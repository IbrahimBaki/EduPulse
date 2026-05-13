<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weak_topics', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(\Modules\Platform\Models\Tenant::class)->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('topic');
            $table->unsignedTinyInteger('score')->default(0);
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->enum('source', ['ai', 'teacher', 'student'])->default('ai');
            $table->timestamp('last_attempted_at')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'student_id', 'topic']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weak_topics');
    }
};
