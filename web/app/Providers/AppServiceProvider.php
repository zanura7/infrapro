<?php

namespace App\Providers;

use App\Models\User;
use App\Services\Ai\ViberAi;
use App\Services\Ai\ViberAiVideoProvider;
use App\Services\Contracts\AiProviderInterface;
use App\Services\Contracts\ImageProviderInterface;
use App\Services\Contracts\VideoProviderInterface;
use App\Services\Publishers\MetaPublisher;
use App\Services\Publishers\TikTokPublisher;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ViberAi::class, fn () => ViberAi::fromConfig());
        $this->app->bind(AiProviderInterface::class, ViberAi::class);
        $this->app->bind(ImageProviderInterface::class, ViberAi::class);

        $this->app->singleton(ViberAiVideoProvider::class, fn () => ViberAiVideoProvider::fromConfig());
        $this->app->bind(VideoProviderInterface::class, ViberAiVideoProvider::class);

        // Register publishers
        $this->app->singleton(TikTokPublisher::class);
        $this->app->singleton(MetaPublisher::class);
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Gate::define('admin', fn (User $user) => $user->hasRole('admin') || $user->role === 'admin');
    }
}
