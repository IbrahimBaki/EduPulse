<?php

namespace Modules\Academic\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToTenant;

class Lesson extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'course_id', 'title', 'description', 'order',
        'pdf_path', 'pdf_processed', 'pdf_chunks_count', 'is_published',
    ];

    protected $casts = [
        'pdf_processed' => 'boolean',
        'is_published'  => 'boolean',
        'pdf_chunks_count' => 'integer',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function pdfChunks()
    {
        return $this->hasMany(\Modules\AI\Models\PdfChunk::class);
    }
}
