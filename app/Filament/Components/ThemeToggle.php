<?php

namespace App\Filament\Components;

use Livewire\Component;

class ThemeToggle extends Component
{
    public string $theme = 'dark';
    public string $language = 'en';

    public function mount(): void
    {
        $this->theme    = request()->cookie('ep_theme', 'dark');
        $this->language = request()->cookie('ep_language', 'en');
    }

    public function toggleTheme(): void
    {
        $this->theme = $this->theme === 'dark' ? 'light' : 'dark';
        $this->dispatch('ep-theme-changed', theme: $this->theme);
    }

    public function toggleLanguage(): void
    {
        $this->language = $this->language === 'en' ? 'ar' : 'en';
        $this->dispatch('ep-language-changed', language: $this->language);
    }

    public function render(): \Illuminate\View\View
    {
        return view('filament.components.theme-toggle');
    }
}
