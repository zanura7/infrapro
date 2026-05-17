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

class PublishResult
{
    public function __construct(
        public bool $success,
        public ?array $metadata = null,
        public ?string $error = null
    ) {}

    public static function success(array $metadata = []): self
    {
        return new self(true, $metadata);
    }

    public static function failed(string $error, array $metadata = []): self
    {
        return new self(false, $metadata, $error);
    }
}
