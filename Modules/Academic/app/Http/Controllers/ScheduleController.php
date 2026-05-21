<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\Academic\Http\Requests\StoreScheduleRequest;
use Modules\Academic\Http\Requests\UpdateScheduleStatusRequest;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Schedule;
use Modules\Academic\Services\JitsiTokenService;

class ScheduleController extends Controller
{
    use ApiResponser;

    public function index($courseId)
    {
        $course = Course::findOrFail($courseId);
        $schedules = $course->schedules()->orderBy('starts_at')->paginate(15);
        return $this->ReturnSuccess($schedules, 'Schedules retrieved');
    }

    public function store(StoreScheduleRequest $request, $courseId)
    {
        $course = Course::findOrFail($courseId);
        $tenant = app('tenant');

        if (auth()->user()->hasRole('teacher') && $course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $data = $request->validated() + [
            'tenant_id'  => $tenant->id,
            'course_id'  => $course->id,
            'teacher_id' => auth()->user()->hasRole('teacher') ? auth()->id() : $course->teacher_id,
        ];

        if ($data['type'] === 'online') {
            $room = Schedule::generateJitsiRoom($tenant->code, $course->id);
            $baseUrl = config('services.jitsi.base_url');
            $data['jitsi_room'] = $room;
            $data['jitsi_url']  = "{$baseUrl}/{$room}";
        }

        $schedule = Schedule::create($data);

        SendN8nWebhookJob::dispatch('schedule_created', [
            'schedule_id' => $schedule->id,
            'course_id'   => $course->id,
            'starts_at'   => $schedule->starts_at->toISOString(),
        ], $tenant->id);

        return $this->ReturnSuccess($schedule, 'Schedule created', 201);
    }

    public function update(StoreScheduleRequest $request, $courseId, $id)
    {
        $schedule = Schedule::where('course_id', $courseId)->findOrFail($id);

        if (auth()->user()->hasRole('teacher') && $schedule->course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        if (in_array($schedule->status, ['live', 'completed'])) {
            return $this->ReturnFailed('Cannot update a live or completed schedule', 422);
        }

        $schedule->update($request->validated());
        return $this->ReturnSuccess($schedule->fresh(), 'Schedule updated');
    }

    public function updateStatus(UpdateScheduleStatusRequest $request, $courseId, $id)
    {
        $schedule = Schedule::where('course_id', $courseId)->findOrFail($id);
        $tenant = app('tenant');

        if (auth()->user()->hasRole('teacher') && $schedule->course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $schedule->update(['status' => $request->status]);

        $event = match ($request->status) {
            'cancelled' => 'schedule_cancelled',
            'live'      => 'session_live',
            default     => null,
        };

        if ($event) {
            SendN8nWebhookJob::dispatch($event, [
                'schedule_id' => $schedule->id,
                'course_id'   => $courseId,
            ], $tenant->id);
        }

        return $this->ReturnSuccess($schedule->fresh(), 'Schedule status updated');
    }

    public function destroy($courseId, $id)
    {
        $schedule = Schedule::where('course_id', $courseId)->findOrFail($id);

        if (auth()->user()->hasRole('teacher') && $schedule->course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        if ($schedule->status !== 'scheduled') {
            return $this->ReturnFailed('Only scheduled sessions can be deleted', 422);
        }

        SendN8nWebhookJob::dispatch('schedule_cancelled', [
            'schedule_id' => $schedule->id,
            'course_id'   => $courseId,
        ], app('tenant')->id);

        $schedule->delete();
        return $this->ReturnSuccess(null, 'Schedule deleted');
    }

    public function teacherAllSchedules()
    {
        $teacherCourseIds = Course::where('teacher_id', auth()->id())->pluck('id');

        if ($courseId = request('course_id')) {
            if (!$teacherCourseIds->contains((int) $courseId)) {
                return $this->ReturnFailed('Unauthorized', 403);
            }
            $teacherCourseIds = collect([(int) $courseId]);
        }

        $schedules = Schedule::whereIn('course_id', $teacherCourseIds)
            ->with(['course:id,name,subject_id', 'course.subject:id,name'])
            ->orderByDesc('starts_at')
            ->paginate(20);

        return $this->ReturnSuccess($schedules, 'Schedules retrieved');
    }

    public function upcomingSchedules()
    {
        $query = Schedule::whereHas('course', function ($q) {
            $q->whereHas('enrollments', fn($e) => $e->where('student_id', auth()->id()));
        })->with(['course:id,name,subject_id', 'course.subject:id,name', 'teacher:id,name,avatar_url']);

        if ($courseId = request('course_id')) {
            $query->where('course_id', $courseId);
        }

        $schedules = $query->orderByDesc('starts_at')->paginate(20);

        return $this->ReturnSuccess($schedules, 'Schedules retrieved');
    }

    public function studentCourseSchedules($courseId)
    {
        $course = Course::whereHas('enrollments', fn($q) => $q->where('student_id', auth()->id()))
            ->findOrFail($courseId);

        $schedules = Schedule::where('course_id', $course->id)
            ->orderBy('starts_at')
            ->get();

        return $this->ReturnSuccess($schedules, 'Course schedules retrieved');
    }

    public function teacherJoin($courseId, $id, JitsiTokenService $jitsi)
    {
        $schedule = Schedule::where('course_id', $courseId)->findOrFail($id);

        if (auth()->user()->hasRole('teacher') && $schedule->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        if ($schedule->type !== 'online' || !$schedule->jitsi_url) {
            return $this->ReturnFailed('This session has no online meeting link', 422);
        }

        $url = $jitsi->getJoinUrl($schedule, auth()->user(), true);

        return $this->ReturnSuccess(['url' => $url], 'Join URL generated');
    }

    public function studentJoin($courseId, $id, JitsiTokenService $jitsi)
    {
        $course = Course::whereHas('enrollments', fn($q) => $q->where('student_id', auth()->id()))
            ->findOrFail($courseId);

        $schedule = Schedule::where('course_id', $course->id)
            ->where('status', 'live')
            ->where('type', 'online')
            ->findOrFail($id);

        if (!$schedule->jitsi_url) {
            return $this->ReturnFailed('This session has no online meeting link', 422);
        }

        $url = $jitsi->getJoinUrl($schedule, auth()->user(), false);

        return $this->ReturnSuccess(['url' => $url], 'Join URL generated');
    }
}
