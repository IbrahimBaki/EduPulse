<?php

namespace Modules\Commerce\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FeeStructure extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'name', 'type', 'amount', 'currency',
        'due_date', 'is_active', 'description',
    ];

    protected $casts = [
        'amount'    => 'decimal:2',
        'due_date'  => 'date',
        'is_active' => 'boolean',
    ];

    public function studentFees()
    {
        return $this->hasMany(StudentFee::class);
    }
}
