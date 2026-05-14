<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudioTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug', 'name', 'description', 'best_for',
        'narrative_shape', 'scene_guidance',
        'default_scene_count', 'default_clip_seconds', 'default_aspect_ratio',
        'is_active', 'sort_order',
    ];

    protected $casts = [
        'narrative_shape' => 'array',
        'is_active' => 'boolean',
        'default_scene_count' => 'integer',
        'default_clip_seconds' => 'integer',
    ];

    public function scopeActive($q)
    {
        return $q->where('is_active', true)->orderBy('sort_order');
    }
}
