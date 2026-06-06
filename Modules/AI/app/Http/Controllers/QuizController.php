<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Modules\Academic\Models\Lesson;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\AI\Models\ChatSession;
use Modules\AI\Models\QuizAttempt;
use Modules\AI\Services\GeminiService;
use Modules\AI\Services\SystemPromptBuilder;
use Modules\AI\Services\WeakTopicService;

class QuizController extends Controller
{
    public function generate(Request $request)
    {
        $data = $request->validate([
            'topic'        => 'required|string|max:200',
            'lesson_id'    => 'nullable|integer|exists:lessons,id',
            'lesson_ids'   => 'nullable|array',
            'lesson_ids.*' => 'integer|exists:lessons,id',
            'level'        => 'nullable|integer|in:1,2,3',
        ]);

        $level   = $data['level'] ?? 1;
        $student = $request->user();

        $lessonIds       = $data['lesson_ids'] ?? (isset($data['lesson_id']) ? [$data['lesson_id']] : []);
        $primaryLessonId = count($lessonIds) === 1 ? $lessonIds[0] : null;

        $systemPrompt = app(SystemPromptBuilder::class)->build($student->id, $primaryLessonId, null, 'quiz');
        $quiz         = app(GeminiService::class)->generateQuiz($systemPrompt, $data['topic'], $level);

        return $this->ReturnSuccess([
            'topic'     => $data['topic'],
            'level'     => $level,
            'questions' => $quiz['questions'] ?? [],
        ], 'Quiz generated');
    }

    public function submit(Request $request)
    {
        $data = $request->validate([
            'topic'            => 'required|string|max:200',
            'lesson_id'        => 'nullable|integer|exists:lessons,id',
            'lesson_ids'       => 'nullable|array',
            'lesson_ids.*'     => 'integer|exists:lessons,id',
            'level'            => 'required|integer|in:1,2,3',
            'questions'        => 'required|array|min:1',
            'student_answers'  => 'required|array',
        ]);

        $student = $request->user();

        $lessonIds       = $data['lesson_ids'] ?? (isset($data['lesson_id']) ? [$data['lesson_id']] : []);
        $primaryLessonId = count($lessonIds) === 1 ? $lessonIds[0] : null;

        $results      = app(GeminiService::class)->correctAnswers($data['questions'], $data['student_answers']);
        $correctCount = collect($results)->where('is_correct', true)->count();
        $score        = (int) round(($correctCount / count($results)) * 100);
        $passed       = $score >= config('ai.quiz_pass_threshold', 70);

        QuizAttempt::create([
            'student_id' => $student->id,
            'lesson_id'  => $primaryLessonId,
            'topic'      => $data['topic'],
            'score'      => $score,
            'passed'     => $passed,
            'level'      => $data['level'],
            'source'     => 'ai',
            'payload'    => $results,
        ]);

        app(WeakTopicService::class)->update($student->id, $data['topic'], $score, 'ai');

        if ($score < 50) {
            SendN8nWebhookJob::dispatch('score_alert', [
                'student_id'   => $student->id,
                'student_name' => $student->name,
                'topic'        => $data['topic'],
                'score'        => $score,
                'lesson_id'    => $primaryLessonId,
                'tenant_code'  => app('tenant')->code,
            ], app('tenant')->id);
        }

        $nextLevel = ($passed && $data['level'] < 3) ? $data['level'] + 1 : null;

        return $this->ReturnSuccess([
            'score'      => $score,
            'passed'     => $passed,
            'results'    => $results,
            'next_level' => $nextLevel,
        ], $passed ? 'Quiz passed!' : 'Quiz failed — topic flagged for review');
    }

    public function history(Request $request)
    {
        $student  = $request->user();
        $attempts = QuizAttempt::where('student_id', $student->id)
            ->with('lesson:id,title')
            ->latest()
            ->paginate(20);

        return $this->ReturnSuccess($attempts);
    }

    public function showAttempt(Request $request, QuizAttempt $attempt)
    {
        abort_if($attempt->student_id !== $request->user()->id, 403);

        return $this->ReturnSuccess($attempt->load('lesson:id,title'));
    }

    public function quickQuiz(Request $request)
    {
        $data = $request->validate([
            'session_id' => 'required|integer|exists:chat_sessions,id',
            'level'      => 'nullable|integer|in:1,2,3',
        ]);

        $student = $request->user();
        $level   = $data['level'] ?? 1;
        $session = ChatSession::where('student_id', $student->id)->findOrFail($data['session_id']);

        $messages            = $session->messages()->orderBy('id')->get();
        $conversationContext = $messages->map(fn($m) =>
            ($m->role === 'user' ? 'الطالب' : 'المساعد') . ': ' . mb_substr($m->content, 0, 300)
        )->implode("\n\n");

        $pdfPaths = [];
        if ($session->lesson_id) {
            $lesson = Lesson::find($session->lesson_id);
            if ($lesson?->pdf_path) {
                $path = Storage::disk('local')->path($lesson->pdf_path);
                if (file_exists($path)) {
                    $pdfPaths[] = $path;
                }
            }
        }

        $systemPrompt = app(SystemPromptBuilder::class)->build($student->id, null, null, 'quiz');
        $gemini       = app(GeminiService::class);

        $quiz = !empty($pdfPaths)
            ? $gemini->generateQuizFromSession($systemPrompt, $conversationContext, $level, $pdfPaths)
            : [];

        if (empty($quiz['questions'] ?? [])) {
            $quiz = $gemini->generateQuiz($systemPrompt, $session->topic ?? 'عام', $level);
        }

        return $this->ReturnSuccess([
            'topic'     => $session->topic,
            'level'     => $level,
            'questions' => $quiz['questions'] ?? [],
        ], 'Quick quiz generated');
    }
}
