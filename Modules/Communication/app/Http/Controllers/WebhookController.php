<?php

namespace Modules\Communication\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Academic\Models\Schedule;
use Modules\Communication\Http\Requests\IncomingWebhookRequest;

class WebhookController extends Controller
{
    use ApiResponser;

    public function notify(IncomingWebhookRequest $request)
    {
        $tenant = app('tenant');
        $validated = $request->validated();

        $notifications = collect($validated['user_ids'])->map(fn($userId) => [
            'id'              => Str::uuid()->toString(),
            'type'            => $validated['type'],
            'notifiable_type' => 'App\Models\User',
            'notifiable_id'   => $userId,
            'data'            => json_encode($validated['data'] ?? []),
            'tenant_id'       => $tenant->id,
            'title'           => $validated['title'],
            'body'            => $validated['body'],
            'created_at'      => now(),
            'updated_at'      => now(),
        ])->toArray();

        DB::table('notifications')->insert($notifications);

        return $this->ReturnSuccess(['created' => count($notifications)], 'Notifications created');
    }

    public function internalUpcoming(Request $request)
    {
        if ($request->header('X-N8n-Secret') !== env('N8N_INCOMING_SECRET')) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $schedules = Schedule::with('course', 'teacher')
            ->where('status', 'scheduled')
            ->where('starts_at', '>=', now())
            ->where('starts_at', '<=', now()->addMinutes(35))
            ->get();

        return $this->ReturnSuccess($schedules, 'Upcoming sessions retrieved');
    }
}
