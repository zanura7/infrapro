<?php

use App\Models\Product;
use App\Models\ProductVersion;
use App\Models\User;

test('restoring a version updates only whitelisted fields', function () {
    $user = User::factory()->create();
    $product = Product::factory()->for($user)->create([
        'name' => 'Current Name',
        'current_version' => 2,
    ]);

    $version = ProductVersion::factory()->create([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'version' => 1,
        'snapshot' => [
            'name' => 'Old Name',
            'description' => 'Old Description',
            'category' => 'Skincare',
            'price' => 10,
            'usp' => ['Old USP'],
            'target_audience' => 'Old Audience',
            'brand_voice' => ['tone' => ['Old']],
        ],
    ]);

    $response = $this->actingAs($user)->put(
        route('product-versions.restore', ['product' => $product, 'version' => $version])
    );

    $response->assertRedirect(route('products.show', $product));
    
    $product->refresh();
    expect($product->name)->toBe('Old Name');
    expect($product->description)->toBe('Old Description');
    expect($product->current_version)->toBe(3); // Bumped
});

test('restoring ignores malicious fields in snapshot', function () {
    $user = User::factory()->create();
    $intruderId = 999;
    
    $product = Product::factory()->for($user)->create([
        'name' => 'Legit',
        'slug' => 'legit-slug',
    ]);

    $version = ProductVersion::factory()->create([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'version' => 1,
        'snapshot' => [
            'name' => 'Old Name',
            'user_id' => $intruderId, // Malicious
            'slug' => 'hacked-slug',  // Malicious
        ],
    ]);

    $this->actingAs($user)->put(
        route('product-versions.restore', ['product' => $product, 'version' => $version])
    );

    $product->refresh();
    expect($product->name)->toBe('Old Name');
    expect($product->user_id)->toBe($user->id); // Unchanged
    expect($product->slug)->toBe('legit-slug'); // Unchanged
});
