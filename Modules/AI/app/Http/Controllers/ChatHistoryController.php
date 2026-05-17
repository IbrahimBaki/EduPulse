<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Modules\AI\Models\ChatSession;

class ChatHistoryController extends Controller
{
    public function index(User $student)
    {
        $sessions = ChatSession::where('student_id', $student->id)
            ->with([
                'messages'     => fn($q) => $q->orderBy('created_at'),
                'lesson:id,title,course_id',
                'lesson.course:id,name',
            ])
            ->latest()
            ->paginate(20)
            ->through(fn($s) => tap($s, function ($s) {
                $s->lesson_name = $s->lesson?->title;
                $s->course_name = $s->lesson?->course?->name;
            }));

        return $this->ReturnSuccess($sessions, 'Chat history retrieved');
    }

    public function myHistory(Request $request)
    {
        $sessions = ChatSession::where('student_id', $request->user()->id)
            ->with([
                'messages'     => fn($q) => $q->orderBy('created_at'),
                'lesson:id,title,course_id',
                'lesson.course:id,name',
            ])
            ->latest()
            ->paginate(20)
            ->through(fn($s) => tap($s, function ($s) {
                $s->lesson_name = $s->lesson?->title;
                $s->course_name = $s->lesson?->course?->name;
            }));

        return $this->ReturnSuccess($sessions, 'Chat history retrieved');
    }
}
