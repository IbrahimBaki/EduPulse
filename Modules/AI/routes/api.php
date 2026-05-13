<?php

use Illuminate\Support\Facades\Route;
use Modules\AI\Http\Controllers\PdfController;
use Modules\AI\Http\Controllers\ExplainController;
use Modules\AI\Http\Controllers\QuizController;
use Modules\AI\Http\Controllers\ExamController;
use Modules\AI\Http\Controllers\WeakTopicController;
use Modules\AI\Http\Controllers\ChatHistoryController;
use Modules\AI\Http\Controllers\DashboardController;

Route::prefix('v1/{tenant_code}')->middleware(['tenant', 'auth:sanctum'])->group(function () {

    Route::post('/lessons/{lesson}/upload-pdf', [PdfController::class, 'upload']);

    Route::prefix('ai')->middleware('throttle:20,1')->group(function () {
        Route::post('/explain',       [ExplainController::class, 'explain']);
        Route::post('/quiz/generate', [QuizController::class, 'generate']);
        Route::post('/quiz/submit',   [QuizController::class, 'submit']);
        Route::post('/exam/generate', [ExamController::class, 'generate'])->middleware('role:teacher');

        Route::get('/students/{student}/weak-topics',  [WeakTopicController::class, 'index']);
        Route::get('/students/{student}/chat-history', [ChatHistoryController::class, 'index']);
        Route::get('/teacher/dashboard', [DashboardController::class, 'teacher'])->middleware('role:teacher');
        Route::get('/parent/dashboard',  [DashboardController::class, 'parent'])->middleware('role:parent');
    });
});
