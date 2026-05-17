<?php

namespace Modules\Assessment\Services;

use Modules\AI\Models\WeakTopic;
use Modules\AI\Services\GeminiService;
use Modules\Assessment\Models\ExamAttempt;
use Modules\Assessment\Models\ExamQuestion;

class ExamGradingService
{
    public function grade(ExamAttempt $attempt): void
    {
        $answers    = $attempt->answers()->with('question')->get();
        $totalScore = 0;

        foreach ($answers as $answer) {
            $question = $answer->question;

            if (in_array($question->question_type, ['mcq', 'true_false'])) {
                $isCorrect = $this->normalizeAnswer($question->question_type, $answer->student_answer ?? '')
                    === $this->normalizeAnswer($question->question_type, $question->correct_answer ?? '');
                $score = $isCorrect ? $question->marks : 0;

                $answer->update([
                    'is_correct'  => $isCorrect,
                    'score'       => $score,
                    'ai_feedback' => $isCorrect
                        ? 'Correct!'
                        : "Incorrect. Correct answer: {$question->correct_answer}. {$question->explanation}",
                ]);
                $totalScore += $score;
            } else {
                $feedback = $this->gradeWithAI($question, $answer->student_answer ?? '');
                $answer->update([
                    'is_correct'  => $feedback['score'] >= ($question->marks * 0.6),
                    'score'       => $feedback['score'],
                    'ai_feedback' => $feedback['feedback'],
                ]);
                $totalScore += $feedback['score'];
            }
        }

        $totalMarks = $attempt->exam->total_marks;
        $percentage = $totalMarks > 0 ? round(($totalScore / $totalMarks) * 100, 2) : 0;

        $attempt->update([
            'status'     => 'graded',
            'total_score' => $totalScore,
            'percentage'  => $percentage,
            'is_passed'   => $percentage >= $attempt->exam->passing_percentage,
            'graded_by'   => 'ai',
            'graded_at'   => now(),
        ]);

        $this->updateWeakTopics($attempt);
    }

    private function normalizeAnswer(string $type, string $answer): string
    {
        $trimmed = trim($answer);

        if ($type === 'mcq') {
            // Accept "A) text", "A. text", "A - text", or bare "A"
            if (preg_match('/^([A-Da-d])[)\.\-\s]/u', $trimmed, $m)) {
                return strtoupper($m[1]);
            }
            return strtoupper($trimmed);
        }

        // true_false
        return strtolower($trimmed);
    }

    private function gradeWithAI(ExamQuestion $question, string $studentAnswer): array
    {
        $prompt = "Grade this answer.\nQuestion: {$question->question_text}\nExpected: {$question->correct_answer}\nStudent: {$studentAnswer}\nMax Marks: {$question->marks}\n\nRespond ONLY JSON: {\"score\": <int>, \"feedback\": \"<text>\"}";

        $response = app(GeminiService::class)->chat('You are an exam grader.', [
            ['role' => 'user', 'content' => $prompt],
        ]);

        $cleaned = preg_replace('/```json\s*|\s*```/', '', $response);
        $result  = json_decode(trim($cleaned), true);

        return [
            'score'    => min((int) ($result['score'] ?? 0), $question->marks),
            'feedback' => $result['feedback'] ?? 'Unable to grade automatically.',
        ];
    }

    private function updateWeakTopics(ExamAttempt $attempt): void
    {
        $wrongAnswers = $attempt->answers()
            ->where('is_correct', false)
            ->with('question')
            ->get();

        foreach ($wrongAnswers as $answer) {
            $topic = $answer->question->topic;
            if ($topic) {
                WeakTopic::updateOrCreate(
                    [
                        'student_id' => $attempt->student_id,
                        'topic'      => $topic,
                        'tenant_id'  => $attempt->tenant_id,
                    ],
                    [
                        'score'     => $answer->score,
                        'max_score' => $answer->question->marks,
                        'source'    => 'exam',
                    ]
                );
            }
        }
    }
}
