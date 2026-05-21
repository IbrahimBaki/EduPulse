import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import styles from './SchoolProfile.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolSettings {
  academy_name: string | null
  logo_url: string | null
  logo_path: string | null
  primary_color: string | null
  currency: string
  timezone: string
  language: string
  academic_year: string | null
  semester: 'first' | 'second' | 'summer' | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
}

interface FormState {
  academy_name: string
  primary_color: string
  currency: string
  timezone: string
  language: string
  academic_year: string
  semester: string
  contact_email: string
  contact_phone: string
  address: string
}

// ─── API ──────────────────────────────────────────────────────────────────────

const profileApi = {
  get:        () => api.get('/manager/settings').then(r => r.data.data as SchoolSettings),
  update:     (data: Partial<FormState>) => api.put('/manager/settings', data).then(r => r.data),
  uploadLogo: (file: File) => {
    const fd = new FormData()
    fd.append('logo', file)
    return api.post('/manager/settings/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data as { logo_path: string })
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function settingsToForm(s: SchoolSettings): FormState {
  return {
    academy_name:  s.academy_name  ?? '',
    primary_color: s.primary_color ?? '#3b82f6',
    currency:      s.currency      ?? 'EGP',
    timezone:      s.timezone      ?? 'Africa/Cairo',
    language:      s.language      ?? 'ar',
    academic_year: s.academic_year ?? '',
    semester:      s.semester      ?? '',
    contact_email: s.contact_email ?? '',
    contact_phone: s.contact_phone ?? '',
    address:       s.address       ?? '',
  }
}

// ─── Logo placeholder SVG ─────────────────────────────────────────────────────

function SchoolLogoPlaceholder() {
  return (
    <span className={styles.logoPlaceholder}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </span>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SchoolProfilePage
// ═══════════════════════════════════════════════════════════════════════════════

export default function SchoolProfilePage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['manager-school-settings'],
    queryFn: profileApi.get,
    staleTime: 5 * 60 * 1000,
  })

  const [form, setForm] = useState<FormState | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (settings && !form) {
      setForm(settingsToForm(settings))
      setLogoUrl(settings.logo_url ?? null)
    }
  }, [settings, form])

  const updateMut = useMutation({
    mutationFn: profileApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school-settings'] })
      setSavedOk(true)
      setSaveErr(false)
      setTimeout(() => setSavedOk(false), 3000)
    },
    onError: () => {
      setSaveErr(true)
      setSavedOk(false)
    },
  })

  function patch(key: keyof FormState, value: string) {
    setForm(f => f ? { ...f, [key]: value } : f)
  }

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadErr(false)
    try {
      await profileApi.uploadLogo(file)
      const url = URL.createObjectURL(file)
      setLogoUrl(url)
      qc.invalidateQueries({ queryKey: ['school-settings'] })
      qc.invalidateQueries({ queryKey: ['manager-school-settings'] })
    } catch {
      setUploadErr(true)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleSave() {
    if (!form) return
    setSavedOk(false)
    setSaveErr(false)
    const payload: Partial<FormState> = {
      academy_name:  form.academy_name  || undefined,
      primary_color: form.primary_color || undefined,
      currency:      form.currency      || undefined,
      timezone:      form.timezone      || undefined,
      language:      form.language      || undefined,
      academic_year: form.academic_year || undefined,
      semester:      (form.semester as FormState['semester']) || undefined,
      contact_email: form.contact_email || undefined,
      contact_phone: form.contact_phone || undefined,
      address:       form.address       || undefined,
    }
    updateMut.mutate(payload)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHead}>
          <h1 className={styles.pageTitle}>{t('manager.schoolProfile.title')}</h1>
        </div>
        <div className={styles.loadingWrap}>{t('common.loading')}</div>
      </div>
    )
  }

  if (isError || !form) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHead}>
          <h1 className={styles.pageTitle}>{t('manager.schoolProfile.title')}</h1>
        </div>
        <div className={styles.errorWrap}>
          {t('manager.schoolProfile.failedToLoad')}
          <button type="button" className={styles.retryLink} onClick={() => refetch()}>
            {t('manager.schoolProfile.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  const busy = updateMut.isPending

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t('manager.schoolProfile.title')}</h1>
        <p className={styles.pageSubtitle}>{t('manager.schoolProfile.subtitle')}</p>
      </div>

      <div className={styles.sections}>

        {/* ── Identity ── */}
        <Section title={t('manager.schoolProfile.identitySection')}>
          {/* Logo */}
          <div className={styles.field}>
            <span className={styles.label}>{t('manager.schoolProfile.logo')}</span>
            <div className={styles.logoArea}>
              <div className={styles.logoPreview}>
                {logoUrl
                  ? <img src={logoUrl} alt="School logo" className={styles.logoImg} />
                  : <SchoolLogoPlaceholder />
                }
              </div>
              <div className={styles.logoActions}>
                <p className={styles.logoHint}>{t('manager.schoolProfile.logoHint')}</p>
                <button
                  type="button"
                  className={styles.uploadBtn}
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading
                    ? t('manager.schoolProfile.uploading')
                    : logoUrl
                      ? t('manager.schoolProfile.changeLogo')
                      : t('manager.schoolProfile.uploadLogo')
                  }
                </button>
                {uploadErr && (
                  <p className={styles.fieldErr}>{t('manager.schoolProfile.uploadError')}</p>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              style={{ display: 'none' }}
              onChange={handleLogoChange}
            />
          </div>

          {/* Academy name */}
          <div className={styles.field}>
            <label className={styles.label}>{t('manager.schoolProfile.academyName')}</label>
            <input
              type="text"
              className={styles.input}
              placeholder={t('manager.schoolProfile.academyNamePlaceholder')}
              value={form.academy_name}
              onChange={e => patch('academy_name', e.target.value)}
              disabled={busy}
            />
          </div>

          {/* Brand color */}
          <div className={styles.field}>
            <span className={styles.label}>{t('manager.schoolProfile.primaryColor')}</span>
            <div className={styles.colorRow}>
              <label className={styles.colorSwatch} title={t('manager.schoolProfile.primaryColor')}>
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => patch('primary_color', e.target.value)}
                  disabled={busy}
                />
              </label>
              <input
                type="text"
                className={`${styles.input} ${styles.colorInput}`}
                value={form.primary_color}
                onChange={e => patch('primary_color', e.target.value)}
                disabled={busy}
                maxLength={20}
              />
            </div>
            <p className={styles.fieldHint}>{t('manager.schoolProfile.primaryColorHint')}</p>
          </div>
        </Section>

        {/* ── Contact ── */}
        <Section title={t('manager.schoolProfile.contactSection')}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('manager.schoolProfile.contactEmail')}</label>
              <input
                type="email"
                className={styles.input}
                value={form.contact_email}
                onChange={e => patch('contact_email', e.target.value)}
                disabled={busy}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('manager.schoolProfile.contactPhone')}</label>
              <input
                type="tel"
                className={styles.input}
                value={form.contact_phone}
                onChange={e => patch('contact_phone', e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('manager.schoolProfile.address')}</label>
            <textarea
              className={styles.textarea}
              placeholder={t('manager.schoolProfile.addressPlaceholder')}
              value={form.address}
              onChange={e => patch('address', e.target.value)}
              disabled={busy}
              rows={3}
            />
          </div>
        </Section>

        {/* ── Academic config ── */}
        <Section title={t('manager.schoolProfile.academicSection')}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('manager.schoolProfile.academicYear')}</label>
              <input
                type="text"
                className={styles.input}
                placeholder={t('manager.schoolProfile.academicYearPlaceholder')}
                value={form.academic_year}
                onChange={e => patch('academic_year', e.target.value)}
                disabled={busy}
                maxLength={20}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('manager.schoolProfile.semester')}</label>
              <select
                className={styles.select}
                value={form.semester}
                onChange={e => patch('semester', e.target.value)}
                disabled={busy}
              >
                <option value="">{t('manager.schoolProfile.semesterNone')}</option>
                <option value="first">{t('manager.schoolProfile.semesterFirst')}</option>
                <option value="second">{t('manager.schoolProfile.semesterSecond')}</option>
                <option value="summer">{t('manager.schoolProfile.semesterSummer')}</option>
              </select>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('manager.schoolProfile.language')}</label>
              <select
                className={styles.select}
                value={form.language}
                onChange={e => patch('language', e.target.value)}
                disabled={busy}
              >
                <option value="ar">{t('manager.schoolProfile.languageAr')}</option>
                <option value="en">{t('manager.schoolProfile.languageEn')}</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('manager.schoolProfile.currency')}</label>
              <input
                type="text"
                className={styles.input}
                value={form.currency}
                onChange={e => patch('currency', e.target.value)}
                disabled={busy}
                maxLength={10}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('manager.schoolProfile.timezone')}</label>
            <input
              type="text"
              className={styles.input}
              value={form.timezone}
              onChange={e => patch('timezone', e.target.value)}
              disabled={busy}
              maxLength={50}
            />
          </div>
        </Section>

        {/* ── Save bar ── */}
        <div className={styles.saveBar}>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? t('manager.schoolProfile.saving') : t('manager.schoolProfile.save')}
          </button>
          {savedOk && (
            <span className={styles.savedMsg}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t('manager.schoolProfile.saved')}
            </span>
          )}
          {saveErr && (
            <span className={styles.errMsg}>{t('manager.schoolProfile.saveError')}</span>
          )}
        </div>

      </div>
    </div>
  )
}
