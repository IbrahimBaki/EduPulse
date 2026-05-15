<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TenantSettingsResource\Pages;
use App\Filament\Resources\TenantSettingsResource\RelationManagers;
use Modules\Platform\Models\TenantSettings;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class TenantSettingsResource extends Resource
{
    protected static ?string $model = TenantSettings::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';
    protected static ?string $navigationGroup = 'Platform';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('tenant_id')
                    ->relationship('tenant', 'name')
                    ->required(),
                Forms\Components\TextInput::make('academy_name')
                    ->maxLength(255),
                Forms\Components\TextInput::make('logo_path')
                    ->maxLength(255),
                Forms\Components\TextInput::make('primary_color')
                    ->maxLength(20),
                Forms\Components\TextInput::make('currency')
                    ->required()
                    ->maxLength(10)
                    ->default('EGP'),
                Forms\Components\TextInput::make('timezone')
                    ->required()
                    ->maxLength(50)
                    ->default('Africa/Cairo'),
                Forms\Components\TextInput::make('language')
                    ->required()
                    ->maxLength(10)
                    ->default('ar'),
                Forms\Components\TextInput::make('academic_year')
                    ->maxLength(20),
                Forms\Components\TextInput::make('semester'),
                Forms\Components\TextInput::make('contact_email')
                    ->email()
                    ->maxLength(255),
                Forms\Components\TextInput::make('contact_phone')
                    ->tel()
                    ->maxLength(30),
                Forms\Components\Textarea::make('address')
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('tenant.name')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('academy_name')
                    ->searchable(),
                Tables\Columns\TextColumn::make('logo_path')
                    ->searchable(),
                Tables\Columns\TextColumn::make('primary_color')
                    ->searchable(),
                Tables\Columns\TextColumn::make('currency')
                    ->searchable(),
                Tables\Columns\TextColumn::make('timezone')
                    ->searchable(),
                Tables\Columns\TextColumn::make('language')
                    ->searchable(),
                Tables\Columns\TextColumn::make('academic_year')
                    ->searchable(),
                Tables\Columns\TextColumn::make('semester'),
                Tables\Columns\TextColumn::make('contact_email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('contact_phone')
                    ->searchable(),
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
            'index' => Pages\ListTenantSettings::route('/'),
            'create' => Pages\CreateTenantSettings::route('/create'),
            'edit' => Pages\EditTenantSettings::route('/{record}/edit'),
        ];
    }
}
