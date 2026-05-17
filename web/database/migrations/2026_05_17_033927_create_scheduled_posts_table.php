<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scheduled_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('social_account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('content_id')->nullable()->constrained('content_jobs')->nullOnDelete();
            $table->text('content');
            $table->json('media_urls')->nullable();
            $table->timestamp('scheduled_at');
            $table->enum('status', ['pending', 'publishing', 'published', 'failed'])->default('pending');
            $table->json('response_metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduled_posts');
    }
};
