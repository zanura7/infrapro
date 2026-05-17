<?php

namespace App\Jobs;

use App\Models\ScheduledPost;
use App\Services\Contracts\PublisherInterface;
use App\Services\Publishers\MetaPublisher;
use App\Services\Publishers\TikTokPublisher;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class PublishPostJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public readonly int $scheduledPostId
    ) {}

    public function handle(): void
    {
        $post = ScheduledPost::with('socialAccount')->findOrFail($this->scheduledPostId);

        if ($post->status !== 'pending') {
            Log::info('PublishPostJob: Skipping non-pending post', [
                'post_id' => $post->id,
                'status' => $post->status,
            ]);

            return;
        }

        $post->update(['status' => 'publishing']);

        $publisher = $this->resolvePublisher($post->socialAccount->provider);

        try {
            $result = $publisher->publish($post);

            if ($result->success) {
                $post->update([
                    'status' => 'published',
                    'published_at' => now(),
                    'response_metadata' => $result->metadata,
                ]);
            } else {
                $post->update([
                    'status' => 'failed',
                    'error_message' => $result->error,
                    'response_metadata' => $result->metadata,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('PublishPostJob: Exception during publish', [
                'post_id' => $post->id,
                'error' => $e->getMessage(),
            ]);

            $post->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function resolvePublisher(string $provider): PublisherInterface
    {
        return match ($provider) {
            'tiktok' => app(TikTokPublisher::class),
            'meta' => app(MetaPublisher::class),
            default => throw new \InvalidArgumentException("Unsupported platform: {$provider}"),
        };
    }
}
