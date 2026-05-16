<div
    x-data="{
        dark: localStorage.getItem('filament-color-scheme') !== 'light',
        lang: document.documentElement.lang || 'en',
        toggleTheme() {
            this.dark = !this.dark;
            const scheme = this.dark ? 'dark' : 'light';
            localStorage.setItem('filament-color-scheme', scheme);
            document.documentElement.classList.toggle('dark', this.dark);
            document.documentElement.classList.toggle('light', !this.dark);
        },
        toggleLang() {
            this.lang = this.lang === 'en' ? 'ar' : 'en';
            const url = new URL(window.location.href);
            url.searchParams.set('lang', this.lang);
            window.location.href = url.toString();
        }
    }"
    x-init="
        document.documentElement.classList.toggle('dark', dark);
        document.documentElement.classList.toggle('light', !dark);
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    "
    class="ep-tlt"
>
    {{-- Theme toggle --}}
    <button
        type="button"
        @click="toggleTheme()"
        :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'"
        :title="dark ? 'Switch to light mode' : 'Switch to dark mode'"
        class="ep-tlt-btn"
    >
        <template x-if="dark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
        </template>
        <template x-if="!dark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        </template>
    </button>

    {{-- Lang toggle --}}
    <button
        type="button"
        @click="toggleLang()"
        :aria-label="lang === 'en' ? 'Switch to Arabic' : 'Switch to English'"
        class="ep-tlt-btn ep-tlt-lang"
    >
        <span x-text="lang === 'en' ? 'ع' : 'EN'"></span>
    </button>
</div>

<style>
.ep-tlt {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.ep-tlt-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    border: 1px solid var(--ep-border);
    background: transparent;
    color: var(--ep-text-muted);
    cursor: pointer;
    transition: background 150ms ease-out, color 150ms ease-out, border-color 150ms ease-out;
}

.ep-tlt-btn:hover {
    background: var(--ep-surface-2);
    color: var(--ep-text-primary);
    border-color: var(--ep-border-strong);
}

.ep-tlt-lang {
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    min-width: 2rem;
}
</style>
