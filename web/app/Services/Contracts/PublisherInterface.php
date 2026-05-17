<?php

namespace App\Services\Contracts;

use App\Models\ScheduledPost;
use App\Models\SocialAccount;

interface PublisherInterface
{
    /**
     * Publish a post to the social media platform.
     */
    public function publish(ScheduledPost $post): PublishResult;

    /**
     * Validate if the social account token is still valid.
     */
    public function validateToken(SocialAccount $account): bool;
}
