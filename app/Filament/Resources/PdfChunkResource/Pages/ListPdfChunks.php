<?php

namespace App\Filament\Resources\PdfChunkResource\Pages;

use App\Filament\Resources\PdfChunkResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListPdfChunks extends ListRecords
{
    protected static string $resource = PdfChunkResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
