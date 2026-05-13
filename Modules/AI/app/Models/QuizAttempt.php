<?php

namespace Modules\AI\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;
use App\Models\User;
use Modules\Academic\Models\Lesson;

class QuizAttempt extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'student_id', 'lesson_id', 'topic',
        'score', 'passed', 'level', 'source', 'payload',
    ];

    protected $casts = [
        'payload' => 'array',
        'passed'  => 'boolean',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function lesson()
    {
        return $this->belongsTo(Lesson::class);
    }
}
