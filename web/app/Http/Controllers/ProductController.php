<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Models\Product;
use App\Models\ProductVersion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $products = Product::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('archived_at')
            ->withCount(['assets', 'contentJobs'])
            ->latest('updated_at')
            ->get();

        return Inertia::render('Products/Index', [
            'products' => $products,
            'stats' => [
                'total' => $products->count(),
                'asset_count' => $products->sum('assets_count'),
                'content_count' => $products->sum('content_jobs_count'),
                'voice_count' => $products->whereNotNull('brand_voice')->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Products/New');
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;
        $data['current_version'] = 1;

        $product = DB::transaction(function () use ($data, $request) {
            $product = Product::create($data);
            ProductVersion::create([
                'product_id' => $product->id,
                'user_id' => $request->user()->id,
                'version' => 1,
                'snapshot' => $product->only([
                    'name', 'sku', 'category', 'price', 'currency',
                    'description', 'usp', 'target_audience',
                    'pain_point', 'brand_voice',
                ]),
                'change_summary' => 'Initial version',
            ]);
            return $product;
        });

        return redirect()
            ->route('products.show', $product)
            ->with('flash.success', "Product '{$product->name}' created.");
    }

    public function show(Product $product): Response
    {
        $this->authorizeOwner($product);

        $product->load([
            'assets' => fn ($q) => $q->latest(),
            'versions' => fn ($q) => $q->with('user:id,name')->limit(20),
            'contentJobs' => fn ($q) => $q->latest()->limit(20),
        ]);

        return Inertia::render('Products/Show', [
            'product' => $product,
        ]);
    }

    public function update(StoreProductRequest $request, Product $product): RedirectResponse
    {
        $this->authorizeOwner($product);

        $data = $request->validated();

        DB::transaction(function () use ($product, $data, $request) {
            $product->update($data);
            $product->increment('current_version');
            ProductVersion::create([
                'product_id' => $product->id,
                'user_id' => $request->user()->id,
                'version' => $product->current_version,
                'snapshot' => $product->only([
                    'name', 'sku', 'category', 'price', 'currency',
                    'description', 'usp', 'target_audience',
                    'pain_point', 'brand_voice',
                ]),
                'change_summary' => 'Updated by ' . $request->user()->name,
            ]);
        });

        return redirect()
            ->route('products.show', $product)
            ->with('flash.success', 'Product updated.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        $this->authorizeOwner($product);
        $product->update(['archived_at' => now()]);
        return redirect()
            ->route('products.index')
            ->with('flash.success', "Archived '{$product->name}'.");
    }

    private function authorizeOwner(Product $product): void
    {
        abort_unless($product->user_id === request()->user()->id, 403);
    }
}
