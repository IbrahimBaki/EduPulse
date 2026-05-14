<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Illuminate\Support\Facades\Cache;
use Modules\Academic\Models\Attendance;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Enrollment;
use Modules\Academic\Models\Schedule;
use Modules\AI\Models\QuizAttempt;
use Modules\AI\Models\WeakTopic;
use Modules\Commerce\Models\StudentFee;

class StudentDashboardController extends Controller
{
    use ApiResponser;

    public function dashboard()
    {
        $userId = auth()->id();

        $data = Cache::remember("dashboard:student:{$userId}", 300, function () use ($userId) {
            $enrolledCourses = Enrollment::where('student_id', $userId)->count();

            $upcomingSessions = Schedule::whereHas('course', function ($q) use ($userId) {
                $q->whereHas('enrollments', fn($e) => $e->where('student_id', $userId));
            })
                ->where('status', 'scheduled')
                ->where('starts_at', '>', now())
                ->orderBy('starts_at')
                ->take(5)
                ->get();

            $weakTopics = WeakTopic::where('student_id', $userId)->get();

            $recentQuizzes = QuizAttempt::where('student_id', $userId)
                ->latest()
                ->take(5)
                ->get();

            $totalAttendance = Attendance::where('student_id', $userId)->count();
            $presentAttendance = Attendance::where('student_id', $userId)->where('status', 'present')->count();
            $attendanceRate = $totalAttendance > 0 ? round(($presentAttendance / $totalAttendance) * 100, 2) : 0;

            $pendingFees = StudentFee::where('student_id', $userId)
                ->whereIn('status', ['pending', 'overdue'])
                ->sum('amount');

            $unreadNotifications = auth()->user()->unreadNotifications()->count();

            return [
                'enrolled_courses'      => $enrolledCourses,
                'upcoming_sessions'     => $upcomingSessions,
                'my_weak_topics'        => $weakTopics,
                'recent_quizzes'        => $recentQuizzes,
                'attendance_summary'    => [
                    'rate'    => $attendanceRate,
                    'total'   => $totalAttendance,
                    'present' => $presentAttendance,
                ],
                'pending_fees'          => (float) $pendingFees,
                'unread_notifications'  => $unreadNotifications,
            ];
        });

        return $this->ReturnSuccess($data, 'Student dashboard retrieved');
    }
}
