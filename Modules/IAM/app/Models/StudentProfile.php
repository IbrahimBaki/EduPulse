<?php

namespace Modules\IAM\Models;

use App\Models\User;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Modules\Academic\Models\GradeLevel;

class StudentProfile extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'student_id', 'grade_level_id', 'student_code',
        'date_of_birth', 'gender', 'address', 'notes',
        'enrollment_date', 'is_active', 'fee_status', 'fee_due_date',
    ];

    protected $casts = [
        'date_of_birth'   => 'date',
        'enrollment_date' => 'date',
        'fee_due_date'    => 'date',
        'is_active'       => 'boolean',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function gradeLevel()
    {
        return $this->belongsTo(GradeLevel::class);
    }

    public static function generateStudentCode(int $tenantId, int $year): string
    {
        $lastCode = static::where('tenant_id', $tenantId)
            ->where('student_code', 'like', "STU-{$year}-%")
            ->orderByDesc('id')
            ->value('student_code');

        $sequence = $lastCode ? ((int) explode('-', $lastCode)[2]) + 1 : 1;

        return sprintf('STU-%d-%04d', $year, $sequence);
    }
}
