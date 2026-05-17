<?php

namespace App\Console\Commands;

use App\Jobs\PublishPostJob;
use App\Models\ScheduledPost;
use Illuminate\Console\Command;

class PublishScheduledPosts extends Command
{
    protected $signature = 'posts:publish';

    protected $description = 'Dispatch publishing jobs for scheduled posts that are due';

    public function handle(): int
    {
        $duePosts = ScheduledPost::query()
            ->where('status', 'pending')
            ->where('scheduled_at', '<=', now())
            ->get();

        if ($duePosts->isEmpty()) {
            $this->info('No posts due for publishing.');

            return self::SUCCESS;
        }

        $count = 0;
        foreach ($duePosts as $post) {
            PublishPostJob::dispatch($post->id);
            $count++;
        }

        $this->info("Dispatched {$count} post(s) for publishing.");

        return self::SUCCESS;
    }
}
