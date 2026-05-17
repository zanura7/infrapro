<?php

namespace App\Http\Controllers;

use App\Models\ScheduledPost;
use App\Models\SocialAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        // Get connected social accounts
        $accounts = SocialAccount::where('user_id', $user->id)->get();
        $connectedPlatforms = $accounts->pluck('provider')->unique()->values();

        // Get scheduled posts for calendar view
        $posts = ScheduledPost::where('user_id', $user->id)
            ->with('socialAccount')
            ->orderBy('scheduled_at')
            ->get()
            ->map(function ($post) {
                return [
                    'id' => $post->id,
                    'platform' => $post->socialAccount->provider ?? 'unknown',
                    'caption' => $post->content,
                    'media_url' => $post->media_urls[0] ?? null,
                    'scheduled_at' => $post->scheduled_at->toIso8601String(),
                    'status' => $post->status,
                ];
            });

        return Inertia::render('Schedule/Index', [
            'connectedPlatforms' => $connectedPlatforms,
            'scheduledPosts' => $posts,
            'socialAccounts' => $accounts->map(fn($a) => [
                'id' => $a->id,
                'platform' => $a->provider,
                'account_name' => $a->account_name,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'social_account_ids' => 'required|array|min:1',
            'social_account_ids.*' => 'exists:social_accounts,id',
            'content' => 'required|string|max:5000',
            'media_urls' => 'nullable|array',
            'media_urls.*' => 'string',
            'scheduled_at' => 'required|date|after:now',
        ]);

        $user = Auth::user();

        // Create a scheduled post for each selected social account
        $posts = [];
        foreach ($validated['social_account_ids'] as $accountId) {
            $account = SocialAccount::findOrFail($accountId);
            
            // Verify ownership
            if ($account->user_id !== $user->id) {
                abort(403);
            }

            $posts[] = ScheduledPost::create([
                'user_id' => $user->id,
                'social_account_id' => $accountId,
                'content' => $validated['content'],
                'media_urls' => $validated['media_urls'] ?? null,
                'scheduled_at' => $validated['scheduled_at'],
                'status' => 'pending',
            ]);
        }

        return back()->with('success', 'Post scheduled successfully');
    }

    public function update(Request $request, ScheduledPost $post)
    {
        $this->authorize('update', $post);

        $validated = $request->validate([
            'content' => 'sometimes|string|max:5000',
            'scheduled_at' => 'sometimes|date|after:now',
            'status' => 'sometimes|in:pending,publishing,published,failed',
        ]);

        $post->update($validated);

        return back()->with('success', 'Post updated successfully');
    }

    public function destroy(ScheduledPost $post)
    {
        $this->authorize('delete', $post);

        $post->delete();

        return back()->with('success', 'Scheduled post cancelled');
    }
}
