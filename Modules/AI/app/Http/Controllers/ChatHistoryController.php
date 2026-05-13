<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Modules\AI\Models\ChatSession;

class ChatHistoryController extends Controller
{
    public function index(User $student)
    {
        $sessions = ChatSession::where('student_id', $student->id)
            ->with(['messages' => fn($q) => $q->orderBy('created_at')])
            ->latest()
            ->paginate(20);

        return $this->ReturnSuccess($sessions, 'Chat history retrieved');
    }
}
