<?php

namespace Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponser;
use Illuminate\Support\Facades\Hash;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\Academic\Models\Enrollment;
use Modules\IAM\Http\Requests\AssignParentRequest;
use Modules\IAM\Http\Requests\DirectEnrollRequest;
use Modules\IAM\Http\Requests\StoreStudentRequest;
use Modules\IAM\Http\Requests\UpdateFeeStatusRequest;
use Modules\IAM\Http\Requests\UpdateStudentRequest;
use Modules\IAM\Models\ParentStudent;
use Modules\IAM\Models\StudentProfile;

class StudentController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $query = User::role('student')->with('studentProfile.gradeLevel');

        if (request('grade_level_id')) {
            $query->whereHas('studentProfile', fn($q) => $q->where('grade_level_id', request('grade_level_id')));
        }

        if (request('is_active') !== null) {
            $query->where('is_active', request()->boolean('is_active'));
        }

        if (request('search')) {
            $search = request('search');
            $query->where(fn($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }

        return $this->ReturnSuccess($query->paginate(15), 'Students retrieved');
    }

    public function store(StoreStudentRequest $request)
    {
        $tenant = app('tenant');
        $validated = $request->validated();

        $user = User::create([
            'tenant_id'   => $tenant->id,
            'name'        => $validated['name'],
            'email'       => $validated['email'],
            'phone'       => $validated['phone'] ?? null,
            'password'    => Hash::make($validated['password']),
            'is_active'   => true,
        ]);

        $user->assignRole('student');

        $studentCode = StudentProfile::generateStudentCode($tenant->id, now()->year);

        StudentProfile::create([
            'tenant_id'       => $tenant->id,
            'student_id'      => $user->id,
            'grade_level_id'  => $validated['grade_level_id'],
            'student_code'    => $studentCode,
            'date_of_birth'   => $validated['date_of_birth'] ?? null,
            'gender'          => $validated['gender'] ?? null,
            'address'         => $validated['address'] ?? null,
            'enrollment_date' => $validated['enrollment_date'] ?? now()->toDateString(),
        ]);

        if (!empty($validated['parent_id'])) {
            ParentStudent::firstOrCreate([
                'tenant_id'  => $tenant->id,
                'parent_id'  => $validated['parent_id'],
                'student_id' => $user->id,
            ]);
        }

        SendN8nWebhookJob::dispatch('student_registered', [
            'student_id'   => $user->id,
            'name'         => $user->name,
            'student_code' => $studentCode,
        ], $tenant->id);

        return $this->ReturnSuccess($user->load('studentProfile'), 'Student created', 201);
    }

    public function show($id)
    {
        $student = User::role('student')
            ->with('studentProfile.gradeLevel', 'parents', 'enrollments.course')
            ->findOrFail($id);

        return $this->ReturnSuccess($student, 'Student retrieved');
    }

    public function update(UpdateStudentRequest $request, $id)
    {
        $student = User::role('student')->findOrFail($id);
        $validated = $request->validated();

        $userFields = array_intersect_key($validated, array_flip(['name', 'email', 'phone', 'is_active']));
        if (!empty($validated['password'])) {
            $userFields['password'] = Hash::make($validated['password']);
        }

        $student->update($userFields);

        $profileFields = array_intersect_key($validated, array_flip(['grade_level_id', 'date_of_birth', 'gender', 'address', 'enrollment_date']));
        if ($profileFields) {
            $student->studentProfile?->update($profileFields);
        }

        return $this->ReturnSuccess($student->fresh()->load('studentProfile'), 'Student updated');
    }

    public function toggleStatus($id)
    {
        $student = User::role('student')->findOrFail($id);
        $student->update(['is_active' => !$student->is_active]);

        if (!$student->is_active) {
            SendN8nWebhookJob::dispatch('student_deactivated', [
                'student_id' => $student->id,
                'name'       => $student->name,
            ], app('tenant')->id);
        }

        return $this->ReturnSuccess(['is_active' => $student->is_active], 'Status toggled');
    }

    public function assignParent(AssignParentRequest $request, $id)
    {
        $student = User::role('student')->findOrFail($id);
        $tenant = app('tenant');

        $currentParentsCount = ParentStudent::where('student_id', $student->id)->count();
        if ($currentParentsCount >= 2) {
            return $this->ReturnFailed('Student already has 2 parents linked', 422);
        }

        ParentStudent::firstOrCreate([
            'tenant_id'  => $tenant->id,
            'parent_id'  => $request->parent_id,
            'student_id' => $student->id,
        ]);

        return $this->ReturnSuccess(null, 'Parent assigned');
    }

    public function destroyParent($id, $parentId)
    {
        ParentStudent::where('student_id', $id)->where('parent_id', $parentId)->delete();
        return $this->ReturnSuccess(null, 'Parent unlinked');
    }

    public function updateFeeStatus(UpdateFeeStatusRequest $request, $id)
    {
        $student = User::role('student')->findOrFail($id);
        $student->studentProfile?->update($request->validated());
        return $this->ReturnSuccess(null, 'Fee status updated');
    }

    public function directEnroll(DirectEnrollRequest $request, $id)
    {
        $student = User::role('student')->findOrFail($id);
        $tenant = app('tenant');

        $already = Enrollment::where('student_id', $student->id)
            ->where('course_id', $request->course_id)
            ->exists();

        if ($already) {
            return $this->ReturnFailed('Student already enrolled in this course', 422);
        }

        $enrollment = Enrollment::create([
            'tenant_id'   => $tenant->id,
            'course_id'   => $request->course_id,
            'student_id'  => $student->id,
            'enrolled_at' => now(),
        ]);

        return $this->ReturnSuccess($enrollment, 'Student enrolled', 201);
    }
}
