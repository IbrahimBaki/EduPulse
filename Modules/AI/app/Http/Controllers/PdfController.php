<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Academic\Models\Lesson;
use Modules\AI\Jobs\ProcessPdfJob;

class PdfController extends Controller
{
    public function upload(Request $request, Lesson $lesson)
    {
        $request->validate([
            'pdf' => 'required|file|mimes:pdf|max:20480',
        ]);

        $path = $request->file('pdf')->store("pdfs/lessons/{$lesson->id}");

        ProcessPdfJob::dispatch($lesson, $path);

        return $this->ReturnSuccess(
            ['lesson_id' => $lesson->id],
            'PDF uploaded and queued for processing',
            202
        );
    }
}
