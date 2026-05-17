<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('weak_topics', function (Blueprint $table) {
            $table->unsignedTinyInteger('max_score')->default(0)->after('score');
        });

        // MySQL only — SQLite doesn't support MODIFY COLUMN
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE weak_topics MODIFY COLUMN source ENUM('ai', 'teacher', 'student', 'exam') DEFAULT 'ai'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE weak_topics MODIFY COLUMN source ENUM('ai', 'teacher', 'student') DEFAULT 'ai'");
        }

        Schema::table('weak_topics', function (Blueprint $table) {
            $table->dropColumn('max_score');
        });
    }
};
