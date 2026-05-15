<?php

namespace Modules\AI\Services;

use Illuminate\Support\Facades\Http;

class GeminiService
{
    private string $url;
    private string $key;

    public function __construct()
    {
        $endpoint  = config('ai.gemini.endpoint');
        $model     = config('ai.gemini.model');
        $this->key = config('ai.gemini.api_key');
        $this->url = "{$endpoint}/{$model}:generateContent";
    }

    public function chat(string $systemPrompt, array $messages): string
    {
        $contents = array_map(fn($m) => [
            'role'  => $m['role'] === 'assistant' ? 'model' : 'user',
            'parts' => [['text' => $m['content']]],
        ], $messages);

        $response = Http::withQueryParameters(['key' => $this->key])
            ->post($this->url, [
                'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
                'contents'           => $contents,
                'generationConfig'   => ['temperature' => 0.7, 'maxOutputTokens' => 2048],
            ]);

        return $response->json('candidates.0.content.parts.0.text', '');
    }

    public function chatWithPdf(string $systemPrompt, array $messages, string $pdfPath): string
    {
        $pdfData = base64_encode(file_get_contents($pdfPath));

        $contents = [];

        // Inject PDF as first user turn so all subsequent turns can reference it
        $contents[] = [
            'role'  => 'user',
            'parts' => [
                [
                    'inline_data' => [
                        'mime_type' => 'application/pdf',
                        'data'      => $pdfData,
                    ],
                ],
                ['text' => 'هذا هو محتوى الدرس. استخدمه للإجابة على أسئلة الطالب.'],
            ],
        ];

        // Model acknowledgement keeps the conversation structure valid
        $contents[] = [
            'role'  => 'model',
            'parts' => [['text' => 'فهمت محتوى الدرس. أنا جاهز للإجابة على أسئلة الطالب.']],
        ];

        foreach ($messages as $m) {
            $contents[] = [
                'role'  => $m['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $m['content']]],
            ];
        }

        $response = Http::withQueryParameters(['key' => $this->key])
            ->post($this->url, [
                'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
                'contents'           => $contents,
                'generationConfig'   => ['temperature' => 0.7, 'maxOutputTokens' => 2048],
            ]);

        return $response->json('candidates.0.content.parts.0.text', '');
    }

    public function generateQuiz(string $systemPrompt, string $topic, int $level): array
    {
        $labels = ['', 'easy', 'medium', 'hard'];
        $prompt = "Generate 5 {$labels[$level]} multiple-choice questions about \"{$topic}\". "
                . 'Return ONLY valid JSON with no markdown: {"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"..."}]}';

        $raw = $this->chat($systemPrompt, [['role' => 'user', 'content' => $prompt]]);
        $clean = trim(preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $raw));

        return json_decode($clean, true) ?? [];
    }

    public function correctAnswers(array $questions, array $studentAnswers): array
    {
        $results = [];
        foreach ($questions as $i => $q) {
            $given     = strtoupper(trim($studentAnswers[$i] ?? ''));
            $correct   = strtoupper(trim($q['correct'] ?? ''));
            $isCorrect = $given === $correct;
            $results[] = [
                'question'    => $q['question'],
                'your_answer' => $studentAnswers[$i] ?? '',
                'correct'     => $q['correct'],
                'is_correct'  => $isCorrect,
                'explanation' => $q['explanation'] ?? '',
                'score'       => $isCorrect ? 100 : 0,
            ];
        }
        return $results;
    }

    public function generateExam(string $systemPrompt, array $topics, int $count): array
    {
        $topicList = implode(', ', $topics);
        $prompt = "Generate {$count} exam questions covering: {$topicList}. "
                . 'Mix difficulty levels. Return ONLY valid JSON with no markdown: '
                . '{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"...","topic":"..."}]}';

        $raw   = $this->chat($systemPrompt, [['role' => 'user', 'content' => $prompt]]);
        $clean = trim(preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $raw));

        return json_decode($clean, true) ?? [];
    }
}
