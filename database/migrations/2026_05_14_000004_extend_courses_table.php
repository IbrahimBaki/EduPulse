<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('cover_image')->nullable()->after('description');
            $table->enum('status', ['draft', 'active', 'archived'])->default('draft')->after('cover_image');
            $table->date('start_date')->nullable()->after('status');
            $table->date('end_date')->nullable()->after('start_date');
            $table->unsignedSmallInteger('max_students')->nullable()->after('end_date');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['cover_image', 'status', 'start_date', 'end_date', 'max_students']);
        });
    }
};
