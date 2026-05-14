<?php

namespace Modules\Communication\Models;

use App\Models\User;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Announcement extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'created_by', 'title', 'body', 'audience',
        'audience_id', 'is_published', 'published_at', 'expires_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'expires_at'   => 'datetime',
        'is_published' => 'boolean',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    public function scopeNotExpired($query)
    {
        return $query->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    public function scopeForStudent($query, User $student)
    {
        return $query->where(function ($q) use ($student) {
            $q->where('audience', 'all')
              ->orWhere(function ($q2) use ($student) {
                  $gradeId = $student->studentProfile?->grade_level_id;
                  if ($gradeId) {
                      $q2->where('audience', 'grade_level')->where('audience_id', $gradeId);
                  }
              })
              ->orWhere(function ($q2) use ($student) {
                  $enrolledCourseIds = \Modules\Academic\Models\Enrollment::where('student_id', $student->id)->pluck('course_id');
                  if ($enrolledCourseIds->isNotEmpty()) {
                      $q2->where('audience', 'course')->whereIn('audience_id', $enrolledCourseIds);
                  }
              })
              ->orWhere('audience', 'role');
        });
    }
}
