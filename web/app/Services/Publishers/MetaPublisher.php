<?php

namespace App\Services\Publishers;

use App\Models\ScheduledPost;
use App\Models\SocialAccount;
use App\Services\Contracts\PublisherInterface;
use App\Services\Contracts\PublishResult;
use Illuminate\Support\Facades\Log;

class MetaPublisher implements PublisherInterface
{
    public function publish(ScheduledPost $post): PublishResult
    {
        Log::info('MetaPublisher: Publishing post', [
            'post_id' => $post->id,
            'account_id' => $post->social_account_id,
            'destination' => $this->destination($post->socialAccount),
        ]);

        return PublishResult::success([
            'platform' => 'meta',
            'destination' => $this->destination($post->socialAccount),
            'post_id' => 'meta_stub_' . time(),
            'published_at' => now()->toIso8601String(),
        ]);
    }

    public function validateToken(SocialAccount $account): bool
    {
        Log::info('MetaPublisher: Validating token', [
            'account_id' => $account->id,
            'destination' => $this->destination($account),
        ]);

        if ($account->token_expires_at && $account->token_expires_at->isPast()) {
            Log::warning('MetaPublisher: Token expired, refresh needed', [
                'account_id' => $account->id,
            ]);
            return false;
        }

        return true;
    }

    private function destination(SocialAccount $account): string
    {
        $metadata = $account->provider_metadata ?? [];

        if (! empty($metadata['instagram_business_account_id'])) {
            return 'instagram_business';
        }

        return 'facebook_page';
    }
}
