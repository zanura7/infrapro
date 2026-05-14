<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('studio_templates', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('best_for')->nullable();
            $table->json('narrative_shape');   // array of 5 scene bullets
            $table->text('scene_guidance');     // camera/lighting tips
            $table->unsignedTinyInteger('default_scene_count')->default(5);
            $table->unsignedSmallInteger('default_clip_seconds')->default(6);
            $table->string('default_aspect_ratio', 8)->default('9:16');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('studio_templates');
    }
};
