<?php

namespace Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponser;
use Illuminate\Support\Facades\Hash;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\IAM\Http\Requests\StoreTeacherAssignmentRequest;
use Modules\IAM\Http\Requests\StoreTeacherRequest;
use Modules\IAM\Http\Requests\UpdateTeacherRequest;
use Modules\IAM\Models\TeacherAssignment;

class TeacherController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $teachers = User::role('teacher')
            ->with('teacherAssignments.subject', 'teacherAssignments.gradeLevel')
            ->paginate(15);

        return $this->ReturnSuccess($teachers, 'Teachers retrieved');
    }

    public function store(StoreTeacherRequest $request)
    {
        $tenant = app('tenant');
        $validated = $request->validated();

        $user = User::create([
            'tenant_id'   => $tenant->id,
            'name'        => $validated['name'],
            'email'       => $validated['email'],
            'phone'       => $validated['phone'] ?? null,
            'national_id' => $validated['national_id'] ?? null,
            'password'    => Hash::make($validated['password']),
            'is_active'   => true,
        ]);

        $user->assignRole('teacher');

        foreach ($validated['assignments'] ?? [] as $assignment) {
            TeacherAssignment::firstOrCreate([
                'tenant_id'      => $tenant->id,
                'teacher_id'     => $user->id,
                'subject_id'     => $assignment['subject_id'],
                'grade_level_id' => $assignment['grade_level_id'],
            ], ['is_active' => true]);
        }

        SendN8nWebhookJob::dispatch('teacher_welcome', [
            'teacher_id' => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
        ], $tenant->id);

        return $this->ReturnSuccess($user->load('teacherAssignments'), 'Teacher created', 201);
    }

    public function show($id)
    {
        $teacher = User::role('teacher')
            ->with('teacherAssignments.subject', 'teacherAssignments.gradeLevel')
            ->findOrFail($id);

        return $this->ReturnSuccess($teacher, 'Teacher retrieved');
    }

    public function update(UpdateTeacherRequest $request, $id)
    {
        $teacher = User::role('teacher')->findOrFail($id);
        $validated = $request->validated();

        $updateData = array_filter([
            'name'        => $validated['name'] ?? null,
            'email'       => $validated['email'] ?? null,
            'phone'       => $validated['phone'] ?? null,
            'national_id' => $validated['national_id'] ?? null,
            'is_active'   => $validated['is_active'] ?? null,
        ], fn($v) => !is_null($v));

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $teacher->update($updateData);

        return $this->ReturnSuccess($teacher->fresh()->load('teacherAssignments'), 'Teacher updated');
    }

    public function destroy($id)
    {
        $teacher = User::role('teacher')->findOrFail($id);

        $hasActiveCourses = \Modules\Academic\Models\Course::where('teacher_id', $teacher->id)
            ->where('status', 'active')
            ->exists();

        if ($hasActiveCourses) {
            return $this->ReturnFailed('Cannot delete teacher with active courses', 422);
        }

        $teacher->delete();
        return $this->ReturnSuccess(null, 'Teacher deleted');
    }

    public function storeAssignment(StoreTeacherAssignmentRequest $request, $id)
    {
        $teacher = User::role('teacher')->findOrFail($id);
        $tenant = app('tenant');

        $assignment = TeacherAssignment::firstOrCreate([
            'tenant_id'      => $tenant->id,
            'teacher_id'     => $teacher->id,
            'subject_id'     => $request->subject_id,
            'grade_level_id' => $request->grade_level_id,
        ], ['is_active' => true]);

        return $this->ReturnSuccess($assignment->load('subject', 'gradeLevel'), 'Assignment created', 201);
    }

    public function destroyAssignment($id, $assignmentId)
    {
        TeacherAssignment::where('teacher_id', $id)->findOrFail($assignmentId)->delete();
        return $this->ReturnSuccess(null, 'Assignment removed');
    }

    public function toggleStatus($id)
    {
        $teacher = User::role('teacher')->findOrFail($id);
        $teacher->update(['is_active' => !$teacher->is_active]);

        return $this->ReturnSuccess(['is_active' => $teacher->is_active], 'Status toggled');
    }
}
