<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\AI\Models\QuizAttempt;
use Modules\AI\Models\WeakTopic;

class DashboardController extends Controller
{
    public function teacher(Request $request)
    {
        $topicStats = QuizAttempt::where('created_at', '>=', now()->subDays(30))
            ->groupBy('topic')
            ->selectRaw('topic, AVG(score) as avg_score, COUNT(*) as attempt_count')
            ->orderByRaw('AVG(score) ASC')
            ->get();

        $atRisk = WeakTopic::where('score', '<', 60)
            ->with('student:id,name,email')
            ->orderBy('score')
            ->get(['student_id', 'topic', 'score', 'attempts']);

        return $this->ReturnSuccess([
            'topic_stats' => $topicStats,
            'at_risk'     => $atRisk,
        ], 'Teacher dashboard retrieved');
    }

    public function parent(Request $request)
    {
        $parent   = $request->user();
        $children = $parent->children()->with([
            'weakTopics' => fn($q) => $q->where('score', '<', 70)->orderBy('score'),
            'quizAttempts' => fn($q) => $q->latest()->limit(5),
        ])->get(['users.id', 'users.name', 'users.email']);

        return $this->ReturnSuccess(['children' => $children], 'Parent dashboard retrieved');
    }
}
