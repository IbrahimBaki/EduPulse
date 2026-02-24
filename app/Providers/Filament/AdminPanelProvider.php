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
            ->colors([
                'primary' => Color::Indigo,
                'info'    => Color::Cyan,
                'success' => Color::Emerald,
                'warning' => Color::Orange,
                'danger'  => Color::Rose,
            ])
            ->renderHook(
                PanelsRenderHook::HEAD_END,
                fn (): string => '<link rel="stylesheet" href="' . asset('css/epa-admin-theme.css') . '?v=' . time() . '">'
            )
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
