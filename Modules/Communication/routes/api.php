<?php

use Illuminate\Support\Facades\Route;
use Modules\Communication\Http\Controllers\AnnouncementController;
use Modules\Communication\Http\Controllers\NotificationController;
use Modules\Communication\Http\Controllers\WebhookController;

// No-auth routes (secured via X-N8n-Secret header)
Route::prefix('v1/{tenant_code}')->middleware('tenant')->group(function () {
    Route::post('webhooks/n8n/notify', [WebhookController::class, 'notify']);
    Route::get('internal/upcoming-sessions', [WebhookController::class, 'internalUpcoming']);
    Route::get('internal/weekly-summary', [WebhookController::class, 'weeklySummary']);
    Route::get('internal/student/{student_id}/intervention-context', [WebhookController::class, 'studentInterventionContext']);
    Route::get('internal/course/{course_id}/enrolled-users', [WebhookController::class, 'courseEnrolledUsers']);
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
