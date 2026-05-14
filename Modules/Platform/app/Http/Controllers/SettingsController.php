<?php

namespace Modules\Platform\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Illuminate\Support\Facades\Storage;
use Modules\Platform\Http\Requests\UpdateSettingsRequest;
use Modules\Platform\Http\Requests\UploadLogoRequest;
use Modules\Platform\Models\TenantSettings;

class SettingsController extends Controller
{
    use ApiResponser;

    public function show()
    {
        $tenant = app('tenant');
        $settings = TenantSettings::firstOrCreate(
            ['tenant_id' => $tenant->id],
            ['academy_name' => $tenant->name ?? 'My Academy']
        );

        return $this->ReturnSuccess($settings, 'Settings retrieved');
    }

    public function update(UpdateSettingsRequest $request)
    {
        $tenant = app('tenant');
        $settings = TenantSettings::updateOrCreate(
            ['tenant_id' => $tenant->id],
            $request->validated()
        );

        return $this->ReturnSuccess($settings, 'Settings updated');
    }

    public function uploadLogo(UploadLogoRequest $request)
    {
        $tenant = app('tenant');
        $settings = TenantSettings::firstOrCreate(['tenant_id' => $tenant->id]);

        if ($settings->logo_path) {
            Storage::disk('public')->delete($settings->logo_path);
        }

        $path = $request->file('logo')->store("logos/tenants/{$tenant->id}", 'public');
        $settings->update(['logo_path' => $path]);

        return $this->ReturnSuccess(['logo_path' => $path], 'Logo uploaded');
    }
}
