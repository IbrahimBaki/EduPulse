<?php

namespace Modules\AI\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Modules\AI\Models\N8nLog;

class SendN8nWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 30;

    public function __construct(
        private readonly string $webhookType,
        private readonly array  $payload,
        private readonly int    $tenantId,
    ) {}

    private const ACTIVE_WEBHOOK_TYPES = [
        'exam_score_alert',
        'weekly_parent_report',
        'schedule_created',
        'schedule_cancelled',
    ];

    public function handle(): void
    {
        if (!in_array($this->webhookType, self::ACTIVE_WEBHOOK_TYPES)) {
            return;
        }

        // On retries a new log row must NOT be created — reuse the pending one.
        $log = $this->attempts() > 1
            ? N8nLog::where('tenant_id', $this->tenantId)
                ->where('webhook_type', $this->webhookType)
                ->where('status', 'pending')
                ->latest()
                ->first()
            : null;

        $log ??= N8nLog::create([
            'tenant_id'    => $this->tenantId,
            'webhook_type' => $this->webhookType,
            'payload'      => $this->payload,
            'status'       => 'pending',
        ]);

        $baseUrl = rtrim(config('services.n8n.webhook_url', ''), '/');

        if (empty($baseUrl)) {
            $log->update(['status' => 'failed', 'sent_at' => now()]);
            return;
        }

        $response = Http::timeout(10)->post("{$baseUrl}/{$this->webhookType}", $this->payload);

        $log->update([
            'status'        => $response->successful() ? 'sent' : 'failed',
            'response_code' => $response->status(),
            'sent_at'       => now(),
        ]);
    }

    public function failed(\Throwable $e): void
    {
        // Mark ALL pending logs for this type+tenant as failed to avoid orphans on retries.
        N8nLog::where('tenant_id', $this->tenantId)
            ->where('webhook_type', $this->webhookType)
            ->where('status', 'pending')
            ->update(['status' => 'failed']);
    }
}
