<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE content_jobs MODIFY COLUMN kind VARCHAR(32) NOT NULL DEFAULT 'poster'");
    }

    public function down(): void
    {
        DB::statement(
            "ALTER TABLE content_jobs MODIFY COLUMN kind "
            . "ENUM('strategy','poster','video','salespage') NOT NULL DEFAULT 'poster'"
        );
    }
};
