<?php

namespace Modules\Assessment\Http\Controllers;

use App\Traits\ApiResponser;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\AI\Services\ExamGeneratorService;
use Modules\Assessment\Http\Requests\GenerateExamRequest;
use Modules\Assessment\Http\Requests\ScheduleExamRequest;
use Modules\Assessment\Http\Requests\UpdateExamQuestionRequest;
use Modules\Assessment\Http\Requests\UpdateExamRequest;
use Modules\Assessment\Models\Exam;
use Modules\Assessment\Models\ExamAttempt;
use Modules\Assessment\Models\ExamQuestion;

class TeacherExamController extends Controller
{
    use ApiResponser;

    public function generate(GenerateExamRequest $request): JsonResponse
    {
        $teacher = $request->user();

        $course = \Modules\Academic\Models\Course::where('id', $request->course_id)
            ->where('teacher_id', $teacher->id)
            ->firstOrFail();

        $questions = app(ExamGeneratorService::class)->generate($request->validated());

        $exam = Exam::create([
            'tenant_id'       => app('tenant')->id,
            'course_id'       => $course->id,
            'created_by'      => $teacher->id,
            'title'           => $request->title,
            'status'          => 'draft',
            'duration_minutes' => $request->duration_minutes,
            'language'        => $request->language,
            'is_ai_generated' => true,
            'ai_model_used'   => config('ai.gemini.model'),
        ]);

        foreach ($questions as $i => $q) {
            ExamQuestion::create([
                'exam_id'       => $exam->id,
                'question_text' => $q['question_text'],
                'question_type' => $q['question_type'],
                'options'       => $q['options'] ?? null,
                'correct_answer' => $q['correct_answer'] ?? null,
                'marks'         => $q['marks'] ?? 1,
                'explanation'   => $q['explanation'] ?? null,
                'order'         => $i + 1,
                'difficulty'    => $q['difficulty'] ?? 'medium',
                'topic'         => $q['topic'] ?? null,
            ]);
        }

        $exam->lessons()->attach($request->lesson_ids);
        $exam->total_marks = $exam->questions()->sum('marks');
        $exam->save();

        return $this->ReturnSuccess(
            $exam->load('questions')->makeVisible(['correct_answer', 'explanation']),
            'Exam generated successfully'
        );
    }

    public function index(): JsonResponse
    {
        $exams = Exam::where('created_by', auth()->id())
            ->withCount(['questions', 'attempts'])
            ->with('course:id,name')
            ->latest()
            ->paginate(15);

        return $this->ReturnSuccess($exams);
    }

    public function show(Exam $exam): JsonResponse
    {
        $this->authorizeExam($exam);

        $exam->load('questions', 'course', 'lessons');
        $questions = $exam->questions->map(fn($q) => $q->makeVisible(['correct_answer', 'explanation']));

        return $this->ReturnSuccess([
            'exam'      => $exam,
            'questions' => $questions,
        ]);
    }

    public function update(UpdateExamRequest $request, Exam $exam): JsonResponse
    {
        $this->authorizeExam($exam);

        if ($exam->status !== 'draft') {
            return $this->ReturnFailed('Only draft exams can be edited', 422);
        }

        $exam->update($request->validated());

        return $this->ReturnSuccess($exam, 'Exam updated successfully');
    }

    public function updateQuestion(UpdateExamQuestionRequest $request, Exam $exam, ExamQuestion $question): JsonResponse
    {
        $this->authorizeExam($exam);

        abort_if($question->exam_id !== $exam->id, 404);

        $question->update($request->validated());

        $exam->total_marks = $exam->questions()->sum('marks');
        $exam->save();

        return $this->ReturnSuccess($question->makeVisible(['correct_answer', 'explanation']), 'Question updated');
    }

    public function deleteQuestion(Exam $exam, ExamQuestion $question): JsonResponse
    {
        $this->authorizeExam($exam);

        abort_if($question->exam_id !== $exam->id, 404);

        $question->delete();

        $exam->total_marks = $exam->questions()->sum('marks');
        $exam->save();

        return $this->ReturnSuccess(null, 'Question deleted');
    }

    public function publish(Exam $exam): JsonResponse
    {
        $this->authorizeExam($exam);

        if ($exam->status !== 'draft') {
            return $this->ReturnFailed('Only draft exams can be published', 422);
        }

        $exam->update(['status' => 'published']);

        SendN8nWebhookJob::dispatch('exam_published', [
            'exam_title'   => $exam->title,
            'course_name'  => $exam->course->name,
            'teacher_name' => auth()->user()->name,
            'tenant_code'  => app('tenant')->code,
        ], app('tenant')->id);

        return $this->ReturnSuccess($exam, 'Exam published successfully');
    }

    public function schedule(ScheduleExamRequest $request, Exam $exam): JsonResponse
    {
        $this->authorizeExam($exam);

        if (!in_array($exam->status, ['published', 'scheduled'])) {
            return $this->ReturnFailed('Exam must be published before scheduling', 422);
        }

        $exam->update([
            'status'       => 'scheduled',
            'scheduled_at' => $request->scheduled_at,
            'starts_at'    => $request->starts_at,
            'ends_at'      => $request->ends_at,
        ]);

        SendN8nWebhookJob::dispatch('exam_scheduled', [
            'exam_title'   => $exam->title,
            'course_name'  => $exam->course->name,
            'scheduled_at' => $exam->scheduled_at->toISOString(),
            'duration'     => $exam->duration_minutes,
            'tenant_code'  => app('tenant')->code,
        ], app('tenant')->id);

        return $this->ReturnSuccess($exam, 'Exam scheduled successfully');
    }

