<?php

namespace App\Services\Ai;

/**
 * Strongly-typed shape of the JSON the strategy model is asked to return.
 *
 * The strategy now produces a 5-scene breakdown. Each scene carries:
 *   - image_prompt:  text-to-image / image-conditioned prompt for the scene keyframe
 *   - video_prompt:  image-to-video prompt (must reference the keyframe)
 *   - voiceover_script:  the line the on-screen person should speak in that clip
 *                        (the video model is instructed to make them say it)
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
        /** @var array<int, array{index:int, title:string, image_prompt:string, video_prompt:string, voiceover_script:string}> */
        public array $scenes,
    ) {}

    public static function fromArray(array $data): self
    {
        $scenes = [];
        foreach (($data['scenes'] ?? []) as $i => $s) {
            $scenes[] = [
                'index' => (int) ($s['index'] ?? $i + 1),
                'title' => (string) ($s['title'] ?? "Scene " . ($i + 1)),
                'image_prompt' => (string) ($s['image_prompt'] ?? ''),
                'video_prompt' => (string) ($s['video_prompt'] ?? ''),
                'voiceover_script' => (string) ($s['voiceover_script'] ?? ''),
            ];
        }

        return new self(
            product: $data['product'] ?? [],
            audience: $data['audience'] ?? [],
            strategy: $data['strategy'] ?? [],
            format: $data['format'] ?? [],
            hook: (string) ($data['hook'] ?? ''),
            cta: (string) ($data['cta'] ?? ''),
            scenes: $scenes,
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
            'scenes' => $this->scenes,
        ];
    }
}
