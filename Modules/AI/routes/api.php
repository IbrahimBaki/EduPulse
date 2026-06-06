<?php

use Illuminate\Support\Facades\Route;
use Modules\AI\Http\Controllers\PdfController;
use Modules\AI\Http\Controllers\ExplainController;
use Modules\AI\Http\Controllers\QuizController;
use Modules\AI\Http\Controllers\ExamController;
use Modules\AI\Http\Controllers\WeakTopicController;
use Modules\AI\Http\Controllers\ChatHistoryController;
use Modules\AI\Http\Controllers\DashboardController;
use Modules\AI\Http\Controllers\StudyPlanController;

Route::prefix('v1/{tenant_code}')->middleware(['tenant', 'auth:sanctum'])->group(function () {

    Route::post('/lessons/{lesson}/upload-pdf', [PdfController::class, 'upload']);

    Route::prefix('ai')->middleware('throttle:20,1')->group(function () {
        Route::post('/explain',       [ExplainController::class, 'explain']);
        Route::post('/quiz/generate', [QuizController::class, 'generate']);
        Route::post('/quiz/submit',   [QuizController::class, 'submit']);
        Route::post('/quiz/quick',    [QuizController::class, 'quickQuiz']);
        Route::get('/quiz/history',              [QuizController::class, 'history']);
        Route::get('/quiz/history/{attempt}',    [QuizController::class, 'showAttempt']);
        Route::post('/exam/generate', [ExamController::class, 'generate'])->middleware('role:teacher');

        Route::get('/chat-history',                    [ChatHistoryController::class, 'myHistory']);
        Route::get('/weak-topics',                     [WeakTopicController::class,  'myTopics']);
        Route::get('/students/{student}/weak-topics',  [WeakTopicController::class,  'index']);
        Route::get('/students/{student}/chat-history', [ChatHistoryController::class, 'index']);
        Route::get('/teacher/dashboard', [DashboardController::class, 'teacher'])->middleware('role:teacher');
        Route::get('/parent/dashboard',  [DashboardController::class, 'parent'])->middleware('role:parent');

        Route::middleware('role:student')->group(function () {
            Route::get('/study-plans',       [StudyPlanController::class, 'index']);
            Route::get('/study-plans/{plan}', [StudyPlanController::class, 'show']);
        });

        Route::middleware('role:teacher')->group(function () {
            Route::get('/students/{student}/study-plans', [StudyPlanController::class, 'studentPlans']);
        });
    });
});
