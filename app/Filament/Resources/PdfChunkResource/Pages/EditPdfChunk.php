<?php

namespace App\Filament\Resources\PdfChunkResource\Pages;

use App\Filament\Resources\PdfChunkResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditPdfChunk extends EditRecord
{
    protected static string $resource = PdfChunkResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
