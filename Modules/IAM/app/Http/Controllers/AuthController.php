<?php

namespace Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
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
            return response()->json(['message' => 'Invalid or inactive academy domain.'], 404);
        }

        // Find the user specifically within this tenant
        // Bypassing global scope momentarily just to explicitly check tenant_id
        $user = User::withoutGlobalScopes()->where('email', $request->email)
            ->where('tenant_id', $tenant->id)
            ->first();
        dd($user);
        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        // Load Spatie roles scoped to this tenant ID (via setPermissionsTeamId in middleware)
        $user->load('roles.permissions');

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name'),
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'code' => $tenant->code
                ]
            ]
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('roles.permissions');
        $tenant = app()->bound('tenant') ? app('tenant') : null;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name'),
                'tenant' => $tenant ? [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'code' => $tenant->code
                ] : null
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }
}
