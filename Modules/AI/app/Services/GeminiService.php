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
                'generationConfig'   => ['temperature' => 0.7, 'maxOutputTokens' => 4096],
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Gemini API error: ' . $response->status());
        }

        $text = $this->extractText($response->json());
        if ($text === '') {
            throw new \RuntimeException('Gemini returned an empty response.');
        }

        return $text;
    }

    public function chatWithMultiplePdfs(string $systemPrompt, array $messages, array $pdfPaths): string
    {
        $pdfParts = [];
        foreach ($pdfPaths as $path) {
            if (file_exists($path)) {
                $pdfParts[] = [
                    'inline_data' => [
                        'mime_type' => 'application/pdf',
                        'data'      => base64_encode(file_get_contents($path)),
                    ],
                ];
            }
        }

        if (empty($pdfParts)) {
            return $this->chat($systemPrompt, $messages);
        }

        $pdfParts[] = ['text' => 'دي محتويات الدروس المرفقة. **أجب من هذه الملفات فقط واذكر اسم الدرس ورقم الصفحة في كل إجابة.**'];

        $contents   = [];
        $contents[] = ['role' => 'user',  'parts' => $pdfParts];
        $contents[] = ['role' => 'model', 'parts' => [['text' => 'فهمت محتوى الدروس. أنا جاهز للإجابة على أسئلة الطالب.']]];

        foreach ($messages as $m) {
            $contents[] = [
                'role'  => $m['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $m['content']]],
            ];
        }

        $response = Http::timeout(120)
            ->withQueryParameters(['key' => $this->key])
            ->post($this->url, [
                'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
                'contents'           => $contents,
                'generationConfig'   => ['temperature' => 0.7, 'maxOutputTokens' => 4096],
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Gemini API error: ' . $response->status());
        }

        $text = $this->extractText($response->json());
        if ($text === '') {
            throw new \RuntimeException('Gemini returned an empty response.');
        }

        return $text;
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
                ['text' => 'هذا هو محتوى الدرس المرفق. **أجب من هذا الملف فقط واذكر رقم الصفحة في كل إجابة.**'],
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
                'generationConfig'   => ['temperature' => 0.7, 'maxOutputTokens' => 4096],
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Gemini API error: ' . $response->status());
        }

        $text = $this->extractText($response->json());
        if ($text === '') {
            throw new \RuntimeException('Gemini returned an empty response.');
        }

        return $text;
    }

    public function generateQuiz(string $systemPrompt, string $topic, int $level): array
    {
        $labels = ['', 'easy', 'medium', 'hard'];
        $prompt = "Generate 5 {$labels[$level]} multiple-choice questions about \"{$topic}\". "
                . 'Return ONLY valid JSON, no prose, no markdown: {"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"..."}]}';

        $raw = $this->chat($systemPrompt, [['role' => 'user', 'content' => $prompt]]);

        return $this->parseJsonResponse($raw);
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
                . 'Mix difficulty levels. Return ONLY valid JSON, no prose, no markdown: '
                . '{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"...","topic":"..."}]}';

        $raw = $this->chat($systemPrompt, [['role' => 'user', 'content' => $prompt]]);

        return $this->parseJsonResponse($raw);
    }

    public function generateQuizFromSession(string $systemPrompt, string $conversationContext, int $level, array $pdfPaths): array
    {
        $labels      = ['', 'easy', 'medium', 'hard'];
        $instruction = "Generate 5 {$labels[$level]}-difficulty multiple-choice questions.\n\n"
                     . "RULES:\n"
                     . "1. Base questions ONLY on the attached lesson PDF(s)\n"
                     . "2. In each 'explanation', cite the page number from the PDF, e.g. (Page 5)\n"
                     . "3. Focus on topics discussed in this conversation:\n"
                     . "=== CONVERSATION ===\n"
                     . $conversationContext . "\n"
                     . "=== END CONVERSATION ===\n\n"
                     . 'Return ONLY valid JSON, no prose, no markdown: '
                     . '{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"..."}]}';

        $parts = [];
        foreach ($pdfPaths as $path) {
            if (file_exists($path)) {
                $parts[] = [
                    'inline_data' => [
                        'mime_type' => 'application/pdf',
                        'data'      => base64_encode(file_get_contents($path)),
                    ],
                ];
            }
        }

        if (empty($parts)) {
            return [];
        }

        $parts[] = ['text' => $instruction];

        $response = Http::timeout(120)
            ->withQueryParameters(['key' => $this->key])
            ->post($this->url, [
                'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
                'contents'           => [['role' => 'user', 'parts' => $parts]],
                'generationConfig'   => ['temperature' => 0.4, 'maxOutputTokens' => 4096],
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Gemini API error: ' . $response->status());
        }

        $raw = $this->extractText($response->json());
        return $this->parseJsonResponse($raw);
    }

    private function parseJsonResponse(string $raw): array
    {
        $clean = trim(preg_replace('/```(?:json)?\s*|\s*```/s', '', $raw));

        $result = json_decode($clean, true);
        if (is_array($result)) {
            return $result;
        }

        if (preg_match('/\{(?:[^{}]|(?R))*\}/s', $clean, $m)) {
            $result = json_decode($m[0], true);
            if (is_array($result)) {
                return $result;
            }
        }

        $start = strpos($clean, '{');
        $end   = strrpos($clean, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $result = json_decode(substr($clean, $start, $end - $start + 1), true);
            if (is_array($result)) {
                return $result;
            }
        }

        return [];
    }

    private function extractText(array $json): string
    {
        $parts = $json['candidates'][0]['content']['parts'] ?? [];
        return implode('', array_column(
            array_filter($parts, fn($p) => isset($p['text'])),
            'text'
        ));
    }

    public function generateExamFromPdfs(string $prompt, array $pdfPaths): string
    {
        $parts = [];

        foreach ($pdfPaths as $path) {
            if (file_exists($path)) {
                $parts[] = [
                    'inline_data' => [
                        'mime_type' => 'application/pdf',
                        'data'      => base64_encode(file_get_contents($path)),
                    ],
                ];
            }
        }

        $parts[] = ['text' => $prompt];

        $response = Http::timeout(120)
            ->withQueryParameters(['key' => $this->key])
            ->post($this->url, [
                'contents'        => [['role' => 'user', 'parts' => $parts]],
                'generationConfig' => ['temperature' => 0.4, 'maxOutputTokens' => 8192],
            ]);

        return $response->json('candidates.0.content.parts.0.text', '');
    }
}
