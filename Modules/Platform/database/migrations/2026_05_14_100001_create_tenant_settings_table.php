<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained('tenants')->cascadeOnDelete();
            $table->string('academy_name')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('primary_color', 20)->nullable();
            $table->string('currency', 10)->default('EGP');
            $table->string('timezone', 50)->default('Africa/Cairo');
            $table->string('language', 10)->default('ar');
            $table->string('academic_year', 20)->nullable();
            $table->enum('semester', ['first', 'second', 'summer'])->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone', 30)->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_settings');
    }
};
