<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grade_levels', function (Blueprint $table) {
            $table->string('description')->nullable()->after('level');
            $table->boolean('is_active')->default(true)->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('grade_levels', function (Blueprint $table) {
            $table->dropColumn(['description', 'is_active']);
        });
    }
};
