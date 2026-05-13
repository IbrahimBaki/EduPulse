<?php

namespace Modules\AI\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ChatMessage extends Model
{
    use HasFactory;

    protected $fillable = ['session_id', 'role', 'content'];

    public function session()
    {
        return $this->belongsTo(ChatSession::class, 'session_id');
    }
}
