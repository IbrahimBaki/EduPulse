<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Modules\AI\Models\WeakTopic;

class WeakTopicController extends Controller
{
    public function index(User $student)
    {
        $topics = WeakTopic::where('student_id', $student->id)
            ->orderBy('score')
            ->get(['topic', 'score', 'attempts', 'source', 'last_attempted_at']);

        return $this->ReturnSuccess($topics, 'Weak topics retrieved');
    }

    public function myTopics(Request $request)
    {
        $topics = WeakTopic::where('student_id', $request->user()->id)
            ->orderBy('score')
            ->get(['topic', 'score', 'attempts', 'source', 'last_attempted_at']);

        return $this->ReturnSuccess($topics, 'Weak topics retrieved');
    }
}
