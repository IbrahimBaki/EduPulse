<?php

use Illuminate\Support\Facades\Route;
use Modules\Assessment\Http\Controllers\AssessmentController;
use Modules\Assessment\Http\Controllers\StudentExamController;
use Modules\Assessment\Http\Controllers\TeacherExamController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('assessments', AssessmentController::class)->names('assessment');
});

Route::prefix('v1/{tenant_code}')->middleware(['tenant', 'auth:sanctum'])->group(function () {

    // Teacher exam routes
    Route::middleware('role:teacher')->prefix('teacher/exams')->group(function () {
        Route::post('generate', [TeacherExamController::class, 'generate']);
        Route::get('/', [TeacherExamController::class, 'index']);
        Route::get('{exam}', [TeacherExamController::class, 'show']);
        Route::patch('{exam}', [TeacherExamController::class, 'update']);
        Route::put('{exam}/questions/{question}', [TeacherExamController::class, 'updateQuestion']);
        Route::delete('{exam}/questions/{question}', [TeacherExamController::class, 'deleteQuestion']);
        Route::post('{exam}/publish', [TeacherExamController::class, 'publish']);
        Route::post('{exam}/schedule', [TeacherExamController::class, 'schedule']);
        Route::get('{exam}/results', [TeacherExamController::class, 'results']);
        Route::get('{exam}/results/{student}', [TeacherExamController::class, 'studentResult']);
        Route::post('{exam}/results/{student}/approve', [TeacherExamController::class, 'approveResult']);
        Route::delete('{exam}/results/{student}/approve', [TeacherExamController::class, 'revokeApproval']);
    });

    // Manager exam routes (same controller but manager can access any course)
    Route::middleware('role:manager')->prefix('manager/exams')->group(function () {
        Route::post('generate', [TeacherExamController::class, 'generateForManager']);
        Route::get('/', [TeacherExamController::class, 'index']);
        Route::get('{exam}', [TeacherExamController::class, 'show']);
        Route::patch('{exam}', [TeacherExamController::class, 'update']);
        Route::put('{exam}/questions/{question}', [TeacherExamController::class, 'updateQuestion']);
        Route::delete('{exam}/questions/{question}', [TeacherExamController::class, 'deleteQuestion']);
        Route::post('{exam}/publish', [TeacherExamController::class, 'publish']);
        Route::post('{exam}/schedule', [TeacherExamController::class, 'schedule']);
        Route::get('{exam}/results', [TeacherExamController::class, 'results']);
        Route::get('{exam}/results/{student}', [TeacherExamController::class, 'studentResult']);
        Route::post('{exam}/results/{student}/approve', [TeacherExamController::class, 'approveResult']);
        Route::delete('{exam}/results/{student}/approve', [TeacherExamController::class, 'revokeApproval']);
    });

    // Student exam routes
    Route::middleware('role:student')->prefix('student/exams')->group(function () {
        Route::get('/', [StudentExamController::class, 'index']);
        Route::get('{exam}', [StudentExamController::class, 'show']);
        Route::post('{exam}/start', [StudentExamController::class, 'start']);
        Route::post('{exam}/answer', [StudentExamController::class, 'answer']);
        Route::post('{exam}/submit', [StudentExamController::class, 'submit']);
        Route::post('{exam}/violation', [StudentExamController::class, 'violation']);
        Route::get('{exam}/result', [StudentExamController::class, 'result']);
    });
});
