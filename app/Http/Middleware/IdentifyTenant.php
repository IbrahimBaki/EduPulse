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
        // Resolve from X-Tenant-Domain header OR fallback to HTTP host
        $domain = $request->header('X-Tenant-Domain') ?? $request->getHost();

        $tenant = Tenant::where('domain', $domain)->where('status', 'active')->first();

        if ($tenant) {
            // Bind the tenant to the application container
            app()->instance('tenant', $tenant);

            // Tell Spatie Permission which tenant team area we are acting in
            setPermissionsTeamId($tenant->id);
        }

        return $next($request);
    }
}
