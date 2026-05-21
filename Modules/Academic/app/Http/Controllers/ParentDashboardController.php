<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Modules\Academic\Models\Attendance;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Enrollment;
use Modules\Academic\Models\Schedule;
use Modules\AI\Models\QuizAttempt;
use Modules\AI\Models\WeakTopic;
use Modules\Assessment\Models\Exam;
use Modules\Assessment\Models\ExamAttempt;
use Modules\Commerce\Models\StudentFee;

class ParentDashboardController extends Controller
{
    use ApiResponser;

    public function dashboard()
    {
        $userId = auth()->id();

        $data = Cache::remember("dashboard:parent:{$userId}", 300, function () {
            $parent   = auth()->user();
            $children = $parent->children()->with('studentProfile.gradeLevel')->get();

            $childrenData = $children->map(function ($child) {
                $total   = Attendance::where('student_id', $child->id)->count();
                $present = Attendance::where('student_id', $child->id)->where('status', 'present')->count();
                $attendanceRate = $total > 0 ? round(($present / $total) * 100, 2) : 0;

                $avgScore     = round(QuizAttempt::where('student_id', $child->id)->avg('score') ?? 0, 2);
                $coursesCount = Enrollment::where('student_id', $child->id)->count();
                $pendingFees  = StudentFee::where('student_id', $child->id)
                    ->whereIn('status', ['pending', 'overdue'])
                    ->sum('amount');

                if ((float) $pendingFees > 0) {
                    $status = 'overdue_fees';
                } elseif ($attendanceRate < 75 || $avgScore < 60) {
                    $status = 'at_risk';
                } else {
                    $status = 'good';
                }

                return [
                    'id'              => $child->id,
                    'name'            => $child->name,
                    'avatar_url'      => $child->avatar_url,
                    'grade'           => $child->studentProfile?->gradeLevel?->name ?? '',
                    'attendance_rate' => $attendanceRate,
                    'avg_score'       => $avgScore,
                    'courses_count'   => $coursesCount,
                    'status'          => $status,
                ];
            });

            // Alerts
            $alerts = [];
            $allGood = true;
            foreach ($childrenData as $c) {
                if ($c['status'] === 'overdue_fees') {
                    $allGood = false;
                    $alerts[] = ['type' => 'overdue_fees', 'message' => 'Outstanding fees require attention', 'child_name' => $c['name']];
                } elseif ($c['status'] === 'at_risk') {
                    $allGood = false;
                    $alerts[] = ['type' => 'at_risk', 'message' => 'Student is at risk due to low attendance or scores', 'child_name' => $c['name']];
                }
            }
            if ($allGood) {
                $alerts = [['type' => 'all_good', 'message' => 'All children are on track', 'child_name' => '']];
            }

            // Activity: last 20 items across all children
            $counter  = 1;
            $activity = collect();

            foreach ($children as $child) {
                $absences = Attendance::where('student_id', $child->id)
                    ->where('status', 'absent')
                    ->with('schedule.course')
                    ->latest()
                    ->take(20)
                    ->get()
                    ->map(function ($a) use ($child, &$counter) {
                        $courseName = $a->schedule?->course?->name ?? $a->schedule?->title ?? 'class';
                        $date       = $a->created_at?->toDateString() ?? '';
                        return [
                            'id'         => $counter++,
                            'type'       => 'absence',
                            'message'    => "{$child->name} was absent from {$courseName} on {$date}",
                            'created_at' => $a->created_at?->toIso8601String(),
                            '_sort'      => $a->created_at,
                        ];
                    });

                $quizzes = QuizAttempt::where('student_id', $child->id)
                    ->latest()
                    ->take(20)
                    ->get()
                    ->map(function ($q) use ($child, &$counter) {
                        $score = round($q->score ?? 0);
                        $topic = $q->topic ?? 'a quiz';
                        return [
                            'id'         => $counter++,
                            'type'       => 'score',
                            'message'    => "{$child->name} scored {$score}% on {$topic}",
                            'created_at' => $q->created_at?->toIso8601String(),
                            '_sort'      => $q->created_at,
                        ];
                    });

                $activity = $activity->concat($absences)->concat($quizzes);
            }

            $activity = $activity->sortByDesc('_sort')->values()->take(20)->map(function ($item) {
                unset($item['_sort']);
                return $item;
            })->values();

            // Upcoming sessions
            $childIds = $children->pluck('id');
            $upcomingSessions = Schedule::whereHas('course', function ($q) use ($childIds) {
                    $q->whereHas('enrollments', fn($e) => $e->whereIn('student_id', $childIds));
                })
                ->where('status', 'scheduled')
                ->where('starts_at', '>', now())
                ->with('course')
                ->orderBy('starts_at')
                ->take(10)
                ->get()
                ->map(function ($s) use ($children) {
                    // Find which child is enrolled
                    $enrolled = $children->first(function ($child) use ($s) {
                        return Enrollment::where('student_id', $child->id)
                            ->where('course_id', $s->course_id)
                            ->exists();
                    });
                    return [
                        'id'          => $s->id,
                        'course_name' => $s->course?->name ?? '',
                        'child_name'  => $enrolled?->name ?? '',
                        'starts_at'   => $s->starts_at?->toIso8601String(),
                        'type'        => $s->type ?? 'online',
                    ];
                });

            return [
                'parent'            => $parent->only(['name']),
                'academy'           => app('tenant')->only(['name']),
                'children'          => $childrenData->values(),
                'alerts'            => $alerts,
                'activity'          => $activity,
                'upcoming_sessions' => $upcomingSessions,
            ];
        });

        return $this->ReturnSuccess($data, 'Parent dashboard retrieved');
    }

