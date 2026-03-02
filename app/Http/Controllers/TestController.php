<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Modules\Platform\Models\Tenant;

class TestController extends Controller
{
    /**
     * Test 1: Basic ping - check if API is reachable
     * GET /api/v1/test/ping
     */
    public function ping()
    {
        return response()->json([
            'status' => 'ok',
            'message' => 'EduPulse API is alive! 🚀',
            'timestamp' => now()->toDateTimeString(),
        ]);
    }

    /**
     * Test 2: Check tenant resolution from URL Parameter
     * GET /api/{tenant_code}/v1/test/tenant
     */
    public function tenant(Request $request)
    {
        // Notice: The `tenant` middleware has already resolved and bound the tenant
        // to `app('tenant')` and then removed the URL parameter from the route.
        $tenant = app('tenant');

        if (!$tenant) {
            return response()->json([
                'status' => 'error',
                'message' => 'Middleware failed to bind the tenant.',
            ], 500);
        }

        return response()->json([
            'status' => 'ok',
            'message' => 'Tenant resolved successfully via URL parameter!',
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'code' => $tenant->code,
                'domain' => $tenant->domain,
                'status' => $tenant->status,
            ],
        ]);
    }

    /**
     * Test 3: Lookup a user by email and check password — simulates login logic
     * POST /api/{tenant_code}/v1/test/user-check
     * Body: { "email": "manager@alpha.localhost", "password": "password" }
     */
    public function userCheck(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Step 1: Get tenant from Container (injected by middleware)
        $tenant = app('tenant');

        if (!$tenant) {
            return response()->json([
                'step' => '1_tenant',
                'status' => 'failed',
                'message' => 'Middleware failed to bind tenant.',
            ], 500);
        }

        // Step 2: Find user in this tenant
        $user = User::withoutGlobalScopes()
            ->where('email', $request->email)
            ->where('tenant_id', $tenant->id)
            ->first();

        if (!$user) {
            return response()->json([
                'step' => '2_user_lookup',
                'status' => 'failed',
                'message' => 'No user found with this email in the ' . $tenant->name . ' academy.',
                'tenant_id' => $tenant->id,
                'email' => $request->email,
            ], 404);
        }

        // Step 3: Verify password
        $passwordOk = Hash::check($request->password, $user->password);

        if (!$passwordOk) {
            return response()->json([
                'step' => '3_password',
                'status' => 'failed',
                'message' => 'Password does not match.',
            ], 401);
        }

        // Step 4: Load roles
        $user->load('roles');

        // Step 5: Issue token
        $token = $user->createToken('test_token')->plainTextToken;

        return response()->json([
            'status' => 'ok',
            'message' => 'All checks passed!',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'tenant_id' => $user->tenant_id,
                'roles' => $user->roles->pluck('name'),
            ],
        ]);
    }
}
