import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'
import styles from '../profile/Profile.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Assignment {
  id: number
  subject: { id: number; name: string }
  grade_level: { id: number; name: string }
}

interface TeacherProfile {
  id: number
  name: string
  email: string
  phone: string | null
  national_id: string | null
  avatar_url: string | null
  is_active: boolean
  teacher_assignments: Assignment[]
}

type FieldErrors = Partial<Record<string, string>>

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchMyProfile(): Promise<TeacherProfile> {
  const { data } = await api.get('/auth/me')
  return data.data.user as TeacherProfile
}

async function updateProfileApi(payload: object) {
  const { data } = await api.patch('/auth/profile', payload)
  return data.data
}

async function uploadAvatarApi(file: File): Promise<{ avatar_url: string }> {
  const form = new FormData()
  form.append('avatar', file)
  const { data } = await api.post('/auth/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

async function deleteAvatarApi() {
  await api.delete('/auth/avatar')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherProfilePage() {
  const qc = useQueryClient()
  const updateUser = useAuthStore(s => s.updateUser)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ name: '', email: '', phone: '', national_id: '', password: '' })
  const [errors, setErrors]           = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)

  const profileQ = useQuery({
    queryKey: ['my-profile'],
    queryFn: fetchMyProfile,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (profileQ.data) {
      setForm({
        name:        profileQ.data.name ?? '',
        email:       profileQ.data.email ?? '',
        phone:       profileQ.data.phone ?? '',
        national_id: profileQ.data.national_id ?? '',
        password:    '',
      })
    }
  }, [profileQ.data])

  const updateMut = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      updateUser({ name: d.name, email: d.email })
      setSuccess(true)
      setErrors({})
      setServerError(null)
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      if (e.response?.data?.errors) {
        const mapped: FieldErrors = {}
        for (const [k, v] of Object.entries(e.response.data.errors)) mapped[k] = v[0]
        setErrors(mapped)
      } else {
        setServerError(e.response?.data?.message ?? 'Something went wrong.')
      }
    },
  })

  const avatarUploadMut = useMutation({
    mutationFn: uploadAvatarApi,
    onSuccess: ({ avatar_url }) => {
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      updateUser({ avatar_url })
    },
  })

  const avatarDeleteMut = useMutation({
    mutationFn: deleteAvatarApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      updateUser({ avatar_url: null })
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) avatarUploadMut.mutate(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: FieldErrors = {}
    if (!form.name.trim())  errs.name  = 'Name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email'
    if (form.password && form.password.length < 8) errs.password = 'Minimum 8 characters'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload: Record<string, string | undefined> = {
      name:        form.name.trim(),
      email:       form.email.trim(),
      phone:       form.phone || undefined,
      national_id: form.national_id || undefined,
    }
    if (form.password) payload.password = form.password
    updateMut.mutate(payload)
  }

  const profile  = profileQ.data
  const initials = profile?.name
    ? profile.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  const inp = (k: string) => `${styles.formInput}${errors[k] ? ' ' + styles.inputError : ''}`

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>My Profile</h1>
        <p className={styles.pageSubtitle}>Manage your personal info and account settings</p>
      </div>

      <div className={styles.container}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          {/* Avatar hero */}
          <div className={styles.avatarSection}>
            <div
              className={styles.avatarWrap}
              onClick={() => fileInputRef.current?.click()}
              tabIndex={0}
              role="button"
              aria-label="Change photo"
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarInitials}>{initials}</div>
              )}
              <div className={styles.avatarOverlay} aria-hidden="true">
                <svg className={styles.avatarOverlayIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <div className={styles.avatarInfo}>
              <p className={styles.avatarName}>{profile?.name ?? '…'}</p>
              <span className={styles.roleBadge}>Teacher</span>
              <div className={styles.avatarActions}>
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploadMut.isPending}
                >
                  {avatarUploadMut.isPending ? 'Uploading…' : (profile?.avatar_url ? 'Change photo' : 'Upload photo')}
                </button>
                {profile?.avatar_url && (
                  <button
                    type="button"
                    className={styles.removeAvatarBtn}
                    onClick={() => avatarDeleteMut.mutate()}
                    disabled={avatarDeleteMut.isPending}
                  >
                    {avatarDeleteMut.isPending ? '…' : 'Remove'}
                  </button>
                )}
              </div>
              <p className={styles.uploadHint}>JPG, PNG or WebP · max 2 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          {/* Form body */}
          <div className={styles.formBody}>
            {serverError && <div className={styles.formBanner} role="alert">{serverError}</div>}
            {success && <div className={styles.successBanner} role="status">Changes saved successfully.</div>}

            {/* Account */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Account</p>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="tp-name">Full name <span aria-hidden>*</span></label>
                  <input id="tp-name" type="text" className={inp('name')} value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: undefined })) }} />
                  {errors.name && <p className={styles.fieldErr}>{errors.name}</p>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="tp-email">Email <span aria-hidden>*</span></label>
                  <input id="tp-email" type="email" className={inp('email')} value={form.email}
                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: undefined })) }} />
                  {errors.email && <p className={styles.fieldErr}>{errors.email}</p>}
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="tp-phone">Phone</label>
                  <input id="tp-phone" type="tel" className={styles.formInput} value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="tp-nid">National ID</label>
                  <input id="tp-nid" type="text" className={styles.formInput} value={form.national_id}
                    onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Security */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Security</p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="tp-pw">New password</label>
                <input
                  id="tp-pw" type="password" className={inp('password')} value={form.password}
                  placeholder="Leave blank to keep current"
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: undefined })) }}
                  autoComplete="new-password"
                />
                {errors.password && <p className={styles.fieldErr}>{errors.password}</p>}
              </div>
            </div>

            {/* Teaching assignments (read-only) */}
            {profile?.teacher_assignments && profile.teacher_assignments.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Teaching assignments</p>
                <ul className={styles.assignList}>
                  {profile.teacher_assignments.map(a => (
                    <li key={a.id} className={styles.assignItem}>
                      <span className={styles.assignSubject}>{a.subject.name}</span>
                      <span className={styles.assignGrade}>{a.grade_level.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={styles.cardFooter}>
            <button type="submit" className={styles.saveBtn} disabled={updateMut.isPending || profileQ.isLoading}>
              {updateMut.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
