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

    public function handle(): void
    {
        $log = N8nLog::create([
            'tenant_id'    => $this->tenantId,
            'webhook_type' => $this->webhookType,
            'payload'      => $this->payload,
            'status'       => 'pending',
        ]);

        $baseUrl  = rtrim(env('N8N_WEBHOOK_URL', ''), '/');
        $response = Http::timeout(10)->post("{$baseUrl}/{$this->webhookType}", $this->payload);

        $log->update([
            'status'        => $response->successful() ? 'sent' : 'failed',
            'response_code' => $response->status(),
            'sent_at'       => now(),
        ]);
    }

    public function failed(\Throwable $e): void
    {
        N8nLog::where('tenant_id', $this->tenantId)
            ->where('webhook_type', $this->webhookType)
            ->where('status', 'pending')
            ->latest()
            ->first()
            ?->update(['status' => 'failed']);
    }
}
