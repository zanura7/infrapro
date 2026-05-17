<?php

namespace App\Jobs;

use App\Models\ContentJob;
use App\Services\Contracts\VideoProviderInterface;
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

    public function handle(VideoProviderInterface $videoProvider): void
    {
        $job = ContentJob::find($this->contentJobId);
        if (! $job) return;

        $job->markRunning();
        $input = (array) $job->input;

        try {
            $prompt = $input['prompt'];
            $options = [
                'video_config' => [
                    'aspect_ratio' => $input['aspect_ratio'] ?? '9:16',
                    'video_length' => (int) ($input['clip_seconds'] ?? 6),
                ],
            ];

            // If approved_image exists, include it in the prompt construction
            if (!empty($input['approved_image'])) {
                [$base64, $mime] = $this->approvedImageToBase64($input['approved_image']);
                $options['image_base64'] = $base64;
                $options['mime_type'] = $mime;
            }

            if (!empty($input['voiceover_script'])) {
                $prompt .= "\n\nThe on-screen person speaks this line, lip-synced, with natural prosody: \"{$input['voiceover_script']}\"";
            }

            $videoUrl = $videoProvider->generateVideo($prompt, $options);

            $stored = $this->persistMedia($videoUrl, $job->product_id, "scene-{$input['scene_index']}-video");
            $job->markSucceeded(['url' => $stored['url'], 'path' => $stored['path']]);

            // If this is the last scene, dispatch StitchScenesJob
            if ($this->isLastScene($job, $input)) {
                $this->dispatchStitchJob($job);
            }
        } catch (\Throwable $e) {
            Log::error('studio.async_video_failed', ['error' => $e->getMessage(), 'job' => $job->id]);
            $job->markFailed($e->getMessage());
        }
    }

    private function isLastScene(ContentJob $job, array $input): bool
    {
        $sceneIndex = (int) ($input['scene_index'] ?? 0);
        $totalScenes = (int) ($input['total_scenes'] ?? 0);

        if ($totalScenes === 0 || $sceneIndex === 0) {
            return false;
        }

        // Check if all sibling jobs are succeeded
        if ($job->parent_id) {
            $siblings = ContentJob::where('parent_id', $job->parent_id)
                ->where('kind', 'video')
                ->get();

            $allSucceeded = $siblings->every(fn ($s) => $s->status === 'succeeded');

            return $allSucceeded && $sceneIndex === $totalScenes;
        }

        return false;
    }

    private function dispatchStitchJob(ContentJob $job): void
    {
        if (! $job->parent_id) {
            return;
        }

        // Gather all sibling video URLs in scene_index order
        $siblings = ContentJob::where('parent_id', $job->parent_id)
            ->where('kind', 'video')
            ->where('status', 'succeeded')
            ->get()
            ->sortBy(fn ($s) => (int) ($s->input['scene_index'] ?? 0));

        $clipUrls = $siblings->map(fn ($s) => $s->output['url'] ?? null)
            ->filter()
            ->values()
            ->toArray();

        if (count($clipUrls) < 2) {
            Log::warning('stitch.not_enough_clips', ['parent_id' => $job->parent_id, 'count' => count($clipUrls)]);
            return;
        }

        $stitchJob = ContentJob::create([
            'product_id' => $job->product_id,
            'user_id' => $job->user_id,
            'parent_id' => $job->parent_id,
            'kind' => 'stitch',
            'status' => 'queued',
            'model' => 'ffmpeg',
            'input' => ['clip_urls' => $clipUrls],
        ]);

        StitchScenesJob::dispatch($stitchJob->id);

        Log::info('stitch.dispatched', ['stitch_job_id' => $stitchJob->id, 'clips' => count($clipUrls)]);
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

        $response = \Illuminate\Support\Facades\Http::timeout(30)->get($src);
        if (!$response->successful()) {
            throw new \RuntimeException('Could not fetch approved image.');
        }
        return [base64_encode($response->body()), 'image/png'];
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
            $response = \Illuminate\Support\Facades\Http::timeout(60)->get($src);
            if (!$response->successful()) {
                throw new \RuntimeException('Failed to fetch generated video.');
            }
            Storage::disk('public')->put($name, $response->body());
        } else {
            throw new \RuntimeException('Unknown video src.');
        }

        return ['path' => $name, 'url' => Storage::disk('public')->url($name)];
    }
}
