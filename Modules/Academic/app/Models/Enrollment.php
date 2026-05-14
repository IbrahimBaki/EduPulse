<?php

namespace Modules\Academic\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;
use App\Models\User;

class Enrollment extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'course_id', 'student_id', 'enrolled_at',
        'fee_amount', 'fee_paid',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
        'fee_amount'  => 'decimal:2',
        'fee_paid'    => 'boolean',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
