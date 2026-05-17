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

class GenerateSceneImageJob implements ShouldQueue
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
            $contents = Storage::disk($input['image_disk'])->get($input['image_path']);
            $base64 = base64_encode($contents);

            $url = $ai->generateImage(
                prompt: $input['prompt'],
                aspectRatio: $input['aspect_ratio'] ?? '9:16',
                negativePrompt: $input['negative_prompt'] ?? null,
                imageBase64: $base64,
                mimeType: $input['image_mime'],
            );

            $stored = $this->persistMedia($url, $job->product_id, "scene-{$input['scene_index']}");
            $job->markSucceeded(['url' => $stored['url'], 'path' => $stored['path']]);
        } catch (\Throwable $e) {
            Log::error('studio.async_image_failed', ['error' => $e->getMessage(), 'job' => $job->id]);
            $job->markFailed($e->getMessage());
        }
    }

    private function persistMedia(string $src, int $productId, string $kind): array
    {
        $name = sprintf('products/%d/%s-%s.png', $productId, $kind, uniqid());

        if (str_starts_with($src, 'data:')) {
            if (! preg_match('/^data:[^;]+;base64,(.+)$/', $src, $m)) {
                throw new \RuntimeException('Malformed image data URI.');
            }
            Storage::disk('public')->put($name, base64_decode($m[1]));
        } elseif (str_starts_with($src, 'http')) {
            $response = \Illuminate\Support\Facades\Http::timeout(30)->get($src);
            if (!$response->successful()) {
                throw new \RuntimeException('Failed to fetch generated image.');
            }
            Storage::disk('public')->put($name, $response->body());
        } else {
            throw new \RuntimeException('Unknown image src.');
        }

        return ['path' => $name, 'url' => Storage::disk('public')->url($name)];
    }
}
