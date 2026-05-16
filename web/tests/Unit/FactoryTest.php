<?php

use App\Models\ContentJob;
use App\Models\Product;
use App\Models\ProductAsset;
use Database\Seeders\RoleSeeder;
use Spatie\Permission\Models\Role;

test('Product factory creates a valid product', function () {
    $product = Product::factory()->create();

    expect($product->id)->toBeInt();
    expect($product->name)->not->toBeEmpty();
    expect($product->slug)->not->toBeEmpty();
    expect($product->user_id)->toBeInt();
});

test('ProductAsset factory creates a valid asset with relationship', function () {
    $asset = ProductAsset::factory()->create();

    expect($asset->id)->toBeInt();
    expect($asset->product_id)->toBeInt();
    expect($asset->product)->toBeInstanceOf(Product::class);
    expect($asset->uploader)->not->toBeNull();
});

test('ContentJob factory creates a valid job', function () {
    $job = ContentJob::factory()->create();

    expect($job->id)->toBeInt();
    expect($job->product_id)->toBeInt();
    expect($job->user_id)->toBeInt();
    expect($job->kind)->not->toBeEmpty();
    expect($job->status)->toBeIn(['queued', 'running', 'succeeded', 'failed']);
});

test('RoleSeeder creates admin and member roles', function () {
    (new RoleSeeder())->run();

    expect(Role::where('name', 'admin')->exists())->toBeTrue();
    expect(Role::where('name', 'member')->exists())->toBeTrue();
});
