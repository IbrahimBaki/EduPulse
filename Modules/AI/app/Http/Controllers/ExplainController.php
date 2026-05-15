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
            'message'    => 'required|string|max:1000',
            'lesson_id'  => 'nullable|integer|exists:lessons,id',
            'session_id' => 'nullable|integer|exists:chat_sessions,id',
            'topic'      => 'nullable|string|max:120',
        ]);

        $student = $request->user();

        // Chunks are not needed here — PDF is sent directly or no content is attached
        $systemPrompt = app(SystemPromptBuilder::class)->build($student->id);

        $session = isset($data['session_id'])
            ? ChatSession::findOrFail($data['session_id'])
            : ChatSession::create([
                'student_id' => $student->id,
                'lesson_id'  => $data['lesson_id'] ?? null,
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

        $pdfPath = null;
        if ($data['lesson_id'] ?? null) {
            $lesson = Lesson::find($data['lesson_id']);
            if ($lesson?->pdf_path) {
                $absolute = Storage::disk('local')->path($lesson->pdf_path);
                if (file_exists($absolute)) {
                    $pdfPath = $absolute;
                }
            }
        }

        $gemini = app(GeminiService::class);
        $reply  = $pdfPath
            ? $gemini->chatWithPdf($systemPrompt, $history, $pdfPath)
            : $gemini->chat($systemPrompt, $history);

        ChatMessage::create([
            'session_id' => $session->id,
            'role'       => 'assistant',
            'content'    => $reply,
        ]);

        return $this->ReturnSuccess([
            'session_id' => $session->id,
            'reply'      => $reply,
        ], 'Explanation generated');
    }
}
