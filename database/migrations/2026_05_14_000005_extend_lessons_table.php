<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->string('pdf_path')->nullable()->after('order');
            $table->boolean('pdf_processed')->default(false)->after('pdf_path');
            $table->unsignedSmallInteger('pdf_chunks_count')->default(0)->after('pdf_processed');
            $table->boolean('is_published')->default(false)->after('pdf_chunks_count');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->dropColumn(['pdf_path', 'pdf_processed', 'pdf_chunks_count', 'is_published']);
        });
    }
};
