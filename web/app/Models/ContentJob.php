<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentJob extends Model
{
    use HasFactory;
    protected $fillable = [
        'product_id',
        'user_id',
        'parent_id',
        'kind',
        'status',
        'model',
        'input',
        'output',
        'error',
        'cost',
        'duration_ms',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'input' => 'array',
        'output' => 'array',
        'error' => 'array',
        'cost' => 'decimal:4',
        'duration_ms' => 'integer',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ContentJob::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ContentJob::class, 'parent_id');
    }

    public function scheduledPosts(): HasMany
    {
        return $this->hasMany(ScheduledPost::class, 'content_id');
    }

    public function markRunning(): void
    {
        $this->update([
            'status' => 'running',
            'started_at' => now(),
        ]);
    }

    public function markSucceeded(array $output, float $cost = 0): void
    {
        $finishedAt = now();
        $this->update([
            'status' => 'succeeded',
            'output' => $output,
            'cost' => $cost,
            'finished_at' => $finishedAt,
            'duration_ms' => $this->started_at
                ? $this->started_at->diffInMilliseconds($finishedAt)
                : null,
        ]);
    }

    public function markFailed(string $message, array $extra = []): void
    {
        $this->update([
            'status' => 'failed',
            'error' => array_merge(['message' => $message], $extra),
            'finished_at' => now(),
        ]);
    }
}
