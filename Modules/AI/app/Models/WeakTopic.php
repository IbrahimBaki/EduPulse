<?php

namespace Modules\AI\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;
use App\Models\User;

class WeakTopic extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'student_id', 'topic',
        'score', 'max_score', 'attempts', 'source', 'last_attempted_at',
    ];

    protected $casts = ['last_attempted_at' => 'datetime'];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
