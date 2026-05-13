<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ProductAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'uploaded_by',
        'type',
        'disk',
        'path',
        'thumbnail_path',
        'mime',
        'size',
        'width',
        'height',
        'duration_ms',
        'tag',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'duration_ms' => 'integer',
    ];

    protected $appends = ['url', 'thumbnail_url'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail_path
            ? Storage::disk($this->disk)->url($this->thumbnail_path)
            : null;
    }
}
