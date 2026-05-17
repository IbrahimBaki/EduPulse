<?php

namespace Modules\Assessment\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ExamQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_id', 'question_text', 'question_type', 'options',
        'correct_answer', 'marks', 'explanation', 'order', 'difficulty', 'topic',
    ];

    protected $hidden = ['correct_answer', 'explanation'];

    protected $casts = [
        'options' => 'array',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function answers()
    {
        return $this->hasMany(ExamAnswer::class, 'question_id');
    }
}
