<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponser;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Enrollment;
use Modules\Academic\Models\Schedule;
use Modules\AI\Models\QuizAttempt;

class TeacherDashboardController extends Controller
{
    use ApiResponser;

    public function dashboard()
    {
        $userId = auth()->id();

        $data = Cache::remember("dashboard:teacher:{$userId}", 300, function () use ($userId) {
            $myCourseIds  = Course::where('teacher_id', $userId)->pluck('id');
            $myStudentIds = Enrollment::whereIn('course_id', $myCourseIds)->distinct()->pluck('student_id');

            $myCourses     = $myCourseIds->count();
            $totalStudents = $myStudentIds->count();

            // Today's sessions (the panel label is "Today's Sessions")
            $todaySessions = Schedule::with(['course:id,name,grade_level_id', 'course.gradeLevel:id,name'])
                ->where('teacher_id', $userId)
                ->whereDate('starts_at', today())
                ->orderBy('starts_at')
                ->get()
                ->map(fn($s) => [
                    'id'          => $s->id,
                    'course_name' => $s->course?->name ?? '',
                    'grade_level' => $s->course?->gradeLevel?->name ?? '',
                    'type'        => $s->type,
                    'starts_at'   => $s->starts_at,
                    'ends_at'     => $s->ends_at,
                    'jitsi_url'   => $s->jitsi_url,
                ])
                ->values();

            // At-risk students: avg score < 60, returned as objects with weakest topic
            $atRiskAvg = DB::table('quiz_attempts')
                ->whereIn('student_id', $myStudentIds)
                ->selectRaw('student_id, AVG(score) as avg_score')
                ->groupBy('student_id')
                ->havingRaw('AVG(score) < 60')
                ->get();

            $atRiskIds = $atRiskAvg->pluck('student_id');

            $studentUsers = User::whereIn('id', $atRiskIds)->get(['id', 'name', 'avatar_url'])->keyBy('id');

            $enrollmentByCourse = Enrollment::whereIn('student_id', $atRiskIds)
                ->whereIn('course_id', $myCourseIds)
                ->with('course:id,name')
                ->get()
                ->groupBy('student_id');

            // Weakest topic per at-risk student: lowest-scored quiz
            $weakestTopics = DB::table('quiz_attempts')
                ->whereIn('student_id', $atRiskIds)
                ->select('student_id', 'topic', 'score')
                ->orderBy('score', 'asc')
                ->get()
                ->groupBy('student_id')
                ->map(fn($rows) => $rows->first());

            $atRiskStudents = $atRiskAvg->map(function ($row) use ($studentUsers, $enrollmentByCourse, $weakestTopics) {
                $weakest = $weakestTopics[$row->student_id] ?? null;
                $course  = $enrollmentByCourse[$row->student_id]?->first()?->course;
                $u       = $studentUsers[$row->student_id] ?? null;
                return [
                    'id'            => $row->student_id,
                    'name'          => $u?->name ?? 'Unknown',
                    'avatar_url'    => $u?->avatar_url,
                    'course_name'   => $course?->name ?? '',
                    'weakest_topic' => $weakest?->topic ?? '',
                    'weakest_score' => (float) ($weakest?->score ?? 0),
                ];
            })->values();

            // Recent quiz activity with student name and grade level
            $recentQuizActivity = QuizAttempt::with(['student:id,name,avatar_url', 'student.studentProfile.gradeLevel:id,name'])
                ->whereIn('student_id', $myStudentIds)
                ->latest()
                ->take(10)
                ->get()
                ->map(fn($a) => [
                    'id'                  => $a->id,
                    'student_name'        => $a->student?->name ?? 'Unknown',
                    'student_avatar_url'  => $a->student?->avatar_url,
                    'topic'               => $a->topic,
                    'score'               => $a->score,
                    'grade_level'         => $a->student?->studentProfile?->gradeLevel?->name ?? '',
                    'submitted_at'        => $a->created_at,
                ]);

            $topicPerformance = DB::table('quiz_attempts')
                ->whereIn('student_id', $myStudentIds)
                ->selectRaw('topic, AVG(score) as avg_score, COUNT(*) as attempt_count')
                ->groupBy('topic')
                ->orderByRaw('AVG(score) ASC')
                ->get();

            return [
                'stats' => [
                    'my_courses'     => $myCourses,
                    'total_students' => $totalStudents,
                    'sessions_today' => $todaySessions->count(),
                    'at_risk_count'  => $atRiskStudents->count(),
                ],
                'sessions_today'       => $todaySessions,
                'at_risk_students'     => $atRiskStudents,
                'recent_quiz_activity' => $recentQuizActivity,
                'topic_performance'    => $topicPerformance,
            ];
        });

        return $this->ReturnSuccess($data, 'Teacher dashboard retrieved');
    }

    public function courseReport($courseId)
    {
        $course = Course::where('teacher_id', auth()->id())->findOrFail($courseId);

        $students = $course->enrollments()->with('student.studentProfile')->get()->pluck('student');

        $studentIds = $students->pluck('id');

        $quizPerformance = DB::table('quiz_attempts')
            ->whereIn('student_id', $studentIds)
            ->selectRaw('student_id, AVG(score) as avg_score, COUNT(*) as attempts')
            ->groupBy('student_id')
            ->get()
            ->keyBy('student_id');

        return $this->ReturnSuccess([
            'course'           => $course->load('subject', 'gradeLevel'),
            'students'         => $students,
            'quiz_performance' => $quizPerformance,
        ], 'Course report retrieved');
    }
}
