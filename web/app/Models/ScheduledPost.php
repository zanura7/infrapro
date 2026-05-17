<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'content_id',
        'platform',
        'scheduled_at',
        'status',
        'response_metadata',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'response_metadata' => 'array',
    ];

    public function contentJob(): BelongsTo
    {
        return $this->belongsTo(ContentJob::class, 'content_id');
    }
}
