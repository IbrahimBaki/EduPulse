<?php

namespace App\Filament\Resources\N8nLogResource\Pages;

use App\Filament\Resources\N8nLogResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditN8nLog extends EditRecord
{
    protected static string $resource = N8nLogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
