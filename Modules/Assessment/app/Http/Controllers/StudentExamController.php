<?php

namespace Modules\Assessment\Http\Controllers;

use App\Traits\ApiResponser;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\Assessment\Http\Requests\SubmitAnswerRequest;
use Modules\Assessment\Models\Exam;
use Modules\Assessment\Models\ExamAnswer;
use Modules\Assessment\Models\ExamAttempt;
use Modules\Assessment\Services\ExamGradingService;

class StudentExamController extends Controller
{
    use ApiResponser;

    public function index(): JsonResponse
    {
        $student = auth()->user();
        $courseIds = $student->enrollments()->pluck('course_id');

        $exams = Exam::whereIn('course_id', $courseIds)
            ->whereIn('status', ['published', 'scheduled', 'active'])
            ->with('course:id,name')
            ->withCount('questions')
            ->get();

        $allAttempts = ExamAttempt::where('student_id', $student->id)
            ->whereIn('exam_id', $exams->pluck('id'))
            ->get(['id', 'exam_id', 'status', 'started_at']);

        // Exams with a terminal attempt are "done"; in-progress stays in upcoming
        $terminalIds = $allAttempts
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->pluck('exam_id')
            ->toArray();

        $inProgressByExam = $allAttempts
            ->where('status', 'in_progress')
            ->keyBy('exam_id');

        $upcoming = $exams->whereNotIn('id', $terminalIds)->values()->map(function ($exam) use ($inProgressByExam) {
            $attempt = $inProgressByExam->get($exam->id);
            $exam->in_progress_attempt = $attempt
                ? ['started_at' => $attempt->started_at?->toISOString()]
                : null;
            return $exam;
        });

        $completed = ExamAttempt::where('student_id', $student->id)
            ->with('exam.course:id,name')
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->latest()
            ->get()
            ->map(function ($attempt) {
                $attempt->result_available = !is_null($attempt->teacher_approved_at);
                return $attempt;
            });

        return $this->ReturnSuccess([
            'upcoming'  => $upcoming,
            'completed' => $completed,
        ]);
    }

    public function show(Exam $exam): JsonResponse
    {
        $this->authorizeStudentExam($exam);

        $attempt = ExamAttempt::where('exam_id', $exam->id)
            ->where('student_id', auth()->id())
            ->first();

        return $this->ReturnSuccess([
            'exam'    => $exam->load('course:id,name'),
            'attempt' => $attempt,
        ]);
    }

    public function start(Exam $exam): JsonResponse
    {
        $this->authorizeStudentExam($exam);

        // Auto-activate a scheduled exam whose window is now open
        if ($exam->status === 'scheduled') {
            if ($exam->starts_at && $exam->starts_at->isFuture()) {
                return $this->ReturnFailed('Exam has not started yet', 422);
            }
            if ($exam->ends_at && $exam->ends_at->isPast()) {
                return $this->ReturnFailed('Exam window has closed', 422);
            }
            $exam->update(['status' => 'active']);
            $exam->refresh();
        }

        if ($exam->status !== 'active') {
            return $this->ReturnFailed('Exam is not available', 422);
        }

        $student = auth()->user();

        // Search without tenant scope to avoid missing rows created under a
        // different tenant_id (e.g. a prior request without middleware context).
        $existing = ExamAttempt::withoutGlobalScopes()
            ->where('exam_id', $exam->id)
            ->where('student_id', $student->id)
            ->first();

        $examPayload = $exam->only(['id', 'title', 'duration_minutes', 'security_level']);

        if ($existing) {
            if (in_array($existing->status, ['submitted', 'auto_submitted', 'graded'])) {
                return $this->ReturnFailed('You have already submitted this exam', 422);
            }

            $questions = $exam->questions()->get()->makeHidden(['correct_answer', 'explanation']);
            return $this->ReturnSuccess([
                'attempt_id' => $existing->id,
                'exam'       => $examPayload,
                'questions'  => $questions,
            ]);
        }

        try {
            $attempt = ExamAttempt::create([
                'tenant_id'  => app('tenant')->id,
                'exam_id'    => $exam->id,
                'student_id' => $student->id,
                'status'     => 'in_progress',
                'started_at' => now(),
            ]);
        } catch (QueryException $e) {
            // Duplicate entry: two requests raced — return the winner's row.
            if ($e->errorInfo[1] !== 1062) throw $e;

            $attempt = ExamAttempt::withoutGlobalScopes()
                ->where('exam_id', $exam->id)
                ->where('student_id', $student->id)
                ->firstOrFail();

            if (in_array($attempt->status, ['submitted', 'auto_submitted', 'graded'])) {
                return $this->ReturnFailed('You have already submitted this exam', 422);
            }
        }

        $questions = $exam->questions()->get()->makeHidden(['correct_answer', 'explanation']);

        return $this->ReturnSuccess([
            'attempt_id' => $attempt->id,
            'exam'       => $examPayload,
            'questions'  => $questions,
        ], 'Exam started', 201);
    }

