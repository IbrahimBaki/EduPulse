<?php

namespace Modules\Commerce\Models;

use App\Models\User;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PaymentTransaction extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'student_fee_id', 'amount', 'currency', 'payment_method',
        'status', 'gateway', 'gateway_ref', 'gateway_response', 'paid_at', 'created_by',
    ];

    protected $casts = [
        'amount'           => 'decimal:2',
        'paid_at'          => 'datetime',
        'gateway_response' => 'array',
    ];

    public function studentFee()
    {
        return $this->belongsTo(StudentFee::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
