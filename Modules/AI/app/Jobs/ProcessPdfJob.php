<?php

namespace Modules\AI\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Modules\Academic\Models\Lesson;
use Modules\AI\Services\PdfChunkService;

class ProcessPdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 120;

    public function __construct(
        private readonly Lesson $lesson,
        private readonly string $storedPath,
    ) {}

    public function handle(PdfChunkService $service): void
    {
        $absolutePath = Storage::disk('local')->path($this->storedPath);

        $chunkCount = $service->processAndStore($absolutePath, $this->lesson);

        $this->lesson->update([
            'pdf_processed'    => true,
            'pdf_chunks_count' => $chunkCount,
        ]);

        SendN8nWebhookJob::dispatch('content_uploaded', [
            'lesson_id'    => $this->lesson->id,
            'lesson_title' => $this->lesson->title,
            'tenant_code'  => $this->lesson->tenant->code ?? null,
        ], $this->lesson->tenant_id);
    }
}
