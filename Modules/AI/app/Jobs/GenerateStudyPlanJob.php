<?php

namespace Modules\AI\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Modules\Academic\Models\Attendance;
use Modules\AI\Models\PdfChunk;
use Modules\AI\Models\StudyPlan;
use Modules\AI\Models\WeakTopic;
use Modules\AI\Services\GeminiService;
use Modules\Assessment\Models\ExamAttempt;

class GenerateStudyPlanJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(private ExamAttempt $attempt) {}

    public function handle(GeminiService $gemini): void
    {
        $attempt = $this->attempt->loadMissing(['exam.course', 'exam.creator', 'exam.lessons', 'student']);
        $student = $attempt->student;
        $exam    = $attempt->exam;

        // 1. Weak topics
        $weakTopics = WeakTopic::where('student_id', $student->id)
            ->where('tenant_id', $attempt->tenant_id)
            ->orderByDesc('attempts')
            ->take(5)
            ->pluck('topic')
            ->toArray();

        // 2. Lesson content from exam's linked lessons
        $lessonIds   = $exam->lessons->pluck('id');
        $lessonChunks = PdfChunk::whereIn('lesson_id', $lessonIds)
            ->orderBy('lesson_id')
            ->orderBy('chunk_index')
            ->take(15)
            ->pluck('chunk_text')
            ->implode("\n\n");

        // 3. Recent exam results
        $recentExams = ExamAttempt::where('student_id', $student->id)
            ->where('tenant_id', $attempt->tenant_id)
            ->whereNotNull('submitted_at')
            ->latest('submitted_at')
            ->take(3)
            ->with('exam:id,title')
            ->get()
            ->map(fn($a) => optional($a->exam)->title . ': ' . $a->percentage . '%')
            ->implode(' | ');

        // 4. Attendance rate (last 30 days)
        $attendances    = Attendance::where('student_id', $student->id)
            ->where('tenant_id', $attempt->tenant_id)
            ->where('created_at', '>=', now()->subDays(30))
            ->get();
        $attendanceRate = $attendances->count() > 0
            ? round(($attendances->where('status', 'present')->count() / $attendances->count()) * 100, 1)
            : null;

        // 5. Build prompt
        $systemPrompt = 'أنت مساعد تعليمي متخصص. مهمتك إنشاء خطط مذاكرة شخصية دقيقة وعملية باللغة العربية بناءً على محتوى الدروس الفعلي وبيانات أداء الطالب.';

        $weakTopicsText   = implode('، ', $weakTopics) ?: 'غير محدد';
        $attendanceText   = $attendanceRate !== null ? "{$attendanceRate}%" : 'غير متاح';
        $lessonContext    = $lessonChunks ?: 'لا يوجد محتوى دروس مرفق.';

        $prompt = <<<PROMPT
أنشئ خطة مذاكرة شخصية مختصرة (لا تتجاوز 200 كلمة) باللغة العربية للطالب: {$student->name}

بيانات الأداء:
- الامتحان الحالي: {$exam->title} — النتيجة: {$attempt->percentage}%
- آخر 3 نتائج: {$recentExams}
- المواضيع الضعيفة: {$weakTopicsText}
- نسبة الحضور (30 يوم): {$attendanceText}

محتوى الدروس ذات الصلة:
{$lessonContext}

الخطة يجب أن تشمل:
1. أولويات المراجعة بناءً على محتوى الدروس الفعلي
2. عدد ساعات الدراسة الموصى بها يومياً
3. توصية محددة لكل موضوع ضعيف
PROMPT;

        // 6. Call Gemini
        $planText = $gemini->chat($systemPrompt, [['role' => 'user', 'content' => $prompt]]);

        // 7. Save to DB
        $plan = StudyPlan::create([
            'tenant_id'       => $attempt->tenant_id,
            'student_id'      => $student->id,
            'exam_attempt_id' => $attempt->id,
            'plan_text'       => $planText,
            'weak_topics'     => $weakTopics,
            'generated_at'    => now(),
        ]);

        // 8. Send to n8n with plan already included
        SendN8nWebhookJob::dispatch('exam_score_alert', [
            'student_id'    => $student->id,
            'student_name'  => $student->name,
            'exam_title'    => $exam->title,
            'course_name'   => optional($exam->course)->name,
            'score'         => $attempt->total_score,
            'percentage'    => $attempt->percentage,
            'teacher_email' => optional($exam->creator)->email,
            'tenant_code'   => $attempt->tenant->code ?? '',
            'study_plan'    => $planText,
            'weak_topics'   => $weakTopics,
            'plan_id'       => $plan->id,
        ], $attempt->tenant_id);
    }
}
