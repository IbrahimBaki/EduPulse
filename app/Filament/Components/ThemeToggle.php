<?php

namespace App\Filament\Components;

use Livewire\Component;

class ThemeToggle extends Component
{
    public string $theme = 'dark';

    public function mount(): void
    {
        $this->theme    = request()->cookie('ep_theme', 'dark');
    }

    public function toggleTheme(): void
    {
        $this->theme = $this->theme === 'dark' ? 'light' : 'dark';
        $this->dispatch('ep-theme-changed', theme: $this->theme);
    }

    public function render(): \Illuminate\View\View
    {
        return view('filament.components.theme-toggle');
    }
}
