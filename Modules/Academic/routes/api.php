<?php

use Illuminate\Support\Facades\Route;
use Modules\Academic\Http\Controllers\AttendanceController;
use Modules\Academic\Http\Controllers\CourseController;
use Modules\Academic\Http\Controllers\GradeLevelController;
use Modules\Academic\Http\Controllers\LessonController;
use Modules\Academic\Http\Controllers\ManagerDashboardController;
use Modules\Academic\Http\Controllers\ParentDashboardController;
use Modules\Academic\Http\Controllers\ScheduleController;
use Modules\Academic\Http\Controllers\StudentDashboardController;
use Modules\Academic\Http\Controllers\SubjectController;
use Modules\Academic\Http\Controllers\TeacherDashboardController;

Route::prefix('v1/{tenant_code}')->middleware(['tenant', 'auth:sanctum'])->group(function () {
    // Manager routes
    Route::middleware('role:manager')->prefix('manager')->group(function () {
        // Grade levels
        Route::get('grade-levels', [GradeLevelController::class, 'index']);
        Route::post('grade-levels', [GradeLevelController::class, 'store']);
        Route::put('grade-levels/{id}', [GradeLevelController::class, 'update']);
        Route::delete('grade-levels/{id}', [GradeLevelController::class, 'destroy']);
        Route::get('grade-levels/{id}/subjects', [GradeLevelController::class, 'subjects']);
        Route::post('grade-levels/{id}/subjects', [GradeLevelController::class, 'assignSubjects']);
        Route::delete('grade-levels/{gradeId}/subjects/{subjectId}', [GradeLevelController::class, 'removeSubject']);

        // Subjects
        Route::get('subjects', [SubjectController::class, 'index']);
        Route::post('subjects', [SubjectController::class, 'store']);
        Route::put('subjects/{id}', [SubjectController::class, 'update']);
        Route::delete('subjects/{id}', [SubjectController::class, 'destroy']);

        // Courses
        Route::get('courses', [CourseController::class, 'index']);
        Route::post('courses', [CourseController::class, 'store']);
        Route::get('courses/{id}', [CourseController::class, 'show']);
        Route::put('courses/{id}', [CourseController::class, 'update']);
        Route::patch('courses/{id}/status', [CourseController::class, 'updateStatus']);
        Route::delete('courses/{id}', [CourseController::class, 'destroy']);

        // Schedules (manager)
        Route::get('courses/{courseId}/schedules', [ScheduleController::class, 'index']);
        Route::post('courses/{courseId}/schedules', [ScheduleController::class, 'store']);
        Route::put('courses/{courseId}/schedules/{id}', [ScheduleController::class, 'update']);
        Route::patch('courses/{courseId}/schedules/{id}/status', [ScheduleController::class, 'updateStatus']);
        Route::delete('courses/{courseId}/schedules/{id}', [ScheduleController::class, 'destroy']);

        // Attendance report
        Route::get('courses/{courseId}/attendance-report', [AttendanceController::class, 'courseReport']);
    });

    // Teacher routes
    Route::middleware('role:teacher')->prefix('teacher')->group(function () {
        Route::get('courses', [CourseController::class, 'myCourses']);
        Route::get('courses/{id}/students', [CourseController::class, 'students']);

        // Lessons
        Route::get('courses/{courseId}/lessons', [LessonController::class, 'index']);
        Route::post('courses/{courseId}/lessons', [LessonController::class, 'store']);
        Route::put('courses/{courseId}/lessons/{id}', [LessonController::class, 'update']);
        Route::patch('courses/{courseId}/lessons/{id}/publish', [LessonController::class, 'publish']);
        Route::delete('courses/{courseId}/lessons/{id}', [LessonController::class, 'destroy']);

        // Schedules (teacher)
        Route::get('courses/{courseId}/schedules', [ScheduleController::class, 'index']);
        Route::post('courses/{courseId}/schedules', [ScheduleController::class, 'store']);
        Route::put('courses/{courseId}/schedules/{id}', [ScheduleController::class, 'update']);
        Route::patch('courses/{courseId}/schedules/{id}/status', [ScheduleController::class, 'updateStatus']);
        Route::delete('courses/{courseId}/schedules/{id}', [ScheduleController::class, 'destroy']);
        Route::get('courses/{courseId}/schedules/{id}/join', [ScheduleController::class, 'teacherJoin']);

        // Attendance (teacher)
        Route::get('schedules/{scheduleId}/attendance', [AttendanceController::class, 'show']);
        Route::post('schedules/{scheduleId}/attendance', [AttendanceController::class, 'bulkMark']);
        Route::patch('schedules/{scheduleId}/attendance/{attendanceId}', [AttendanceController::class, 'updateOne']);
    });

    // Student routes
    Route::middleware('role:student')->prefix('student')->group(function () {
        Route::get('courses',                              [CourseController::class,  'enrolledCourses']);
        Route::get('courses/{courseId}',                  [CourseController::class,  'enrolledCourseDetail']);
        Route::get('courses/{courseId}/lessons',          [LessonController::class,  'publishedLessons']);
        Route::get('courses/{courseId}/schedules',        [ScheduleController::class, 'studentCourseSchedules']);
        Route::get('courses/{courseId}/schedules/{id}/join', [ScheduleController::class, 'studentJoin']);
        Route::get('courses/{courseId}/progress',         [CourseController::class,  'courseProgress']);
        Route::get('lessons/{lesson}/pdf',                [LessonController::class,  'servePdf']);
        Route::get('schedules',                           [ScheduleController::class, 'upcomingSchedules']);
        Route::get('attendance',                          [AttendanceController::class, 'mySummary']);
        Route::get('dashboard',                           [StudentDashboardController::class, 'dashboard']);
    });

    // Parent routes
    Route::middleware('role:parent')->prefix('parent')->group(function () {
        Route::get('dashboard', [ParentDashboardController::class, 'dashboard']);
    });

    // Dashboard routes
    Route::middleware('role:manager')->prefix('manager')->group(function () {
        Route::get('dashboard', [ManagerDashboardController::class, 'dashboard']);
        Route::get('reports/students', [ManagerDashboardController::class, 'studentsReport']);
        Route::get('reports/attendance', [ManagerDashboardController::class, 'attendanceReport']);
        Route::get('reports/academic-performance', [ManagerDashboardController::class, 'academicPerformanceReport']);
    });

    Route::middleware('role:teacher')->prefix('teacher')->group(function () {
        Route::get('dashboard', [TeacherDashboardController::class, 'dashboard']);
        Route::get('reports/course/{courseId}', [TeacherDashboardController::class, 'courseReport']);
    });

    // Internal endpoint (no Sanctum, secured by header)
    Route::get('internal/weekly-report/{parentId}', [ParentDashboardController::class, 'internalWeeklyReport'])
        ->withoutMiddleware(['auth:sanctum']);
});
