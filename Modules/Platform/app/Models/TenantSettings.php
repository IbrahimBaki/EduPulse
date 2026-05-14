<?php

namespace Modules\Platform\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

class TenantSettings extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'academy_name', 'logo_path', 'primary_color',
        'currency', 'timezone', 'language', 'academic_year', 'semester',
        'contact_email', 'contact_phone', 'address',
    ];
}
