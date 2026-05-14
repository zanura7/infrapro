<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosterTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug', 'name', 'description',
        'prompt_template', 'negative_prompt', 'fields',
        'default_aspect_ratio', 'default_size',
        'is_active', 'sort_order',
    ];

    protected $casts = [
        'fields' => 'array',
        'is_active' => 'boolean',
    ];

    public function scopeActive($q)
    {
        return $q->where('is_active', true)->orderBy('sort_order');
    }
}
