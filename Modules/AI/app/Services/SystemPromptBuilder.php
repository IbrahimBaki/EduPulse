<?php

namespace Modules\AI\Services;

use Modules\AI\Models\PdfChunk;
use Modules\AI\Models\WeakTopic;

class SystemPromptBuilder
{
    /**
     * Build a system prompt for AI interactions.
     *
     * Pass $lessonId when chunks should be embedded in the prompt (quiz generation).
     * Omit $lessonId when the PDF is sent directly to the model (explain endpoint).
     */
    public function build(int $studentId, ?int $lessonId = null, ?string $studentMessage = null): string
    {
        $weakTopics = WeakTopic::where('student_id', $studentId)
            ->where('score', '<', 60)
            ->orderBy('score')
            ->pluck('topic')
            ->toArray();

        $tenantName = app()->bound('tenant') ? app('tenant')->name : 'EduPulse';
        $weakList   = $weakTopics ? implode(', ', $weakTopics) : 'none identified';

        $base = "You are an educational assistant for {$tenantName}.\n"
              . "Student weak areas: {$weakList}.\n"
              . "Be clear and concise for a student audience.";

        if (!$lessonId) {
            return $base;
        }

        // Quiz path: embed relevant chunks directly in the prompt
        $chunks = ($studentMessage !== null && trim($studentMessage) !== '')
            ? PdfChunk::searchByKeywords($lessonId, $studentMessage, config('ai.max_chunks', 5))
                ->pluck('chunk_text')
                ->toArray()
            : PdfChunk::where('lesson_id', $lessonId)
                ->orderBy('chunk_index')
                ->limit(config('ai.max_chunks', 5))
                ->pluck('chunk_text')
                ->toArray();

        $content = $chunks ? implode("\n---\n", $chunks) : 'No lesson content provided.';

        return $base . "\nRelevant lesson content:\n---\n{$content}\n---\n"
             . "Answer based on the lesson content above.";
    }
}
