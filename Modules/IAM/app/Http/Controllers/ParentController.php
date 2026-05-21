<?php

namespace Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponser;
use Illuminate\Support\Facades\Hash;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\IAM\Http\Requests\StoreParentRequest;
use Modules\IAM\Http\Requests\UpdateParentRequest;
use Modules\IAM\Models\ParentStudent;

class ParentController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $query = User::role('parent')->withCount('children');

        if ($search = request('search')) {
            $query->where(fn ($q) =>
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
            );
        }

        $perPage = (int) request('per_page', 15);

        return $this->ReturnSuccess($query->paginate($perPage), 'Parents retrieved');
    }

    public function store(StoreParentRequest $request)
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

        $user->assignRole('parent');

        foreach ($validated['student_ids'] ?? [] as $studentId) {
            ParentStudent::firstOrCreate([
                'tenant_id'  => $tenant->id,
                'parent_id'  => $user->id,
                'student_id' => $studentId,
            ]);
        }

        SendN8nWebhookJob::dispatch('parent_registered', [
            'parent_id' => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
        ], $tenant->id);

        return $this->ReturnSuccess($user->load('children'), 'Parent created', 201);
    }

    public function show($id)
    {
        $parent = User::role('parent')
            ->with('children.studentProfile')
            ->findOrFail($id);

        return $this->ReturnSuccess($parent, 'Parent retrieved');
    }

    public function update($id, UpdateParentRequest $request)
    {
        $parent = User::role('parent')->findOrFail($id);
        $validated = $request->validated();

        $fields = array_filter([
            'name'        => $validated['name'] ?? null,
            'email'       => $validated['email'] ?? null,
            'phone'       => $validated['phone'] ?? null,
            'national_id' => $validated['national_id'] ?? null,
        ], fn($v) => !is_null($v));

        if (!empty($validated['password'])) {
            $fields['password'] = Hash::make($validated['password']);
        }

        $parent->update($fields);
        return $this->ReturnSuccess($parent->fresh(), 'Parent updated');
    }

    public function linkStudent($id)
    {
        $parent = User::role('parent')->findOrFail($id);
        $tenant = app('tenant');

        $studentId = request('student_id');
        if (!$studentId) {
            return $this->ReturnFailed('student_id is required', 422);
        }

        ParentStudent::firstOrCreate([
            'tenant_id'  => $tenant->id,
            'parent_id'  => $parent->id,
            'student_id' => $studentId,
        ]);

        return $this->ReturnSuccess(null, 'Student linked');
    }

    public function unlinkStudent($id, $studentId)
    {
        ParentStudent::where('parent_id', $id)->where('student_id', $studentId)->delete();
        return $this->ReturnSuccess(null, 'Student unlinked');
    }
}
