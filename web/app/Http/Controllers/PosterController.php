<?php

namespace App\Http\Controllers;

use App\Jobs\GeneratePosterJob;
use App\Models\ContentJob;
use App\Models\PosterTemplate;
use App\Models\Product;
use App\Models\ProductAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosterController extends Controller
{
    public function index(Request $request): Response
    {
        $products = Product::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('archived_at')
            ->with(['assets' => fn ($q) => $q->where('type', 'image')->latest()->limit(3)])
            ->latest('updated_at')
            ->get();

        $templates = PosterTemplate::active()->get();

        return Inertia::render('Poster/Index', [
            'products'  => $products,
            'templates' => $templates,
        ]);
    }

    /**
     * Generate a poster: substitute placeholders, dispatch async job.
     */
    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'    => ['required', 'integer', 'exists:products,id'],
            'template_slug' => ['required', 'string', 'exists:poster_templates,slug'],
            'fields'        => ['required', 'array'],
            'asset_id'      => ['nullable', 'integer', 'exists:product_assets,id'],
            'image'         => ['nullable', 'file', 'image', 'max:10240'],
            'aspect_ratio'  => ['nullable', 'string', 'in:9:16,1:1,4:5,16:9'],
        ]);

        $product = Product::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('product_id'));

        $template = PosterTemplate::where('slug', $request->string('template_slug')->toString())->firstOrFail();

        $aspectRatio = $request->input('aspect_ratio') ?: $template->default_aspect_ratio;

        // Substitute placeholders in the prompt
        $fieldValues = (array) $request->input('fields', []);
        $finalPrompt = $this->substitute($template, $product, $fieldValues);

        // Resolve optional reference image
        [$disk, $path, $mime] = $this->resolveImageInput($request, $product);

        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id'    => $request->user()->id,
            'kind'       => 'poster',
            'status'     => 'queued',
            'model'      => config('services.viber.models.image'),
            'input'      => [
                'template_slug'    => $template->slug,
                'prompt'           => $finalPrompt,
                'negative_prompt'  => $template->negative_prompt,
                'aspect_ratio'     => $aspectRatio,
                'field_values'     => $fieldValues,
                'image_disk'       => $disk,
                'image_path'       => $path,
                'image_mime'       => $mime,
            ],
        ]);

        GeneratePosterJob::dispatch($job->id);

        return response()->json([
            'job_id' => $job->id,
            'status' => 'queued',
        ], 202);
    }

    /**
     * Polling endpoint (mirrors AiStudioController::jobStatus shape).
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
    // Helpers
    // ------------------------------------------------------------------

    private function substitute(PosterTemplate $template, Product $product, array $values): string
    {
        $prompt = $template->prompt_template;

        // Always substitute product name tokens
        $prompt = str_replace(['[NAMA PRODUK]', '[PRODUCT NAME]'], $product->name, $prompt);

        // Substitute fields by their token
        foreach ($template->fields as $field) {
            $token = $field['token'] ?? null;
            $key = $field['key'] ?? null;
            if (! $token || ! $key) continue;
            $val = (string) ($values[$key] ?? '');
            $prompt = str_replace($token, $val, $prompt);
        }

        return $prompt;
    }

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

        // Poster gen works without reference image (pure text-to-image)
        return [null, null, null];
    }
}
