import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'
import styles from '../profile/Profile.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentProfile {
  id: number
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  student_profile: {
    student_code: string | null
    enrollment_date: string | null
    date_of_birth: string | null
    gender: string | null
    address: string | null
    fee_status: string | null
    grade_level: { id: number; name: string } | null
  } | null
}

type FieldErrors = Partial<Record<string, string>>

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchMyProfile(): Promise<StudentProfile> {
  const { data } = await api.get('/auth/me')
  return data.data.user as StudentProfile
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

export default function StudentProfilePage() {
  const qc = useQueryClient()
  const updateUser = useAuthStore(s => s.updateUser)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '', phone: '', date_of_birth: '', gender: '', address: '',
  })
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
      const sp = profileQ.data.student_profile
      setForm({
        name:          profileQ.data.name ?? '',
        phone:         profileQ.data.phone ?? '',
        date_of_birth: sp?.date_of_birth ?? '',
        gender:        sp?.gender ?? '',
        address:       sp?.address ?? '',
      })
    }
  }, [profileQ.data])

  const updateMut = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      updateUser({ name: d.name })
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
    if (!form.name.trim()) errs.name = 'Name is required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    updateMut.mutate({
      name:          form.name.trim(),
      phone:         form.phone || undefined,
      date_of_birth: form.date_of_birth || undefined,
      gender:        form.gender || undefined,
      address:       form.address || undefined,
    })
  }

  const profile  = profileQ.data
  const sp       = profile?.student_profile
  const initials = profile?.name
    ? profile.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  const inp = (k: string) => `${styles.formInput}${errors[k] ? ' ' + styles.inputError : ''}`

  const fmt = (v: string | null | undefined) => {
    if (!v) return '—'
    return v
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>My Profile</h1>
        <p className={styles.pageSubtitle}>View your academic info and update personal details</p>
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
              <span className={styles.roleBadge}>Student</span>
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

            {/* Academic info (read-only) */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Academic</p>
              <dl className={styles.dataGrid}>
                <div className={styles.dataRow}>
                  <dt className={styles.dataLabel}>Student code</dt>
                  <dd className={styles.dataValue}>{fmt(sp?.student_code)}</dd>
                </div>
                <div className={styles.dataRow}>
                  <dt className={styles.dataLabel}>Grade level</dt>
                  <dd className={styles.dataValue}>{sp?.grade_level?.name ?? '—'}</dd>
                </div>
                <div className={styles.dataRow}>
                  <dt className={styles.dataLabel}>Enrolled</dt>
                  <dd className={styles.dataValue}>{fmt(sp?.enrollment_date)}</dd>
                </div>
                <div className={styles.dataRow}>
                  <dt className={styles.dataLabel}>Status</dt>
                  <dd className={styles.dataValue}>
                    <span className={profile?.is_active ? styles.pillActive : styles.pillInactive}>
                      {profile?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div className={styles.dataRow}>
                  <dt className={styles.dataLabel}>Fee status</dt>
                  <dd className={styles.dataValue}>{fmt(sp?.fee_status)}</dd>
                </div>
              </dl>
            </div>

            {/* Personal info (editable) */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Personal</p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="sp-name">Full name <span aria-hidden>*</span></label>
                <input id="sp-name" type="text" className={inp('name')} value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: undefined })) }} />
                {errors.name && <p className={styles.fieldErr}>{errors.name}</p>}
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="sp-phone">Phone</label>
                  <input id="sp-phone" type="tel" className={styles.formInput} value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="sp-dob">Date of birth</label>
                  <input id="sp-dob" type="date" className={styles.formInput} value={form.date_of_birth}
                    onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="sp-gender">Gender</label>
                  <select id="sp-gender" className={styles.formSelect} value={form.gender}
                    onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="sp-address">Address</label>
                  <input id="sp-address" type="text" className={styles.formInput} value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
            </div>
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
