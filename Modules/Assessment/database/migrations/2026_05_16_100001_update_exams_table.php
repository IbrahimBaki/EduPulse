<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->foreignId('tenant_id')->after('id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->after('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->after('course_id')->constrained('users')->cascadeOnDelete();
            $table->string('title')->after('created_by');
            $table->text('description')->nullable()->after('title');
            $table->enum('status', ['draft', 'published', 'scheduled', 'active', 'completed', 'archived'])->default('draft')->after('description');
            $table->integer('total_marks')->default(0)->after('status');
            $table->integer('passing_percentage')->default(60)->after('total_marks');
            $table->integer('duration_minutes')->default(60)->after('passing_percentage');
            $table->timestamp('scheduled_at')->nullable()->after('duration_minutes');
            $table->timestamp('starts_at')->nullable()->after('scheduled_at');
            $table->timestamp('ends_at')->nullable()->after('starts_at');
            $table->boolean('is_ai_generated')->default(false)->after('ends_at');
            $table->string('ai_model_used')->nullable()->after('is_ai_generated');
            $table->string('language', 5)->default('en')->after('ai_model_used');
            $table->softDeletes();

            $table->index(['tenant_id', 'course_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['course_id']);
            $table->dropForeign(['created_by']);
            $table->dropIndex(['tenant_id', 'course_id']);
            $table->dropIndex(['tenant_id', 'status']);
            $table->dropColumn([
                'tenant_id', 'course_id', 'created_by', 'title', 'description', 'status',
                'total_marks', 'passing_percentage', 'duration_minutes',
                'scheduled_at', 'starts_at', 'ends_at',
                'is_ai_generated', 'ai_model_used', 'language', 'deleted_at',
            ]);
        });
    }
};
