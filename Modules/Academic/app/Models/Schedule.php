<?php

namespace Modules\Academic\Models;

use App\Models\User;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;

class Schedule extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'course_id', 'teacher_id', 'title', 'description',
        'starts_at', 'ends_at', 'type', 'jitsi_room', 'jitsi_url',
        'meeting_url', 'status', 'recording_url',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public static function generateJitsiRoom(string $tenantCode, int $courseId): string
    {
        return "{$tenantCode}-{$courseId}-" . Str::random(8);
    }
}
