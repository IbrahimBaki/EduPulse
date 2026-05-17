<?php

namespace Modules\Assessment\Models;

use App\Models\User;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Lesson;

class Exam extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'course_id', 'created_by', 'title', 'description',
        'status', 'total_marks', 'passing_percentage', 'duration_minutes',
        'scheduled_at', 'starts_at', 'ends_at',
        'is_ai_generated', 'ai_model_used', 'language',
    ];

    protected $casts = [
        'scheduled_at'   => 'datetime',
        'starts_at'      => 'datetime',
        'ends_at'        => 'datetime',
        'is_ai_generated' => 'boolean',
    ];

    public function tenant()
    {
        return $this->belongsTo(\Modules\Platform\Models\Tenant::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lessons()
    {
        return $this->belongsToMany(Lesson::class, 'exam_lessons');
    }

    public function questions()
    {
        return $this->hasMany(ExamQuestion::class)->orderBy('order');
    }

    public function attempts()
    {
        return $this->hasMany(ExamAttempt::class);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['published', 'scheduled', 'active']);
    }

    public function scopeForStudent($query, User $student)
    {
        $courseIds = $student->enrollments()->pluck('course_id');
        return $query->active()->whereIn('course_id', $courseIds);
    }
}
