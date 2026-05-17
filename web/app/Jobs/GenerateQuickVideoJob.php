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

class GenerateQuickVideoJob implements ShouldQueue
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
            $product  = Product::find($job->product_id);
            $template = StudioTemplate::where('slug', $input['template_slug'] ?? '')->first();

            $sceneCount  = (int) ($input['scene_count'] ?? 5);
            $clipSeconds = (int) ($input['clip_seconds'] ?? 6);
            $aspectRatio = $input['aspect_ratio'] ?? '9:16';
            $language    = $input['language'] ?? 'indonesian';

            // Stage 1 — strategy (text-only, used to build a rich combined prompt)
            $job->updateProgress(['stage' => 'strategy', 'message' => 'Building strategy…']);

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

            // Stage 2 — single 30s video call
            $job->updateProgress(['stage' => 'video', 'message' => 'Requesting 30-second video from API… (this may take a few minutes)']);

            [$refBase64, $refMime]         = $this->resolveRefImage($input);
            [$refVideoBase64, $refVideoMime] = $this->resolveRefVideo($input);
            $prompt = $this->buildPrompt($strategy);

            $videoUrl = $ai->generateVideo(
                imageBase64:    $refBase64,
                mimeType:       $refMime,
                prompt:         $prompt,
                aspectRatio:    $aspectRatio,
                videoLength:    30,
                refVideoBase64: $refVideoBase64,
                refVideoMime:   $refVideoMime,
            );

            $path = sprintf('products/%d/quick-30s-%s.mp4', $job->product_id, uniqid());
            $this->persistMedia($videoUrl, $path);

            $job->markSucceeded([
                'url'      => Storage::disk('public')->url($path),
                'stage'    => 'done',
                'strategy' => $strategy->toArray(),
            ]);
        } catch (\Throwable $e) {
            Log::error('studio.quick_video_failed', ['error' => $e->getMessage(), 'job' => $job->id]);
            $job->markFailed($e->getMessage());
        }
    }

    private function buildPrompt(ContentStrategy $strategy): string
    {
        $sceneCount = count($strategy->scenes);
        $perScene   = $sceneCount > 0 ? (int) round(30 / $sceneCount) : 6;

        $lines = [
            "Create a continuous 30-second short-form video ad. Angle: {$strategy->strategy['angle']}.",
            "Hook (first 3 seconds): \"{$strategy->hook}\".",
            "The ad flows through {$sceneCount} visual chapters (~{$perScene}s each):",
        ];
        foreach ($strategy->scenes as $scene) {
            $lines[] = "  Scene {$scene['index']} — {$scene['title']}: {$scene['video_prompt']}";
        }
        $lines[] = "Close with the call-to-action: \"{$strategy->cta}\".";
        $lines[] = "Keep the product clearly visible throughout. Cinematic, engaging, no text overlays.";

        return implode("\n", $lines);
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

    private function persistMedia(string $src, string $storagePath): void
    {
        if (str_starts_with($src, 'data:')) {
            if (! preg_match('/^data:[^;]+;base64,(.+)$/', $src, $m)) {
                throw new \RuntimeException('Malformed data URI.');
            }
            Storage::disk('public')->put($storagePath, base64_decode($m[1]));
        } elseif (str_starts_with($src, 'http')) {
            $bytes = @file_get_contents($src);
            if ($bytes === false) throw new \RuntimeException('Cannot fetch generated video.');
            Storage::disk('public')->put($storagePath, $bytes);
        } else {
            throw new \RuntimeException('Unknown media src format.');
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
