<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parent_telegram_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('telegram_chat_id');
            $table->string('student_code', 20);
            $table->timestamp('registered_at')->useCurrent();
            $table->timestamps();

            $table->index(['tenant_id', 'student_code']);
            $table->unique(['telegram_chat_id', 'student_code', 'tenant_id'], 'unique_parent_student_reg');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_telegram_registrations');
    }
};
