<?php

use Illuminate\Support\Facades\Route;
use Modules\IAM\Http\Controllers\AuthController;
use Modules\IAM\Http\Controllers\DeviceTokenController;
use Modules\IAM\Http\Controllers\EnrollmentRequestController;
use Modules\IAM\Http\Controllers\ParentController;
use Modules\IAM\Http\Controllers\ProfileController;
use Modules\IAM\Http\Controllers\StudentController;
use Modules\IAM\Http\Controllers\TeacherController;

Route::prefix('v1/{tenant_code}/auth')->middleware('tenant')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware(['auth:sanctum'])->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::patch('/profile', [ProfileController::class, 'update']);
        Route::post('/avatar', [ProfileController::class, 'uploadAvatar']);
        Route::delete('/avatar', [ProfileController::class, 'deleteAvatar']);
        Route::post('/device-token', [DeviceTokenController::class, 'store']);
        Route::delete('/device-token', [DeviceTokenController::class, 'destroy']);
    });
});

Route::prefix('v1/{tenant_code}')->middleware(['tenant', 'auth:sanctum'])->group(function () {
    Route::middleware('role:manager')->prefix('manager')->group(function () {
        // Teachers
        Route::get('teachers', [TeacherController::class, 'index']);
        Route::post('teachers', [TeacherController::class, 'store']);
        Route::get('teachers/{id}', [TeacherController::class, 'show']);
        Route::put('teachers/{id}', [TeacherController::class, 'update']);
        Route::delete('teachers/{id}', [TeacherController::class, 'destroy']);
        Route::post('teachers/{id}/assignments', [TeacherController::class, 'storeAssignment']);
        Route::delete('teachers/{id}/assignments/{assignmentId}', [TeacherController::class, 'destroyAssignment']);
        Route::patch('teachers/{id}/toggle-status', [TeacherController::class, 'toggleStatus']);

        // Students
        Route::get('students', [StudentController::class, 'index']);
        Route::post('students', [StudentController::class, 'store']);
        Route::get('students/{id}', [StudentController::class, 'show']);
        Route::put('students/{id}', [StudentController::class, 'update']);
        Route::patch('students/{id}/toggle-status', [StudentController::class, 'toggleStatus']);
        Route::post('students/{id}/assign-parent', [StudentController::class, 'assignParent']);
        Route::delete('students/{id}/parents/{parentId}', [StudentController::class, 'destroyParent']);
        Route::patch('students/{id}/fee-status', [StudentController::class, 'updateFeeStatus']);
        Route::post('students/{id}/enroll', [StudentController::class, 'directEnroll']);

        // Parents
        Route::get('parents', [ParentController::class, 'index']);
        Route::post('parents', [ParentController::class, 'store']);
        Route::get('parents/{id}', [ParentController::class, 'show']);
        Route::put('parents/{id}', [ParentController::class, 'update']);
        Route::post('parents/{id}/link-student', [ParentController::class, 'linkStudent']);
        Route::delete('parents/{id}/students/{studentId}', [ParentController::class, 'unlinkStudent']);

        // Enrollment requests
        Route::get('enrollment-requests', [EnrollmentRequestController::class, 'index']);
        Route::patch('enrollment-requests/{id}/approve', [EnrollmentRequestController::class, 'approve']);
        Route::patch('enrollment-requests/{id}/reject', [EnrollmentRequestController::class, 'reject']);
    });
});
