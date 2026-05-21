<?php

namespace Modules\AI\Models;

use App\Models\User;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Modules\Assessment\Models\ExamAttempt;

class StudyPlan extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'exam_attempt_id',
        'plan_text',
        'weak_topics',
        'generated_at',
    ];

    protected $casts = [
        'weak_topics'  => 'array',
        'generated_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function examAttempt()
    {
        return $this->belongsTo(ExamAttempt::class, 'exam_attempt_id');
    }
}