    public function children()
    {
        $children = auth()->user()->children()->with('studentProfile.gradeLevel')->get();

        $data = $children->map(function ($child) {
            $total   = Attendance::where('student_id', $child->id)->count();
            $present = Attendance::where('student_id', $child->id)->where('status', 'present')->count();
            $rate    = $total > 0 ? round(($present / $total) * 100, 2) : 0;

            $avgScore     = round(QuizAttempt::where('student_id', $child->id)->avg('score') ?? 0, 2);
            $coursesCount = Enrollment::where('student_id', $child->id)->count();
            $pendingFees  = StudentFee::where('student_id', $child->id)
                ->whereIn('status', ['pending', 'overdue'])
                ->sum('amount');

            return [
                'id'              => $child->id,
                'name'            => $child->name,
                'avatar_url'      => $child->avatar_url,
                'student_code'    => $child->studentProfile?->student_code ?? '',
                'grade'           => $child->studentProfile?->gradeLevel?->name ?? '',
                'attendance_rate' => $rate,
                'avg_score'       => $avgScore,
                'courses_count'   => $coursesCount,
                'pending_fees'    => (float) $pendingFees,
            ];
        });

        return $this->ReturnSuccess(['children' => $data->values()], 'Children retrieved');
    }

    public function childDetail($childId)
    {
        $parent = auth()->user();
        $child  = $parent->children()->with('studentProfile.gradeLevel')->findOrFail($childId);

        $total   = Attendance::where('student_id', $child->id)->count();
        $present = Attendance::where('student_id', $child->id)->where('status', 'present')->count();
        $rate    = $total > 0 ? round(($present / $total) * 100, 2) : 0;

        $avgScore = round(QuizAttempt::where('student_id', $child->id)->avg('score') ?? 0, 2);

        $scoreHistory = ExamAttempt::where('student_id', $child->id)
            ->with('exam')
            ->latest('submitted_at')
            ->take(10)
            ->get()
            ->map(fn($a) => [
                'label' => $a->exam?->title ?? '',
                'score' => (int) round($a->percentage ?? 0),
            ]);

        $weakTopics = WeakTopic::where('student_id', $child->id)
            ->where('score', '<', 60)
            ->orderBy('score')
            ->get()
            ->map(fn($t) => ['name' => $t->topic, 'score' => (int) $t->score]);

        $strongTopics = WeakTopic::where('student_id', $child->id)
            ->where('score', '>=', 80)
            ->orderByDesc('score')
            ->get()
            ->map(fn($t) => ['name' => $t->topic, 'score' => (int) $t->score]);

        $courses = Course::whereHas('enrollments', fn($q) => $q->where('student_id', $child->id))
            ->with('schedules')
            ->get()
            ->map(function ($course) use ($child) {
                $scheduleIds   = $course->schedules()->pluck('id');
                $totalSchedules = $course->schedules()->count();

                if ($totalSchedules === 0) {
                    $progress = 0;
                } else {
                    $attendedCount = Attendance::where('student_id', $child->id)
                        ->whereIn('schedule_id', $scheduleIds)
                        ->where('status', 'present')
                        ->count();
                    $progress = (int) round(($attendedCount / $totalSchedules) * 100);
                }

                return [
                    'name'     => $course->name,
                    'progress' => $progress,
                ];
            });

        return $this->ReturnSuccess([
            'child' => [
                'id'              => $child->id,
                'name'            => $child->name,
                'avatar_url'      => $child->avatar_url,
                'grade'           => $child->studentProfile?->gradeLevel?->name ?? '',
                'student_code'    => $child->studentProfile?->student_code ?? '',
                'academy_name'    => app('tenant')->name,
                'attendance_rate' => $rate,
                'avg_score'       => $avgScore,
                'score_history'   => $scoreHistory,
                'weak_topics'     => $weakTopics,
                'strong_topics'   => $strongTopics,
                'courses'         => $courses,
            ],
        ], 'Child detail retrieved');
    }

