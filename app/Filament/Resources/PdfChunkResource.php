<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PdfChunkResource\Pages;
use App\Filament\Resources\PdfChunkResource\RelationManagers;
use Modules\AI\Models\PdfChunk;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class PdfChunkResource extends Resource
{
    protected static ?string $model = PdfChunk::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';
    protected static ?string $navigationGroup = 'AI Tools';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('tenant_id')
                    ->relationship('tenant', 'name')
                    ->required(),
                Forms\Components\TextInput::make('lesson_id')
                    ->required()
                    ->numeric(),
                Forms\Components\Textarea::make('chunk_text')
                    ->required()
                    ->columnSpanFull(),
                Forms\Components\TextInput::make('chunk_index')
                    ->required()
                    ->numeric(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('tenant.name')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('lesson_id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('chunk_index')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPdfChunks::route('/'),
            'create' => Pages\CreatePdfChunk::route('/create'),
            'edit' => Pages\EditPdfChunk::route('/{record}/edit'),
        ];
    }
}
