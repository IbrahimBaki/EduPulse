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

        $text  = (new Parser())->parseFile($filePath)->getText();
        $words = preg_split('/\s+/', trim($text), -1, PREG_SPLIT_NO_EMPTY);

        $chunkSize = config('ai.chunk_size', 500);
        $overlap   = config('ai.chunk_overlap', 50);
        $step      = max(1, $chunkSize - $overlap);
        $index     = 0;

        for ($i = 0; $i < count($words); $i += $step) {
            PdfChunk::create([
                'lesson_id'   => $lesson->id,
                'chunk_text'  => implode(' ', array_slice($words, $i, $chunkSize)),
                'chunk_index' => $index++,
            ]);
        }

        return $index;
    }
}
