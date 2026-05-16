<?php

use App\Models\ContentJob;
use App\Models\Product;
use App\Models\User;

test('dashboard shows onboarding when user has 0 products and 0 jobs', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Dashboard')
        ->where('show_onboarding', true)
    );
});

test('dashboard hides onboarding and shows stats when user has products', function () {
    $user = User::factory()->create();
    Product::factory()->for($user)->create();

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Dashboard')
        ->where('show_onboarding', false)
        ->has('stats', fn ($stats) => $stats
            ->where('products', 1)
            ->etc()
        )
    );
});

test('dashboard recent jobs limited to 10', function () {
    $user = User::factory()->create();
    $product = Product::factory()->for($user)->create();
    ContentJob::factory()->count(15)->for($product)->for($user)->create();

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Dashboard')
        ->has('recent_jobs', 10)
    );
});
