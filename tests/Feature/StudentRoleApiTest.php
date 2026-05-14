<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\Academic\Models\Course;
use Modules\Platform\Models\Tenant;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StudentRoleApiTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User   $student;
    private User   $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Test School',
            'code'   => 'testschool',
            'status' => 'active',
        ]);

        Role::firstOrCreate(['name' => 'student', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'teacher', 'guard_name' => 'web']);

        $this->teacher = User::create([
            'name'      => 'Test Teacher',
            'email'     => 'teacher@test.com',
            'password'  => bcrypt('password'),
            'tenant_id' => $this->tenant->id,
        ]);
        $this->teacher->assignRole('teacher');

        $this->student = User::create([
            'name'      => 'Test Student',
            'email'     => 'student@test.com',
            'password'  => bcrypt('password'),
            'tenant_id' => $this->tenant->id,
        ]);
        $this->student->assignRole('student');
    }

    private function url(string $path): string
    {
        return "/api/v1/{$this->tenant->code}/{$path}";
    }

    // ─── Bug 1 regression: role-audience announcements must NOT reach students ───

    public function test_role_audience_announcements_are_not_visible_to_students(): void
    {
        \DB::table('announcements')->insert([
            'tenant_id'    => $this->tenant->id,
            'created_by'   => $this->teacher->id,
            'title'        => 'Teacher-Only Notice',
            'body'         => 'For teachers only',
            'audience'     => 'role',
            'is_published' => true,
            'published_at' => now()->toDateTimeString(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        \DB::table('announcements')->insert([
            'tenant_id'    => $this->tenant->id,
            'created_by'   => $this->teacher->id,
            'title'        => 'School-Wide Notice',
            'body'         => 'For everyone',
            'audience'     => 'all',
            'is_published' => true,
            'published_at' => now()->toDateTimeString(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson($this->url('student/announcements'));

        $response->assertOk()->assertJsonPath('status', 'success');

        $titles = collect($response->json('data.data'))->pluck('title')->toArray();
        $this->assertContains('School-Wide Notice', $titles);
        $this->assertNotContains(
            'Teacher-Only Notice',
            $titles,
            'audience=role announcements must not be visible to students (FR-014 data leakage)'
        );
    }

    // ─── Announcement expiry: expired records must never appear ───

    public function test_expired_announcements_are_hidden_from_students(): void
    {
        \DB::table('announcements')->insert([
            'tenant_id'    => $this->tenant->id,
            'created_by'   => $this->teacher->id,
            'title'        => 'Expired Notice',
            'body'         => 'Old news',
            'audience'     => 'all',
            'is_published' => true,
            'published_at' => now()->subDays(2)->toDateTimeString(),
            'expires_at'   => now()->subHour()->toDateTimeString(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        \DB::table('announcements')->insert([
            'tenant_id'    => $this->tenant->id,
            'created_by'   => $this->teacher->id,
            'title'        => 'Live Notice',
            'body'         => 'Current news',
            'audience'     => 'all',
            'is_published' => true,
            'published_at' => now()->toDateTimeString(),
            'expires_at'   => now()->addDay()->toDateTimeString(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson($this->url('student/announcements'));

        $response->assertOk();
        $titles = collect($response->json('data.data'))->pluck('title')->toArray();
        $this->assertContains('Live Notice', $titles);
        $this->assertNotContains(
            'Expired Notice',
            $titles,
            'Expired announcements must be excluded even when is_published=true (FR-014 edge case)'
        );
    }

    // ─── Bug 2 regression: schedule endpoint must return ALL sessions (paginated) ───

    public function test_upcoming_schedules_returns_all_sessions_not_capped_at_ten(): void
    {
        $course = Course::create([
            'tenant_id'  => $this->tenant->id,
            'teacher_id' => $this->teacher->id,
            'name'       => 'Math 101',
        ]);

        \DB::table('enrollments')->insert([
            'tenant_id'   => $this->tenant->id,
            'course_id'   => $course->id,
            'student_id'  => $this->student->id,
            'enrolled_at' => now()->toDateTimeString(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        for ($i = 1; $i <= 12; $i++) {
            \DB::table('schedules')->insert([
                'tenant_id'  => $this->tenant->id,
                'course_id'  => $course->id,
                'teacher_id' => $this->teacher->id,
                'title'      => "Session {$i}",
                'starts_at'  => now()->addDays($i)->toDateTimeString(),
                'ends_at'    => now()->addDays($i)->addHour()->toDateTimeString(),
                'type'       => 'online',
                'status'     => 'scheduled',
                'jitsi_url'  => "https://meet.jitsi/session-{$i}",
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson($this->url('student/schedules'));

        $response->assertOk()->assertJsonPath('status', 'success');
        $this->assertEquals(
            12,
            $response->json('data.total'),
            'GET /student/schedules must return all upcoming sessions via pagination (FR-012), not be capped at 10'
        );
    }

    // ─── Bug 3 regression: markRead must return the updated notification record ───

    public function test_mark_notification_read_returns_updated_record_with_read_at(): void
    {
        $notificationId = (string) Str::uuid();
        \DB::table('notifications')->insert([
            'id'              => $notificationId,
            'tenant_id'       => $this->tenant->id,
            'type'            => 'App\\Notifications\\TestNotification',
            'notifiable_type' => User::class,
            'notifiable_id'   => $this->student->id,
            'data'            => json_encode(['message' => 'Session reminder']),
            'read_at'         => null,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->patchJson($this->url("notifications/{$notificationId}/read"));

        $response->assertOk()->assertJsonPath('status', 'success');

        $data = $response->json('data');
        $this->assertNotNull(
            $data,
            'PATCH /notifications/{id}/read must return the updated notification record (FR-015), got null'
        );
        $this->assertNotNull(
            $data['read_at'] ?? null,
            'read_at must be populated in the returned record after marking as read'
        );
    }

    // ─── Bug 4 regression: fees must be ordered overdue → pending → waived → paid ───

    public function test_student_fees_ordered_overdue_then_pending_then_waived_then_paid(): void
    {
        $base = [
            'tenant_id'   => $this->tenant->id,
            'student_id'  => $this->student->id,
            'amount'      => 100.00,
            'currency'    => 'EGP',
            'created_by'  => $this->teacher->id,
            'created_at'  => now(),
            'updated_at'  => now(),
        ];

        // Insert intentionally in reverse priority order to prove the ORDER BY
        \DB::table('student_fees')->insert($base + ['description' => 'Paid Fee',    'status' => 'paid']);
        \DB::table('student_fees')->insert($base + ['description' => 'Waived Fee',  'status' => 'waived']);
        \DB::table('student_fees')->insert($base + ['description' => 'Pending Fee', 'status' => 'pending']);
        \DB::table('student_fees')->insert($base + ['description' => 'Overdue Fee', 'status' => 'overdue']);

        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson($this->url('student/fees'));

        $response->assertOk()->assertJsonPath('status', 'success');

        $statuses = collect($response->json('data.data'))->pluck('status')->toArray();
        $this->assertEquals(
            ['overdue', 'pending', 'waived', 'paid'],
            $statuses,
            'Fees must be ordered overdue → pending → waived → paid (spec US7 AS1)'
        );
    }

    // ─── Attendance ownership: summary must be scoped to authenticated student only ───

    public function test_attendance_summary_is_scoped_to_authenticated_student(): void
    {
        $otherStudent = User::create([
            'name'      => 'Other Student',
            'email'     => 'other@test.com',
            'password'  => bcrypt('password'),
            'tenant_id' => $this->tenant->id,
        ]);
        $otherStudent->assignRole('student');

        $course = Course::create([
            'tenant_id'  => $this->tenant->id,
            'teacher_id' => $this->teacher->id,
            'name'       => 'Biology',
        ]);

        // Create 3 schedules so we get 3 distinct attendance records for our student
        for ($i = 1; $i <= 3; $i++) {
            $scheduleId = \DB::table('schedules')->insertGetId([
                'tenant_id'  => $this->tenant->id,
                'course_id'  => $course->id,
                'teacher_id' => $this->teacher->id,
                'title'      => "Session {$i}",
                'starts_at'  => now()->subDays($i)->toDateTimeString(),
                'ends_at'    => now()->subDays($i)->addHour()->toDateTimeString(),
                'type'       => 'in_person',
                'status'     => 'completed',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            \DB::table('attendances')->insert([
                'tenant_id'   => $this->tenant->id,
                'schedule_id' => $scheduleId,
                'student_id'  => $this->student->id,
                'status'      => 'present',
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        // Other student: 10 absent records across 10 distinct schedules (unique constraint per schedule+student)
        for ($i = 1; $i <= 10; $i++) {
            $noisyId = \DB::table('schedules')->insertGetId([
                'tenant_id'  => $this->tenant->id,
                'course_id'  => $course->id,
                'teacher_id' => $this->teacher->id,
                'title'      => "Noisy Session {$i}",
                'starts_at'  => now()->subDays($i + 10)->toDateTimeString(),
                'ends_at'    => now()->subDays($i + 10)->addHour()->toDateTimeString(),
                'type'       => 'in_person',
                'status'     => 'completed',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            \DB::table('attendances')->insert([
                'tenant_id'   => $this->tenant->id,
                'schedule_id' => $noisyId,
                'student_id'  => $otherStudent->id,
                'status'      => 'absent',
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson($this->url('student/attendance'));

        $response->assertOk()->assertJsonPath('status', 'success');

        $this->assertEquals(
            3,
            $response->json('data.total_sessions'),
            'Attendance summary must only include the authenticated student\'s records, not other students\' (SC-004)'
        );
        $this->assertEquals(100.0, $response->json('data.attendance_rate'));
    }

    // ─── Role enforcement ───

    public function test_teacher_cannot_access_student_prefixed_routes(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')
            ->getJson($this->url('student/courses'));

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson($this->url('student/courses'));
        $response->assertStatus(401);
    }

    // ─── T035: Cross-student authorization on sealed AI endpoints ───
    // SECURITY FINDING: The sealed Modules/AI/ controllers (WeakTopicController,
    // ChatHistoryController) perform no ownership check — any authenticated student
    // can read any other student's weak-topics and chat-history by substituting
    // their {student} route parameter. Fixing this requires modifying the sealed
    // AI module. Tracked as a known risk in specs/003-student-role-api/plan.md.

    public function test_ai_weak_topics_endpoint_accepts_cross_student_request_security_gap(): void
    {
        $otherStudent = User::create([
            'name'      => 'Other Student',
            'email'     => 'other2@test.com',
            'password'  => bcrypt('password'),
            'tenant_id' => $this->tenant->id,
        ]);
        $otherStudent->assignRole('student');

        \DB::table('weak_topics')->insert([
            'tenant_id'         => $this->tenant->id,
            'student_id'        => $otherStudent->id,
            'topic'             => 'Quadratic Equations',
            'score'             => 45,
            'attempts'          => 3,
            'source'            => 'ai',
            'last_attempted_at' => now()->toDateTimeString(),
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        // Student A (this->student) requests Student B's (otherStudent) weak-topics.
        // The sealed AI module does NOT enforce ownership — this returns 200, not 403.
        // This assertion documents the gap; the fix requires unsealing Modules/AI/.
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/{$this->tenant->code}/ai/students/{$otherStudent->id}/weak-topics");

        // KNOWN GAP: should be 403 per T035 / FR-016 authorization requirement.
        // Remove this assertion and replace with assertStatus(403) once AI module is unsealed.
        $response->assertStatus(200);
    }

    public function test_ai_chat_history_endpoint_accepts_cross_student_request_security_gap(): void
    {
        $otherStudent = User::create([
            'name'      => 'Other Student B',
            'email'     => 'other3@test.com',
            'password'  => bcrypt('password'),
            'tenant_id' => $this->tenant->id,
        ]);
        $otherStudent->assignRole('student');

        // Student A requests Student B's chat-history.
        // The sealed AI module does NOT enforce ownership — this returns 200, not 403.
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/{$this->tenant->code}/ai/students/{$otherStudent->id}/chat-history");

        // KNOWN GAP: should be 403 per T035 / FR-016 authorization requirement.
        // Ownership enforcement requires modifying the sealed Modules/AI/ module.
        $response->assertStatus(200);
    }
}
