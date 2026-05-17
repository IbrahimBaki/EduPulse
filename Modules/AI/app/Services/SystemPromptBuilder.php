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
    public function build(int $studentId, ?int $lessonId = null, ?string $studentMessage = null, string $mode = 'chat'): string
    {
        $weakTopics = WeakTopic::where('student_id', $studentId)
            ->where('score', '<', 60)
            ->orderBy('score')
            ->pluck('topic')
            ->toArray();

        $tenantName = app()->bound('tenant') ? app('tenant')->name : 'EduPulse';
        $weakList   = $weakTopics ? implode(', ', $weakTopics) : 'none identified';

        if ($mode === 'quiz') {
            $base = "You are an educational quiz generator for {$tenantName}.\n"
                  . "Student weak areas: {$weakList}.\n"
                  . "CRITICAL RULE: Generate questions in the SAME language as the topic.\n"
                  . "- English grammar/language topic → questions and options in English\n"
                  . "- Arabic topic → questions and options in Arabic\n"
                  . "- Math/Science → use the appropriate notation\n"
                  . "Explanations in the 'explanation' field can be in Arabic (Egyptian dialect) to help the student understand.\n"
                  . "Questions must be practical fill-in-the-blank or multiple-choice, not translations.";

            return $base;
        }

        $base = "أنت مساعد تعليمي ذكي اسمك \"بلس\" بتشتغل على منصة {$tenantName}.\n"
              . "**اللغة:** اتكلم دايما بالعربي المصري العامية الواضحة والبسيطة.\n"
              . "**نقاط ضعف الطالب:** {$weakList}. ركّز على تقوية الجوانب دي.\n"
              . "**تنسيق الردود — مهم جداً:**\n"
              . "- استخدم Markdown في كل ردودك (## عناوين، **bold**، - قوائم، | جداول |)\n"
              . "- لو في مقارنة بين حاجتين → استخدم جدول Markdown\n"
              . "- لو في خطوات → استخدم قائمة مرتبة 1. 2. 3.\n"
              . "- لو في كود → استخدم \`\`\`code block\`\`\`\n"
              . "- لو في رسم أو مخطط تدفق → استخدم \`\`\`mermaid\`\`\` block\n"
              . "- ابدأ دايما بملخص سريع في سطرين، بعدين وسّع الشرح\n"
              . "- الردود تكون شاملة ومنظمة ومفيدة وممتعة للطالب";

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
