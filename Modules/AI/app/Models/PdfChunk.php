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

    /**
     * Full-text keyword search across chunks for a lesson.
     * Returns the most relevant chunks (any keyword matches) up to $limit.
     * Falls back to sequential chunks when no keywords are long enough.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, static>
     */
    public static function searchByKeywords(int $lessonId, string $query, int $limit = 5): \Illuminate\Database\Eloquent\Collection
    {
        $keywords = array_values(array_filter(
            preg_split('/\s+/', trim($query), -1, PREG_SPLIT_NO_EMPTY),
            fn ($w) => mb_strlen($w) > 3
        ));

        if (empty($keywords)) {
            return static::where('lesson_id', $lessonId)
                ->orderBy('chunk_index')
                ->limit($limit)
                ->get();
        }

        return static::where('lesson_id', $lessonId)
            ->where(function ($q) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $q->orWhere('chunk_text', 'LIKE', '%' . $keyword . '%');
                }
            })
            ->limit($limit)
            ->get();
    }
}
