<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Modules\AI\Jobs\GenerateWeeklyReportJob;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new GenerateWeeklyReportJob())->weeklyOn(1, '08:00')->name('weekly-parent-report');

Schedule::call(function () {
    $overdueFees = \Modules\Commerce\Models\StudentFee::where('status', 'pending')
        ->whereNotNull('due_date')
        ->where('due_date', '<', now()->toDateString())
        ->get();

    foreach ($overdueFees as $fee) {
        $fee->update(['status' => 'overdue']);
        \Modules\AI\Jobs\SendN8nWebhookJob::dispatch('fee_overdue', [
            'fee_id'     => $fee->id,
            'student_id' => $fee->student_id,
            'amount'     => $fee->amount,
        ], $fee->tenant_id);
    }
})->dailyAt('09:00')->name('mark-overdue-fees');
