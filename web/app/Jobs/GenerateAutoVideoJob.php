<?php

namespace App\Jobs;

use App\Models\ContentJob;
use App\Models\Product;
use App\Models\StudioTemplate;
use App\Services\Ai\ContentStrategy;
use App\Services\Ai\ViberAi;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class GenerateAutoVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 1200;

    public function __construct(public readonly int $contentJobId) {}

    public function handle(ViberAi $ai): void
    {
        $job = ContentJob::find($this->contentJobId);
        if (! $job) return;

        $job->markRunning();
        $input = (array) $job->input;

        try {
            $product  = Product::find($job->product_id);
            $template = StudioTemplate::where('slug', $input['template_slug'] ?? '')->first();

            $sceneCount  = (int) ($input['scene_count'] ?? 5);
            $clipSeconds = (int) ($input['clip_seconds'] ?? 6);
            $aspectRatio = $input['aspect_ratio'] ?? '9:16';
            $language    = $input['language'] ?? 'indonesian';

            // Stage 1 — strategy
            $job->updateProgress(['stage' => 'strategy', 'message' => 'Building scene strategy…']);

            $strategy = $ai->generateStrategyFromTemplate(
                language: $language,
                productContext: $this->productContext($product),
                template: $template ? [
                    'name'            => $template->name,
                    'description'     => $template->description,
                    'best_for'        => $template->best_for,
                    'narrative_shape' => $template->narrative_shape,
                    'scene_guidance'  => $template->scene_guidance,
                ] : null,
                sceneCount: $sceneCount,
                clipSeconds: $clipSeconds,
                aspectRatio: $aspectRatio,
            );

            [$refBase64, $refMime]         = $this->resolveRefImage($input);
            [$refVideoBase64, $refVideoMime] = $this->resolveRefVideo($input);

            // Stage 2 — generate one keyframe image per scene
            $sceneImages = [];
            foreach ($strategy->scenes as $scene) {
                $idx = $scene['index'];
                $job->updateProgress([
                    'stage'        => 'images',
                    'step'         => $idx,
                    'total'        => $sceneCount,
                    'message'      => "Generating image for scene {$idx}/{$sceneCount}…",
                    'scene_images' => array_values($sceneImages),
                ]);

                $imageUrl  = $ai->generateImage(
                    imageBase64: $refBase64,
                    mimeType:    $refMime,
                    prompt:      $scene['image_prompt'],
                    aspectRatio: $aspectRatio,
                );
                $imagePath = "products/{$job->product_id}/auto-img-{$idx}-" . uniqid() . '.png';
                $this->persistMedia($imageUrl, $imagePath);
                $sceneImages[$idx] = Storage::disk('public')->url($imagePath);
            }

            // Stage 3 — generate one video clip per scene
            $sceneVideos = [];
            foreach ($strategy->scenes as $scene) {
                $idx = $scene['index'];
                $job->updateProgress([
                    'stage'        => 'videos',
                    'step'         => $idx,
                    'total'        => $sceneCount,
                    'message'      => "Generating video for scene {$idx}/{$sceneCount}…",
                    'scene_images' => array_values($sceneImages),
                    'scene_videos' => array_values($sceneVideos),
                ]);

                [$imgBase64, $imgMime] = $this->urlToBase64($sceneImages[$idx]);

                $videoUrl  = $ai->generateVideo(
                    imageBase64:     $imgBase64,
                    mimeType:        $imgMime,
                    prompt:          $scene['video_prompt'],
                    aspectRatio:     $aspectRatio,
                    videoLength:     $clipSeconds,
                    voiceoverScript: $scene['voiceover_script'] ?? null,
                    refVideoBase64:  $refVideoBase64,
                    refVideoMime:    $refVideoMime,
                );
                $videoPath = "products/{$job->product_id}/auto-vid-{$idx}-" . uniqid() . '.mp4';
                $this->persistMedia($videoUrl, $videoPath);
                $sceneVideos[$idx] = Storage::disk('public')->url($videoPath);
            }

            // Stage 4 — stitch clips into one final video
            $job->updateProgress([
                'stage'        => 'stitching',
                'message'      => 'Stitching all scenes into final video…',
                'scene_images' => array_values($sceneImages),
                'scene_videos' => array_values($sceneVideos),
            ]);

            $finalUrl = $this->stitch(array_values($sceneVideos), $job->product_id);

            $job->markSucceeded([
                'url'          => $finalUrl,
                'stage'        => 'done',
                'strategy'     => $strategy->toArray(),
                'scene_images' => array_values($sceneImages),
                'scene_videos' => array_values($sceneVideos),
            ]);
        } catch (\Throwable $e) {
            Log::error('studio.auto_video_failed', ['error' => $e->getMessage(), 'job' => $job->id]);
            $job->markFailed($e->getMessage());
        }
    }

    private function resolveRefImage(array $input): array
    {
        if (empty($input['image_path'])) return [null, null];
        $bytes = Storage::disk($input['image_disk'] ?? 'local')->get($input['image_path']);
        if (! $bytes) return [null, null];
        return [base64_encode($bytes), $input['image_mime'] ?? 'image/png'];
    }

    private function resolveRefVideo(array $input): array
    {
        if (empty($input['ref_video_path'])) return [null, null];
        $bytes = Storage::disk($input['ref_video_disk'] ?? 'local')->get($input['ref_video_path']);
        if (! $bytes) return [null, null];
        return [base64_encode($bytes), $input['ref_video_mime'] ?? 'video/mp4'];
    }

    private function urlToBase64(string $url): array
    {
        $urlPath = parse_url($url, PHP_URL_PATH);
        $prefix  = '/storage/';
        if ($urlPath && str_starts_with($urlPath, $prefix)) {
            $relative = substr($urlPath, strlen($prefix));
            $bytes    = Storage::disk('public')->get($relative);
            $mime     = Storage::disk('public')->mimeType($relative) ?: 'image/png';
            return [base64_encode($bytes), $mime];
        }
        $bytes = @file_get_contents($url);
        if ($bytes === false) throw new \RuntimeException("Cannot fetch image: {$url}");
        return [base64_encode($bytes), 'image/png'];
    }

    private function persistMedia(string $src, string $storagePath): void
    {
        if (str_starts_with($src, 'data:')) {
            if (! preg_match('/^data:[^;]+;base64,(.+)$/', $src, $m)) {
                throw new \RuntimeException('Malformed data URI.');
            }
            Storage::disk('public')->put($storagePath, base64_decode($m[1]));
        } elseif (str_starts_with($src, 'http')) {
            $bytes = @file_get_contents($src);
            if ($bytes === false) throw new \RuntimeException("Cannot fetch media: {$src}");
            Storage::disk('public')->put($storagePath, $bytes);
        } else {
            throw new \RuntimeException('Unknown media src format.');
        }
    }

    private function stitch(array $clipUrls, int $productId): string
    {
        if (count($clipUrls) === 1) return $clipUrls[0];

        $workDir = storage_path('app/temp/auto-stitch-' . uniqid());
        @mkdir($workDir, 0755, true);

        try {
            $localPaths = [];
            foreach ($clipUrls as $i => $url) {
                $urlPath = parse_url($url, PHP_URL_PATH);
                $prefix  = '/storage/';
                if ($urlPath && str_starts_with($urlPath, $prefix)) {
                    $bytes = Storage::disk('public')->get(substr($urlPath, strlen($prefix)));
                } else {
                    $bytes = @file_get_contents($url);
                    if ($bytes === false) throw new \RuntimeException("Cannot download clip: {$url}");
                }
                $local = $workDir . '/clip_' . str_pad((string) $i, 2, '0', STR_PAD_LEFT) . '.mp4';
                file_put_contents($local, $bytes);
                $localPaths[] = $local;
            }

            $listFile    = $workDir . '/list.txt';
            $listContent = '';
            foreach ($localPaths as $p) {
                $listContent .= "file '" . str_replace("'", "'\\''", $p) . "'\n";
            }
            file_put_contents($listFile, $listContent);
            $outFile = $workDir . '/stitched.mp4';

            $fast = new Process(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', $listFile, '-c', 'copy', $outFile]);
            $fast->setTimeout(180);
            $fast->run();

            if (! $fast->isSuccessful() || ! file_exists($outFile) || filesize($outFile) < 1024) {
                @unlink($outFile);
                $reencode = new Process([
                    'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', $listFile,
                    '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
                    '-r', '30',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
                    '-c:a', 'aac', '-b:a', '128k',
                    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                    $outFile,
                ]);
                $reencode->setTimeout(240);
                $reencode->run();

                if (! $reencode->isSuccessful() || ! file_exists($outFile) || filesize($outFile) < 1024) {
                    throw new \RuntimeException('ffmpeg stitch failed: ' . mb_substr($reencode->getErrorOutput(), 0, 500));
                }
            }

            $name = sprintf('products/%d/auto-final-%s.mp4', $productId, uniqid());
            Storage::disk('public')->put($name, file_get_contents($outFile));
            return Storage::disk('public')->url($name);
        } finally {
            foreach (glob($workDir . '/*') ?: [] as $f) @unlink($f);
            @rmdir($workDir);
        }
    }

    private function productContext(?Product $product): string
    {
        if (! $product) return '';
        $bits = array_filter([
            "Name: {$product->name}",
            $product->category ? "Category: {$product->category}" : null,
            $product->price !== null ? "Price: {$product->currency} {$product->price}" : null,
            $product->target_audience ? "Audience: {$product->target_audience}" : null,
            ! empty($product->usp) ? 'USP: ' . implode(', ', $product->usp) : null,
            $product->pain_point ? "Pain: {$product->pain_point}" : null,
            $product->description ? "Description: {$product->description}" : null,
        ]);
        return implode("\n", $bits);
    }
}
