<?php

namespace Modules\Academic\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

class Subject extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = ['tenant_id', 'name', 'description', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function courses()
    {
        return $this->hasMany(Course::class);
    }

    public function gradeLevels()
    {
        return $this->belongsToMany(GradeLevel::class, 'subject_grade_level');
    }
}
