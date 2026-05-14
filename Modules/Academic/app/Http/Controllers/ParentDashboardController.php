<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Modules\Academic\Models\Attendance;
use Modules\Academic\Models\Enrollment;
use Modules\Academic\Models\Schedule;
use Modules\AI\Models\QuizAttempt;
use Modules\AI\Models\WeakTopic;
use Modules\Commerce\Models\StudentFee;

class ParentDashboardController extends Controller
{
    use ApiResponser;

    public function dashboard()
    {
        $userId = auth()->id();

        $data = Cache::remember("dashboard:parent:{$userId}", 300, function () use ($userId) {
            $children = auth()->user()->children()->with('studentProfile.gradeLevel')->get();

            return $children->map(fn($child) => $this->buildChildData($child));
        });

        return $this->ReturnSuccess($data, 'Parent dashboard retrieved');
    }

    public function internalWeeklyReport(Request $request, $parentId)
    {
        if ($request->header('X-N8n-Secret') !== env('N8N_INCOMING_SECRET')) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $parent = \App\Models\User::findOrFail($parentId);
        $children = $parent->children()->with('studentProfile.gradeLevel')->get();

        $since = now()->subDays(7);

        $data = $children->map(function ($child) use ($since) {
            return $this->buildChildData($child, $since);
        });

        return $this->ReturnSuccess($data, 'Weekly parent report retrieved');
    }

    private function buildChildData($child, $since = null)
    {
        $attendanceQuery = Attendance::where('student_id', $child->id);
        if ($since) {
            $attendanceQuery->where('created_at', '>=', $since);
        }

        $totalAttendance = (clone $attendanceQuery)->count();
        $presentAttendance = (clone $attendanceQuery)->where('status', 'present')->count();
        $attendanceRate = $totalAttendance > 0 ? round(($presentAttendance / $totalAttendance) * 100, 2) : 0;

        $quizQuery = QuizAttempt::where('student_id', $child->id);
        if ($since) {
            $quizQuery->where('created_at', '>=', $since);
        }

        $avgScore = $quizQuery->avg('score') ?? 0;
        $recentQuizzes = (clone $quizQuery)->latest()->take(5)->get();

        $weakTopics = WeakTopic::where('student_id', $child->id)->get();

        $upcomingSessions = Schedule::whereHas('course', function ($q) use ($child) {
            $q->whereHas('enrollments', fn($e) => $e->where('student_id', $child->id));
        })
            ->where('status', 'scheduled')
            ->where('starts_at', '>', now())
            ->orderBy('starts_at')
            ->take(3)
            ->get();

        $pendingFees = StudentFee::where('student_id', $child->id)
            ->whereIn('status', ['pending', 'overdue'])
            ->sum('amount');

        $recentActivity = $this->getRecentActivity($child->id, $since ?? now()->subDays(7));

        return [
            'child'            => $child,
            'grade_level'      => $child->studentProfile?->gradeLevel,
            'attendance_rate'  => $attendanceRate,
            'avg_quiz_score'   => round($avgScore, 2),
            'weak_topics'      => $weakTopics,
            'upcoming_sessions' => $upcomingSessions,
            'pending_fees'     => (float) $pendingFees,
            'recent_activity'  => $recentActivity,
        ];
    }

    private function getRecentActivity(int $studentId, $since)
    {
        $absences = Attendance::where('student_id', $studentId)
            ->where('status', 'absent')
            ->where('created_at', '>=', $since)
            ->with('schedule.course')
            ->get()
            ->map(fn($a) => ['type' => 'absent', 'data' => $a, 'date' => $a->created_at]);

        $quizzes = QuizAttempt::where('student_id', $studentId)
            ->where('created_at', '>=', $since)
            ->get()
            ->map(fn($q) => ['type' => 'quiz', 'data' => $q, 'date' => $q->created_at]);

        return $absences->concat($quizzes)->sortByDesc('date')->values()->take(20);
    }
}
