<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\AI\Models\QuizAttempt;
use Modules\AI\Services\GeminiService;
use Modules\AI\Services\SystemPromptBuilder;
use Modules\AI\Services\WeakTopicService;

class QuizController extends Controller
{
    public function generate(Request $request)
    {
        $data = $request->validate([
            'topic'     => 'required|string|max:200',
            'lesson_id' => 'nullable|integer|exists:lessons,id',
            'level'     => 'nullable|integer|in:1,2,3',
        ]);

        $level  = $data['level'] ?? 1;
        $student = $request->user();

        $systemPrompt = app(SystemPromptBuilder::class)->build($student->id, $data['lesson_id'] ?? null);
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
            'level'            => 'required|integer|in:1,2,3',
            'questions'        => 'required|array|min:1',
            'student_answers'  => 'required|array',
        ]);

        $student = $request->user();

        $results      = app(GeminiService::class)->correctAnswers($data['questions'], $data['student_answers']);
        $correctCount = collect($results)->where('is_correct', true)->count();
        $score        = (int) round(($correctCount / count($results)) * 100);
        $passed       = $score >= config('ai.quiz_pass_threshold', 70);

        QuizAttempt::create([
            'student_id' => $student->id,
            'lesson_id'  => $data['lesson_id'] ?? null,
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
                'lesson_id'    => $data['lesson_id'] ?? null,
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
}
