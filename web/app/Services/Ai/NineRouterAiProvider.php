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

        $response = Http::timeout($options['timeout'] ?? 60)
            ->withToken($this->apiKey)
            ->post("{$this->baseUrl}/chat/completions", [
                'model' => $options['model'] ?? $this->model,
                'messages' => $messages,
                'temperature' => $options['temperature'] ?? 0.7,
            ]);

        if (!$response->successful()) {
            Log::error('9router.chat_failed', [
                'status' => $response->status(),
                'error' => $response->body(),
            ]);
            throw new \RuntimeException("9Router API error: " . ($response->json('error.message') ?? 'Unknown error'));
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
