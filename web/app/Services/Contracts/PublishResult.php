<?php

namespace App\Services\Contracts;

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
