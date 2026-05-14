<?php

namespace App\Http\Controllers;

use App\Models\ContentJob;
use App\Models\Product;
use App\Models\ProductAsset;
use App\Models\StudioTemplate;
use App\Services\Ai\ViberAi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AiStudioController extends Controller
{
    public function __construct(private readonly ViberAi $ai) {}

    /**
     * Wizard landing — pick product + reference image + template + scenes.
     */
    public function index(Request $request): Response
    {
        $products = Product::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('archived_at')
            ->with(['assets' => fn ($q) => $q->where('type', 'image')->latest()->limit(3)])
            ->latest('updated_at')
            ->get();

        $templates = StudioTemplate::active()->get();

        return Inertia::render('Studio/Index', [
            'products' => $products,
            'templates' => $templates,
        ]);
    }

    /**
     * Step 1 — vision analysis + 5-scene breakdown following the chosen template.
     */
    public function analyze(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'    => ['required', 'integer', 'exists:products,id'],
            'template_slug' => ['nullable', 'string', 'exists:studio_templates,slug'],
            'asset_id'      => ['nullable', 'integer', 'exists:product_assets,id'],
            'image'         => ['nullable', 'file', 'image', 'max:10240'],
            'language'      => ['nullable', 'string', 'in:indonesian,malay,english'],
            'scene_count'   => ['nullable', 'integer', 'min:3', 'max:8'],
            'clip_seconds'  => ['nullable', 'integer', 'min:4', 'max:10'],
            'aspect_ratio'  => ['nullable', 'string', 'in:9:16,1:1,4:5,16:9'],
        ]);

        $product = Product::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('product_id'));

        [$base64, $mime] = $this->resolveImageInput($request, $product);

        $template = $request->filled('template_slug')
            ? StudioTemplate::where('slug', $request->string('template_slug')->toString())->first()
            : null;

        $sceneCount  = (int) ($request->input('scene_count') ?: ($template->default_scene_count ?? 5));
        $clipSeconds = (int) ($request->input('clip_seconds') ?: ($template->default_clip_seconds ?? 6));
        $aspectRatio = $request->input('aspect_ratio') ?: ($template?->default_aspect_ratio ?? '9:16');

        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id'    => $request->user()->id,
            'kind'       => 'strategy',
            'status'     => 'running',
            'model'      => config('services.viber.models.text'),
            'input'      => [
                'language'      => $request->input('language', 'indonesian'),
                'template_slug' => $template?->slug,
                'scene_count'   => $sceneCount,
                'clip_seconds'  => $clipSeconds,
                'aspect_ratio'  => $aspectRatio,
                'context'       => $this->productContext($product),
            ],
            'started_at' => now(),
        ]);

        try {
            $strategy = $this->ai->generateStrategy(
                imageBase64: $base64,
                mimeType: $mime,
                language: $request->input('language', 'indonesian'),
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

            $payload = $strategy->toArray();
            $payload['meta'] = [
                'template_slug' => $template?->slug,
                'scene_count'   => $sceneCount,
                'clip_seconds'  => $clipSeconds,
                'aspect_ratio'  => $aspectRatio,
            ];

            $job->markSucceeded(['strategy' => $payload]);

            return response()->json(['job_id' => $job->id, 'strategy' => $payload]);
        } catch (\Throwable $e) {
            Log::error('studio.analyze_failed', ['error' => $e->getMessage()]);
            $job->markFailed($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Step 2 — generate the keyframe image for ONE scene.
     */
    public function generateImage(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'   => ['required', 'integer', 'exists:products,id'],
            'asset_id'     => ['nullable', 'integer', 'exists:product_assets,id'],
            'image'        => ['nullable', 'file', 'image', 'max:10240'],
            'scene_index'  => ['required', 'integer', 'min:1'],
            'prompt'       => ['required', 'string', 'min:10'],
            'aspect_ratio' => ['nullable', 'string', 'in:9:16,1:1,4:5,16:9'],
        ]);

        $product = Product::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('product_id'));

        [$base64, $mime] = $this->resolveImageInput($request, $product);

        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id'    => $request->user()->id,
            'kind'       => 'poster',
            'status'     => 'running',
            'model'      => config('services.viber.models.image'),
            'input'      => [
                'scene_index'  => $request->integer('scene_index'),
                'prompt'       => $request->string('prompt')->toString(),
                'aspect_ratio' => $request->string('aspect_ratio')->toString() ?: '9:16',
            ],
            'started_at' => now(),
        ]);

        try {
            $url = $this->ai->generateImage(
                imageBase64: $base64,
                mimeType: $mime,
                prompt: $request->string('prompt')->toString(),
                aspectRatio: $request->string('aspect_ratio')->toString() ?: '9:16',
            );

            $stored = $this->persistMedia($url, $product->id, "scene-{$request->integer('scene_index')}", 'png');
            $job->markSucceeded(['url' => $stored['url'], 'path' => $stored['path']]);

            return response()->json([
                'job_id'      => $job->id,
                'scene_index' => $request->integer('scene_index'),
                'image_url'   => $stored['url'],
            ]);
        } catch (\Throwable $e) {
            Log::error('studio.scene_image_failed', ['error' => $e->getMessage()]);
            $job->markFailed($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Step 3 — image-to-video for ONE scene. Frontend sends the approved keyframe
     * URL (the image generated for this scene), the per-scene video_prompt, and
     * the voiceover_script. The video model is instructed to lip-sync that line.
     */
    public function generateVideo(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'       => ['required', 'integer', 'exists:products,id'],
            'scene_index'      => ['required', 'integer', 'min:1'],
            'approved_image'   => ['required', 'string'],
            'prompt'           => ['required', 'string', 'min:10'],
            'voiceover_script' => ['nullable', 'string', 'max:600'],
            'aspect_ratio'     => ['nullable', 'string', 'in:9:16,1:1,4:5,16:9'],
            'clip_seconds'     => ['nullable', 'integer', 'min:4', 'max:10'],
        ]);

        $product = Product::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('product_id'));

        [$base64, $mime] = $this->approvedImageToBase64($request->string('approved_image')->toString());

        $sceneIndex = $request->integer('scene_index');
        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id'    => $request->user()->id,
            'kind'       => 'video',
            'status'     => 'running',
            'model'      => config('services.viber.models.video'),
            'input'      => [
                'scene_index'      => $sceneIndex,
                'prompt'           => $request->string('prompt')->toString(),
                'voiceover_script' => $request->string('voiceover_script')->toString(),
                'aspect_ratio'     => $request->string('aspect_ratio')->toString() ?: '9:16',
                'clip_seconds'     => $request->integer('clip_seconds') ?: 6,
            ],
            'started_at' => now(),
        ]);

        try {
            $videoUrl = $this->ai->generateVideo(
                imageBase64: $base64,
                mimeType: $mime,
                prompt: $request->string('prompt')->toString(),
                aspectRatio: $request->string('aspect_ratio')->toString() ?: '9:16',
                videoLength: $request->integer('clip_seconds') ?: 6,
                voiceoverScript: $request->string('voiceover_script')->toString() ?: null,
            );

            $stored = $this->persistMedia($videoUrl, $product->id, "scene-{$sceneIndex}-video", 'mp4');
            $job->markSucceeded(['url' => $stored['url'], 'path' => $stored['path']]);

            return response()->json([
                'job_id'      => $job->id,
                'scene_index' => $sceneIndex,
                'video_url'   => $stored['url'],
            ]);
        } catch (\Throwable $e) {
            Log::error('studio.scene_video_failed', ['error' => $e->getMessage()]);
            $job->markFailed($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function resolveImageInput(Request $request, Product $product): array
    {
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            return [base64_encode(file_get_contents($file->getRealPath())), $file->getMimeType()];
        }

        if ($id = $request->input('asset_id')) {
            $asset = ProductAsset::query()
                ->where('product_id', $product->id)
                ->findOrFail($id);
            $contents = Storage::disk($asset->disk)->get($asset->path);
            return [base64_encode($contents), $asset->mime];
        }

        $asset = $product->assets()->where('type', 'image')->latest()->first();
        if (! $asset) {
            abort(422, 'No product image available. Upload one first.');
        }
        $contents = Storage::disk($asset->disk)->get($asset->path);
        return [base64_encode($contents), $asset->mime];
    }

    private function productContext(Product $product): string
    {
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

    private function approvedImageToBase64(string $src): array
    {
        if (str_starts_with($src, 'data:')) {
            if (preg_match('/^data:([^;]+);base64,(.+)$/', $src, $m)) {
                return [$m[2], $m[1]];
            }
            abort(422, 'Bad data URI.');
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
            abort(422, 'Could not fetch approved image.');
        }
        return [base64_encode($bytes), 'image/png'];
    }

    private function persistMedia(string $src, int $productId, string $kind, string $ext): array
    {
        $name = sprintf('products/%d/%s-%s.%s', $productId, $kind, uniqid(), $ext);

        if (str_starts_with($src, 'data:')) {
            if (! preg_match('/^data:[^;]+;base64,(.+)$/', $src, $m)) {
                abort(500, 'Malformed media data URI.');
            }
            Storage::disk('public')->put($name, base64_decode($m[1]));
        } elseif (str_starts_with($src, 'http')) {
            $bytes = @file_get_contents($src);
            if ($bytes === false) {
                abort(500, 'Failed to fetch generated media.');
            }
            Storage::disk('public')->put($name, $bytes);
        } else {
            abort(500, 'Unknown media src.');
        }

        return [
            'path' => $name,
            'url'  => Storage::disk('public')->url($name),
        ];
    }
}
