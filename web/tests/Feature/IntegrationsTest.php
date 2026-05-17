<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\SocialAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Tests\TestCase;

class IntegrationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_integrations_routes_require_auth(): void
    {
        $response = $this->get('/integrations/tiktok/connect');
        $response->assertRedirect('/login');
    }

    public function test_integrations_connect_redirects_to_provider(): void
    {
        $user = User::factory()->create();

        // Mock socialite
        $provider = \Mockery::mock('Laravel\Socialite\Contracts\Provider');
        $provider->shouldReceive('scopes')->andReturnSelf();
        $provider->shouldReceive('redirect')->andReturn(redirect('https://provider.com/auth'));
        
        Socialite::shouldReceive('driver')->with('tiktok')->andReturn($provider);

        $response = $this->actingAs($user)->get('/integrations/tiktok/connect');

        $response->assertRedirect('https://provider.com/auth');
    }

    public function test_integrations_connect_handles_invalid_platform(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/integrations/invalid_platform/connect');

        // Laravel Socialite throws InvalidArgumentException which we catch and redirect
        $response->assertRedirect(route('settings.index'));
        $response->assertSessionHas('error');
    }

    public function test_integrations_disconnect_removes_account(): void
    {
        $user = User::factory()->create();
        
        SocialAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'platform_user_id' => '12345',
            'token' => 'fake_token'
        ]);

        $this->assertDatabaseHas('social_accounts', [
            'user_id' => $user->id,
            'platform' => 'tiktok',
        ]);

        $response = $this->actingAs($user)->post('/integrations/tiktok/disconnect');

        $response->assertRedirect(route('settings.index'));
        
        $this->assertDatabaseMissing('social_accounts', [
            'user_id' => $user->id,
            'platform' => 'tiktok',
        ]);
    }
}
