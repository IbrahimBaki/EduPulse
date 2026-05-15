<?php

namespace App\Filament\Resources\SubjectGradeLevelResource\Pages;

use App\Filament\Resources\SubjectGradeLevelResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListSubjectGradeLevels extends ListRecords
{
    protected static string $resource = SubjectGradeLevelResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
