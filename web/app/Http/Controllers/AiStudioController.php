<?php

namespace App\Http\Controllers;

use App\Models\ContentJob;
use App\Models\Product;
use App\Models\ProductAsset;
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
     * Wizard landing — pick product + reference image + output type.
     */
    public function index(Request $request): Response
    {
        $products = Product::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('archived_at')
            ->with(['assets' => fn ($q) => $q->where('type', 'image')->latest()->limit(1)])
            ->latest('updated_at')
            ->get();

        return Inertia::render('Studio/Index', [
            'products' => $products,
        ]);
    }

    /**
     * Step 1 — run vision analysis on a product image and store the strategy
     * as a ContentJob (kind=strategy).
     */
    public function analyze(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'asset_id' => ['nullable', 'integer', 'exists:product_assets,id'],
            'image' => ['nullable', 'file', 'image', 'max:10240'],
            'language' => ['nullable', 'string', 'in:indonesian,malay,english'],
            'model' => ['nullable', 'string', 'max:120'],
        ]);

        $product = Product::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('product_id'));

        [$base64, $mime] = $this->resolveImageInput($request, $product);

        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id' => $request->user()->id,
            'kind' => 'strategy',
            'status' => 'running',
            'model' => $request->string('model')->toString()
                ?: config('services.viber.models.text'),
            'input' => [
                'language' => $request->input('language', 'indonesian'),
                'has_image' => true,
                'context' => $this->productContext($product),
            ],
            'started_at' => now(),
        ]);

        try {
            $strategy = $this->ai->generateStrategy(
                imageBase64: $base64,
                mimeType: $mime,
                language: $request->input('language', 'indonesian'),
                productContext: $this->productContext($product),
                model: $request->input('model') ?: null,
            );
            $job->markSucceeded(['strategy' => $strategy->toArray()]);

            return response()->json([
                'job_id' => $job->id,
                'strategy' => $strategy->toArray(),
            ]);
        } catch (\Throwable $e) {
            Log::error('studio.analyze_failed', ['error' => $e->getMessage()]);
            $job->markFailed($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Step 2 — generate the ad image using the strategy's image_prompt
     * and the reference product image.
     */
    public function generateImage(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'asset_id' => ['nullable', 'integer', 'exists:product_assets,id'],
            'image' => ['nullable', 'file', 'image', 'max:10240'],
            'prompt' => ['required', 'string', 'min:10'],
            'aspect_ratio' => ['nullable', 'string', 'in:9:16,1:1,4:5,16:9'],
        ]);

        $product = Product::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('product_id'));

        [$base64, $mime] = $this->resolveImageInput($request, $product);

        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id' => $request->user()->id,
            'kind' => 'poster',
            'status' => 'running',
            'model' => config('services.viber.models.image'),
            'input' => [
                'prompt' => $request->string('prompt')->toString(),
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

            $stored = $this->persistMedia($url, $product->id, 'poster', 'png');
            $job->markSucceeded(['url' => $stored['url'], 'path' => $stored['path']]);

            return response()->json([
                'job_id' => $job->id,
                'image_url' => $stored['url'],
            ]);
        } catch (\Throwable $e) {
            Log::error('studio.image_failed', ['error' => $e->getMessage()]);
            $job->markFailed($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Step 3 — image-to-video. Caller passes the approved image URL/data URI
     * (returned by generateImage) and the strategy's video_prompt.
     */
    public function generateVideo(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'approved_image' => ['required', 'string'],
            'prompt' => ['required', 'string', 'min:10'],
            'aspect_ratio' => ['nullable', 'string', 'in:9:16,1:1,4:5,16:9'],
        ]);

        $product = Product::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('product_id'));

        [$base64, $mime] = $this->approvedImageToBase64($request->string('approved_image')->toString());

        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id' => $request->user()->id,
            'kind' => 'video',
            'status' => 'running',
            'model' => config('services.viber.models.video'),
            'input' => [
                'prompt' => $request->string('prompt')->toString(),
                'aspect_ratio' => $request->string('aspect_ratio')->toString() ?: '9:16',
            ],
            'started_at' => now(),
        ]);

        try {
            $videoUrl = $this->ai->generateVideo(
                imageBase64: $base64,
                mimeType: $mime,
                prompt: $request->string('prompt')->toString(),
                aspectRatio: $request->string('aspect_ratio')->toString() ?: '9:16',
            );

            $stored = $this->persistMedia($videoUrl, $product->id, 'video', 'mp4');
            $job->markSucceeded(['url' => $stored['url'], 'path' => $stored['path']]);

            return response()->json([
                'job_id' => $job->id,
                'video_url' => $stored['url'],
            ]);
        } catch (\Throwable $e) {
            Log::error('studio.video_failed', ['error' => $e->getMessage()]);
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

        // Fall back to the most recent image asset for this product
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
            $product->category ? "Category: {$product->category}" : null,
            $product->price !== null ? "Price: {$product->currency} {$product->price}" : null,
            $product->target_audience ? "Audience: {$product->target_audience}" : null,
            ! empty($product->usp) ? 'USP: ' . implode(', ', $product->usp) : null,
            $product->pain_point ? "Pain: {$product->pain_point}" : null,
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

        // Local /storage/... URL → read from disk
        $storagePrefix = '/storage/';
        $path = parse_url($src, PHP_URL_PATH);
        if ($path && str_starts_with($path, $storagePrefix)) {
            $relative = substr($path, strlen($storagePrefix));
            $contents = Storage::disk('public')->get($relative);
            $mime = Storage::disk('public')->mimeType($relative) ?: 'image/png';
            return [base64_encode($contents), $mime];
        }

        // Remote http(s) URL — fetch it
        $bytes = @file_get_contents($src);
        if ($bytes === false) {
            abort(422, 'Could not fetch approved image.');
        }
        return [base64_encode($bytes), 'image/png'];
    }

    /**
     * Save base64 or remote URL to public disk and return public URL.
     */
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
            'url' => Storage::disk('public')->url($name),
        ];
    }
}
