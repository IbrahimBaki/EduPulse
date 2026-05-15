<?php

namespace App\Filament\Resources\PdfChunkResource\Pages;

use App\Filament\Resources\PdfChunkResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreatePdfChunk extends CreateRecord
{
    protected static string $resource = PdfChunkResource::class;
}
