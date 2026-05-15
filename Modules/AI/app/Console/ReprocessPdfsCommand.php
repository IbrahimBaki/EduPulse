<?php

namespace Modules\AI\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Modules\Academic\Models\Lesson;
use Modules\AI\Jobs\ProcessPdfJob;

class ReprocessPdfsCommand extends Command
{
    protected $signature   = 'ai:reprocess-pdfs';
    protected $description = 'Re-dispatch PDF processing jobs for all lessons that have uploaded PDFs';

    public function handle(): int
    {
        // Lessons are tenant-scoped; withoutGlobalScopes lets us iterate all tenants
        $lessons = Lesson::withoutGlobalScopes()
            ->where('pdf_processed', true)
            ->get();

        // Also pick up lessons that have files on disk but pdf_path was never set
        $orphanDirs = Storage::disk('local')->directories('pdfs/lessons');
        $orphanIds  = collect($orphanDirs)
            ->map(fn ($d) => (int) basename($d))
            ->filter()
            ->diff($lessons->pluck('id'));

        if ($orphanIds->isNotEmpty()) {
            $extra = Lesson::withoutGlobalScopes()
                ->whereIn('id', $orphanIds->values())
                ->get();
            $lessons = $lessons->merge($extra);
        }

        if ($lessons->isEmpty()) {
            $this->info('No lessons with PDF content found.');
            return self::SUCCESS;
        }

        $dispatched = 0;

        foreach ($lessons as $lesson) {
            // Prefer the saved pdf_path; fall back to most-recently-modified file in the lesson dir
            if ($lesson->pdf_path && Storage::disk('local')->exists($lesson->pdf_path)) {
                $storedPath = $lesson->pdf_path;
            } else {
                $files = Storage::disk('local')->files("pdfs/lessons/{$lesson->id}");

                if (empty($files)) {
                    $this->warn("  Lesson {$lesson->id} ({$lesson->title}): no PDF in storage, skipping.");
                    continue;
                }

                $storedPath = collect($files)
                    ->sortByDesc(fn ($f) => Storage::disk('local')->lastModified($f))
                    ->first();
            }

            ProcessPdfJob::dispatch($lesson, $storedPath);
            $dispatched++;

            $this->line("  Queued lesson {$lesson->id}: {$lesson->title}");
        }

        $this->info("Dispatched {$dispatched} job(s). Run 'php artisan queue:work' to process them.");

        return self::SUCCESS;
    }
}
