<?php

namespace App\Services\Contracts;

interface VideoProviderInterface
{
    /**
     * Generate a video from a text prompt.
     * Returns a URL to the generated video.
     */
    public function generateVideo(string $prompt, array $options = []): string;
}
