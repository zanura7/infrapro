<?php

namespace App\Jobs;

use App\Models\ContentJob;
use App\Services\Ai\ViberAi;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateSceneVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 600;

    public function __construct(public readonly int $contentJobId) {}

    public function handle(ViberAi $ai): void
    {
        $job = ContentJob::find($this->contentJobId);
        if (! $job) return;

        $job->markRunning();
        $input = (array) $job->input;

        try {
            [$base64, $mime] = $this->approvedImageToBase64($input['approved_image']);

            $videoUrl = $ai->generateVideo(
                imageBase64: $base64,
                mimeType: $mime,
                prompt: $input['prompt'],
                aspectRatio: $input['aspect_ratio'] ?? '9:16',
                videoLength: (int) ($input['clip_seconds'] ?? 6),
                voiceoverScript: $input['voiceover_script'] ?? null,
            );

            $stored = $this->persistMedia($videoUrl, $job->product_id, "scene-{$input['scene_index']}-video");
            $job->markSucceeded(['url' => $stored['url'], 'path' => $stored['path']]);
        } catch (\Throwable $e) {
            Log::error('studio.async_video_failed', ['error' => $e->getMessage(), 'job' => $job->id]);
            $job->markFailed($e->getMessage());
        }
    }

    private function approvedImageToBase64(string $src): array
    {
        if (str_starts_with($src, 'data:')) {
            if (preg_match('/^data:([^;]+);base64,(.+)$/', $src, $m)) {
                return [$m[2], $m[1]];
            }
            throw new \RuntimeException('Bad data URI.');
        }

        $storagePrefix = '/storage/';
        $path = parse_url($src, PHP_URL_PATH);
        if ($path && str_starts_with($path, $storagePrefix)) {
            $relative = substr($path, strlen($storagePrefix));
            $contents = Storage::disk('public')->get($relative);
            $mime = Storage::disk('public')->mimeType($relative) ?: 'image/png';
            return [base64_encode($contents), $mime];
        }

        $bytes = @file_get_contents($src);
        if ($bytes === false) {
            throw new \RuntimeException('Could not fetch approved image.');
        }
        return [base64_encode($bytes), 'image/png'];
    }

    private function persistMedia(string $src, int $productId, string $kind): array
    {
        $name = sprintf('products/%d/%s-%s.mp4', $productId, $kind, uniqid());

        if (str_starts_with($src, 'data:')) {
            if (! preg_match('/^data:[^;]+;base64,(.+)$/', $src, $m)) {
                throw new \RuntimeException('Malformed video data URI.');
            }
            Storage::disk('public')->put($name, base64_decode($m[1]));
        } elseif (str_starts_with($src, 'http')) {
            $bytes = @file_get_contents($src);
            if ($bytes === false) {
                throw new \RuntimeException('Failed to fetch generated video.');
            }
            Storage::disk('public')->put($name, $bytes);
        } else {
            throw new \RuntimeException('Unknown video src.');
        }

        return ['path' => $name, 'url' => Storage::disk('public')->url($name)];
    }
}
