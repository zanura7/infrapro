<?php

namespace App\Services\Ai;

use App\Services\Contracts\VideoProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Video generation provider using Viber's grok-imagine-1.0-video model.
 * Parses markdown [video](url) from streaming response.
 */
class ViberAiVideoProvider implements VideoProviderInterface
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $baseUrl,
        private readonly string $model,
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
            model: (string) (config('services.viber.models.video') ?? 'grok-imagine-1.0-video'),
        );
    }

    /**
     * Generate a video from a text prompt.
     * Returns a URL to the generated video.
     */
    public function generateVideo(string $prompt, array $options = []): string
    {
        $content = $prompt;
        if (! empty($options['image_base64']) && ! empty($options['mime_type'])) {
            $content = [
                ['type' => 'text', 'text' => $prompt],
                ['type' => 'image_url', 'image_url' => ['url' => "data:{$options['mime_type']};base64,{$options['image_base64']}"]],
            ];
            unset($options['image_base64'], $options['mime_type']);
        }

        $body = array_merge([
            'model' => $this->model,
            'messages' => [['role' => 'user', 'content' => $content]],
            'stream' => true,
        ], $options);

        $response = Http::withToken($this->apiKey)
            ->acceptJson()
            ->timeout(300)
            ->post($this->baseUrl . '/chat/completions', $body);

        if (! $response->ok()) {
            $head = mb_substr($response->body(), 0, 500);
            throw new RuntimeException("Viber video generation failed {$response->status()} — {$head}");
        }

        $videoUrl = $this->parseVideoUrlFromStream($response->body());

        if (! $videoUrl) {
            throw new RuntimeException('No video URL found in response.');
        }

        return $videoUrl;
    }

    /**
     * Parse markdown [video](url) from SSE stream response.
     */
    private function parseVideoUrlFromStream(string $body): ?string
    {
        // SSE format: data: {"choices":[{"delta":{"content":"..."}}]}
        // We accumulate content chunks and extract [video](url)
        $lines = explode("\n", $body);
        $accumulated = '';

        foreach ($lines as $line) {
            $line = trim($line);
            if (! str_starts_with($line, 'data: ')) {
                continue;
            }

            $json = trim(substr($line, 6));
            if ($json === '[DONE]') {
                break;
            }

            $chunk = json_decode($json, true);
            if (! is_array($chunk)) {
                continue;
            }

            $content = $chunk['choices'][0]['delta']['content'] ?? null;
            if (is_string($content)) {
                $accumulated .= $content;
            }
        }

        // Extract [video](url) markdown pattern
        if (preg_match('/\[video\]\(([^)]+)\)/i', $accumulated, $matches)) {
            return $matches[1];
        }

        // Fallback: try extracting raw video URL
        if (preg_match('/https?:\/\/\S+\.(?:mp4|webm|mov)(?:\?[^\s"\']*)?/i', $accumulated, $matches)) {
            return $matches[0];
        }

        Log::warning('video_provider.no_url_found', ['accumulated' => mb_substr($accumulated, 0, 500)]);

        return null;
    }
}
