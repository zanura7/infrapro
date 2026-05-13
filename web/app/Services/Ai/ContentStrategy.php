<?php

namespace App\Services\Ai;

/**
 * Strongly-typed shape of the JSON the strategy model is asked to return.
 * Wraps the array so callers can use ->toArray() or property access.
 */
class ContentStrategy
{
    public function __construct(
        public array $product,
        public array $audience,
        public array $strategy,
        public array $format,
        public string $hook,
        public string $cta,
        public string $imagePrompt,
        public string $videoPrompt,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            product: $data['product'] ?? [],
            audience: $data['audience'] ?? [],
            strategy: $data['strategy'] ?? [],
            format: $data['format'] ?? [],
            hook: (string) ($data['hook'] ?? ''),
            cta: (string) ($data['cta'] ?? ''),
            imagePrompt: (string) ($data['image_prompt'] ?? ''),
            videoPrompt: (string) ($data['video_prompt'] ?? ''),
        );
    }

    public function toArray(): array
    {
        return [
            'product' => $this->product,
            'audience' => $this->audience,
            'strategy' => $this->strategy,
            'format' => $this->format,
            'hook' => $this->hook,
            'cta' => $this->cta,
            'image_prompt' => $this->imagePrompt,
            'video_prompt' => $this->videoPrompt,
        ];
    }
}
