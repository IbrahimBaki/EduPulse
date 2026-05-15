<?php

namespace App\Filament\Resources\TenantSettingsResource\Pages;

use App\Filament\Resources\TenantSettingsResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreateTenantSettings extends CreateRecord
{
    protected static string $resource = TenantSettingsResource::class;
}
