<?php

namespace Modules\Assessment\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Modules\Academic\Models\Lesson;

class ExamLesson extends Pivot
{
    protected $table = 'exam_lessons';

    public $incrementing = true;

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function lesson()
    {
        return $this->belongsTo(Lesson::class);
    }
}
