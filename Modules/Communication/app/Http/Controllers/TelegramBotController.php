<?php

namespace Modules\Communication\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Attendance;
use Modules\Academic\Models\Enrollment;
use Modules\Academic\Models\Schedule;
use Modules\AI\Models\QuizAttempt;
use Modules\AI\Models\WeakTopic;
use Modules\Assessment\Models\Exam;
use Modules\Assessment\Models\ExamAttempt;
use Modules\Commerce\Models\StudentFee;
use Modules\Communication\Models\Announcement;
use Modules\IAM\Models\StudentProfile;

class TelegramBotController extends Controller
{
    use ApiResponser;

    private function verifySecret(Request $request): bool
    {
        return $request->header('X-N8n-Secret') === env('N8N_INCOMING_SECRET');
    }

    private function validCode(string $code): bool
    {
        return (bool) preg_match('/^STU-\d{4}-\d{4}$/', $code);
    }

    private function resolveStudentId(string $studentCode): ?int
    {
        return StudentProfile::where('student_code', $studentCode)->value('student_id');
    }

    // ─────────────────────────────────────────────
    // Lookup student by code — first call from bot
    // ─────────────────────────────────────────────
    public function lookupStudent(Request $request, string $studentCode)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        if (!$this->validCode($studentCode)) {
            return $this->ReturnFailed('Invalid student code format', 422);
        }

        $profile = StudentProfile::with('student', 'gradeLevel')
            ->where('student_code', $studentCode)
            ->first();

        if (!$profile || !$profile->student) {
            return $this->ReturnFailed('Student not found', 404);
        }

