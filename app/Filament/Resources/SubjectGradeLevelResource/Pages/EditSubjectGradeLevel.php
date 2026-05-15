<?php

namespace App\Filament\Resources\SubjectGradeLevelResource\Pages;

use App\Filament\Resources\SubjectGradeLevelResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditSubjectGradeLevel extends EditRecord
{
    protected static string $resource = SubjectGradeLevelResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
