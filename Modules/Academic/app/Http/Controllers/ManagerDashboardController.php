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
use Modules\IAM\Models\StudentProfile;

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

    public function schedule()
    {
        $sessions = Schedule::with('course', 'teacher')
            ->where('status', 'scheduled')
            ->where('starts_at', '>', now())
            ->orderBy('starts_at')
            ->get()
            ->map(fn($s) => [
                'id'        => $s->id,
                'title'     => $s->title,
                'starts_at' => $s->starts_at,
                'type'      => $s->type,
                'course'    => $s->course?->name ?? '',
                'teacher'   => $s->teacher?->name ?? '',
            ]);

        return $this->ReturnSuccess($sessions, 'Schedule retrieved');
    }

    public function studentsReport()
    {
        $query = User::role('student')->with('studentProfile.gradeLevel');

        if (request('date_from')) {
            $query->whereDate('created_at', '>=', request('date_from'));
        }
        if (request('date_to')) {
            $query->whereDate('created_at', '<=', request('date_to'));
        }

        $perPage  = (int) request('per_page', 15);
        $students = $query->paginate($perPage);

        // Flatten nested profile fields so the frontend can read them directly
        $students->getCollection()->transform(function ($student) {
            $student->student_code = $student->studentProfile?->student_code ?? null;
            $student->grade_level  = $student->studentProfile?->gradeLevel?->name ?? null;
            $student->parent_name  = null;
            return $student;
        });

        return $this->ReturnSuccess($students, 'Students report retrieved');
    }

    public function atRiskStudents()
    {
        $atRiskAvg = DB::table('quiz_attempts')
            ->selectRaw('student_id, AVG(score) as avg_score')
            ->groupBy('student_id')
            ->havingRaw('AVG(score) < 60')
            ->paginate((int) request('per_page', 15));

        $studentIds = collect($atRiskAvg->items())->pluck('student_id');

        $studentUsers = User::whereIn('id', $studentIds)->get(['id', 'name', 'avatar_url'])->keyBy('id');
        $studentCodes = StudentProfile::whereIn('student_id', $studentIds)
            ->pluck('student_code', 'student_id');

        $weakTopicsMap = DB::table('weak_topics')
            ->whereIn('student_id', $studentIds)
            ->select('student_id', 'topic')
            ->get()
            ->groupBy('student_id')
            ->map(fn($rows) => $rows->pluck('topic')->toArray());

        $attendanceMap = DB::table('attendances')
            ->whereIn('student_id', $studentIds)
            ->selectRaw('student_id, COUNT(*) as total, SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present_count')
            ->groupBy('student_id')
            ->get()
            ->keyBy('student_id');

        $feeStatusMap = DB::table('student_fees')
            ->whereIn('student_id', $studentIds)
            ->orderByRaw("FIELD(status, 'overdue', 'pending', 'paid')")
            ->select('student_id', 'status')
            ->get()
            ->groupBy('student_id')
            ->map(fn($rows) => $rows->first()->status ?? 'none');

        $enrollCountMap = DB::table('enrollments')
            ->whereIn('student_id', $studentIds)
            ->selectRaw('student_id, COUNT(*) as count')
            ->groupBy('student_id')
            ->pluck('count', 'student_id');

        $items = collect($atRiskAvg->items())->map(function ($row) use (
            $studentUsers, $studentCodes, $weakTopicsMap,
            $attendanceMap, $feeStatusMap, $enrollCountMap
        ) {
            $att   = $attendanceMap[$row->student_id] ?? null;
            $total = $att?->total ?? 0;
            $rate  = $total > 0 ? round(($att->present_count / $total) * 100, 1) . '%' : '0%';
            $u     = $studentUsers[$row->student_id] ?? null;

            return [
                'student'          => [
                    'id'         => $row->student_id,
                    'name'       => $u?->name ?? 'Unknown',
                    'code'       => $studentCodes[$row->student_id] ?? null,
                    'avatar_url' => $u?->avatar_url,
                ],
                'avg_quiz_score'   => round((float) $row->avg_score, 1),
                'weak_topics'      => $weakTopicsMap[$row->student_id] ?? [],
                'attendance_rate'  => $rate,
                'fee_status'       => $feeStatusMap[$row->student_id] ?? 'none',
                'enrolled_courses' => (int) ($enrollCountMap[$row->student_id] ?? 0),
            ];
        });

        return $this->ReturnSuccess([
            'data'         => $items,
            'current_page' => $atRiskAvg->currentPage(),
            'per_page'     => $atRiskAvg->perPage(),
            'total'        => $atRiskAvg->total(),
        ], 'At-risk students retrieved');
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
