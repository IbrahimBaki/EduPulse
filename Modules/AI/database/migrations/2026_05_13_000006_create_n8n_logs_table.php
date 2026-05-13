<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('n8n_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(\Modules\Platform\Models\Tenant::class)->constrained()->cascadeOnDelete();
            $table->string('webhook_type');
            $table->json('payload');
            $table->enum('status', ['pending', 'sent', 'failed'])->default('pending');
            $table->unsignedSmallInteger('response_code')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('n8n_logs');
    }
};
