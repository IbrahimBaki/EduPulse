<?php

namespace Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\AI\Models\StudyPlan;

class StudyPlanController extends Controller
{
    use ApiResponser;

    public function index(Request $request): JsonResponse
    {
        $plans = StudyPlan::where('student_id', auth()->id())
            ->with('examAttempt.exam:id,title')
            ->latest()
            ->paginate(10);

        return $this->ReturnSuccess($plans, 'Study plans retrieved');
    }

    public function show(StudyPlan $plan): JsonResponse
    {
        if ($plan->student_id !== auth()->id()) {
            return $this->ReturnFailed('Forbidden', 403);
        }

        $plan->load('examAttempt.exam:id,title');

        return $this->ReturnSuccess($plan, 'Study plan retrieved');
    }

    public function studentPlans(Request $request, $student_id): JsonResponse
    {
        $plans = StudyPlan::where('student_id', $student_id)
            ->with('examAttempt.exam:id,title')
            ->latest()
            ->paginate(10);

        return $this->ReturnSuccess($plans, 'Student study plans retrieved');
    }
}
