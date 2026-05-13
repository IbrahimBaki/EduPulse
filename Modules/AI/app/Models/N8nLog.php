<?php

namespace Modules\AI\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

class N8nLog extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'webhook_type', 'payload',
        'status', 'response_code', 'sent_at',
    ];

    protected $casts = [
        'payload'  => 'array',
        'sent_at'  => 'datetime',
    ];
}
