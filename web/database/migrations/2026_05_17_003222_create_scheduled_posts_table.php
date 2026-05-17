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
            $table->string('status')->default('pending'); // pending, publishing, published, failed
            $table->text('content');
            $table->json('media_urls')->nullable();
            $table->timestamp('scheduled_at');
            $table->timestamp('published_at')->nullable();
            $table->json('response_metadata')->nullable(); // API response from platform
            $table->text('error_message')->nullable();
            $table->timestamps();
            
            $table->index(['status', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduled_posts');
    }
};
