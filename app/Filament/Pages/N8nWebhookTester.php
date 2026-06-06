<?php

namespace App\Filament\Pages;

use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Illuminate\Support\Facades\Http;
use Modules\AI\Models\N8nLog;
use Modules\Platform\Models\Tenant;

class N8nWebhookTester extends Page
{
    protected static ?string $navigationIcon  = 'heroicon-o-signal';
    protected static ?string $navigationGroup = 'AI Tools';
    protected static ?string $navigationLabel = 'Webhook Tester';
    protected static ?string $title           = 'n8n Webhook Tester';
    protected static ?int    $navigationSort  = 99;

    protected static string $view = 'filament.pages.n8n-webhook-tester';

    public int    $selectedTenantId = 0;
    public array  $payloads         = [];
    public array  $results          = [];
    public array  $sending          = [];

    public function mount(): void
    {
        $firstTenant = Tenant::where('status', 'active')->first();
        $this->selectedTenantId = $firstTenant?->id ?? 0;
        $this->initPayloads();
    }

    public function updatedSelectedTenantId(): void
    {
        $this->results = [];
        $this->initPayloads();
    }

    private function initPayloads(): void
    {
        foreach (self::webhookDefinitions() as $def) {
            $type = $def['type'];
            if (!isset($this->payloads[$type])) {
                $this->payloads[$type] = json_encode($def['sample'], JSON_PRETTY_PRINT);
            }
        }
    }

    public function resetPayload(string $type): void
    {
        $definitions = collect(self::webhookDefinitions())->keyBy('type');
        if ($definitions->has($type)) {
            $this->payloads[$type] = json_encode($definitions[$type]['sample'], JSON_PRETTY_PRINT);
        }
    }

    public function sendTest(string $type): void
    {
        if (!$this->selectedTenantId) {
            Notification::make()->title('No tenant selected')->danger()->send();
            return;
        }

        $rawPayload = $this->payloads[$type] ?? '{}';
        $payload    = json_decode($rawPayload, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->results[$type] = [
                'ok'      => false,
                'code'    => null,
                'message' => 'Invalid JSON payload: ' . json_last_error_msg(),
            ];
            return;
        }

        $this->sending[$type] = true;

        $log = N8nLog::create([
            'tenant_id'    => $this->selectedTenantId,
            'webhook_type' => $type,
            'payload'      => $payload,
            'status'       => 'pending',
        ]);

        try {
            $baseUrl  = rtrim(env('N8N_WEBHOOK_URL', ''), '/');
            $fullUrl  = "{$baseUrl}/{$type}";
            $response = Http::timeout(10)->post($fullUrl, $payload);

            $status = $response->successful() ? 'sent' : 'failed';
            $log->update([
                'status'        => $status,
                'response_code' => $response->status(),
                'sent_at'       => now(),
            ]);

            $this->results[$type] = [
                'ok'      => $response->successful(),
                'code'    => $response->status(),
                'url'     => $fullUrl,
                'message' => $response->successful()
                    ? 'Delivered (HTTP ' . $response->status() . ') → ' . $fullUrl
                    : 'HTTP ' . $response->status() . ' → ' . $fullUrl,
            ];

            if ($response->successful()) {
                Notification::make()->title('Webhook sent')->body($type)->success()->send();
            } else {
                Notification::make()->title('Webhook failed')->body('HTTP ' . $response->status())->danger()->send();
            }
        } catch (\Throwable $e) {
            $baseUrl = rtrim(env('N8N_WEBHOOK_URL', ''), '/');
            $log->update(['status' => 'failed']);
            $this->results[$type] = [
                'ok'      => false,
                'code'    => null,
                'url'     => "{$baseUrl}/{$type}",
                'message' => 'Connection error: ' . $e->getMessage(),
            ];
            Notification::make()->title('Connection error')->body($e->getMessage())->danger()->send();
        }

        $this->sending[$type] = false;
    }

    public function getTenants(): array
    {
        return Tenant::where('status', 'active')
            ->orderBy('name')
            ->pluck('name', 'id')
            ->toArray();
    }

