<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponser;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Attendance;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Enrollment;
use Modules\Academic\Models\Schedule;
use Modules\AI\Models\QuizAttempt;
use Modules\Commerce\Models\StudentFee;

class ManagerDashboardController extends Controller
{
    use ApiResponser;

    public function dashboard()
    {
        $userId = auth()->id();

        $data = Cache::remember("dashboard:manager:{$userId}", 300, function () {
            $totalTeachers = User::role('teacher')->count();
            $totalStudents = User::role('student')->count();
            $totalParents  = User::role('parent')->count();
            $totalCourses  = Course::count();
            $activeCourses = Course::where('status', 'active')->count();

            $weekStart = now()->startOfWeek();
            $attendanceThisWeek = Attendance::where('created_at', '>=', $weekStart);
            $totalAttendance = (clone $attendanceThisWeek)->count();
            $presentAttendance = (clone $attendanceThisWeek)->where('status', 'present')->count();
            $attendanceRate = $totalAttendance > 0 ? round(($presentAttendance / $totalAttendance) * 100, 2) : 0;

            $absentToday = Attendance::whereDate('created_at', today())
                ->where('status', 'absent')
                ->count();

            $avgScore = QuizAttempt::avg('score') ?? 0;
            $atRiskCount = DB::table('quiz_attempts')
                ->selectRaw('student_id, AVG(score) as avg_score')
                ->groupBy('student_id')
                ->havingRaw('AVG(score) < 60')
                ->count();

            $totalExpected = StudentFee::sum('amount');
            $collected = StudentFee::where('status', 'paid')->sum('amount');
            $collectionRate = $totalExpected > 0 ? round(($collected / $totalExpected) * 100, 2) : 0;
            $overdueCount = StudentFee::where('status', 'overdue')->count();

            $upcomingSessions = Schedule::with('course', 'teacher')
                ->where('status', 'scheduled')
                ->where('starts_at', '>', now())
                ->orderBy('starts_at')
                ->take(5)
                ->get();

            return [
                'totals' => [
                    'teachers'      => $totalTeachers,
                    'students'      => $totalStudents,
                    'parents'       => $totalParents,
                    'courses'       => $totalCourses,
                    'active_courses' => $activeCourses,
                ],
                'attendance' => [
                    'this_week_rate' => $attendanceRate,
                    'absent_today'   => $absentToday,
                ],
                'academics' => [
                    'at_risk_students' => $atRiskCount,
                    'avg_quiz_score'   => round($avgScore, 2),
                ],
                'finance' => [
                    'collection_rate' => $collectionRate,
                    'overdue_count'   => $overdueCount,
                ],
                'upcoming_sessions' => $upcomingSessions,
            ];
        });

        return $this->ReturnSuccess($data, 'Manager dashboard retrieved');
    }

    public function studentsReport()
    {
        $students = User::role('student')
            ->with('studentProfile.gradeLevel')
            ->paginate(15);

        return $this->ReturnSuccess($students, 'Students report retrieved');
    }

    public function attendanceReport()
    {
        $report = Attendance::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        return $this->ReturnSuccess($report, 'Attendance report retrieved');
    }

    public function academicPerformanceReport()
    {
        $report = DB::table('quiz_attempts')
            ->selectRaw('student_id, AVG(score) as avg_score, COUNT(*) as total_attempts, SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed_count')
            ->groupBy('student_id')
            ->orderByRaw('AVG(score) ASC')
            ->paginate(15);

        return $this->ReturnSuccess($report, 'Academic performance report retrieved');
    }
}
