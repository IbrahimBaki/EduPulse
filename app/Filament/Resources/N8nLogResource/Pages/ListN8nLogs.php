<?php

namespace App\Filament\Resources\N8nLogResource\Pages;

use App\Filament\Resources\N8nLogResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListN8nLogs extends ListRecords
{
    protected static string $resource = N8nLogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
