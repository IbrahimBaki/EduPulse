<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pdf_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(\Modules\Platform\Models\Tenant::class)->constrained()->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->text('chunk_text');
            $table->unsignedSmallInteger('chunk_index');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdf_chunks');
    }
};
