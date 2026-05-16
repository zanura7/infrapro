<?php

namespace App\Http\Controllers;

use App\Models\ContentJob;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $userId = $request->user()->id;

        $products = Product::where('user_id', $userId)->whereNull('archived_at')->count();
        $jobs = ContentJob::where('user_id', $userId);

        $totalContent = (clone $jobs)->where('kind', '!=', 'strategy')->count();
        $thisMonthSpend = (clone $jobs)
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->sum('cost');

        $recent = ContentJob::where('user_id', $userId)
            ->with('product:id,name')
            ->latest()
            ->limit(10)
            ->get();

        $showOnboarding = $products === 0 && $totalContent === 0;

        return Inertia::render('Dashboard', [
            'stats' => [
                'products' => $products,
                'content' => $totalContent,
                'spend' => round((float) $thisMonthSpend, 2),
            ],
            'recent_jobs' => $recent,
            'show_onboarding' => $showOnboarding,
        ]);
    }
}
