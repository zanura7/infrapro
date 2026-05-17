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
        'scheduled_at' => 'datetime',
        'published_at' => 'datetime',
        'response_metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class);
    }

    public function contentJob(): BelongsTo
    {
        return $this->belongsTo(ContentJob::class, 'content_id');
    }
}
