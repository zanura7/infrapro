<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('poster_templates', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('prompt_template');       // raw template with [TOKEN] placeholders
            $table->text('negative_prompt')->nullable();
            $table->json('fields');                // field defs the user fills in
            $table->string('default_aspect_ratio', 8)->default('4:5'); // 1080x1350
            $table->string('default_size', 16)->default('1080x1350');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poster_templates');
    }
};
