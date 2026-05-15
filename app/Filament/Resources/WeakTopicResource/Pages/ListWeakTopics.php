<?php

namespace App\Filament\Resources\WeakTopicResource\Pages;

use App\Filament\Resources\WeakTopicResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListWeakTopics extends ListRecords
{
    protected static string $resource = WeakTopicResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
