<?php

namespace Modules\AI\Services;

use Modules\Academic\Models\Lesson;
use Modules\AI\Models\PdfChunk;
use Smalot\PdfParser\Parser;

class PdfChunkService
{
    public function processAndStore(string $filePath, Lesson $lesson): int
    {
        PdfChunk::where('lesson_id', $lesson->id)->delete();

        $text  = $this->extractText($filePath);
        $words = preg_split('/\s+/', trim($text), -1, PREG_SPLIT_NO_EMPTY);

        $chunkSize = config('ai.chunk_size', 200);
        $overlap   = config('ai.chunk_overlap', 30);
        $step      = max(1, $chunkSize - $overlap);
        $index     = 0;

        for ($i = 0; $i < count($words); $i += $step) {
            PdfChunk::create([
                'tenant_id'   => $lesson->tenant_id,
                'lesson_id'   => $lesson->id,
                'chunk_text'  => implode(' ', array_slice($words, $i, $chunkSize)),
                'chunk_index' => $index++,
            ]);
        }

        return $index;
    }

    private function extractText(string $filePath): string
    {
        // pdftotext (poppler) handles Arabic BiDi ordering correctly.
        // smalot/pdfparser reads characters in visual/stream order which reverses RTL runs.
        $escaped = escapeshellarg($filePath);
        $raw     = shell_exec("pdftotext -enc UTF-8 -nopgbrk {$escaped} - 2>/dev/null");

        if ($raw === null || trim($raw) === '') {
            return (new Parser())->parseFile($filePath)->getText();
        }

        // Strip Unicode BiDi directional control characters that pdftotext injects
        // (LRM U+200E, RLM U+200F, LRE/RLE/PDF/LRO/RLO U+202A–U+202E, BOM U+FEFF)
        $text = preg_replace('/[\x{200E}\x{200F}\x{202A}-\x{202E}\x{FEFF}]/u', '', $raw);

        // Collapse runs of horizontal whitespace; preserve line breaks for context
        $text = preg_replace('/[^\S\n]+/', ' ', $text);

        return trim($text);
    }
}
