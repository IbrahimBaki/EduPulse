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
        $logoHtml = '<div style="display:flex;align-items:center;gap:0.625rem;">
            <img src="'.asset('images/epa-logo.png').'" style="height:2rem;width:auto;border-radius:0.375rem;">
            <span class="ep-brand-text" style="font-size:1rem;font-weight:800;letter-spacing:-0.02em;">EduPulse</span>
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
            ->darkMode(true)
            ->font('Plus Jakarta Sans')
            ->colors([
                'primary' => [
                    50 => '#eff6ff',
                    100 => '#dbeafe',
                    200 => '#bfdbfe',
                    300 => '#93c5fd',
                    400 => '#60a5fa',
                    500 => '#3b82f6',
                    600 => '#2563eb',
                    700 => '#1d4ed8',
                    800 => '#1e40af',
                    900 => '#1e3a8a',
                    950 => '#172554',
                ],
                'gray' => [
                    50 => '#f8fafc',
                    100 => '#f1f5f9',
                    200 => '#e2e8f0',
                    300 => '#cbd5e1',
                    400 => '#94a3b8',
                    500 => '#64748b',
                    600 => '#475569',
                    700 => '#334155',
                    800 => '#1e293b',
                    900 => '#0f172a',
                    950 => '#020617',
                ],
                'info'    => Color::Sky,
                'success' => Color::Emerald,
                'warning' => Color::Amber,
                'danger'  => Color::Rose,
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
            ->viteTheme('resources/css/filament/admin/custom.css')
            ->renderHook(
                PanelsRenderHook::HEAD_END,
                fn (): string => "<script>if(!localStorage.getItem('theme')){localStorage.setItem('theme','dark');document.documentElement.classList.add('dark');}</script>",
            )
            ->renderHook(
                PanelsRenderHook::TOPBAR_END,
                fn (): string => view('filament.components.theme-toggle')->render(),
            )
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->pages([
                Pages\Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([])
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
