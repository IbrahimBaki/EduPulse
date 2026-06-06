<?php

use Illuminate\Support\Facades\Route;
use Modules\Communication\Http\Controllers\AnnouncementController;
use Modules\Communication\Http\Controllers\NotificationController;
use Modules\Communication\Http\Controllers\TelegramBotController;
use Modules\Communication\Http\Controllers\WebhookController;

// No-auth routes (secured via X-N8n-Secret header)
Route::prefix('v1/{tenant_code}')->middleware('tenant')->group(function () {
    Route::post('webhooks/n8n/notify', [WebhookController::class, 'notify']);
    Route::get('internal/upcoming-sessions', [WebhookController::class, 'internalUpcoming']);
    Route::get('internal/weekly-summary', [WebhookController::class, 'weeklySummary']);
    Route::get('internal/student/{student_id}/intervention-context', [WebhookController::class, 'studentInterventionContext']);
    Route::get('internal/course/{course_id}/enrolled-users', [WebhookController::class, 'courseEnrolledUsers']);

    // Telegram parent bot — query endpoints (Flow D)
    Route::prefix('internal/telegram')->group(function () {
        Route::post('register-parent', [TelegramBotController::class, 'registerParentChat']);
        Route::get('student/{studentCode}', [TelegramBotController::class, 'lookupStudent']);
        Route::get('student/{studentCode}/attendance', [TelegramBotController::class, 'studentAttendance']);
        Route::get('student/{studentCode}/exams', [TelegramBotController::class, 'studentExams']);
        Route::get('student/{studentCode}/quizzes', [TelegramBotController::class, 'studentQuizzes']);
        Route::get('student/{studentCode}/schedule', [TelegramBotController::class, 'studentSchedule']);
        Route::get('student/{studentCode}/fees', [TelegramBotController::class, 'studentFees']);
        Route::get('student/{studentCode}/announcements', [TelegramBotController::class, 'studentAnnouncements']);
        // Push notification context endpoints (Flows D1, D3, D4, D5)
        Route::get('absence-context', [TelegramBotController::class, 'absenceAlertContext']);
        Route::get('session-context/{scheduleId}', [TelegramBotController::class, 'sessionLiveContext']);
        Route::get('upcoming-exams', [TelegramBotController::class, 'upcomingExamsWithParents']);
        Route::get('overdue-fees', [TelegramBotController::class, 'overdueFeesWithParents']);
    });
});

Route::prefix('v1/{tenant_code}')->middleware(['tenant', 'auth:sanctum'])->group(function () {
    // Manager announcements
    Route::middleware('role:manager')->prefix('manager')->group(function () {
        Route::get('announcements', [AnnouncementController::class, 'index']);
        Route::post('announcements', [AnnouncementController::class, 'store']);
        Route::patch('announcements/{id}/publish', [AnnouncementController::class, 'publish']);
        Route::delete('announcements/{id}', [AnnouncementController::class, 'destroy']);
    });

    // Teacher announcements
    Route::middleware('role:teacher')->prefix('teacher')->group(function () {
        Route::get('announcements', [AnnouncementController::class, 'index']);
        Route::post('announcements', [AnnouncementController::class, 'store']);
        Route::patch('announcements/{id}/publish', [AnnouncementController::class, 'publish']);
        Route::delete('announcements/{id}', [AnnouncementController::class, 'destroy']);
    });

    // Student announcements
    Route::middleware('role:student')->prefix('student')->group(function () {
        Route::get('announcements', [AnnouncementController::class, 'studentIndex']);
    });

    // Parent announcements
    Route::middleware('role:parent')->prefix('parent')->group(function () {
        Route::get('announcements', [AnnouncementController::class, 'parentIndex']);
    });

    // Notifications (all authenticated roles)
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::patch('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
});
