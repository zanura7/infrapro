<?php

namespace App\Providers;

use App\Services\Ai\ViberAi;
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
    }
}
