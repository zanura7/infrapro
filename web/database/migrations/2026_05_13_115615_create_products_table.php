<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku')->nullable();
            $table->string('category')->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->string('currency', 8)->default('MYR');
            $table->text('description')->nullable();
            $table->json('usp')->nullable();
            $table->string('target_audience')->nullable();
            $table->text('pain_point')->nullable();
            $table->json('brand_voice')->nullable();
            $table->unsignedInteger('current_version')->default(1);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'archived_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
