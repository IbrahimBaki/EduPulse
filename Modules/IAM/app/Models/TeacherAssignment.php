<?php

namespace Modules\IAM\Models;

use App\Models\User;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Modules\Academic\Models\GradeLevel;
use Modules\Academic\Models\Subject;

class TeacherAssignment extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = ['tenant_id', 'teacher_id', 'subject_id', 'grade_level_id', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function gradeLevel()
    {
        return $this->belongsTo(GradeLevel::class);
    }
}
