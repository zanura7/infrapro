<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'social_account_id',
        'status',
        'content',
        'media_urls',
        'scheduled_at',
        'published_at',
        'response_metadata',
        'error_message',
    ];

    protected $casts = [
        'media_urls' => 'array',
        'response_metadata' => 'array',
        'scheduled_at' => 'datetime',
        'published_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isDue(): bool
    {
        return $this->isPending() && $this->scheduled_at->lte(now());
    }
}
