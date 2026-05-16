<?php

namespace App\Services\Contracts;

interface ImageProviderInterface
{
    /**
     * Generate an image from a text prompt (with optional reference image).
     * Returns a URL or data URI of the generated image.
     */
    public function generateImage(
        string $prompt,
        string $aspectRatio,
        ?string $negativePrompt = null,
        ?string $imageBase64 = null,
        ?string $mimeType = null,
    ): string;
}
