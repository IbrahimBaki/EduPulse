<?php

namespace Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $tenant = app()->bound('tenant') ? app('tenant') : null;

        if (!$tenant) {
            return $this->ReturnFailed('Invalid or inactive academy domain.', 404);
        }

        // Find the user specifically within this tenant
        // Bypassing global scope momentarily just to explicitly check tenant_id
        $user = User::withoutGlobalScopes()->where('email', $request->email)
            ->where('tenant_id', $tenant->id)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return $this->ReturnFailed('The provided credentials do not match our records.', 401);
        }

        // Load Spatie roles scoped to this tenant ID (via setPermissionsTeamId in middleware)
        $user->load('roles.permissions');

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->ReturnSuccess([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'avatar_url' => $user->avatar_url,
                'roles'      => $user->roles->pluck('name'),
                'tenant'     => [
                    'id'   => $tenant->id,
                    'name' => $tenant->name,
                    'code' => $tenant->code,
                ],
            ]
        ], 'Login successful');
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('roles.permissions');
        $tenant = app()->bound('tenant') ? app('tenant') : null;

        $userData = [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'phone'       => $user->phone,
            'national_id' => $user->national_id,
            'avatar_url'  => $user->avatar_url,
            'is_active'   => $user->is_active,
            'roles'       => $user->roles->pluck('name'),
            'tenant'      => $tenant ? [
                'id'   => $tenant->id,
                'name' => $tenant->name,
                'code' => $tenant->code,
            ] : null,
        ];

        if ($user->hasRole('teacher')) {
            $user->load('teacherAssignments.subject', 'teacherAssignments.gradeLevel');
            $userData['teacher_assignments'] = $user->teacherAssignments;
        }

        if ($user->hasRole('student')) {
            $user->load('studentProfile.gradeLevel');
            $userData['student_profile'] = $user->studentProfile;
        }

        if ($user->hasRole('parent')) {
            $user->load('children');
            $userData['children'] = $user->children->map(fn ($c) => [
                'id'    => $c->id,
                'name'  => $c->name,
                'email' => $c->email,
            ]);
        }

        return $this->ReturnSuccess(['user' => $userData], 'Profile retrieved successfully');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return $this->ReturnSuccess(null, 'Logged out successfully');
    }
}
