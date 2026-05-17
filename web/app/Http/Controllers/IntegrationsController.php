<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Log;

class IntegrationsController extends Controller
{
    /**
     * Map platform param to Socialite driver name.
     */
    protected function getDriverName(string $platform): string
    {
        return $platform === 'meta' ? 'facebook' : $platform;
    }

    public function connect(Request $request, string $platform)
    {
        $driver = $this->getDriverName($platform);

        try {
            $socialite = Socialite::driver($driver);
            
            // Add required scopes
            if ($platform === 'meta') {
                $socialite->scopes(['pages_manage_posts', 'pages_read_engagement', 'pages_show_list']);
            } elseif ($platform === 'tiktok') {
                $socialite->scopes(['video.publish', 'video.upload']);
            }

            return $socialite->redirect();
        } catch (\InvalidArgumentException $e) {
            return redirect()->route('settings.index')->with('error', "Platform {$platform} is not supported.");
        }
    }

    public function callback(Request $request, string $platform)
    {
        $driver = $this->getDriverName($platform);

        try {
            $socialUser = Socialite::driver($driver)->user();
            
            // Map the platform name properly (e.g. facebook -> meta in our DB)
            $dbPlatform = $platform === 'facebook' ? 'meta' : $platform;

            SocialAccount::updateOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'platform' => $dbPlatform,
                    'platform_user_id' => $socialUser->getId(),
                ],
                [
                    'token' => $socialUser->token,
                    'refresh_token' => $socialUser->refreshToken,
                    'expires_at' => property_exists($socialUser, 'expiresIn') ? now()->addSeconds($socialUser->expiresIn) : null,
                    'metadata' => [
                        'nickname' => $socialUser->getNickname(),
                        'name' => $socialUser->getName(),
                        'email' => $socialUser->getEmail(),
                        'avatar' => $socialUser->getAvatar(),
                    ],
                ]
            );

            return redirect()->route('settings.index')->with('status', ucfirst($dbPlatform) . ' connected successfully!');
        } catch (\Exception $e) {
            Log::error("OAuth callback error for {$platform}: " . $e->getMessage());
            return redirect()->route('settings.index')->with('error', "Failed to connect to {$platform}.");
        }
    }

    public function disconnect(Request $request, string $platform)
    {
        $dbPlatform = $platform === 'facebook' ? 'meta' : $platform;

        SocialAccount::where('user_id', $request->user()->id)
            ->where('platform', $dbPlatform)
            ->delete();

        return redirect()->route('settings.index')->with('status', ucfirst($dbPlatform) . ' disconnected.');
    }
}
