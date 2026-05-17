<?php

namespace Modules\AI\Services;

use Illuminate\Support\Facades\Storage;
use Modules\Academic\Models\Lesson;

class ExamGeneratorService
{
    public function __construct(
        private GeminiService $gemini
    ) {}

    public function generate(array $config): array
    {
        $lessons = Lesson::whereIn('id', $config['lesson_ids'])->get();

        $pdfPaths = $lessons->filter(fn($l) => $l->pdf_path)
            ->map(fn($l) => Storage::disk('local')->path($l->pdf_path))
            ->toArray();

        $prompt = $this->buildPrompt($config);

        $response = $this->gemini->generateExamFromPdfs($prompt, $pdfPaths);

        return $this->parseResponse($response);
    }

    private function buildPrompt(array $config): string
    {
        $mcq         = $config['question_types']['mcq'] ?? 0;
        $trueFalse   = $config['question_types']['true_false'] ?? 0;
        $shortAnswer = $config['question_types']['short_answer'] ?? 0;
        $essay       = $config['question_types']['essay'] ?? 0;
        $language    = $config['language'] ?? 'en';

        $langInstruction = $language === 'ar'
            ? 'Generate all questions and answers in Arabic.'
            : 'Generate all questions and answers in English.';

        $easy   = $config['difficulty_mix']['easy'] ?? 33;
        $medium = $config['difficulty_mix']['medium'] ?? 34;
        $hard   = $config['difficulty_mix']['hard'] ?? 33;

        return <<<PROMPT
You are an expert exam generator for an educational platform.
Based on the lesson content provided in the PDF files, generate an exam.

{$langInstruction}

Generate exactly:
- {$mcq} Multiple Choice Questions (MCQ) with 4 options each (A, B, C, D)
- {$trueFalse} True/False questions
- {$shortAnswer} Short Answer questions
- {$essay} Essay questions

Difficulty: {$easy}% Easy, {$medium}% Medium, {$hard}% Hard

For EACH question provide:
- question_text, question_type, options (for MCQ/TF), correct_answer
- explanation, difficulty, topic, marks (easy=1, medium=2, hard=3)

Return ONLY valid JSON array. No markdown, no backticks.
Example format:
[
  {
    "question_text": "...",
    "question_type": "mcq",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A",
    "explanation": "...",
    "difficulty": "medium",
    "topic": "...",
    "marks": 2
  }
]
PROMPT;
    }

    private function parseResponse(string $response): array
    {
        $cleaned = preg_replace('/```json\s*|\s*```/', '', $response);
        $questions = json_decode(trim($cleaned), true);

        if (!is_array($questions)) {
            throw new \RuntimeException('AI returned invalid JSON: ' . substr($cleaned, 0, 200));
        }

        return $questions;
    }
}
