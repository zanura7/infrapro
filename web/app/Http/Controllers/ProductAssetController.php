<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductAsset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductAssetController extends Controller
{
    public function store(Request $request, Product $product): RedirectResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        $request->validate([
            'files.*' => ['required', 'file', 'max:51200'], // 50 MB
            'tag' => ['nullable', 'string', 'max:64'],
        ]);

        foreach ((array) $request->file('files', []) as $file) {
            $path = $file->store("products/{$product->id}", 'public');
            $type = $this->detectType($file->getMimeType());

            ProductAsset::create([
                'product_id' => $product->id,
                'uploaded_by' => $request->user()->id,
                'type' => $type,
                'disk' => 'public',
                'path' => $path,
                'mime' => $file->getMimeType(),
                'size' => $file->getSize(),
                'tag' => $request->string('tag')->toString() ?: null,
            ]);
        }

        return back()->with('flash.success', 'Assets uploaded.');
    }

    public function destroy(Request $request, Product $product, ProductAsset $asset): RedirectResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);
        abort_unless($asset->product_id === $product->id, 404);

        Storage::disk($asset->disk)->delete($asset->path);
        if ($asset->thumbnail_path) {
            Storage::disk($asset->disk)->delete($asset->thumbnail_path);
        }
        $asset->delete();

        return back()->with('flash.success', 'Asset removed.');
    }

    private function detectType(?string $mime): string
    {
        if (! $mime) return 'document';
        if (str_starts_with($mime, 'image/')) return 'image';
        if (str_starts_with($mime, 'video/')) return 'video';
        return 'document';
    }
}
