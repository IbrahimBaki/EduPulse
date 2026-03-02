<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Platform\Models\Tenant;

class IdentifyTenant
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        // 1. Extract tenant_code from the URL route parameter (e.g., /api/v1/{tenant_code}/...)
        $tenantCode = $request->route('tenant_code');

        if (!$tenantCode) {
            return response()->json(['error' => 'Tenant code missing in URL.'], 400);
        }

        // 2. Find the active tenant by its tracking code
        $tenant = Tenant::where('code', $tenantCode)->where('status', 'active')->first();

        if (!$tenant) {
            return response()->json(['error' => 'Academy not found or inactive.'], 404);
        }

        // 3. Security Authorization: If a user is logged in, they MUST belong to this tenant
        // (Super Admins with tenant_id = null might be an exception depending on your rules)
        $user = $request->user();
        if ($user && $user->tenant_id !== null && $user->tenant_id !== $tenant->id) {
            return response()->json([
                'error' => 'Permission Denied. You do not have access to this academy.'
            ], 403);
        }

        // 4. Bind the tenant to the application container
        app()->instance('tenant', $tenant);

        // 5. Tell Spatie Permission which tenant team area we are acting in
        setPermissionsTeamId($tenant->id);

        // 6. Forget the parameter so it doesn't get injected into all Controller methods
        // meaning Controllers can just use `app('tenant')` as usual.
        $request->route()->forgetParameter('tenant_code');

        return $next($request);
    }
}
