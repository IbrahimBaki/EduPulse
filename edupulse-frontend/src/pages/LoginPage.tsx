import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore, type AuthUser } from '../stores/authStore'
import { getPrimaryRole } from '../components/RoleGuard'
import styles from './LoginPage.module.css'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSchoolName(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b[a-z]/g, c => c.toUpperCase())
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value)
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="var(--color-blue)" />
      {/* Pulse / heartbeat wave — represents "EduPulse" vitality */}
      <path
        d="M4 14h4l2.5-5 3 10 2.5-5H24"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5m7-7-7 7 7 7" />
    </svg>
  )
}

function AlertCircleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function DashboardMockup() {
  return (
    <div className={styles.mockup}>
      {/* Header */}
      <div className={styles.mockupHeader}>
        <div className={styles.mockupLogo}>
          <LogoMark />
          <span className={styles.mockupSchoolName}>Al-Noor Academy</span>
        </div>
        <div className={styles.mockupLive}>
          <span className={styles.liveDot} />
          <span>Live</span>
        </div>
      </div>

      {/* Metric rows */}
      <div className={styles.mockupMetrics}>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Attendance</span>
          <div className={styles.metricBar}>
            <div className={`${styles.metricFill} ${styles.metricFill1}`} />
          </div>
          <span className={styles.metricVal}>94%</span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Assignments</span>
          <div className={styles.metricBar}>
            <div className={`${styles.metricFill} ${styles.metricFill2}`} />
          </div>
          <span className={styles.metricVal}>78%</span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Submissions</span>
          <div className={styles.metricBar}>
            <div className={`${styles.metricFill} ${styles.metricFill3}`} />
          </div>
          <span className={styles.metricVal}>61%</span>
        </div>
      </div>

      {/* Bottom row */}
      <div className={styles.mockupFooter}>
        <div className={styles.mockupStat}>
          <UsersIcon />
          <span><strong>142</strong> online now</span>
        </div>
        <div className={styles.mockupBadge}>
          <CheckCircleIcon />
          <span>All systems normal</span>
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 1 | 2
type FieldErrors = { email?: string; password?: string }

export default function LoginPage() {
  const [step, setStep] = useState<Step>(1)
  const [tenantCode, setTenantCode] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const codeRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  useEffect(() => {
    if (step === 1) codeRef.current?.focus()
    if (step === 2) emailRef.current?.focus()
  }, [step])

  // ── Step 1: school code ──

  const handleCodeSubmit = (e: FormEvent) => {
    e.preventDefault()
    const code = tenantCode.trim().toLowerCase()
    if (!code) {
      setCodeError('Enter your school code to continue')
      return
    }
    if (!isValidSlug(code)) {
      setCodeError('School codes use lowercase letters, numbers, and hyphens only')
      return
    }
    setCodeError(null)
    setTenantCode(code)
    setSchoolName(formatSchoolName(code))
    setStep(2)
  }

  // ── Step 2: credentials ──

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()

    const errors: FieldErrors = {}
    if (!email.trim()) errors.email = 'Email is required'
    if (!password) errors.password = 'Password is required'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    setIsSubmitting(true)
    setLoginError(null)

    try {
      const res = await axios.post(`/api/v1/${tenantCode}/auth/login`, {
        email: email.trim(),
        password,
      })

      const { access_token, user } = res.data.data

      // Use canonical school name from backend if available
      if (user.tenant?.name) setSchoolName(user.tenant.name)

      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: Array.isArray(user.roles) ? user.roles : Object.values(user.roles as Record<string, string>),
      }

      setAuth(access_token, authUser, tenantCode)
      navigate(`/${getPrimaryRole(authUser.roles)}/dashboard`)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const message: string = err.response?.data?.message ?? ''
        const validationErrors = err.response?.data?.errors

        if (status === 404 || message.toLowerCase().includes('domain')) {
          // Tenant not found — send user back to step 1
          setStep(1)
          setCodeError('School not found — check the code and try again')
        } else if (status === 422 && validationErrors) {
          setFieldErrors({
            email: validationErrors.email?.[0],
            password: validationErrors.password?.[0],
          })
        } else if (status === 401) {
          setLoginError('Incorrect email or password.')
        } else {
          setLoginError('Something went wrong. Please try again in a moment.')
        }
      } else {
        setLoginError('Unable to connect. Check your internet connection.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    setStep(1)
    setLoginError(null)
    setFieldErrors({})
    setPassword('')
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={styles.layout}>

      {/* Left: form panel */}
      <div className={styles.formPanel}>
        <div className={styles.formInner}>

          {/* Logo */}
          <div className={styles.logoRow}>
            <LogoMark />
            <span className={styles.logoText}>
              Edu<span className={styles.logoAccent}>Pulse</span>
            </span>
          </div>

          {/* Two-step form — key triggers enter animation on step change */}
          <div key={step} className={styles.stepContent}>
            {step === 1 ? (
              <form onSubmit={handleCodeSubmit} noValidate>
                <div className={styles.stepHead}>
                  <h1 className={styles.headline}>Sign in to your school</h1>
                  <p className={styles.subline}>Enter your school code to get started.</p>
                </div>

                <div className={styles.field}>
                  <label htmlFor="school-code" className={styles.label}>School code</label>
                  <input
                    ref={codeRef}
                    id="school-code"
                    type="text"
                    autoComplete="organization"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={tenantCode}
                    onChange={e => {
                      setTenantCode(e.target.value)
                      if (codeError) setCodeError(null)
                    }}
                    placeholder="e.g. al-noor-academy"
                    className={`${styles.input} ${codeError ? styles.inputError : ''}`}
                    aria-describedby={codeError ? 'code-error' : undefined}
                    aria-invalid={codeError ? true : undefined}
                  />
                  {codeError && (
                    <span id="code-error" className={styles.fieldError} role="alert">
                      <AlertCircleIcon />
                      {codeError}
                    </span>
                  )}
                </div>

                <button type="submit" className={styles.btnPrimary}>
                  Continue
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} noValidate>
                <div className={styles.stepHead}>
                  <button
                    type="button"
                    onClick={handleBack}
                    className={styles.backBtn}
                    aria-label="Back to school code entry"
                  >
                    <ArrowLeftIcon />
                    <span className={styles.schoolPill}>{tenantCode}</span>
                  </button>
                  <h1 className={styles.headline}>Welcome back</h1>
                  <p className={styles.subline}>Sign in to continue to {schoolName}.</p>
                </div>

                {loginError && (
                  <div className={styles.loginError} role="alert">
                    <AlertCircleIcon />
                    {loginError}
                  </div>
                )}

                <div className={styles.field}>
                  <label htmlFor="email" className={styles.label}>Email address</label>
                  <input
                    ref={emailRef}
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value)
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }))
                    }}
                    placeholder="you@school.edu"
                    className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    aria-invalid={fieldErrors.email ? true : undefined}
                  />
                  {fieldErrors.email && (
                    <span id="email-error" className={styles.fieldError} role="alert">
                      <AlertCircleIcon />
                      {fieldErrors.email}
                    </span>
                  )}
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label htmlFor="password" className={styles.label}>Password</label>
                    <button type="button" className={styles.forgotLink} tabIndex={0}>
                      Forgot password?
                    </button>
                  </div>
                  <div className={styles.passwordWrap}>
                    <input
                      id="password"
                      type={passwordVisible ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }))
                      }}
                      placeholder="••••••••"
                      className={`${styles.input} ${styles.passwordInput} ${fieldErrors.password ? styles.inputError : ''}`}
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                      aria-invalid={fieldErrors.password ? true : undefined}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setPasswordVisible(v => !v)}
                      aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                      aria-pressed={passwordVisible}
                    >
                      {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <span id="password-error" className={styles.fieldError} role="alert">
                      <AlertCircleIcon />
                      {fieldErrors.password}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.btnPrimary}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting && <span className={styles.spinner} aria-hidden="true" />}
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <footer className={styles.formFooter}>
            <ShieldIcon />
            <span>Secured with 256-bit encryption</span>
          </footer>

        </div>
      </div>

      {/* Right: brand panel */}
      <div className={styles.brandPanel} aria-hidden="true">
        <div className={styles.brandInner}>
          {step === 1 ? (
            <div key="brand-1" className={styles.brandContent}>
              <h2 className={styles.brandHeadline}>
                The precision cockpit<br />for school operations.
              </h2>
              <p className={styles.brandSub}>
                Every metric, every role, every decision — one place.
              </p>
              <DashboardMockup />
            </div>
          ) : (
            <div key="brand-2" className={styles.brandContent}>
              <p className={styles.schoolWelcome}>Welcome back to</p>
              <h2 className={styles.schoolName}>{schoolName}</h2>
              <span className={styles.schoolCode}>{tenantCode}</span>
              <div className={styles.statRow}>
                <div className={styles.statChip}>
                  <UsersIcon />
                  <div>
                    <div className={styles.statNum}>—</div>
                    <div className={styles.statLabel}>Students</div>
                  </div>
                </div>
                <div className={styles.statChip}>
                  <BookIcon />
                  <div>
                    <div className={styles.statNum}>—</div>
                    <div className={styles.statLabel}>Courses</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
