import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export function useLanguage() {
  const { i18n } = useTranslation()

  const language = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en'
  const direction: 'rtl' | 'ltr' = language === 'ar' ? 'rtl' : 'ltr'

  const switchLanguage = useCallback((lang: 'ar' | 'en') => {
    i18n.changeLanguage(lang)
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    localStorage.setItem('edupulse-lang', lang)
  }, [i18n])

  return { language, direction, switchLanguage }
}
