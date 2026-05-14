<?php

namespace Modules\Academic\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

class SubjectGradeLevel extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'subject_grade_level';

    protected $fillable = ['tenant_id', 'subject_id', 'grade_level_id'];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function gradeLevel()
    {
        return $this->belongsTo(GradeLevel::class);
    }
}
