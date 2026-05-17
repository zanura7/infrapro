<?php

use App\Http\Controllers\AiStudioController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IntegrationsController;
use App\Http\Controllers\PosterController;
use App\Http\Controllers\ProductAssetController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductVersionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingsController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route(Auth::check() ? 'dashboard' : 'login');
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

    // Product versions
    Route::put('/products/{product:slug}/versions/{version}/restore', [ProductVersionController::class, 'restore'])->name('product-versions.restore');

    // Strategy
    Route::post('/products/{product:slug}/strategy', [ProductController::class, 'generateStrategy'])->name('products.strategy.generate');

    // AI Content Studio
    Route::get('/studio', [AiStudioController::class, 'index'])->name('studio.index');
    Route::post('/studio/analyze', [AiStudioController::class, 'analyze'])->name('studio.analyze');
    Route::post('/studio/generate-image', [AiStudioController::class, 'generateImage'])->name('studio.image');
    Route::post('/studio/generate-video', [AiStudioController::class, 'generateVideo'])->name('studio.video');
    Route::post('/studio/stitch', [AiStudioController::class, 'stitch'])->name('studio.stitch');
    Route::get('/studio/jobs/{id}', [AiStudioController::class, 'jobStatus'])->name('studio.job');

    // Image Poster — single-image promotional banner generator
    Route::get('/poster', [PosterController::class, 'index'])->name('poster.index');
    Route::post('/poster/generate', [PosterController::class, 'generate'])->name('poster.generate');
    Route::get('/poster/jobs/{id}', [PosterController::class, 'jobStatus'])->name('poster.job');
    Route::get('/poster/jobs/{id}/batch', [PosterController::class, 'batchStatus'])->name('poster.batch');
    Route::get('/poster/download/{id}', [PosterController::class, 'download'])->name('poster.download');

    // Settings
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');

    // Integrations
    Route::get('/integrations/{platform}/connect', [IntegrationsController::class, 'connect'])->name('integrations.connect');
    Route::get('/integrations/{platform}/callback', [IntegrationsController::class, 'callback'])->name('integrations.callback');
    Route::post('/integrations/{platform}/disconnect', [IntegrationsController::class, 'disconnect'])->name('integrations.disconnect');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
