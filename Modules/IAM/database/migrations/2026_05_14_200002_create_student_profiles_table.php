<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('student_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignId('grade_level_id')->nullable()->constrained('grade_levels')->nullOnDelete();
            $table->string('student_code');
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female'])->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->date('enrollment_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->enum('fee_status', ['paid', 'pending', 'overdue'])->default('pending');
            $table->date('fee_due_date')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'student_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_profiles');
    }
};
