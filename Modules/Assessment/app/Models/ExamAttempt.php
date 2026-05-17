<?php

namespace Modules\Assessment\Models;

use App\Models\User;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ExamAttempt extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'exam_id', 'student_id', 'status',
        'started_at', 'submitted_at', 'total_score', 'percentage',
        'is_passed', 'graded_by', 'graded_at',
        'teacher_approved_at', 'approved_by',
    ];

    protected $casts = [
        'started_at'          => 'datetime',
        'submitted_at'        => 'datetime',
        'graded_at'           => 'datetime',
        'teacher_approved_at' => 'datetime',
        'is_passed'           => 'boolean',
        'percentage'          => 'float',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function answers()
    {
        return $this->hasMany(ExamAnswer::class, 'attempt_id');
    }
}