    public static function webhookDefinitions(): array
    {
        return [
            [
                'type'        => 'student_registered',
                'module'      => 'IAM',
                'color'       => 'blue',
                'icon'        => 'heroicon-o-user-plus',
                'description' => 'Fired when a new student account is created. Used to send welcome messages and onboarding instructions.',
                'trigger'     => 'POST /{tenant}/students',
                'sample'      => ['student_id' => 1, 'name' => 'Ahmed Ali', 'student_code' => 'STU-2024-001'],
            ],
            [
                'type'        => 'student_deactivated',
                'module'      => 'IAM',
                'color'       => 'blue',
                'icon'        => 'heroicon-o-user-minus',
                'description' => 'Fired when a student account is deactivated. Useful for notifying parents or administrators.',
                'trigger'     => 'PATCH /{tenant}/students/{id}/toggle-status',
                'sample'      => ['student_id' => 1, 'name' => 'Ahmed Ali'],
            ],
            [
                'type'        => 'teacher_welcome',
                'module'      => 'IAM',
                'color'       => 'blue',
                'icon'        => 'heroicon-o-academic-cap',
                'description' => 'Fired when a new teacher account is created. Sends login credentials and platform orientation links.',
                'trigger'     => 'POST /{tenant}/teachers',
                'sample'      => ['teacher_id' => 1, 'name' => 'Dr. Sarah Hassan', 'email' => 'sarah@school.com'],
            ],
            [
                'type'        => 'parent_registered',
                'module'      => 'IAM',
                'color'       => 'blue',
                'icon'        => 'heroicon-o-user-group',
                'description' => 'Fired when a parent account is created and linked. Sends account setup and child monitoring instructions.',
                'trigger'     => 'POST /{tenant}/parents',
                'sample'      => ['parent_id' => 1, 'name' => 'Mohammed Ali', 'email' => 'parent@family.com'],
            ],
            [
                'type'        => 'enrollment_approved',
                'module'      => 'IAM',
                'color'       => 'blue',
                'icon'        => 'heroicon-o-check-circle',
                'description' => 'Fired when a student\'s course enrollment request is approved by a manager.',
                'trigger'     => 'POST /{tenant}/enrollment-requests/{id}/approve',
                'sample'      => ['enrollment_request_id' => 1, 'student_id' => 1, 'course_id' => 1],
            ],
            [
                'type'        => 'enrollment_rejected',
                'module'      => 'IAM',
                'color'       => 'blue',
                'icon'        => 'heroicon-o-x-circle',
                'description' => 'Fired when a student\'s enrollment request is rejected. Notifies the student with the rejection reason.',
                'trigger'     => 'POST /{tenant}/enrollment-requests/{id}/reject',
                'sample'      => ['enrollment_request_id' => 1, 'student_id' => 1, 'course_id' => 1],
            ],
            [
                'type'        => 'lesson_published',
                'module'      => 'Academic',
                'color'       => 'green',
                'icon'        => 'heroicon-o-book-open',
                'description' => 'Fired when a lesson is published and made visible to enrolled students.',
                'trigger'     => 'POST /{tenant}/courses/{id}/lessons/{id}/publish',
                'sample'      => ['lesson_id' => 1, 'course_id' => 1, 'title' => 'Introduction to Algebra'],
            ],
            [
                'type'        => 'schedule_created',
                'module'      => 'Academic',
                'color'       => 'green',
                'icon'        => 'heroicon-o-calendar',
                'description' => 'Fired when a new live session or class schedule is created for a course.',
                'trigger'     => 'POST /{tenant}/courses/{id}/schedules',
                'sample'      => ['schedule_id' => 1, 'course_id' => 1, 'starts_at' => now()->addDay()->toISOString()],
            ],
            [
                'type'        => 'schedule_cancelled',
                'module'      => 'Academic',
                'color'       => 'green',
                'icon'        => 'heroicon-o-calendar-days',
                'description' => 'Fired when a schedule is cancelled or deleted. Notifies enrolled students.',
                'trigger'     => 'DELETE /{tenant}/schedules/{id}',
                'sample'      => ['schedule_id' => 1, 'course_id' => 1],
            ],
            [
                'type'        => 'student_absent',
                'module'      => 'Academic',
                'color'       => 'green',
                'icon'        => 'heroicon-o-x-mark',
                'description' => 'Fired per absent student when attendance is recorded. Triggers parent notification.',
                'trigger'     => 'POST /{tenant}/schedules/{id}/attendance',
                'sample'      => ['student_id' => 1, 'schedule_id' => 1, 'course_id' => 1],
            ],
            [
                'type'        => 'content_uploaded',
                'module'      => 'AI',
                'color'       => 'purple',
                'icon'        => 'heroicon-o-document-arrow-up',
                'description' => 'Fired after a PDF is processed and chunked for AI context. Notifies about new material availability.',
                'trigger'     => 'ProcessPdfJob (after PDF chunking)',
                'sample'      => ['lesson_id' => 1, 'lesson_title' => 'Chapter 1: Algebra Basics', 'tenant_code' => 'SCH01'],
            ],
            [
                'type'        => 'score_alert',
                'module'      => 'AI',
                'color'       => 'purple',
                'icon'        => 'heroicon-o-exclamation-triangle',
                'description' => 'Fired when a student scores below 50% on an AI quiz. Alerts parents and suggests remediation.',
                'trigger'     => 'POST /{tenant}/ai/quiz/submit (score < 50%)',
                'sample'      => ['student_id' => 1, 'student_name' => 'Ahmed Ali', 'topic' => 'Quadratic Equations', 'score' => 35, 'lesson_id' => 1],
            ],
            [
                'type'        => 'weekly_parent_report',
                'module'      => 'AI',
                'color'       => 'purple',
                'icon'        => 'heroicon-o-chart-bar',
                'description' => 'Fired weekly for each parent. Includes children\'s weak topics and recent quiz performance summary.',
                'trigger'     => 'GenerateWeeklyReportJob (scheduled cron)',
                'sample'      => [
                    'parent_id'   => 1,
                    'parent_name' => 'Mohammed Ali',
                    'tenant_code' => 'SCH01',
                    'children'    => [[
                        'student_id'    => 1,
                        'student_name'  => 'Ahmed Ali',
                        'weak_topics'   => [['topic' => 'Algebra', 'score' => 45]],
                        'recent_scores' => [['topic' => 'Algebra', 'score' => 45, 'level' => 'medium', 'date' => now()->toDateString()]],
                    ]],
                ],
            ],
            [
                'type'        => 'exam_published',
                'module'      => 'Assessment',
                'color'       => 'orange',
                'icon'        => 'heroicon-o-clipboard-document',
                'description' => 'Fired when a teacher publishes an exam, making it accessible to enrolled students.',
                'trigger'     => 'POST /{tenant}/exams/{id}/publish',
                'sample'      => ['exam_title' => 'Midterm Exam', 'course_name' => 'Mathematics', 'teacher_name' => 'Dr. Sarah', 'tenant_code' => 'SCH01'],
            ],
            [
                'type'        => 'exam_scheduled',
                'module'      => 'Assessment',
                'color'       => 'orange',
                'icon'        => 'heroicon-o-clock',
                'description' => 'Fired when an exam is given a scheduled start time. Sends reminders to students.',
                'trigger'     => 'POST /{tenant}/exams/{id}/schedule',
                'sample'      => ['exam_title' => 'Final Exam', 'course_name' => 'Mathematics', 'scheduled_at' => now()->addWeek()->toISOString(), 'duration' => 90, 'tenant_code' => 'SCH01'],
            ],
            [
                'type'        => 'exam_score_alert',
                'module'      => 'Assessment',
                'color'       => 'orange',
                'icon'        => 'heroicon-o-bell-alert',
                'description' => 'Fired when a student scores below 50% on a formal exam. Notifies teacher and parent.',
                'trigger'     => 'POST /{tenant}/exams/{id}/submit (score < 50%)',
                'sample'      => ['student_id' => 1, 'student_name' => 'Ahmed Ali', 'exam_title' => 'Midterm Exam', 'course_name' => 'Mathematics', 'score' => 30, 'percentage' => 40, 'teacher_email' => 'teacher@school.com', 'tenant_code' => 'SCH01'],
            ],
            [
                'type'        => 'fees_assigned',
                'module'      => 'Commerce',
                'color'       => 'yellow',
                'icon'        => 'heroicon-o-banknotes',
                'description' => 'Fired when a fee structure is bulk-assigned to students. Notifies about payment requirements.',
                'trigger'     => 'POST /{tenant}/fee-structures/{id}/assign',
                'sample'      => ['fee_structure_id' => 1, 'target' => 'course', 'target_id' => 1, 'created_count' => 25],
            ],
            [
                'type'        => 'fee_paid',
                'module'      => 'Commerce',
                'color'       => 'yellow',
                'icon'        => 'heroicon-o-credit-card',
                'description' => 'Fired when a student fee is marked as paid. Sends payment confirmation receipt.',
                'trigger'     => 'POST /{tenant}/student-fees/{id}/mark-paid',
                'sample'      => ['fee_id' => 1, 'student_id' => 1, 'amount' => 500.00],
            ],
            [
                'type'        => 'fee_overdue',
                'module'      => 'Commerce',
                'color'       => 'yellow',
                'icon'        => 'heroicon-o-exclamation-circle',
                'description' => 'Fired when a fee is flagged as overdue past its due date. Sends overdue payment reminder.',
                'trigger'     => 'POST /{tenant}/student-fees/{id}/mark-overdue',
                'sample'      => ['fee_id' => 1, 'student_id' => 1, 'amount' => 500.00],
            ],
            [
                'type'        => 'announcement_published',
                'module'      => 'Communication',
                'color'       => 'teal',
                'icon'        => 'heroicon-o-megaphone',
                'description' => 'Fired when an announcement is published to students, teachers, or parents via n8n broadcast.',
                'trigger'     => 'POST /{tenant}/announcements/{id}/publish',
                'sample'      => ['announcement_id' => 1, 'title' => 'School Holiday Notice', 'audience' => 'all'],
            ],
        ];
    }
}
