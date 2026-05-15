<?php

namespace App\Providers;

use App\Models\User;
use App\Services\Ai\ViberAi;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ViberAi::class, fn () => ViberAi::fromConfig());
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Gate::define('admin', fn (User $user) => $user->hasRole('admin') || $user->role === 'admin');
    }
}
