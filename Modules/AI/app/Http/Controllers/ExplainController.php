<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
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
        ]);

        $student = $request->user();

        $systemPrompt = app(SystemPromptBuilder::class)->build(
            $student->id,
            $data['lesson_id'] ?? null
        );

        $session = isset($data['session_id'])
            ? ChatSession::findOrFail($data['session_id'])
            : ChatSession::create([
                'student_id' => $student->id,
                'lesson_id'  => $data['lesson_id'] ?? null,
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

        $reply = app(GeminiService::class)->chat($systemPrompt, $history);

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
