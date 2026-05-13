<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * AI client for the Viber OpenAI-compatible endpoint.
 * Replaces the Next.js prototype at contengen/lib/ai.ts — same logic, PHP edition.
 *
 *   - generateStrategy()    => vision analysis, returns structured ContentStrategy
 *   - generateImage()       => text-to-image with reference image conditioning
 *   - generateVideo()       => image-to-video (long-running, ~1–3 min)
 *
 * All calls force stream:false so we get plain JSON. The Viber proxy defaults
 * to SSE streaming which would break our parsers.
 */
class ViberAi
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $baseUrl,
        private readonly array $models,
    ) {
        if (! $this->apiKey) {
            throw new RuntimeException('VIBER_API_KEY is not configured.');
        }
    }

    public static function fromConfig(): self
    {
        return new self(
            apiKey: (string) config('services.viber.key'),
            baseUrl: rtrim((string) config('services.viber.base_url'), '/'),
            models: (array) config('services.viber.models'),
        );
    }

    // ------------------------------------------------------------------
    // Public surface
    // ------------------------------------------------------------------

    public function generateStrategy(
        string $imageBase64,
        string $mimeType,
        string $language = 'indonesian',
        ?string $productContext = null,
        ?string $model = null,
    ): ContentStrategy {
        $languageName = match ($language) {
            'indonesian' => 'Indonesian (Bahasa Indonesia)',
            'malay' => 'Malaysian (Bahasa Melayu)',
            default => 'English (global/Western)',
        };

        $userPrompt = "Analyze the attached product image and produce the content strategy JSON.\n\n"
            . "Target language for hook, cta, and any human dialogue inside prompts: {$languageName}.\n\n"
            . ($productContext ? "Additional product context from the seller:\n{$productContext}\n\n" : '')
            . 'Remember: return ONLY the JSON object, nothing else.';

        $dataUrl = "data:{$mimeType};base64,{$imageBase64}";

        $body = [
            'model' => $model ?: ($this->models['text'] ?? 'grok-4.20-beta'),
            'messages' => [
                ['role' => 'system', 'content' => $this->strategySystemPrompt()],
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => $userPrompt],
                        ['type' => 'image_url', 'image_url' => ['url' => $dataUrl]],
                    ],
                ],
            ],
        ];

        $raw = $this->extractText($this->chat($body));
        if ($raw === '') {
            throw new RuntimeException('Empty response from strategy model.');
        }

        $json = $this->extractJson($raw);
        $data = json_decode($json, true);
        if (! is_array($data)) {
            Log::warning('strategy.malformed_json', ['raw_head' => mb_substr($raw, 0, 400)]);
            throw new RuntimeException("Strategy model returned malformed JSON. First 300 chars:\n" . mb_substr($raw, 0, 300));
        }

        return ContentStrategy::fromArray($data);
    }

    /**
     * Returns a string ready to use as <img src>:
     * either a data:image/...;base64,... URI or an https URL.
     */
    public function generateImage(
        string $imageBase64,
        string $mimeType,
        string $prompt,
        string $aspectRatio = '9:16',
    ): string {
        $dataUrl = "data:{$mimeType};base64,{$imageBase64}";

        $body = [
            'model' => $this->models['image'] ?? 'grok-imagine-1.0',
            'messages' => [[
                'role' => 'user',
                'content' => [
                    ['type' => 'text', 'text' => $prompt],
                    ['type' => 'image_url', 'image_url' => ['url' => $dataUrl]],
                ],
            ]],
            'image_config' => ['aspect_ratio' => $aspectRatio],
        ];

        return $this->extractMediaUrl($this->chat($body, timeout: 120), kind: 'image');
    }

    /**
     * Returns a video URL or data: URI. Video gen is slow (1–3 min).
     */
    public function generateVideo(
        ?string $imageBase64,
        ?string $mimeType,
        string $prompt,
        string $aspectRatio = '9:16',
        int $videoLength = 8,
        string $resolution = '480p',
        string $preset = 'normal',
    ): string {
        if ($imageBase64 && $mimeType) {
            $content = [
                ['type' => 'text', 'text' => $prompt],
                ['type' => 'image_url', 'image_url' => ['url' => "data:{$mimeType};base64,{$imageBase64}"]],
            ];
        } else {
            $content = $prompt;
        }

        $body = [
            'model' => $this->models['video'] ?? 'grok-imagine-1.0-video',
            'messages' => [['role' => 'user', 'content' => $content]],
            'video_config' => [
                'aspect_ratio' => $aspectRatio,
                'video_length' => $videoLength,
                'resolution_name' => $resolution,
                'preset' => $preset,
            ],
        ];

        return $this->extractMediaUrl($this->chat($body, timeout: 300), kind: 'video');
    }

    // ------------------------------------------------------------------
    // HTTP plumbing
    // ------------------------------------------------------------------

    private function chat(array $body, int $timeout = 60): array
    {
        $body = ['stream' => false] + $body;

        $response = Http::withToken($this->apiKey)
            ->acceptJson()
            ->timeout($timeout)
            ->post($this->baseUrl . '/chat/completions', $body);

        if (! $response->ok()) {
            $head = mb_substr($response->body(), 0, 500);
            throw new RuntimeException("Viber {$response->status()} — {$head}");
        }

        return (array) $response->json();
    }

    // ------------------------------------------------------------------
    // Response parsing — kept flexible because the proxy returns several shapes
    // ------------------------------------------------------------------

    private function extractText(array $res): string
    {
        $content = $res['choices'][0]['message']['content'] ?? null;

        if (is_string($content)) {
            return $content;
        }
        if (is_array($content)) {
            $parts = [];
            foreach ($content as $c) {
                if (is_string($c)) {
                    $parts[] = $c;
                } elseif (is_array($c) && isset($c['text'])) {
                    $parts[] = (string) $c['text'];
                }
            }
            return implode('', $parts);
        }
        return '';
    }

    private function extractJson(string $raw): string
    {
        $cleaned = trim($raw);

        // Strip ```json ... ``` fences
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $cleaned, $m)) {
            $cleaned = trim($m[1]);
        }

        // Trim to outermost { ... }
        $first = strpos($cleaned, '{');
        $last = strrpos($cleaned, '}');
        if ($first !== false && $last !== false && $last > $first) {
            $cleaned = substr($cleaned, $first, $last - $first + 1);
        }

        return $cleaned;
    }

    private function extractMediaUrl(array $res, string $kind): string
    {
        // Pattern A — top-level data array (OpenAI images shape)
        $first = $res['data'][0] ?? null;
        if (is_array($first)) {
            if (! empty($first['url'])) {
                return (string) $first['url'];
            }
            if (! empty($first['b64_json'])) {
                $defaultMime = $kind === 'video' ? 'video/mp4' : 'image/png';
                return "data:{$defaultMime};base64,{$first['b64_json']}";
            }
        }

        // Pattern B — content string with embedded data URI or URL
        $content = $res['choices'][0]['message']['content'] ?? null;
        if (is_string($content)) {
            $mediaRegex = $kind === 'video'
                ? '/data:video\/[^;]+;base64,[A-Za-z0-9+\/=]+/'
                : '/data:image\/[^;]+;base64,[A-Za-z0-9+\/=]+/';
            if (preg_match($mediaRegex, $content, $m)) {
                return $m[0];
            }
            $urlRegex = $kind === 'video'
                ? '/https?:\/\/\S+\.(?:mp4|webm|mov)(?:\?[^\s"\']*)?/i'
                : '/https?:\/\/\S+\.(?:png|jpe?g|webp)(?:\?[^\s"\']*)?/i';
            if (preg_match($urlRegex, $content, $m)) {
                return $m[0];
            }
        }

        // Pattern C — content as array of parts
        if (is_array($content)) {
            foreach ($content as $part) {
                if (! is_array($part)) {
                    continue;
                }
                if (! empty($part['b64_json'])) {
                    $defaultMime = $kind === 'video' ? 'video/mp4' : 'image/png';
                    return "data:{$defaultMime};base64,{$part['b64_json']}";
                }
                if (! empty($part['image_url']['url']) && $kind === 'image') {
                    return (string) $part['image_url']['url'];
                }
                if (! empty($part['video_url']['url']) && $kind === 'video') {
                    return (string) $part['video_url']['url'];
                }
                if (! empty($part['url'])) {
                    return (string) $part['url'];
                }
            }
        }

        throw new RuntimeException("No {$kind} returned by the model.");
    }

    private function strategySystemPrompt(): string
    {
        return <<<'PROMPT'
You are a senior content strategist for affiliate marketing.
You analyze product images and decide the best creative strategy + format,
then output prompts a downstream image/video model can execute.

You MUST return ONLY valid JSON. No prose before or after, no markdown fences.
The JSON shape:

{
  "product": {
    "name": "concise product name as you see it",
    "category": "short category (e.g. 'Personal Care · Skincare')",
    "description": "1-2 sentence factual description",
    "key_features": ["3-5 short bullet observations from the image"]
  },
  "audience": {
    "primary": "single-line audience description (age range, gender, lifestyle)",
    "psychographics": "what they care about, in one sentence",
    "pain_points": ["2-4 short pain points this product solves"]
  },
  "strategy": {
    "angle": "one of: trust | story | authority | fomo | aspiration | problem-solution | social-proof",
    "rationale": "1-2 sentences why this angle fits this product + audience"
  },
  "format": {
    "type": "one of: single_poster | carousel | reel | story | short_video",
    "aspect_ratio": "one of: 9:16 | 1:1 | 4:5 | 16:9",
    "rationale": "1-2 sentences why this format wins for this product"
  },
  "hook": "the headline / first 3 seconds — punchy, max 12 words, in the requested language",
  "cta": "the call to action — max 8 words, in the requested language",
  "image_prompt": "detailed text-to-image prompt. Lock the product's exact shape, color, label, packaging. Include environment + people + lighting + camera style. The product must look IDENTICAL to the reference.",
  "video_prompt": "detailed image-to-video prompt for an 8-second clip starting from the generated image. Describe the motion, camera movement, and human interaction. Keep the product identity locked."
}
PROMPT;
    }
}
