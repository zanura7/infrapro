<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateSceneImageJob;
use App\Jobs\GenerateSceneVideoJob;
use App\Jobs\StitchScenesJob;
use App\Models\ContentJob;
use App\Models\Product;
use App\Models\ProductAsset;
use App\Models\StudioTemplate;
use App\Services\Ai\ViberAi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class AiStudioController extends Controller
{
    public function __construct(private readonly ViberAi $ai) {}

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
     * Step 1 — build the 5-scene strategy from the chosen template +
     * product info. Text-only LLM call — no reference image needed at
     * this stage. The reference image is only used per-scene when the
     * user clicks "Generate Image".
     */
    public function analyze(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'    => ['required', 'integer', 'exists:products,id'],
            'template_slug' => ['required', 'string', 'exists:studio_templates,slug'],
            'language'      => ['nullable', 'string', 'in:indonesian,malay,english'],
            'scene_count'   => ['nullable', 'integer', 'min:3', 'max:8'],
            'clip_seconds'  => ['nullable', 'integer', 'min:4', 'max:10'],
            'aspect_ratio'  => ['nullable', 'string', 'in:9:16,1:1,4:5,16:9'],
        ]);

        $product = Product::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('product_id'));

        $template = StudioTemplate::where('slug', $request->string('template_slug')->toString())->first();

        $sceneCount  = (int) ($request->input('scene_count') ?: ($template->default_scene_count ?? 5));
        $clipSeconds = (int) ($request->input('clip_seconds') ?: ($template->default_clip_seconds ?? 6));
        $aspectRatio = $request->input('aspect_ratio') ?: ($template?->default_aspect_ratio ?? '9:16');
        $language    = $request->input('language', 'indonesian');

        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id'    => $request->user()->id,
            'kind'       => 'strategy',
            'status'     => 'running',
            'model'      => config('services.viber.models.text'),
            'input'      => [
                'language'      => $language,
                'template_slug' => $template?->slug,
                'scene_count'   => $sceneCount,
                'clip_seconds'  => $clipSeconds,
                'aspect_ratio'  => $aspectRatio,
            ],
            'started_at' => now(),
        ]);

        try {
            $strategy = $this->ai->generateStrategyFromTemplate(
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
     * Step 2 — dispatch scene image generation as a queued job.
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

        [$disk, $path, $mime] = $this->resolveImageInput($request, $product);

        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id'    => $request->user()->id,
            'kind'       => 'poster',
            'status'     => 'queued',
            'model'      => config('services.viber.models.image'),
            'input'      => [
                'scene_index'  => $request->integer('scene_index'),
                'prompt'       => $request->string('prompt')->toString(),
                'aspect_ratio' => $request->string('aspect_ratio')->toString() ?: '9:16',
                'image_disk'   => $disk,
                'image_path'   => $path,
                'image_mime'   => $mime,
            ],
        ]);

        GenerateSceneImageJob::dispatch($job->id);

        return response()->json([
            'job_id' => $job->id,
            'scene_index' => $request->integer('scene_index'),
            'status' => 'queued',
        ], 202);
    }

    /**
     * Step 3 — dispatch scene video generation as a queued job.
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

        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id'    => $request->user()->id,
            'kind'       => 'video',
            'status'     => 'queued',
            'model'      => config('services.viber.models.video'),
            'input'      => [
                'scene_index'      => $request->integer('scene_index'),
                'approved_image'   => $request->string('approved_image')->toString(),
                'prompt'           => $request->string('prompt')->toString(),
                'voiceover_script' => $request->string('voiceover_script')->toString(),
                'aspect_ratio'     => $request->string('aspect_ratio')->toString() ?: '9:16',
                'clip_seconds'     => $request->integer('clip_seconds') ?: 6,
            ],
        ]);

        GenerateSceneVideoJob::dispatch($job->id);

        return response()->json([
            'job_id' => $job->id,
            'scene_index' => $request->integer('scene_index'),
            'status' => 'queued',
        ], 202);
    }

    /**
     * Step 4 — stitch generated scene clips into one video.
     */
    public function stitch(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'clip_urls'  => ['required', 'array', 'min:2'],
            'clip_urls.*'=> ['required', 'string'],
        ]);

        $product = Product::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('product_id'));

        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id'    => $request->user()->id,
            'kind'       => 'stitch',
            'status'     => 'queued',
            'model'      => 'ffmpeg',
            'input'      => ['clip_urls' => $request->input('clip_urls')],
        ]);

        StitchScenesJob::dispatch($job->id);

        return response()->json(['job_id' => $job->id, 'status' => 'queued'], 202);
    }

    /**
     * Polling endpoint for any ContentJob this user owns.
     */
    public function jobStatus(Request $request, int $id): JsonResponse
    {
        $job = ContentJob::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json([
            'id'           => $job->id,
            'kind'         => $job->kind,
            'status'       => $job->status,
            'output'       => $job->output,
            'error'        => $job->error,
            'duration_ms'  => $job->duration_ms,
            'started_at'   => $job->started_at,
            'finished_at'  => $job->finished_at,
        ]);
    }

    // ------------------------------------------------------------------
    // Image input helpers
    // ------------------------------------------------------------------

    /**
     * Returns [disk, relativePath, mime] — always pointing at a real file the
     * job can read later.
     */
    private function resolveImageInput(Request $request, Product $product): array
    {
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $path = $file->store("temp/inputs/{$product->id}", 'local');
            return ['local', $path, $file->getMimeType()];
        }

        if ($id = $request->input('asset_id')) {
            $asset = ProductAsset::query()
                ->where('product_id', $product->id)
                ->findOrFail($id);
            return [$asset->disk, $asset->path, $asset->mime];
        }

        $asset = $product->assets()->where('type', 'image')->latest()->first();
        if (! $asset) {
            abort(422, 'No product image available. Upload one first.');
        }
        return [$asset->disk, $asset->path, $asset->mime];
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
}
