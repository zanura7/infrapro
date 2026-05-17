<?php

namespace App\Services\Ai;

use App\Services\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NineRouterAiProvider implements AiProviderInterface
{
    private string $apiKey;
    private string $baseUrl;
    private string $model;

    public function __construct(array $config)
    {
        $this->apiKey = $config['api_key'];
        $this->baseUrl = rtrim($config['base_url'], '/');
        $this->model = $config['model'] ?? 'grok-2-1212';
    }

    public function chat(string $prompt, array $options = []): string
    {
        $messages = $options['messages'] ?? [['role' => 'user', 'content' => $prompt]];

        $response = Http::timeout($options['timeout'] ?? 120)
            ->withToken($this->apiKey)
            ->post("{$this->baseUrl}/chat/completions", [
                'model' => $options['model'] ?? $this->model,
                'messages' => $messages,
                'temperature' => $options['temperature'] ?? 0.7,
                'stream' => false,
            ]);

        if (!$response->successful()) {
            Log::error('9router.chat_failed', [
                'status' => $response->status(),
                'error' => $response->body(),
            ]);
            throw new \RuntimeException("9Router API error: " . ($response->json('error.message') ?? $response->body()));
        }

        // Handle both streaming (SSE) and non-streaming responses
        $body = $response->body();
        
        if (str_starts_with($body, 'data: ')) {
            // SSE response — concatenate all content deltas
            $content = '';
            foreach (explode("\n", $body) as $line) {
                $line = trim($line);
                if (!str_starts_with($line, 'data: ') || $line === 'data: [DONE]') continue;
                $chunk = json_decode(substr($line, 6), true);
                $content .= $chunk['choices'][0]['delta']['content'] ?? '';
            }
            return $content;
        }

        return $response->json('choices.0.message.content') ?? '';
    }

    public function generateText(string $prompt, ?string $system = null, float $temperature = 0.7): string
    {
        $messages = [];
        if ($system) {
            $messages[] = ['role' => 'system', 'content' => $system];
        }
        $messages[] = ['role' => 'user', 'content' => $prompt];

        return $this->chat($prompt, [
            'messages' => $messages,
            'temperature' => $temperature,
        ]);
    }
}
