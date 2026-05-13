<?php

namespace Modules\AI\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Modules\Platform\Models\Tenant;
use App\Models\User;

class GenerateWeeklyReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 300;

    public function handle(): void
    {
        Tenant::where('status', 'active')->each(function (Tenant $tenant) {
            app()->instance('tenant', $tenant);

            $parents = User::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->role('parent')
                ->with([
                    'children.weakTopics'   => fn($q) => $q->where('score', '<', 70)->orderBy('score'),
                    'children.quizAttempts' => fn($q) => $q->latest()->limit(5),
                ])
                ->get();

            foreach ($parents as $parent) {
                $payload = [
                    'parent_id'   => $parent->id,
                    'parent_name' => $parent->name,
                    'tenant_code' => $tenant->code,
                    'children'    => $parent->children->map(fn($child) => [
                        'student_id'    => $child->id,
                        'student_name'  => $child->name,
                        'weak_topics'   => $child->weakTopics->toArray(),
                        'recent_scores' => $child->quizAttempts->map(fn($a) => [
                            'topic' => $a->topic,
                            'score' => $a->score,
                            'level' => $a->level,
                            'date'  => $a->created_at->toDateString(),
                        ])->toArray(),
                    ])->toArray(),
                ];

                SendN8nWebhookJob::dispatch('weekly_parent_report', $payload, $tenant->id);
            }
        });
    }
}
