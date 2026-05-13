<?php

namespace Modules\Academic\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

class Subject extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = ['tenant_id', 'name'];

    public function courses()
    {
        return $this->hasMany(Course::class);
    }
}
