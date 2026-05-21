<?php

namespace Modules\Communication\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Academic\Models\Attendance;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Enrollment;
use Modules\Academic\Models\Schedule;
use Modules\AI\Models\WeakTopic;
use Modules\Assessment\Models\ExamAttempt;
use Modules\Commerce\Models\StudentFee;
use Modules\Communication\Http\Requests\IncomingWebhookRequest;
use Modules\IAM\Models\ParentStudent;

class WebhookController extends Controller
{
    use ApiResponser;

    public function notify(IncomingWebhookRequest $request)
    {
        $tenant = app('tenant');
        $validated = $request->validated();

        $notifications = collect($validated['user_ids'])->map(fn($userId) => [
            'id'              => Str::uuid()->toString(),
            'type'            => $validated['type'],
            'notifiable_type' => 'App\Models\User',
            'notifiable_id'   => $userId,
            'data'            => json_encode($validated['data'] ?? []),
            'tenant_id'       => $tenant->id,
            'title'           => $validated['title'],
            'body'            => $validated['body'],
            'created_at'      => now(),
            'updated_at'      => now(),
        ])->toArray();

        DB::table('notifications')->insert($notifications);

        return $this->ReturnSuccess(['created' => count($notifications)], 'Notifications created');
    }

    public function internalUpcoming(Request $request)
    {
        if ($request->header('X-N8n-Secret') !== env('N8N_INCOMING_SECRET')) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $schedules = Schedule::with('course', 'teacher')
            ->where('status', 'scheduled')
            ->where('starts_at', '>=', now())
            ->where('starts_at', '<=', now()->addMinutes(35))
            ->get();

        return $this->ReturnSuccess($schedules, 'Upcoming sessions retrieved');
    }

    public function weeklySummary(Request $request)
    {
        if ($request->header('X-N8n-Secret') !== env('N8N_INCOMING_SECRET')) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $weekStart = now()->startOfWeek();
        $weekEnd   = now()->endOfWeek();

        $attempts = ExamAttempt::whereBetween('submitted_at', [$weekStart, $weekEnd])
            ->whereNotNull('submitted_at')
            ->get();

        $attendances    = Attendance::whereBetween('created_at', [$weekStart, $weekEnd])->get();
        $totalAttended  = $attendances->count();
        $presentCount   = $attendances->where('status', 'present')->count();

        $chronicAbsent = $attendances->where('status', 'absent')
            ->groupBy('student_id')
            ->filter(fn($group) => $group->count() >= 3)
            ->keys()
            ->map(fn($id) => optional(User::find($id))->name)
            ->filter()
            ->values();

        $overdueFees = StudentFee::overdue()->get();

        return $this->ReturnSuccess([
            'week' => [
                'from' => $weekStart->toDateString(),
                'to'   => $weekEnd->toDateString(),
            ],
            'exams' => [
                'count'         => $attempts->count(),
                'avg_score'     => round($attempts->avg('percentage') ?? 0, 1),
                'failing_count' => $attempts->where('is_passed', false)->count(),
            ],
            'attendance' => [
                'rate'                    => $totalAttended > 0 ? round(($presentCount / $totalAttended) * 100, 1) : 0,
                'chronic_absent_students' => $chronicAbsent,
            ],
            'fees' => [
                'overdue_count' => $overdueFees->count(),
                'overdue_total' => (float) $overdueFees->sum('amount'),
            ],
        ], 'Weekly summary retrieved');
    }

    public function studentInterventionContext(Request $request, $student_id)
    {
        if ($request->header('X-N8n-Secret') !== env('N8N_INCOMING_SECRET')) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $student = User::withoutGlobalScopes()->findOrFail($student_id);

        $weakTopics = WeakTopic::where('student_id', $student_id)
            ->orderByDesc('attempts')
            ->take(5)
            ->pluck('topic');

        $recentExams = ExamAttempt::with('exam')
            ->where('student_id', $student_id)
            ->whereNotNull('submitted_at')
            ->latest('submitted_at')
            ->take(3)
            ->get()
            ->map(fn($a) => [
                'exam_title' => optional($a->exam)->title,
                'score'      => $a->percentage,
                'is_passed'  => $a->is_passed,
                'date'       => optional($a->submitted_at)->toDateString(),
            ]);

        $attendances     = Attendance::where('student_id', $student_id)
            ->where('created_at', '>=', now()->subDays(30))
            ->get();
        $attendanceRate  = $attendances->count() > 0
            ? round(($attendances->where('status', 'present')->count() / $attendances->count()) * 100, 1)
            : null;

        $enrollment = Enrollment::with('course.teacher')
            ->where('student_id', $student_id)
            ->latest()
            ->first();
        $teacher = optional($enrollment?->course)->teacher;

        $parentLink = ParentStudent::with('parent')
            ->where('student_id', $student_id)
            ->first();
        $parent = $parentLink?->parent;

        return $this->ReturnSuccess([
            'student'         => ['id' => $student->id, 'name' => $student->name, 'email' => $student->email],
            'weak_topics'     => $weakTopics,
            'recent_exams'    => $recentExams,
            'attendance_rate' => $attendanceRate,
            'teacher'         => $teacher ? ['name' => $teacher->name, 'email' => $teacher->email] : null,
            'parent'          => $parent ? ['name' => $parent->name, 'email' => $parent->email] : null,
        ], 'Student intervention context retrieved');
    }

    public function courseEnrolledUsers(Request $request, $course_id)
    {
        if ($request->header('X-N8n-Secret') !== env('N8N_INCOMING_SECRET')) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $course = Course::with('teacher')->findOrFail($course_id);

        $students = Enrollment::with('student')
            ->where('course_id', $course_id)
            ->get()
            ->map(fn($e) => [
                'id'    => optional($e->student)->id,
                'name'  => optional($e->student)->name,
                'email' => optional($e->student)->email,
            ])
            ->filter(fn($s) => $s['id'] !== null)
            ->values();

        return $this->ReturnSuccess([
            'course'   => ['id' => $course->id, 'name' => $course->name],
            'teacher'  => $course->teacher
                ? ['name' => $course->teacher->name, 'email' => $course->teacher->email]
                : null,
            'students' => $students,
        ], 'Enrolled users retrieved');
    }
}
