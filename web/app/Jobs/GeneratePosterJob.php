<?php

namespace App\Jobs;

use App\Models\ContentJob;
use App\Services\Contracts\ImageProviderInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GeneratePosterJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 300;

    public function __construct(public readonly int $contentJobId) {}

    public function handle(ImageProviderInterface $ai): void
    {
        $job = ContentJob::find($this->contentJobId);
        if (! $job) return;

        $job->markRunning();
        $input = (array) $job->input;

        try {
            $base64 = null;
            $mime = null;
            if (! empty($input['image_path']) && ! empty($input['image_disk'])) {
                $contents = Storage::disk($input['image_disk'])->get($input['image_path']);
                $base64 = base64_encode($contents);
                $mime = $input['image_mime'] ?? 'image/png';
            }

            $url = $ai->generateImage(
                prompt: $input['prompt'],
                aspectRatio: $input['aspect_ratio'] ?? '4:5',
                negativePrompt: $input['negative_prompt'] ?? null,
                imageBase64: $base64,
                mimeType: $mime,
            );

            $stored = $this->persistMedia($url, $job->product_id);
            $job->markSucceeded(['url' => $stored['url'], 'path' => $stored['path']]);
        } catch (\Throwable $e) {
            Log::error('poster.generate_failed', ['error' => $e->getMessage(), 'job' => $job->id]);
            $job->markFailed($e->getMessage());
        }
    }

    private function persistMedia(string $src, int $productId): array
    {
        $name = sprintf('products/%d/poster-%s.png', $productId, uniqid());

        if (str_starts_with($src, 'data:')) {
            if (! preg_match('/^data:[^;]+;base64,(.+)$/', $src, $m)) {
                throw new \RuntimeException('Malformed poster data URI.');
            }
            Storage::disk('public')->put($name, base64_decode($m[1]));
        } elseif (str_starts_with($src, 'http')) {
            $bytes = @file_get_contents($src);
            if ($bytes === false) {
                throw new \RuntimeException('Failed to fetch generated poster.');
            }
            Storage::disk('public')->put($name, $bytes);
        } else {
            throw new \RuntimeException('Unknown poster src.');
        }

        return ['path' => $name, 'url' => Storage::disk('public')->url($name)];
    }
}
