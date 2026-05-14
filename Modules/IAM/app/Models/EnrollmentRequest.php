<?php

namespace Modules\IAM\Models;

use App\Models\User;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Modules\Academic\Models\Course;

class EnrollmentRequest extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'student_id', 'course_id', 'status',
        'requested_by', 'reviewed_by', 'notes', 'reviewed_at',
        'fee_amount', 'fee_paid',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'fee_amount'  => 'decimal:2',
        'fee_paid'    => 'boolean',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
