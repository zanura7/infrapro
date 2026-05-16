<?php

namespace App\Http\Controllers;

use App\Jobs\GeneratePosterJob;
use App\Models\ContentJob;
use App\Models\PosterTemplate;
use App\Models\Product;
use App\Models\ProductAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use ZipArchive;

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
     * Generate a poster: substitute placeholders, dispatch async job(s).
     *
     * When aspect_ratio is omitted or "all", dispatches 3 jobs (1:1, 4:5, 9:16)
     * grouped under a parent poster_batch ContentJob.
     */
    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'    => ['required', 'integer', 'exists:products,id'],
            'template_slug' => ['required', 'string', 'exists:poster_templates,slug'],
            'fields'        => ['required', 'array'],
            'asset_id'      => ['nullable', 'integer', 'exists:product_assets,id'],
            'image'         => ['nullable', 'file', 'image', 'max:10240'],
            'aspect_ratio'  => ['nullable', 'string', 'in:9:16,1:1,4:5,16:9,all'],
        ]);

        $product = Product::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('product_id'));

        $template = PosterTemplate::where('slug', $request->string('template_slug')->toString())->firstOrFail();

        $requestedRatio = $request->input('aspect_ratio');
        $isBatch = ! $requestedRatio || $requestedRatio === 'all';

        // Substitute placeholders in the prompt
        $fieldValues = (array) $request->input('fields', []);
        $finalPrompt = $this->substitute($template, $product, $fieldValues);

        // Resolve optional reference image
        [$disk, $path, $mime] = $this->resolveImageInput($request, $product);

        if ($isBatch) {
            return $this->dispatchBatch(
                $request, $product, $template, $finalPrompt, $fieldValues, $disk, $path, $mime
            );
        }

        // Single-size flow (unchanged behaviour)
        $aspectRatio = $requestedRatio ?: ($template->default_aspect_ratio ?? '4:5');
        $job = ContentJob::create([
            'product_id' => $product->id,
            'user_id'    => $request->user()->id,
            'kind'       => 'poster',
            'status'     => 'queued',
            'model'      => config('services.viber.models.image'),
            'input'      => [
                'template_slug'   => $template->slug,
                'prompt'          => $finalPrompt,
                'negative_prompt' => $template->negative_prompt,
                'aspect_ratio'    => $aspectRatio,
                'field_values'    => $fieldValues,
                'image_disk'      => $disk,
                'image_path'      => $path,
                'image_mime'      => $mime,
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

    /**
     * Batch polling: returns status of all 3 child jobs in a poster_batch.
     */
    public function batchStatus(Request $request, int $id): JsonResponse
    {
        $batch = ContentJob::query()
            ->where('user_id', $request->user()->id)
            ->where('kind', 'poster_batch')
            ->findOrFail($id);

        $children = $batch->children()
            ->select(['id', 'kind', 'status', 'output', 'error', 'duration_ms', 'started_at', 'finished_at', 'input'])
            ->get()
            ->map(fn ($c) => [
                'id'           => $c->id,
                'aspect_ratio' => data_get($c->input, 'aspect_ratio'),
                'status'       => $c->status,
                'output'       => $c->output,
                'error'        => $c->error,
                'duration_ms'  => $c->duration_ms,
                'started_at'   => $c->started_at,
                'finished_at'  => $c->finished_at,
            ]);

        $statuses = $children->pluck('status');
        $batchStatus = match (true) {
            $statuses->contains('running')                   => 'running',
            $statuses->every(fn ($s) => $s === 'succeeded')  => 'succeeded',
            $statuses->contains('failed')                    => 'partial',
            default                                          => 'queued',
        };

        return response()->json([
            'batch_id' => $batch->id,
            'status'   => $batchStatus,
            'children' => $children,
        ]);
    }

    /**
     * Download a poster or a ZIP of all 3 batch images.
     *
     * GET /poster/download/{job_id}
     *   - single job:  stream or redirect the stored image
     *   - batch job:   build and stream a ZIP of all succeeded children
     */
    public function download(Request $request, int $id)
    {
        $job = ContentJob::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        if ($job->kind === 'poster_batch') {
            return $this->streamBatchZip($job, $request->user());
        }

        // Single poster
        $path = data_get($job->output, 'path');
        if (! $path || ! Storage::disk('public')->exists($path)) {
            abort(404, 'Poster not ready or not found.');
        }

        $filename = basename($path);
        return response()->streamDownload(function () use ($path) {
            echo Storage::disk('public')->get($path);
        }, $filename, ['Content-Type' => 'image/png']);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function dispatchBatch(
        Request $request,
        Product $product,
        PosterTemplate $template,
        string $finalPrompt,
        array $fieldValues,
        ?string $disk,
        ?string $path,
        ?string $mime,
    ): JsonResponse {
        $ratios = ['1:1', '4:5', '9:16'];

        $batch = ContentJob::create([
            'product_id' => $product->id,
            'user_id'    => $request->user()->id,
            'kind'       => 'poster_batch',
            'status'     => 'queued',
            'model'      => config('services.viber.models.image'),
            'input'      => [
                'template_slug' => $template->slug,
                'prompt'        => $finalPrompt,
                'field_values'  => $fieldValues,
                'ratios'        => $ratios,
            ],
        ]);

        foreach ($ratios as $ratio) {
            $child = ContentJob::create([
                'product_id' => $product->id,
                'user_id'    => $request->user()->id,
                'parent_id'  => $batch->id,
                'kind'       => 'poster',
                'status'     => 'queued',
                'model'      => config('services.viber.models.image'),
                'input'      => [
                    'template_slug'   => $template->slug,
                    'prompt'          => $finalPrompt,
                    'negative_prompt' => $template->negative_prompt,
                    'aspect_ratio'    => $ratio,
                    'field_values'    => $fieldValues,
                    'image_disk'      => $disk,
                    'image_path'      => $path,
                    'image_mime'      => $mime,
                ],
            ]);

            GeneratePosterJob::dispatch($child->id);
        }

        return response()->json([
            'batch_id' => $batch->id,
            'status'   => 'queued',
            'sizes'    => $ratios,
        ], 202);
    }

    private function streamBatchZip(ContentJob $batch, $user)
    {
        $children = $batch->children()->get();

        $succeeded = $children->filter(fn ($c) => $c->status === 'succeeded' && ! empty($c->output['path']));

        if ($succeeded->isEmpty()) {
            abort(422, 'No completed images in this batch yet.');
        }

        $slug = optional($batch->product)->slug ?? 'product';
        $timestamp = now()->format('Ymd_His');
        $zipFilename = "poster_{$slug}_{$timestamp}.zip";
        $tmpZip = sys_get_temp_dir() . '/' . uniqid('poster_zip_', true) . '.zip';

        $zip = new ZipArchive();
        if ($zip->open($tmpZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Could not create ZIP archive.');
        }

        foreach ($succeeded as $child) {
            $filePath = $child->output['path'];
            $ratio = str_replace(':', 'x', data_get($child->input, 'aspect_ratio', 'unknown'));
            $entryName = "poster_{$ratio}.png";

            if (Storage::disk('public')->exists($filePath)) {
                $zip->addFromString($entryName, Storage::disk('public')->get($filePath));
            }
        }

        $zip->close();

        return response()->streamDownload(function () use ($tmpZip) {
            readfile($tmpZip);
            @unlink($tmpZip);
        }, $zipFilename, [
            'Content-Type'        => 'application/zip',
            'Content-Disposition' => 'attachment; filename="' . $zipFilename . '"',
        ]);
    }

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
