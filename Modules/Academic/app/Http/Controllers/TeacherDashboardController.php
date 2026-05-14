<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
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
            $myCourses = Course::where('teacher_id', $userId)->count();

            $totalStudents = Enrollment::whereHas('course', fn($q) => $q->where('teacher_id', $userId))
                ->distinct('student_id')
                ->count();

            $upcomingSessions = Schedule::with('course')
                ->where('teacher_id', $userId)
                ->where('status', 'scheduled')
                ->where('starts_at', '>', now())
                ->orderBy('starts_at')
                ->take(3)
                ->get();

            $myCourseIds = Course::where('teacher_id', $userId)->pluck('id');
            $myStudentIds = Enrollment::whereIn('course_id', $myCourseIds)->pluck('student_id');

            $atRiskCount = DB::table('quiz_attempts')
                ->whereIn('student_id', $myStudentIds)
                ->selectRaw('student_id, AVG(score) as avg_score')
                ->groupBy('student_id')
                ->havingRaw('AVG(score) < 60')
                ->count();

            $recentQuizActivity = QuizAttempt::whereIn('student_id', $myStudentIds)
                ->latest()
                ->take(10)
                ->get();

            $topicPerformance = DB::table('quiz_attempts')
                ->whereIn('student_id', $myStudentIds)
                ->selectRaw('topic, AVG(score) as avg_score, COUNT(*) as attempt_count')
                ->groupBy('topic')
                ->orderByRaw('AVG(score) ASC')
                ->get();

            return [
                'my_courses'          => $myCourses,
                'total_students'      => $totalStudents,
                'upcoming_sessions'   => $upcomingSessions,
                'at_risk_students'    => $atRiskCount,
                'recent_quiz_activity' => $recentQuizActivity,
                'topic_performance'   => $topicPerformance,
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
