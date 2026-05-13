<?php

namespace Modules\AI\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;
use Modules\Academic\Models\Lesson;

class PdfChunk extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = ['tenant_id', 'lesson_id', 'chunk_text', 'chunk_index'];

    public function lesson()
    {
        return $this->belongsTo(Lesson::class);
    }
}
