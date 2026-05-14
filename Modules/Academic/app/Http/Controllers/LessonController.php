<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\Academic\Http\Requests\StoreLessonRequest;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Lesson;

class LessonController extends Controller
{
    use ApiResponser;

    public function index($courseId)
    {
        $course = Course::findOrFail($courseId);
        $lessons = $course->lessons()->orderBy('order')->get();
        return $this->ReturnSuccess($lessons, 'Lessons retrieved');
    }

    public function store(StoreLessonRequest $request, $courseId)
    {
        $course = Course::findOrFail($courseId);

        if (auth()->user()->hasRole('teacher') && $course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $lesson = $course->lessons()->create(
            $request->validated() + ['tenant_id' => app('tenant')->id]
        );

        return $this->ReturnSuccess($lesson, 'Lesson created', 201);
    }

    public function update(StoreLessonRequest $request, $courseId, $id)
    {
        $course = Course::findOrFail($courseId);
        $lesson = $course->lessons()->findOrFail($id);

        if (auth()->user()->hasRole('teacher') && $course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $lesson->update($request->validated());
        return $this->ReturnSuccess($lesson->fresh(), 'Lesson updated');
    }

    public function publish($courseId, $id)
    {
        $course = Course::findOrFail($courseId);
        $lesson = $course->lessons()->findOrFail($id);

        if (auth()->user()->hasRole('teacher') && $course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $lesson->update(['is_published' => true]);

        SendN8nWebhookJob::dispatch('lesson_published', [
            'lesson_id' => $lesson->id,
            'course_id' => $course->id,
            'title'     => $lesson->title,
        ], app('tenant')->id);

        return $this->ReturnSuccess($lesson->fresh(), 'Lesson published');
    }

    public function destroy($courseId, $id)
    {
        $course = Course::findOrFail($courseId);
        $lesson = $course->lessons()->findOrFail($id);

        if (auth()->user()->hasRole('teacher') && $course->teacher_id !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $lesson->delete();
        return $this->ReturnSuccess(null, 'Lesson deleted');
    }

    public function publishedLessons($courseId)
    {
        $course = Course::findOrFail($courseId);

        // Verify student is enrolled in the course
        $isEnrolled = $course->enrollments()->where('student_id', auth()->id())->exists();
        if (!$isEnrolled) {
            return $this->ReturnFailed('You are not enrolled in this course', 403);
        }

        $lessons = $course->lessons()->where('is_published', true)->orderBy('order')->get();
        return $this->ReturnSuccess($lessons, 'Published lessons retrieved');
    }
}
