import { useThemeStore } from '../stores/themeStore'
import { useLanguage } from '../hooks/useLanguage'
import styles from './TopControls.module.css'

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

export default function TopControls() {
  const { theme, toggleTheme } = useThemeStore()
  const { language, switchLanguage } = useLanguage()

  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.btn}
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={() => switchLanguage(language === 'ar' ? 'en' : 'ar')}
        aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        title={language === 'ar' ? 'EN' : 'عربي'}
      >
        <span className={styles.langLabel}>{language === 'ar' ? 'EN' : 'ع'}</span>
      </button>
    </div>
  )
}
