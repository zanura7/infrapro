<?php

namespace App\Services\Contracts;

interface AiProviderInterface
{
    /**
     * Send a chat/text prompt and return the model's text response.
     */
    public function chat(string $prompt, array $options = []): string;
}
