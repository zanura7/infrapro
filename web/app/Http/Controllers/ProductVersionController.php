<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductVersion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductVersionController extends Controller
{
    /**
     * Restore a product to a previous version's snapshot.
     * Creates a new version record reflecting the restore.
     */
    public function restore(Request $request, Product $product, ProductVersion $version): RedirectResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);
        abort_unless($version->product_id === $product->id, 404);

        DB::transaction(function () use ($product, $version, $request) {
            $snapshot = $version->snapshot;

            $product->update($snapshot);
            $product->increment('current_version');

            ProductVersion::create([
                'product_id'     => $product->id,
                'user_id'        => $request->user()->id,
                'version'        => $product->current_version,
                'snapshot'       => $snapshot,
                'change_summary' => "Restored from version {$version->version}",
            ]);
        });

        return redirect()
            ->route('products.show', $product)
            ->with('flash.success', "Restored to version {$version->version}.");
    }
}
