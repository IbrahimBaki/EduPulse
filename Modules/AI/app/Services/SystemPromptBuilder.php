<?php

namespace Modules\AI\Services;

use Modules\AI\Models\PdfChunk;
use Modules\AI\Models\WeakTopic;

class SystemPromptBuilder
{
    public function build(int $studentId, ?int $lessonId = null): string
    {
        $weakTopics = WeakTopic::where('student_id', $studentId)
            ->where('score', '<', 60)
            ->orderBy('score')
            ->pluck('topic')
            ->toArray();

        $chunks = $lessonId
            ? PdfChunk::where('lesson_id', $lessonId)
                ->orderBy('chunk_index')
                ->limit(config('ai.max_chunks', 5))
                ->pluck('chunk_text')
                ->toArray()
            : [];

        $tenantName = app()->bound('tenant') ? app('tenant')->name : 'EduPulse';
        $weakList   = $weakTopics ? implode(', ', $weakTopics) : 'none identified';
        $content    = $chunks ? implode("\n---\n", $chunks) : 'No lesson content provided.';

        return "You are an educational assistant for {$tenantName}.\n"
             . "Student weak areas: {$weakList}.\n"
             . "Relevant lesson content:\n---\n{$content}\n---\n"
             . "Answer ONLY based on the lesson content above. Be clear and concise for a student audience.";
    }
}
