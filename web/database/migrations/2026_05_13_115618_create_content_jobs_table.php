<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('content_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('kind', ['strategy', 'poster', 'video', 'salespage'])->default('poster');
            $table->enum('status', ['queued', 'running', 'succeeded', 'failed', 'cancelled'])->default('queued');
            $table->string('model')->nullable();
            $table->json('input')->nullable();        // prompt, refs, options
            $table->json('output')->nullable();       // urls, paths, strategy json
            $table->json('error')->nullable();
            $table->decimal('cost', 10, 4)->default(0);
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'status']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_jobs');
    }
};