    public function childAttendance(Request $request, $childId)
    {
        $parent = auth()->user();
        $child  = $parent->children()->findOrFail($childId);

        $month  = $request->query('month', now()->format('Y-m'));
        $start  = Carbon::parse($month . '-01')->startOfMonth();
        $end    = Carbon::parse($month . '-01')->endOfMonth();

        $records = Attendance::where('student_id', $child->id)
            ->whereBetween('created_at', [$start, $end])
            ->with('schedule')
            ->get();

        $days = $records->map(fn($r) => [
            'date'   => $r->created_at->toDateString(),
            'status' => $r->status,
        ])->values();

        $presentCount = $records->where('status', 'present')->count();
        $absentCount  = $records->where('status', 'absent')->count();
        $lateCount    = $records->where('status', 'late')->count();
        $totalCount   = $presentCount + $absentCount + $lateCount;
        $rate         = $totalCount > 0 ? round(($presentCount / $totalCount) * 100, 1) : 0;

        // Trend: last 6 months
        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $mStart = now()->subMonths($i)->startOfMonth();
            $mEnd   = now()->subMonths($i)->endOfMonth();

            $mRecords  = Attendance::where('student_id', $child->id)
                ->whereBetween('created_at', [$mStart, $mEnd])
                ->get();

            $mPresent = $mRecords->where('status', 'present')->count();
            $mAbsent  = $mRecords->where('status', 'absent')->count();
            $mLate    = $mRecords->where('status', 'late')->count();
            $mTotal   = $mPresent + $mAbsent + $mLate;
            $mRate    = $mTotal > 0 ? round(($mPresent / $mTotal) * 100, 1) : 0;

            $trend[] = [
                'month' => $mStart->format('M'),
                'rate'  => $mRate,
            ];
        }

