<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->decimal('fee_amount', 10, 2)->nullable()->after('enrolled_at');
            $table->boolean('fee_paid')->default(false)->after('fee_amount');
        });
    }

    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropColumn(['fee_amount', 'fee_paid']);
        });
    }
};