        return $this->ReturnSuccess([
            'student_id'   => $profile->student_id,
            'name'         => $profile->student->name,
            'grade'        => $profile->gradeLevel?->name ?? '',
            'student_code' => $profile->student_code,
            'is_active'    => $profile->is_active,
        ], 'Student found');
    }

    // ─────────────────────────────────────────────
    // Attendance — last 30 days + 6-month trend
    // ─────────────────────────────────────────────
    public function studentAttendance(Request $request, string $studentCode)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        if (!$this->validCode($studentCode)) {
            return $this->ReturnFailed('Invalid student code format', 422);
        }

        $studentId = $this->resolveStudentId($studentCode);
        if (!$studentId) {
            return $this->ReturnFailed('Student not found', 404);
        }

        $records = Attendance::where('student_id', $studentId)
            ->where('created_at', '>=', now()->subDays(30))
            ->get();

        $present = $records->where('status', 'present')->count();
        $absent  = $records->where('status', 'absent')->count();
        $late    = $records->where('status', 'late')->count();
        $total   = $present + $absent + $late;
        $rate    = $total > 0 ? round(($present / $total) * 100, 1) : 0;

        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $mStart   = now()->subMonths($i)->startOfMonth();
            $mEnd     = now()->subMonths($i)->endOfMonth();
            $mRecords = Attendance::where('student_id', $studentId)
                ->whereBetween('created_at', [$mStart, $mEnd])
                ->get();
            $mPresent = $mRecords->where('status', 'present')->count();
            $mTotal   = $mRecords->count();
            $trend[]  = [
                'month' => $mStart->format('M Y'),
                'rate'  => $mTotal > 0 ? round(($mPresent / $mTotal) * 100, 1) : 0,
            ];
        }

        return $this->ReturnSuccess([
            'present' => $present,
            'absent'  => $absent,
            'late'    => $late,
            'total'   => $total,
            'rate'    => $rate,
            'trend'   => $trend,
        ], 'Attendance retrieved');
    }

    // ─────────────────────────────────────────────
    // Exams — last 10 completed + upcoming
    // ─────────────────────────────────────────────
    public function studentExams(Request $request, string $studentCode)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        if (!$this->validCode($studentCode)) {
            return $this->ReturnFailed('Invalid student code format', 422);
        }

        $studentId = $this->resolveStudentId($studentCode);
        if (!$studentId) {
            return $this->ReturnFailed('Student not found', 404);
        }

        $completedAttempts = ExamAttempt::where('student_id', $studentId)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->with('exam.course')
            ->latest('submitted_at')
            ->take(10)
            ->get();

        $completed = $completedAttempts->map(fn($a) => [
            'title'      => $a->exam?->title ?? '',
            'course'     => $a->exam?->course?->name ?? '',
            'percentage' => round($a->percentage ?? 0, 1),
            'passed'     => (bool) $a->is_passed,
            'taken_at'   => $a->submitted_at?->toDateString(),
        ]);

        $enrolledCourseIds = Enrollment::where('student_id', $studentId)->pluck('course_id');
        $upcoming = [];
        if ($enrolledCourseIds->isNotEmpty()) {
            $upcoming = Exam::whereIn('course_id', $enrolledCourseIds)
                ->whereIn('status', ['active', 'published', 'scheduled'])
                ->where(function ($q) {
                    $q->where('starts_at', '>', now())
                      ->orWhere('scheduled_at', '>', now());
                })
                ->with('course')
                ->get()
                ->map(fn($e) => [
                    'title'        => $e->title,
                    'course'       => $e->course?->name ?? '',
                    'scheduled_at' => ($e->starts_at ?? $e->scheduled_at)?->toDateString(),
                ])
                ->values()
                ->toArray();
        }

        return $this->ReturnSuccess([
            'completed'      => $completed->values(),
            'upcoming'       => $upcoming,
            'avg_percentage' => $completedAttempts->isNotEmpty()
                ? round($completedAttempts->avg('percentage'), 1)
                : 0,
        ], 'Exams retrieved');
    }

    // ─────────────────────────────────────────────
    // Quizzes — last 10 attempts + weak topics
    // ─────────────────────────────────────────────
    public function studentQuizzes(Request $request, string $studentCode)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        if (!$this->validCode($studentCode)) {
            return $this->ReturnFailed('Invalid student code format', 422);
        }

        $studentId = $this->resolveStudentId($studentCode);
        if (!$studentId) {
            return $this->ReturnFailed('Student not found', 404);
        }

        $attempts = QuizAttempt::where('student_id', $studentId)
            ->latest()
            ->take(10)
            ->get()
            ->map(fn($q) => [
                'topic'  => $q->topic ?? '',
                'score'  => round($q->score ?? 0, 1),
                'passed' => (bool) $q->passed,
            ]);

        $all       = QuizAttempt::where('student_id', $studentId)->get();
        $avgScore  = $all->isNotEmpty() ? round($all->avg('score'), 1) : 0;
        $passRate  = $all->isNotEmpty()
            ? round(($all->where('passed', true)->count() / $all->count()) * 100, 1)
            : 0;

        $weakTopics = WeakTopic::where('student_id', $studentId)
            ->where('score', '<', 60)
            ->orderBy('score')
            ->take(3)
            ->get()
            ->map(fn($t) => ['topic' => $t->topic, 'score' => round($t->score, 1)]);

        return $this->ReturnSuccess([
            'attempts'    => $attempts->values(),
            'avg_score'   => $avgScore,
            'pass_rate'   => $passRate,
            'weak_topics' => $weakTopics->values(),
        ], 'Quizzes retrieved');
    }

    // ─────────────────────────────────────────────
    // Schedule — next 7 upcoming sessions
    // ─────────────────────────────────────────────
    public function studentSchedule(Request $request, string $studentCode)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        if (!$this->validCode($studentCode)) {
            return $this->ReturnFailed('Invalid student code format', 422);
        }

        $studentId = $this->resolveStudentId($studentCode);
        if (!$studentId) {
            return $this->ReturnFailed('Student not found', 404);
        }

        $sessions = Schedule::whereHas('course', function ($q) use ($studentId) {
                $q->whereHas('enrollments', fn($e) => $e->where('student_id', $studentId));
            })
            ->where('status', 'scheduled')
            ->where('starts_at', '>', now())
            ->with('course', 'teacher:id,name')
            ->orderBy('starts_at')
            ->take(7)
            ->get()
            ->map(fn($s) => [
                'course_name'  => $s->course?->name ?? '',
                'teacher_name' => $s->teacher?->name ?? '',
                'starts_at'    => $s->starts_at?->toIso8601String(),
                'ends_at'      => $s->ends_at?->toIso8601String(),
                'type'         => $s->type ?? 'online',
                'jitsi_url'    => $s->jitsi_url,
            ]);

        return $this->ReturnSuccess(['sessions' => $sessions->values()], 'Schedule retrieved');
    }

    // ─────────────────────────────────────────────
    // Fees — summary + line items
    // ─────────────────────────────────────────────
    public function studentFees(Request $request, string $studentCode)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        if (!$this->validCode($studentCode)) {
            return $this->ReturnFailed('Invalid student code format', 422);
        }

        $studentId = $this->resolveStudentId($studentCode);
        if (!$studentId) {
            return $this->ReturnFailed('Student not found', 404);
        }

        $pending      = (float) StudentFee::where('student_id', $studentId)->where('status', 'pending')->sum('amount');
        $overdue      = (float) StudentFee::where('student_id', $studentId)->where('status', 'overdue')->sum('amount');
        $paidThisYear = (float) StudentFee::where('student_id', $studentId)
            ->where('status', 'paid')
            ->where('updated_at', '>=', now()->startOfYear())
            ->sum('amount');

        $fees = StudentFee::where('student_id', $studentId)
            ->orderByDesc('created_at')
            ->take(10)
            ->get()
            ->map(fn($fee) => [
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

    // ─────────────────────────────────────────────
    // Announcements — last 5, scoped to student
    // ─────────────────────────────────────────────
    public function studentAnnouncements(Request $request, string $studentCode)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        if (!$this->validCode($studentCode)) {
            return $this->ReturnFailed('Invalid student code format', 422);
        }

        $profile = StudentProfile::where('student_code', $studentCode)->firstOrFail();
        $studentId = $profile->student_id;
        $gradeId   = $profile->grade_level_id;
        $courseIds = Enrollment::where('student_id', $studentId)->pluck('course_id');

        $announcements = Announcement::published()
            ->notExpired()
            ->where(function ($q) use ($gradeId, $courseIds) {
                $q->where('audience', 'all');
                if ($gradeId) {
                    $q->orWhere(fn($q2) => $q2->where('audience', 'grade_level')->where('audience_id', $gradeId));
                }
                if ($courseIds->isNotEmpty()) {
                    $q->orWhere(fn($q2) => $q2->where('audience', 'course')->whereIn('audience_id', $courseIds));
                }
            })
            ->latest('published_at')
            ->take(5)
            ->get()
            ->map(fn($a) => [
                'title'      => $a->title,
                'body'       => $a->body,
                'scope'      => match ($a->audience) {
                    'grade_level' => 'grade',
                    'course'      => 'course',
                    default       => 'school',
                },
                'created_at' => $a->created_at->toDateString(),
            ]);

        return $this->ReturnSuccess(['announcements' => $announcements->values()], 'Announcements retrieved');
    }

    // ─────────────────────────────────────────────
    // D1: Absence alert context — student info + registered parent chat IDs
    // Called by n8n after receiving student_absent webhook
    // ─────────────────────────────────────────────
    public function absenceAlertContext(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $studentId  = (int) $request->query('student_id');
        $scheduleId = (int) $request->query('schedule_id');

        if (!$studentId || !$scheduleId) {
            return $this->ReturnFailed('Missing student_id or schedule_id', 422);
        }

        $student  = User::findOrFail($studentId);
        $schedule = Schedule::with('course')->findOrFail($scheduleId);

        $studentCode = StudentProfile::where('student_id', $studentId)->value('student_code');

        $chatIds = DB::table('parent_telegram_registrations')
            ->where('student_code', $studentCode)
            ->pluck('telegram_chat_id')
            ->values();

        return $this->ReturnSuccess([
            'student_name'      => $student->name,
            'course_name'       => $schedule->course?->name ?? '',
            'starts_at'         => $schedule->starts_at?->toIso8601String(),
            'telegram_chat_ids' => $chatIds,
        ], 'Absence context retrieved');
    }

    // ─────────────────────────────────────────────
    // D5: Session live context — course info + all enrolled students' parent chat IDs
    // Called by n8n after receiving session_live webhook
    // ─────────────────────────────────────────────
    public function sessionLiveContext(Request $request, int $scheduleId)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $schedule = Schedule::with('course', 'teacher')->findOrFail($scheduleId);

        $studentIds   = Enrollment::where('course_id', $schedule->course_id)->pluck('student_id');
        $studentCodes = StudentProfile::whereIn('student_id', $studentIds)
            ->pluck('student_code', 'student_id');
        $studentNames = User::whereIn('id', $studentIds)->pluck('name', 'id');
        $codeToId     = $studentCodes->flip();

        $parents = DB::table('parent_telegram_registrations')
            ->whereIn('student_code', $studentCodes->values())
            ->get()
            ->map(fn($r) => [
                'telegram_chat_id' => $r->telegram_chat_id,
                'student_name'     => $studentNames[$codeToId[$r->student_code] ?? 0] ?? '',
            ]);

        return $this->ReturnSuccess([
            'course_name'  => $schedule->course?->name ?? '',
            'teacher_name' => $schedule->teacher?->name ?? '',
            'starts_at'    => $schedule->starts_at?->toIso8601String(),
            'jitsi_url'    => $schedule->jitsi_url,
            'parents'      => $parents->values(),
        ], 'Session context retrieved');
    }

    // ─────────────────────────────────────────────
    // D3: Upcoming exams in next 48h with enrolled students' parent chat IDs
    // Called by daily 8AM cron flow
    // ─────────────────────────────────────────────
    public function upcomingExamsWithParents(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $exams = Exam::with('course')
            ->whereIn('status', ['active', 'published', 'scheduled'])
            ->where(function ($q) {
                $q->whereBetween('starts_at', [now(), now()->addHours(48)])
                  ->orWhereBetween('scheduled_at', [now(), now()->addHours(48)]);
            })
            ->get();

        $result = $exams->map(function ($exam) {
            $studentIds   = Enrollment::where('course_id', $exam->course_id)->pluck('student_id');
            $studentCodes = StudentProfile::whereIn('student_id', $studentIds)
                ->pluck('student_code', 'student_id');
            $studentNames = User::whereIn('id', $studentIds)->pluck('name', 'id');
            $codeToId     = $studentCodes->flip();

            $parents = DB::table('parent_telegram_registrations')
                ->whereIn('student_code', $studentCodes->values())
                ->get()
                ->map(fn($r) => [
                    'telegram_chat_id' => $r->telegram_chat_id,
                    'student_name'     => $studentNames[$codeToId[$r->student_code] ?? 0] ?? '',
                ]);

            return [
                'exam_title'   => $exam->title,
                'course_name'  => $exam->course?->name ?? '',
                'scheduled_at' => ($exam->starts_at ?? $exam->scheduled_at)?->toIso8601String(),
                'duration'     => $exam->duration_minutes ?? 0,
                'parents'      => $parents->values(),
            ];
        })->filter(fn($e) => $e['parents']->isNotEmpty());

        return $this->ReturnSuccess(['exams' => $result->values()], 'Upcoming exams retrieved');
    }

    // ─────────────────────────────────────────────
    // D4: All overdue fees with registered parent chat IDs
    // Called by 1st-of-month cron flow
    // ─────────────────────────────────────────────
    public function overdueFeesWithParents(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $fees = StudentFee::with('student')
            ->where('status', 'overdue')
            ->get();

        $studentIds   = $fees->pluck('student_id')->unique();
        $studentCodes = StudentProfile::whereIn('student_id', $studentIds)
            ->pluck('student_code', 'student_id');

        $registrations = DB::table('parent_telegram_registrations')
            ->whereIn('student_code', $studentCodes->values())
            ->get()
            ->groupBy('student_code');

        $result = $fees->map(function ($fee) use ($studentCodes, $registrations) {
            $code    = $studentCodes[$fee->student_id] ?? '';
            $chatIds = collect($registrations[$code] ?? [])->pluck('telegram_chat_id')->values();
            $days    = $fee->due_date ? (int) $fee->due_date->diffInDays(now()) : 0;

            return [
                'student_name'      => $fee->student?->name ?? '',
                'description'       => $fee->description ?? '',
                'amount'            => (float) $fee->amount,
                'due_date'          => $fee->due_date?->toDateString(),
                'days_overdue'      => $days,
                'is_long_overdue'   => $days > 30,
                'telegram_chat_ids' => $chatIds,
            ];
        });

        return $this->ReturnSuccess(['fees' => $result->values()], 'Overdue fees retrieved');
    }

    // ─────────────────────────────────────────────
    // Register parent Telegram chat ID
    // ─────────────────────────────────────────────
    public function registerParentChat(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $chatId      = (string) $request->input('telegram_chat_id');
        $studentCode = strtoupper(trim((string) $request->input('student_code', '')));

        if (!$chatId || !$this->validCode($studentCode)) {
            return $this->ReturnFailed('Invalid parameters', 422);
        }

        $tenant = app('tenant');

        DB::table('parent_telegram_registrations')->updateOrInsert(
            [
                'telegram_chat_id' => $chatId,
                'student_code'     => $studentCode,
                'tenant_id'        => $tenant->id,
            ],
            ['registered_at' => now(), 'updated_at' => now()]
        );

        return $this->ReturnSuccess(['status' => 'registered'], 'Parent registered');
    }
}
