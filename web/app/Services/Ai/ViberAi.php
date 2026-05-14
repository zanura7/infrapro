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

    /**
     * Vision analysis + 5-scene ad breakdown. If $template is passed, the
     * strategy LLM follows that narrative shape; otherwise it picks freely.
     *
     * @param array{name:string,description:string,best_for?:string,narrative_shape:array,scene_guidance:string}|null $template
     */
    public function generateStrategy(
        string $imageBase64,
        string $mimeType,
        string $language = 'indonesian',
        ?string $productContext = null,
        ?array $template = null,
        int $sceneCount = 5,
        int $clipSeconds = 6,
        ?string $aspectRatio = null,
        ?string $model = null,
    ): ContentStrategy {
        $languageName = match ($language) {
            'indonesian' => 'Indonesian (Bahasa Indonesia)',
            'malay' => 'Malaysian (Bahasa Melayu)',
            default => 'English (global/Western)',
        };

        $userBlocks = [
            "Analyze the attached product image and produce the multi-scene content strategy JSON.",
            "Target language for hook, cta, and all `voiceover_script` lines: {$languageName}.",
            "Number of scenes: {$sceneCount}. Each clip will be exactly {$clipSeconds} seconds long.",
        ];

        if ($aspectRatio) {
            $userBlocks[] = "Aspect ratio: {$aspectRatio}.";
        }

        if ($productContext) {
            $userBlocks[] = "Product context from the seller:\n{$productContext}";
        }

        if ($template) {
            $userBlocks[] = "TEMPLATE TO FOLLOW: " . ($template['name'] ?? '');
            $userBlocks[] = "Template description: " . ($template['description'] ?? '');
            if (! empty($template['narrative_shape'])) {
                $userBlocks[] = "Narrative shape (use as the spine of the 5 scenes — adapt to the actual product/audience):\n- " . implode("\n- ", $template['narrative_shape']);
            }
            if (! empty($template['scene_guidance'])) {
                $userBlocks[] = "Scene guidance: " . $template['scene_guidance'];
            }
        }

        $userBlocks[] = 'Remember: return ONLY the JSON object, nothing else.';

        $dataUrl = "data:{$mimeType};base64,{$imageBase64}";

        $body = [
            'model' => $model ?: ($this->models['text'] ?? 'grok-4.20-beta'),
            'messages' => [
                ['role' => 'system', 'content' => $this->strategySystemPrompt($sceneCount, $clipSeconds)],
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => implode("\n\n", $userBlocks)],
                        ['type' => 'image_url', 'image_url' => ['url' => $dataUrl]],
                    ],
                ],
            ],
        ];

        // Force JSON mode if the proxy honours it. Some OpenAI-compatible
        // servers accept response_format; if it's rejected, the second attempt
        // (without it) takes over.
        $bodyWithJsonMode = $body + ['response_format' => ['type' => 'json_object']];

        $data = $this->tryStrategy($bodyWithJsonMode)
            ?? $this->tryStrategy($body); // fallback: same prompt without response_format

        if ($data === null) {
            throw new RuntimeException('Strategy model returned non-JSON output twice in a row. Try a different image, or toggle "Skip vision analyze" to use the template directly.');
        }

        return ContentStrategy::fromArray($data);
    }

    /**
     * Text-only strategy build — no reference image attached. Uses the
     * chosen template + product context to design the 5-scene breakdown.
     * Cheaper and avoids the "vision model emits media link" edge case.
     */
    public function generateStrategyFromTemplate(
        string $language = 'indonesian',
        ?string $productContext = null,
        ?array $template = null,
        int $sceneCount = 5,
        int $clipSeconds = 6,
        ?string $aspectRatio = null,
        ?string $model = null,
    ): ContentStrategy {
        $languageName = match ($language) {
            'indonesian' => 'Indonesian (Bahasa Indonesia)',
            'malay' => 'Malaysian (Bahasa Melayu)',
            default => 'English (global/Western)',
        };

        $userBlocks = [
            "Design a {$sceneCount}-scene short-form video ad strategy as JSON.",
            "Target language for hook, cta, and all `voiceover_script` lines: {$languageName}.",
            "Each clip will be exactly {$clipSeconds} seconds long.",
        ];

        if ($aspectRatio) {
            $userBlocks[] = "Aspect ratio: {$aspectRatio}.";
        }

        if ($productContext) {
            $userBlocks[] = "PRODUCT (from seller):\n{$productContext}";
        }

        if ($template) {
            $userBlocks[] = "TEMPLATE TO FOLLOW: " . ($template['name'] ?? '');
            $userBlocks[] = "Template description: " . ($template['description'] ?? '');
            if (! empty($template['narrative_shape'])) {
                $userBlocks[] = "Narrative shape (use as the spine of the {$sceneCount} scenes — map each bullet to one scene in order):\n- "
                    . implode("\n- ", $template['narrative_shape']);
            }
            if (! empty($template['scene_guidance'])) {
                $userBlocks[] = "Scene guidance: " . $template['scene_guidance'];
            }
        }

        $userBlocks[] = 'Remember: return ONLY the JSON object, nothing else.';

        $body = [
            'model' => $model ?: ($this->models['text'] ?? 'grok-4.20-beta'),
            'messages' => [
                ['role' => 'system', 'content' => $this->strategySystemPrompt($sceneCount, $clipSeconds)],
                ['role' => 'user', 'content' => implode("\n\n", $userBlocks)],
            ],
        ];

        $bodyWithJsonMode = $body + ['response_format' => ['type' => 'json_object']];
        $data = $this->tryStrategy($bodyWithJsonMode) ?? $this->tryStrategy($body);

        if ($data === null) {
            throw new RuntimeException('Strategy model returned non-JSON output twice. Try regenerating, or pick a different template.');
        }

        return ContentStrategy::fromArray($data);
    }

    /**
     * Run one strategy attempt. Returns decoded array on success, null on a
     * non-JSON response (so the caller can retry). Real HTTP errors still
     * propagate as exceptions.
     */
    private function tryStrategy(array $body): ?array
    {
        try {
            $raw = $this->extractText($this->chat($body, timeout: 90));
        } catch (RuntimeException $e) {
            // If the proxy rejects response_format with a 4xx, surface that
            // by returning null so the caller drops the option and retries.
            if (isset($body['response_format'])) {
                Log::warning('strategy.response_format_rejected', ['error' => $e->getMessage()]);
                return null;
            }
            throw $e;
        }

        if ($raw === '') {
            Log::warning('strategy.empty_response');
            return null;
        }

        // Guard: if the model returned a media link instead of JSON, bail
        // (so we can retry without response_format or fall through to error).
        if (preg_match('/^\s*\[(?:video|image|audio)\]\(https?:\/\//i', $raw)) {
            Log::warning('strategy.media_response_instead_of_json', ['raw_head' => mb_substr($raw, 0, 200)]);
            return null;
        }

        $json = $this->extractJson($raw);
        $data = json_decode($json, true);
        if (! is_array($data)) {
            Log::warning('strategy.malformed_json', ['raw_head' => mb_substr($raw, 0, 400)]);
            return null;
        }
        return $data;
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
     * If $voiceoverScript is passed, an instruction is appended so the
     * on-screen person actually speaks that line in the generated clip.
     */
    public function generateVideo(
        ?string $imageBase64,
        ?string $mimeType,
        string $prompt,
        string $aspectRatio = '9:16',
        int $videoLength = 6,
        string $resolution = '480p',
        string $preset = 'normal',
        ?string $voiceoverScript = null,
    ): string {
        $effectivePrompt = $prompt;
        if ($voiceoverScript) {
            $effectivePrompt .= "\n\nThe on-screen person speaks this line, lip-synced, with natural prosody: \"{$voiceoverScript}\"";
        }

        if ($imageBase64 && $mimeType) {
            $content = [
                ['type' => 'text', 'text' => $effectivePrompt],
                ['type' => 'image_url', 'image_url' => ['url' => "data:{$mimeType};base64,{$imageBase64}"]],
            ];
        } else {
            $content = $effectivePrompt;
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

    private function strategySystemPrompt(int $sceneCount, int $clipSeconds): string
    {
        return <<<PROMPT
You are a senior creative director for short-form affiliate marketing video ads.
You analyze a product image and design a {$sceneCount}-scene video ad,
producing per-scene prompts a downstream image/video model can execute.

ABSOLUTE OUTPUT RULES:
- You are a TEXT-ONLY response. DO NOT generate, render, or return any media
  (no video links, no image links, no audio, no markdown like `[video](...)`
  or `![image](...)` or `<video>` / `<img>` tags). You ONLY produce text JSON.
- Your downstream consumer is another program that will read your JSON and
  call dedicated image and video generation models itself. You must NOT call
  them or pretend to.
- Return ONLY one valid JSON object. No prose before or after, no markdown
  code fences, no commentary.
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
    "type": "short_video",
    "aspect_ratio": "one of: 9:16 | 1:1 | 4:5 | 16:9",
    "rationale": "1-2 sentences why this aspect ratio wins for this product"
  },
  "hook": "the opening line / first 3 seconds — punchy, max 12 words, in the requested language",
  "cta": "the call to action — max 8 words, in the requested language",
  "scenes": [
    {
      "index": 1,
      "title": "short label (e.g. 'Hook', 'Problem', 'Solution', 'Demo', 'CTA')",
      "image_prompt": "detailed text-to-image prompt for the KEYFRAME of this scene. Lock the product's exact shape, color, label, packaging. Include environment + people + wardrobe + lighting + camera angle + framing. The product must look IDENTICAL to the reference image. This image will be the FIRST FRAME of a {$clipSeconds}-second image-to-video clip, so compose it accordingly.",
      "video_prompt": "detailed image-to-video prompt for the {$clipSeconds}-second clip starting from this keyframe. Describe motion, camera movement, human action/expression beats. Do NOT describe the voiceover here — that goes in voiceover_script. Keep product identity locked.",
      "voiceover_script": "the ONE line the on-screen person speaks in this {$clipSeconds}-second clip, in the requested language. Keep it natural, conversational, ~10–18 words max. This will be lip-synced by the video model."
    }
    // ... exactly {$sceneCount} scenes total. Each scene must visually advance the narrative.
  ]
}

Rules:
- Produce EXACTLY {$sceneCount} scenes, numbered 1..{$sceneCount}.
- Each scene's image_prompt must be self-contained (the image model only sees that prompt + reference image, not other scenes).
- voiceover_script lines should string together to tell a coherent {$sceneCount}-beat story when played in sequence.
- Honor the supplied TEMPLATE narrative_shape if one is provided — map each bullet to one scene in order.
PROMPT;
    }
}
