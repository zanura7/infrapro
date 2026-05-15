<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductAsset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductAssetController extends Controller
{
    /** Whitelisted upload MIME types. */
    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'video/mp4',
    ];

    /** MIME types eligible for GD thumbnail generation (SVG and video skipped). */
    private const THUMBNAILABLE_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    private const THUMBNAIL_WIDTH = 300;

    public function store(Request $request, Product $product): RedirectResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        $request->validate([
            'files'   => ['required', 'array', 'min:1'],
            'files.*' => [
                'required',
                'file',
                'max:51200', // 50 MB
                'mimetypes:' . implode(',', self::ALLOWED_MIMES),
            ],
            'tag' => ['nullable', 'string', 'max:64'],
        ], [
            'files.*.mimetypes' => 'Only JPEG, PNG, WebP, SVG and MP4 files are allowed.',
        ]);

        foreach ((array) $request->file('files', []) as $file) {
            /** @var UploadedFile $file */
            $mime = $file->getMimeType();
            $path = $file->store("products/{$product->id}", 'public');
            $type = $this->detectType($mime);

            $thumbnailPath = null;
            $width = null;
            $height = null;

            if (in_array($mime, self::THUMBNAILABLE_MIMES, true)) {
                [$thumbnailPath, $width, $height] = $this->generateThumbnail(
                    Storage::disk('public')->path($path),
                    $product->id,
                    $mime,
                );
            }

            ProductAsset::create([
                'product_id'     => $product->id,
                'uploaded_by'    => $request->user()->id,
                'type'           => $type,
                'disk'           => 'public',
                'path'           => $path,
                'thumbnail_path' => $thumbnailPath,
                'mime'           => $mime,
                'size'           => $file->getSize(),
                'width'          => $width,
                'height'         => $height,
                'tag'            => $request->string('tag')->toString() ?: null,
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
        if (! $mime) {
            return 'document';
        }
        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }
        if (str_starts_with($mime, 'video/')) {
            return 'video';
        }
        return 'document';
    }

    /**
     * Generate a 300px-wide JPEG thumbnail using GD.
     *
     * @return array{0: ?string, 1: ?int, 2: ?int} [relative thumbnail path, source width, source height]
     */
    private function generateThumbnail(string $sourceAbsolutePath, int $productId, string $mime): array
    {
        if (! extension_loaded('gd')) {
            return [null, null, null];
        }

        $src = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($sourceAbsolutePath),
            'image/png'  => @imagecreatefrompng($sourceAbsolutePath),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($sourceAbsolutePath) : false,
            default      => false,
        };

        if ($src === false) {
            return [null, null, null];
        }

        $srcW = imagesx($src);
        $srcH = imagesy($src);

        // Only downscale; never upscale.
        $targetW = min(self::THUMBNAIL_WIDTH, $srcW);
        $targetH = (int) round($srcH * ($targetW / $srcW));

        $thumb = imagecreatetruecolor($targetW, $targetH);
        // Fill with white so PNG transparency flattens to a sensible background.
        $white = imagecolorallocate($thumb, 255, 255, 255);
        imagefilledrectangle($thumb, 0, 0, $targetW, $targetH, $white);
        imagecopyresampled($thumb, $src, 0, 0, 0, 0, $targetW, $targetH, $srcW, $srcH);

        $relativePath = "products/{$productId}/thumbs/" . Str::uuid()->toString() . '.jpg';
        $absolutePath = Storage::disk('public')->path($relativePath);

        if (! is_dir(dirname($absolutePath))) {
            mkdir(dirname($absolutePath), 0755, true);
        }

        $ok = imagejpeg($thumb, $absolutePath, 82);

        imagedestroy($src);
        imagedestroy($thumb);

        if (! $ok) {
            return [null, $srcW, $srcH];
        }

        return [$relativePath, $srcW, $srcH];
    }
}
