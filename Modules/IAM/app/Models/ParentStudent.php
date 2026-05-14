<?php

namespace Modules\IAM\Models;

use App\Models\User;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ParentStudent extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'parent_student';

    protected $fillable = ['tenant_id', 'parent_id', 'student_id'];

    public function parent()
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
