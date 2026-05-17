<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->text('question_text');
            $table->enum('question_type', ['mcq', 'true_false', 'short_answer', 'essay'])->default('mcq');
            $table->json('options')->nullable();
            $table->string('correct_answer')->nullable();
            $table->integer('marks')->default(1);
            $table->text('explanation')->nullable();
            $table->integer('order')->default(0);
            $table->enum('difficulty', ['easy', 'medium', 'hard'])->default('medium');
            $table->string('topic')->nullable();
            $table->timestamps();

            $table->index(['exam_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_questions');
    }
};
