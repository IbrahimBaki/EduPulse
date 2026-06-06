<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Modules\Academic\Models\Lesson;
use Modules\AI\Models\ChatSession;
use Modules\AI\Models\ChatMessage;
use Modules\AI\Services\GeminiService;
use Modules\AI\Services\SystemPromptBuilder;

class ExplainController extends Controller
{
    public function explain(Request $request)
    {
        $data = $request->validate([
            'message'      => 'required|string|max:1000',
            'lesson_id'    => 'nullable|integer|exists:lessons,id',
            'lesson_ids'   => 'nullable|array',
            'lesson_ids.*' => 'integer|exists:lessons,id',
            'session_id'   => 'nullable|integer|exists:chat_sessions,id',
            'topic'        => 'nullable|string|max:120',
        ]);

        $student = $request->user();

        // Normalise to a flat list of lesson IDs
        $lessonIds       = $data['lesson_ids'] ?? (isset($data['lesson_id']) ? [$data['lesson_id']] : []);
        $primaryLessonId = count($lessonIds) === 1 ? $lessonIds[0] : null;

        // Collect PDF paths and lesson names BEFORE building the system prompt
        $pdfPaths    = [];
        $lessonNames = [];
        if (!empty($lessonIds)) {
            $lessons = Lesson::whereIn('id', $lessonIds)->get();
            foreach ($lessons as $lesson) {
                if ($lesson->pdf_path) {
                    $absolute = Storage::disk('local')->path($lesson->pdf_path);
                    if (file_exists($absolute)) {
                        $pdfPaths[]    = $absolute;
                        $lessonNames[] = $lesson->title;
                    }
                }
            }
        }

        $systemPrompt = app(SystemPromptBuilder::class)->build($student->id, null, null, 'chat', $lessonNames);

        $isNew   = !isset($data['session_id']);
        $session = !$isNew
            ? ChatSession::where('student_id', $student->id)->findOrFail($data['session_id'])
            : ChatSession::create([
                'student_id' => $student->id,
                'lesson_id'  => $primaryLessonId,
                'topic'      => $data['topic'] ?? mb_substr($data['message'], 0, 80),
            ]);

        $history = $session->messages()
            ->latest()
            ->limit(10)
            ->get()
            ->reverse()
            ->map(fn($m) => ['role' => $m->role, 'content' => $m->content])
            ->values()
            ->toArray();

        $history[] = ['role' => 'user', 'content' => $data['message']];

        ChatMessage::create([
            'session_id' => $session->id,
            'role'       => 'user',
            'content'    => $data['message'],
        ]);

        try {
            $gemini = app(GeminiService::class);
            $reply  = match (true) {
                count($pdfPaths) > 1  => $gemini->chatWithMultiplePdfs($systemPrompt, $history, $pdfPaths),
                count($pdfPaths) === 1 => $gemini->chatWithPdf($systemPrompt, $history, $pdfPaths[0]),
                default               => $gemini->chat($systemPrompt, $history),
            };
        } catch (\RuntimeException $e) {
            return $this->ReturnFailed($e->getMessage(), 502);
        }

        ChatMessage::create([
            'session_id' => $session->id,
            'role'       => 'assistant',
            'content'    => $reply,
        ]);

        return $this->ReturnSuccess([
            'session_id'     => $session->id,
            'session_title'  => $session->topic,
            'is_new_session' => $isNew,
            'reply'          => $reply,
        ], 'Explanation generated');
    }
}
