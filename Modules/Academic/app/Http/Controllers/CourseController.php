<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Modules\Academic\Http\Requests\StoreCourseRequest;
use Modules\Academic\Http\Requests\UpdateCourseRequest;
use Modules\Academic\Http\Requests\UpdateCourseStatusRequest;
use Modules\Academic\Models\Course;
use Modules\AI\Models\QuizAttempt;
use Modules\AI\Models\WeakTopic;

class CourseController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $query = Course::with('subject', 'gradeLevel', 'teacher');

        if (request('status')) {
            $query->where('status', request('status'));
        }
        if (request('grade_level_id')) {
            $query->where('grade_level_id', request('grade_level_id'));
        }
        if (request('subject_id')) {
            $query->where('subject_id', request('subject_id'));
        }
        if (request('teacher_id')) {
            $query->where('teacher_id', request('teacher_id'));
        }

        return $this->ReturnSuccess($query->paginate(15), 'Courses retrieved');
    }

    public function store(StoreCourseRequest $request)
    {
        $course = Course::create($request->validated() + [
            'tenant_id' => app('tenant')->id,
            'status'    => 'draft',
        ]);

        return $this->ReturnSuccess($course->load('subject', 'gradeLevel', 'teacher'), 'Course created', 201);
    }

    public function show($id)
    {
        $course = Course::with('subject', 'gradeLevel', 'teacher')->findOrFail($id);
        return $this->ReturnSuccess($course, 'Course retrieved');
    }

    public function update(UpdateCourseRequest $request, $id)
    {
        $course = Course::findOrFail($id);
        $course->update($request->validated());
        return $this->ReturnSuccess($course->fresh()->load('subject', 'gradeLevel', 'teacher'), 'Course updated');
    }

    public function updateStatus(UpdateCourseStatusRequest $request, $id)
    {
        $course = Course::findOrFail($id);

        $allowed = [
            'draft'    => ['active'],
            'active'   => ['archived'],
            'archived' => [],
        ];

        if (!in_array($request->status, $allowed[$course->status] ?? [])) {
            return $this->ReturnFailed("Cannot transition from {$course->status} to {$request->status}", 422);
        }

        $course->update(['status' => $request->status]);
        return $this->ReturnSuccess($course->fresh(), 'Course status updated');
    }

    public function destroy($id)
    {
        $course = Course::findOrFail($id);

        if ($course->status !== 'draft') {
            return $this->ReturnFailed('Only draft courses can be deleted', 422);
        }

        if ($course->enrollments()->exists()) {
            return $this->ReturnFailed('Cannot delete course with enrollments', 422);
        }

        $course->delete();
        return $this->ReturnSuccess(null, 'Course deleted');
    }

    public function myCourses()
    {
        $courses = Course::where('teacher_id', auth()->id())
            ->with('subject', 'gradeLevel')
            ->paginate(15);

        return $this->ReturnSuccess($courses, 'My courses retrieved');
    }

    public function students($id)
    {
        $course = Course::findOrFail($id);

        if (auth()->user()->hasRole('teacher') && $course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $students = $course->enrollments()->with('student.studentProfile')->get()->pluck('student');

        $studentIds = $students->pluck('id');

        $weakTopics = WeakTopic::whereIn('student_id', $studentIds)
            ->get()
            ->groupBy('student_id');

        $quizAttempts = QuizAttempt::whereIn('student_id', $studentIds)
            ->latest()
            ->get()
            ->groupBy('student_id')
            ->map(fn($g) => $g->take(5));

        $data = $students->map(function ($student) use ($weakTopics, $quizAttempts) {
            $sArray = $student->toArray();
            $sArray['weak_topics'] = $weakTopics->get($student->id, collect());
            $sArray['recent_quizzes'] = $quizAttempts->get($student->id, collect());
            return $sArray;
        });

        return $this->ReturnSuccess($data, 'Students retrieved');
    }

    public function enrolledCourses()
    {
        $courses = Course::whereHas('enrollments', fn($q) => $q->where('student_id', auth()->id()))
            ->with('subject', 'gradeLevel', 'teacher')
            ->paginate(15);

        return $this->ReturnSuccess($courses, 'Enrolled courses retrieved');
    }

    public function enrolledCourseDetail($courseId)
    {
        $course = Course::whereHas('enrollments', fn($q) => $q->where('student_id', auth()->id()))
            ->with('subject', 'gradeLevel', 'teacher')
            ->findOrFail($courseId);

        return $this->ReturnSuccess($course, 'Course retrieved');
    }

    public function courseProgress($courseId)
    {
        $student = auth()->user();

        $course = Course::whereHas('enrollments', fn($q) => $q->where('student_id', $student->id))
            ->findOrFail($courseId);

        // Attendance: schedules for this course that the student has attendance records for
        $scheduleIds = $course->schedules()->pluck('id');
        $totalSchedules  = $scheduleIds->count();
        $presentCount    = \Modules\Academic\Models\Attendance::whereIn('schedule_id', $scheduleIds)
            ->where('student_id', $student->id)
            ->where('status', 'present')
            ->count();
        $attendanceRate = $totalSchedules > 0 ? round(($presentCount / $totalSchedules) * 100, 1) : 0;

        // Quiz scores: attempts for lessons belonging to this course
        $lessonIds = $course->lessons()->pluck('id');
        $quizScores = \Modules\AI\Models\QuizAttempt::where('student_id', $student->id)
            ->whereIn('lesson_id', $lessonIds)
            ->latest()
            ->limit(20)
            ->get(['topic', 'score', 'passed', 'created_at'])
            ->map(fn($q) => ['topic' => $q->topic, 'score' => $q->score, 'date' => $q->created_at->toDateString()]);

        // Weak / strong topics (global for the student, not course-scoped)
        $weakTopics = \Modules\AI\Models\WeakTopic::where('student_id', $student->id)
            ->where('score', '<', 60)
            ->orderBy('score')
            ->get(['topic', 'score']);

        $strongTopics = \Modules\AI\Models\WeakTopic::where('student_id', $student->id)
            ->where('score', '>=', 80)
            ->orderByDesc('score')
            ->get(['topic', 'score']);

        return $this->ReturnSuccess([
            'attendance_rate' => $attendanceRate,
            'quiz_scores'     => $quizScores,
            'weak_topics'     => $weakTopics,
            'strong_topics'   => $strongTopics,
        ], 'Progress retrieved');
    }
}
