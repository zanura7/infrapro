<?php

use App\Http\Controllers\AiStudioController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProductAssetController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    // Products
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    Route::get('/products/new', [ProductController::class, 'create'])->name('products.create');
    Route::post('/products', [ProductController::class, 'store'])->name('products.store');
    Route::get('/products/{product:slug}', [ProductController::class, 'show'])->name('products.show');
    Route::put('/products/{product:slug}', [ProductController::class, 'update'])->name('products.update');
    Route::delete('/products/{product:slug}', [ProductController::class, 'destroy'])->name('products.destroy');

    // Product assets
    Route::post('/products/{product:slug}/assets', [ProductAssetController::class, 'store'])->name('product-assets.store');
    Route::delete('/products/{product:slug}/assets/{asset}', [ProductAssetController::class, 'destroy'])->name('product-assets.destroy');

    // AI Content Studio
    Route::get('/studio', [AiStudioController::class, 'index'])->name('studio.index');
    Route::post('/studio/analyze', [AiStudioController::class, 'analyze'])->name('studio.analyze');
    Route::post('/studio/generate-image', [AiStudioController::class, 'generateImage'])->name('studio.image');
    Route::post('/studio/generate-video', [AiStudioController::class, 'generateVideo'])->name('studio.video');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