    public function answer(SubmitAnswerRequest $request, Exam $exam): JsonResponse
    {
        $student = auth()->user();

        $attempt = ExamAttempt::where('exam_id', $exam->id)
            ->where('student_id', $student->id)
            ->where('status', 'in_progress')
            ->firstOrFail();

        ExamAnswer::updateOrCreate(
            ['attempt_id' => $attempt->id, 'question_id' => $request->question_id],
            ['student_answer' => $request->student_answer]
        );

        return $this->ReturnSuccess(null, 'Answer saved');
    }

    public function submit(Request $request, Exam $exam): JsonResponse
    {
        $student = auth()->user();

        $attempt = ExamAttempt::where('exam_id', $exam->id)
            ->where('student_id', $student->id)
            ->where('status', 'in_progress')
            ->firstOrFail();

        // Allow answers to be submitted inline with the submit call
        if ($request->has('answers') && is_array($request->answers)) {
            foreach ($request->answers as $item) {
                if (empty($item['question_id']) || !isset($item['student_answer'])) {
                    continue;
                }
                ExamAnswer::updateOrCreate(
                    ['attempt_id' => $attempt->id, 'question_id' => $item['question_id']],
                    ['student_answer' => $item['student_answer']]
                );
            }
        }

        $attempt->update([
            'status'       => 'submitted',
            'submitted_at' => now(),
        ]);

        app(ExamGradingService::class)->grade($attempt->fresh());

        $attempt->refresh();

        if ($attempt->percentage < 50) {
            SendN8nWebhookJob::dispatch('exam_score_alert', [
                'student_id'    => $student->id,
                'student_name'  => $student->name,
                'exam_title'    => $exam->title,
                'course_name'   => $exam->course->name,
                'score'         => $attempt->total_score,
                'percentage'    => $attempt->percentage,
                'teacher_email' => $exam->creator->email,
                'tenant_code'   => app('tenant')->code,
            ], app('tenant')->id);
        }

        return $this->ReturnSuccess([
            'attempt'           => $attempt->only(['id', 'status', 'total_score', 'percentage', 'is_passed', 'submitted_at']),
            'teacher_approval'  => 'pending',
        ], 'Exam submitted and graded. Results will be visible after teacher approval.');
    }

    public function violation(Request $request, Exam $exam): JsonResponse
    {
        $request->validate(['type' => 'required|in:tab_switch,fullscreen_exit,copy_attempt']);

        $attempt = ExamAttempt::where('exam_id', $exam->id)
            ->where('student_id', auth()->id())
            ->where('status', 'in_progress')
            ->firstOrFail();

        $log = $attempt->violation_log ?? [];
        $log[] = ['type' => $request->type, 'at' => now()->toISOString()];

        $attempt->update([
            'violations_count' => $attempt->violations_count + 1,
            'violation_log'    => $log,
        ]);

        return $this->ReturnSuccess(['violations_count' => $attempt->violations_count]);
    }

    public function result(Exam $exam): JsonResponse
    {
        $student = auth()->user();

        $attempt = ExamAttempt::where('exam_id', $exam->id)
            ->where('student_id', $student->id)
            ->whereIn('status', ['graded', 'submitted', 'auto_submitted'])
            ->with(['answers' => fn($q) => $q->with('question')])
            ->firstOrFail();

        $answers = $attempt->answers->map(function ($answer) {
            $question = $answer->question->makeVisible(['correct_answer', 'explanation']);
            return [
                'question_text'  => $question->question_text,
                'question_type'  => $question->question_type,
                'student_answer' => $answer->student_answer,
                'correct_answer' => $question->correct_answer,
                'is_correct'     => $answer->is_correct,
                'score'          => $answer->score,
                'marks'          => $question->marks,
                'ai_feedback'    => $answer->ai_feedback,
                'explanation'    => $question->explanation,
            ];
        });

        return $this->ReturnSuccess([
            'attempt' => $attempt->only([
                'id', 'status', 'total_score', 'percentage', 'is_passed',
                'started_at', 'submitted_at', 'graded_at',
            ]),
            'exam'    => $exam->only(['id', 'title', 'total_marks', 'passing_percentage', 'duration_minutes']),
            'answers' => $answers,
        ]);
    }

    private function authorizeStudentExam(Exam $exam): void
    {
        $student   = auth()->user();
        $courseIds = $student->enrollments()->pluck('course_id');
        abort_unless($courseIds->contains($exam->course_id), 403);
    }
}