    public function results(Exam $exam): JsonResponse
    {
        $this->authorizeExam($exam);

        $attempts = $exam->attempts()->with('student:id,name,email')->get();

        $stats = [
            'total_attempts' => $attempts->count(),
            'average_score'  => round($attempts->avg('percentage'), 2),
            'pass_rate'      => $attempts->count()
                ? round(($attempts->where('is_passed', true)->count() / $attempts->count()) * 100, 2)
                : 0,
            'highest_score'  => $attempts->max('percentage'),
            'lowest_score'   => $attempts->min('percentage'),
        ];

        return $this->ReturnSuccess([
            'exam'     => $exam->only(['id', 'title', 'total_marks', 'passing_percentage']),
            'stats'    => $stats,
            'attempts' => $attempts,
        ]);
    }

    public function studentResult(Exam $exam, $studentId): JsonResponse
    {
        $this->authorizeExam($exam);

        $attempt = $exam->attempts()
            ->where('student_id', $studentId)
            ->with(['answers.question', 'student:id,name,email'])
            ->firstOrFail();

        $answers = $attempt->answers->map(function ($answer) {
            $question = $answer->question->makeVisible(['correct_answer', 'explanation']);
            return [
                'question_text'  => $question->question_text,
                'question_type'  => $question->question_type,
                'student_answer' => $answer->student_answer,
                'correct_answer' => $question->correct_answer,
                'score'          => $answer->score,
                'marks'          => $question->marks,
                'is_correct'     => $answer->is_correct,
                'ai_feedback'    => $answer->ai_feedback,
            ];
        });

        return $this->ReturnSuccess([
            'attempt' => $attempt->only([
                'id', 'status', 'total_score', 'percentage', 'is_passed',
                'started_at', 'submitted_at', 'graded_at', 'teacher_approved_at',
            ]),
            'student' => $attempt->student,
            'answers' => $answers,
        ]);
    }

    public function generateForManager(GenerateExamRequest $request): JsonResponse
    {
        $manager = $request->user();

        $course = \Modules\Academic\Models\Course::findOrFail($request->course_id);

        $questions = app(ExamGeneratorService::class)->generate($request->validated());

        $exam = Exam::create([
            'tenant_id'        => app('tenant')->id,
            'course_id'        => $course->id,
            'created_by'       => $manager->id,
            'title'            => $request->title,
            'status'           => 'draft',
            'duration_minutes' => $request->duration_minutes,
            'language'         => $request->language,
            'is_ai_generated'  => true,
            'ai_model_used'    => config('ai.gemini.model'),
        ]);

        foreach ($questions as $i => $q) {
            ExamQuestion::create([
                'exam_id'        => $exam->id,
                'question_text'  => $q['question_text'],
                'question_type'  => $q['question_type'],
                'options'        => $q['options'] ?? null,
                'correct_answer' => $q['correct_answer'] ?? null,
                'marks'          => $q['marks'] ?? 1,
                'explanation'    => $q['explanation'] ?? null,
                'order'          => $i + 1,
                'difficulty'     => $q['difficulty'] ?? 'medium',
                'topic'          => $q['topic'] ?? null,
            ]);
        }

        $exam->lessons()->attach($request->lesson_ids);
        $exam->total_marks = $exam->questions()->sum('marks');
        $exam->save();

        return $this->ReturnSuccess(
            $exam->load('questions')->makeVisible(['correct_answer', 'explanation']),
            'Exam generated successfully'
        );
    }

    public function approveResult(Exam $exam, $studentId): JsonResponse
    {
        $this->authorizeExam($exam);

        $attempt = ExamAttempt::where('exam_id', $exam->id)
            ->where('student_id', $studentId)
            ->whereIn('status', ['graded', 'submitted', 'auto_submitted'])
            ->firstOrFail();

        if (!is_null($attempt->teacher_approved_at)) {
            return $this->ReturnFailed('Result has already been approved', 422);
        }

        $attempt->update([
            'teacher_approved_at' => now(),
            'approved_by'         => auth()->id(),
        ]);

        return $this->ReturnSuccess([
            'attempt_id'          => $attempt->id,
            'student_id'          => $attempt->student_id,
            'teacher_approved_at' => $attempt->teacher_approved_at,
        ], 'Result approved. Student can now view their result.');
    }

    public function revokeApproval(Exam $exam, $studentId): JsonResponse
    {
        $this->authorizeExam($exam);

        $attempt = ExamAttempt::where('exam_id', $exam->id)
            ->where('student_id', $studentId)
            ->firstOrFail();

        $attempt->update([
            'teacher_approved_at' => null,
            'approved_by'         => null,
        ]);

        return $this->ReturnSuccess(null, 'Approval revoked. Result is hidden from student.');
    }

    private function authorizeExam(Exam $exam): void
    {
        abort_if($exam->created_by !== auth()->id(), 403);
    }
}
