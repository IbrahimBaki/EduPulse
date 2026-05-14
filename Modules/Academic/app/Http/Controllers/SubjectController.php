<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Modules\Academic\Http\Requests\StoreSubjectRequest;
use Modules\Academic\Http\Requests\UpdateSubjectRequest;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Subject;

class SubjectController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $subjects = Subject::orderBy('name')->get();
        return $this->ReturnSuccess($subjects, 'Subjects retrieved');
    }

    public function store(StoreSubjectRequest $request)
    {
        $subject = Subject::create($request->validated() + ['tenant_id' => app('tenant')->id]);
        return $this->ReturnSuccess($subject, 'Subject created', 201);
    }

    public function update(UpdateSubjectRequest $request, $id)
    {
        $subject = Subject::findOrFail($id);
        $subject->update($request->validated());
        return $this->ReturnSuccess($subject, 'Subject updated');
    }

    public function destroy($id)
    {
        $subject = Subject::findOrFail($id);

        $hasActiveCourses = Course::where('subject_id', $subject->id)
            ->where('status', 'active')
            ->exists();

        if ($hasActiveCourses) {
            return $this->ReturnFailed('Cannot delete subject with active courses', 422);
        }

        $subject->delete();
        return $this->ReturnSuccess(null, 'Subject deleted');
    }
}
