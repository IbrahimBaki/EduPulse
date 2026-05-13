<?php

namespace Modules\AI\Services;

use Modules\AI\Models\WeakTopic;

class WeakTopicService
{
    public function update(int $studentId, string $topic, int $score, string $source): WeakTopic
    {
        $wt = WeakTopic::firstOrNew(['student_id' => $studentId, 'topic' => $topic]);

        $prevAttempts  = $wt->attempts;
        $wt->attempts  = $prevAttempts + 1;
        $wt->score     = $wt->exists
            ? (int) round(($wt->score * $prevAttempts + $score) / $wt->attempts)
            : $score;
        $wt->source              = $source;
        $wt->last_attempted_at   = now();
        $wt->save();

        return $wt;
    }
}
