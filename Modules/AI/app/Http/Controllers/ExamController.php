<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\AI\Services\GeminiService;
use Modules\AI\Services\SystemPromptBuilder;

class ExamController extends Controller
{
    public function generate(Request $request)
    {
        $data = $request->validate([
            'topics'   => 'required|array|min:1',
            'topics.*' => 'string|max:200',
            'count'    => 'nullable|integer|min:5|max:50',
        ]);

        $systemPrompt = app(SystemPromptBuilder::class)->build($request->user()->id);
        $exam         = app(GeminiService::class)->generateExam(
            $systemPrompt,
            $data['topics'],
            $data['count'] ?? 10
        );

        return $this->ReturnSuccess($exam, 'Exam generated');
    }
}
