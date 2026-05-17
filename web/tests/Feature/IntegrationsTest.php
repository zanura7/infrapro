<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_integrations_routes_require_auth(): void
    {
        $response = $this->get('/integrations/tiktok/connect');
        $response->assertRedirect('/login');
    }

    public function test_integrations_connect_returns_placeholder(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/integrations/tiktok/connect');

        $response->assertStatus(501);
        $response->assertJson([
            'platform' => 'tiktok',
        ]);
    }

    public function test_integrations_disconnect_returns_placeholder(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/integrations/tiktok/disconnect');

        $response->assertStatus(501);
        $response->assertJson([
            'platform' => 'tiktok',
        ]);
    }
}
