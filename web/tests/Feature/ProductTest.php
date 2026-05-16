<?php

use App\Models\Product;
use App\Models\User;

test('user can create a product', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/products', [
        'name' => 'Acme Serum',
        'category' => 'Personal Care · Skincare',
        'price' => 99.50,
        'currency' => 'MYR',
        'description' => 'A great serum.',
    ]);

    $product = Product::where('name', 'Acme Serum')->firstOrFail();

    $response->assertRedirect(route('products.show', $product));
    expect($product->user_id)->toBe($user->id);
    expect($product->slug)->not->toBeEmpty();
    expect($product->current_version)->toBe(1);
    expect($product->versions()->count())->toBe(1);
});

test('user can list only their own products', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    Product::factory()->for($user)->create(['name' => 'Mine A']);
    Product::factory()->for($user)->create(['name' => 'Mine B']);
    Product::factory()->for($other)->create(['name' => 'Other']);

    $response = $this->actingAs($user)->get('/products');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Products/Index')
        ->has('products', 2)
        ->where('products.0.user_id', $user->id)
        ->where('products.1.user_id', $user->id)
    );
});

test('user can update their own product', function () {
    $user = User::factory()->create();
    $product = Product::factory()->for($user)->create(['name' => 'Old Name']);

    $response = $this->actingAs($user)->put(route('products.update', $product), [
        'name' => 'New Name',
        'description' => 'Updated.',
    ]);

    $response->assertRedirect(route('products.show', $product));
    expect($product->fresh()->name)->toBe('New Name');
    expect($product->fresh()->current_version)->toBe(2);
});

test('user cannot update another user product', function () {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $product = Product::factory()->for($owner)->create(['name' => 'Owned']);

    $response = $this->actingAs($intruder)->put(route('products.update', $product), [
        'name' => 'Hijacked',
    ]);

    $response->assertStatus(403);
    expect($product->fresh()->name)->toBe('Owned');
});

test('user can soft-archive their product', function () {
    $user = User::factory()->create();
    $product = Product::factory()->for($user)->create();

    $response = $this->actingAs($user)->delete(route('products.destroy', $product));

    $response->assertRedirect(route('products.index'));
    expect($product->fresh()->archived_at)->not->toBeNull();
});