        return $this->ReturnSuccess([
            'month'   => $month,
            'days'    => $days,
            'summary' => [
                'present' => $presentCount,
                'absent'  => $absentCount,
                'late'    => $lateCount,
            ],
            'rate'  => $rate,
            'trend' => $trend,
        ], 'Child attendance retrieved');
    }

    public function childExams($childId)
    {
        $parent = auth()->user();
        $child  = $parent->children()->findOrFail($childId);

        $completedAttempts = ExamAttempt::where('student_id', $child->id)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->with('exam.course')
            ->latest('submitted_at')
            ->take(20)
            ->get();

        $completed = $completedAttempts->map(fn($attempt) => [
            'id'         => $attempt->id,
            'title'      => $attempt->exam?->title ?? '',
            'course'     => $attempt->exam?->course?->name ?? '',
            'score'      => (int) ($attempt->total_score ?? 0),
            'total'      => (int) ($attempt->exam?->total_marks ?? 0),
            'percentage' => round($attempt->percentage ?? 0, 1),
            'passed'     => (bool) $attempt->is_passed,
            'taken_at'   => $attempt->submitted_at?->toIso8601String(),
        ]);

        // Upcoming exams for enrolled courses
        $enrolledCourseIds = Enrollment::where('student_id', $child->id)->pluck('course_id');

        $upcoming = [];
        if ($enrolledCourseIds->isNotEmpty()) {
            $upcoming = Exam::whereIn('course_id', $enrolledCourseIds)
                ->whereIn('status', ['active', 'published', 'scheduled'])
                ->where(function ($q) {
                    $q->whereNotNull('starts_at')->where('starts_at', '>', now())
                      ->orWhereNotNull('scheduled_at')->where('scheduled_at', '>', now());
                })
                ->with('course')
                ->get()
                ->map(fn($exam) => [
                    'id'               => $exam->id,
                    'title'            => $exam->title,
                    'course'           => $exam->course?->name ?? '',
                    'scheduled_at'     => ($exam->starts_at ?? $exam->scheduled_at)?->toIso8601String(),
                    'duration_minutes' => $exam->duration_minutes ?? 0,
                ])
                ->values()
                ->toArray();
        }

        $trend = $completedAttempts->sortBy('submitted_at')->take(10)->map(fn($a) => [
            'label' => $a->exam?->title ?? '',
            'score' => (int) round($a->percentage ?? 0),
        ])->values();

        return $this->ReturnSuccess([
            'upcoming'  => $upcoming,
            'completed' => $completed->values(),
            'trend'     => $trend,
        ], 'Child exams retrieved');
    }

    public function fees(Request $request)
    {
        $childIds = auth()->user()->children()->pluck('users.id');

        if ($request->has('child_id')) {
            $requestedChildId = (int) $request->query('child_id');
            if (! $childIds->contains($requestedChildId)) {
                return $this->ReturnFailed('Child not found', 403);
            }
            $childIds = collect([$requestedChildId]);
        }

        $pending      = (float) StudentFee::whereIn('student_id', $childIds)->where('status', 'pending')->sum('amount');
        $overdue      = (float) StudentFee::whereIn('student_id', $childIds)->where('status', 'overdue')->sum('amount');
        $paidThisYear = (float) StudentFee::whereIn('student_id', $childIds)
            ->where('status', 'paid')
            ->where('updated_at', '>=', now()->startOfYear())
            ->sum('amount');

        $fees = StudentFee::whereIn('student_id', $childIds)
            ->with('student')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($fee) => [
                'id'          => $fee->id,
                'child_name'  => $fee->student?->name ?? '',
                'description' => $fee->description ?? '',
                'amount'      => (float) $fee->amount,
                'due_date'    => $fee->due_date?->toDateString(),
                'status'      => $fee->status,
            ]);

        return $this->ReturnSuccess([
            'summary' => [
                'pending'        => $pending,
                'overdue'        => $overdue,
                'paid_this_year' => $paidThisYear,
            ],
            'fees' => $fees->values(),
        ], 'Fees retrieved');
    }

    public function attendance()
    {
        $childIds = auth()->user()->children()->pluck('users.id');

        $records = Attendance::whereIn('student_id', $childIds)
            ->with('student', 'schedule.course')
            ->latest()
            ->take(100)
            ->get()
            ->map(fn($a) => [
                'child'   => $a->student?->name ?? '',
                'date'    => $a->created_at?->toDateString(),
                'status'  => $a->status,
                'session' => $a->schedule?->title ?? ($a->schedule?->course?->name ?? ''),
            ]);

        return $this->ReturnSuccess($records, 'Attendance retrieved');
    }

    public function internalWeeklyReport(Request $request, $parentId)
    {
        if ($request->header('X-N8n-Secret') !== env('N8N_INCOMING_SECRET')) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $parent   = \App\Models\User::findOrFail($parentId);
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

        $totalAttendance   = (clone $attendanceQuery)->count();
        $presentAttendance = (clone $attendanceQuery)->where('status', 'present')->count();
        $attendanceRate    = $totalAttendance > 0 ? round(($presentAttendance / $totalAttendance) * 100, 2) : 0;

        $quizQuery = QuizAttempt::where('student_id', $child->id);
        if ($since) {
            $quizQuery->where('created_at', '>=', $since);
        }

        $avgScore     = $quizQuery->avg('score') ?? 0;
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
            'child'             => $child,
            'grade_level'       => $child->studentProfile?->gradeLevel,
            'attendance_rate'   => $attendanceRate,
            'avg_quiz_score'    => round($avgScore, 2),
            'weak_topics'       => $weakTopics,
            'upcoming_sessions' => $upcomingSessions,
            'pending_fees'      => (float) $pendingFees,
            'recent_activity'   => $recentActivity,
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
