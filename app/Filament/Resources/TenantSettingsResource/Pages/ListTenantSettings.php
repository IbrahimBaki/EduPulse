<?php

namespace App\Filament\Resources\TenantSettingsResource\Pages;

use App\Filament\Resources\TenantSettingsResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListTenantSettings extends ListRecords
{
    protected static string $resource = TenantSettingsResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
