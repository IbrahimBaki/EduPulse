<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Modules\Academic\Http\Requests\AssignSubjectsRequest;
use Modules\Academic\Http\Requests\StoreGradeLevelRequest;
use Modules\Academic\Http\Requests\UpdateGradeLevelRequest;
use Modules\Academic\Models\GradeLevel;
use Modules\Academic\Models\SubjectGradeLevel;

class GradeLevelController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $gradeLevels = GradeLevel::orderBy('level')->get();
        return $this->ReturnSuccess($gradeLevels, 'Grade levels retrieved');
    }

    public function store(StoreGradeLevelRequest $request)
    {
        $gradeLevel = GradeLevel::create($request->validated() + ['tenant_id' => app('tenant')->id]);
        return $this->ReturnSuccess($gradeLevel, 'Grade level created', 201);
    }

    public function update(UpdateGradeLevelRequest $request, $id)
    {
        $gradeLevel = GradeLevel::findOrFail($id);
        $gradeLevel->update($request->validated());
        return $this->ReturnSuccess($gradeLevel, 'Grade level updated');
    }

    public function destroy($id)
    {
        $gradeLevel = GradeLevel::findOrFail($id);

        $hasEnrolledStudents = \Modules\Academic\Models\Enrollment::whereHas('course', function ($q) use ($gradeLevel) {
            $q->where('grade_level_id', $gradeLevel->id);
        })->exists();

        if ($hasEnrolledStudents) {
            return $this->ReturnFailed('Cannot delete grade level with enrolled students', 422);
        }

        $gradeLevel->delete();
        return $this->ReturnSuccess(null, 'Grade level deleted');
    }

    public function subjects($id)
    {
        $gradeLevel = GradeLevel::with('subjects')->findOrFail($id);
        return $this->ReturnSuccess($gradeLevel->subjects, 'Subjects retrieved');
    }

    public function assignSubjects(AssignSubjectsRequest $request, $id)
    {
        $gradeLevel = GradeLevel::findOrFail($id);
        $tenantId = app('tenant')->id;

        foreach ($request->subject_ids as $subjectId) {
            SubjectGradeLevel::firstOrCreate([
                'tenant_id'     => $tenantId,
                'subject_id'    => $subjectId,
                'grade_level_id' => $gradeLevel->id,
            ]);
        }

        return $this->ReturnSuccess($gradeLevel->subjects()->get(), 'Subjects assigned');
    }

    public function removeSubject($gradeId, $subjectId)
    {
        SubjectGradeLevel::where([
            'grade_level_id' => $gradeId,
            'subject_id'     => $subjectId,
        ])->delete();

        return $this->ReturnSuccess(null, 'Subject removed from grade level');
    }
}
