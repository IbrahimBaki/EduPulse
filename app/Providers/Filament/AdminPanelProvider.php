<?php

namespace App\Providers\Filament;

use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets;
use Filament\View\PanelsRenderHook;
use Filament\Navigation\NavigationGroup;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Illuminate\Support\HtmlString;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        $logoHtml = '<div style="display:flex; align-items:center; gap:0.75rem;">
            <img src="'.asset('images/epa-logo.png').'" style="height:3.5rem; width:auto; border-radius:0.5rem; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
            <span style="font-size:1.5rem; font-weight:800; color:#1e1b4b;">EduPulse </span>
        </div>';

        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->brandName('EduPulse (EPA)')
            ->brandLogo(fn () => new HtmlString($logoHtml))
            ->brandLogoHeight('3.5rem')
            ->favicon(asset('images/epa-logo.png'))
            ->sidebarCollapsibleOnDesktop()
            ->font('Plus Jakarta Sans')
            ->colors([
                'primary' => Color::Indigo,
                'info'    => Color::Sky,
                'success' => Color::Emerald,
                'warning' => Color::Amber,
                'danger'  => Color::Rose,
                'gray'    => Color::Slate,
            ])
            ->navigationGroups([
                NavigationGroup::make()
                     ->label('Academic')
                     ->icon('heroicon-o-academic-cap'),
                NavigationGroup::make()
                     ->label('Assessments')
                     ->icon('heroicon-o-clipboard-document-check'),
                NavigationGroup::make()
                     ->label('Finance')
                     ->icon('heroicon-o-banknotes'),
                NavigationGroup::make()
                     ->label('Communication')
                     ->icon('heroicon-o-chat-bubble-left-right'),
                NavigationGroup::make()
                     ->label('AI Tools')
                     ->icon('heroicon-o-sparkles'),
                NavigationGroup::make()
                     ->label('Identity & Access')
                     ->icon('heroicon-o-users'),
                NavigationGroup::make()
                     ->label('Platform')
                     ->icon('heroicon-o-cog-8-tooth'),
            ])
            ->viteTheme('resources/css/filament/admin/theme.css')
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->pages([
                Pages\Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([
                Widgets\AccountWidget::class,
                Widgets\FilamentInfoWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
