<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\Academic\Http\Requests\BulkAttendanceRequest;
use Modules\Academic\Http\Requests\UpdateAttendanceRequest;
use Modules\Academic\Models\Attendance;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Schedule;

class AttendanceController extends Controller
{
    use ApiResponser;

    public function show($scheduleId)
    {
        $schedule = Schedule::findOrFail($scheduleId);

        if ($schedule->course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $tenant = app('tenant');

        $enrolled = $schedule->course->enrollments()->pluck('student_id');

        foreach ($enrolled as $studentId) {
            Attendance::firstOrCreate([
                'tenant_id'   => $tenant->id,
                'schedule_id' => $schedule->id,
                'student_id'  => $studentId,
            ], ['status' => 'absent']);
        }

        $attendances = $schedule->attendances()->with('student')->get();
        return $this->ReturnSuccess($attendances, 'Attendance retrieved');
    }

    public function bulkMark(BulkAttendanceRequest $request, $scheduleId)
    {
        $schedule = Schedule::findOrFail($scheduleId);

        if ($schedule->course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $tenant = app('tenant');
        $markedBy = auth()->id();

        foreach ($request->attendance as $record) {
            Attendance::updateOrCreate(
                [
                    'tenant_id'   => $tenant->id,
                    'schedule_id' => $schedule->id,
                    'student_id'  => $record['student_id'],
                ],
                [
                    'status'    => $record['status'],
                    'notes'     => $record['notes'] ?? null,
                    'marked_by' => $markedBy,
                ]
            );

            if ($record['status'] === 'absent') {
                SendN8nWebhookJob::dispatch('student_absent', [
                    'student_id'  => $record['student_id'],
                    'schedule_id' => $schedule->id,
                    'course_id'   => $schedule->course_id,
                ], $tenant->id);
            }
        }

        return $this->ReturnSuccess(null, 'Attendance marked');
    }

    public function updateOne(UpdateAttendanceRequest $request, $scheduleId, $attendanceId)
    {
        $attendance = Attendance::where('schedule_id', $scheduleId)->findOrFail($attendanceId);
        $attendance->update($request->validated() + ['marked_by' => auth()->id()]);
        return $this->ReturnSuccess($attendance->fresh(), 'Attendance updated');
    }

    public function courseReport($courseId)
    {
        $course = Course::findOrFail($courseId);

        $report = Attendance::whereHas('schedule', fn($q) => $q->where('course_id', $course->id))
            ->selectRaw('student_id, status, COUNT(*) as count')
            ->groupBy('student_id', 'status')
            ->with('student:id,name')
            ->get()
            ->groupBy('student_id');

        return $this->ReturnSuccess($report, 'Attendance report retrieved');
    }

    public function mySummary()
    {
        $summary = Attendance::where('student_id', auth()->id())
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        return $this->ReturnSuccess($summary, 'Attendance summary retrieved');
    }
}
