import { useState, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import styles from './Students.module.css'
import UserAvatar from '../../components/UserAvatar'
import { translateStatus } from '../../utils/translateStatus'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeLevel { id: number; name: string; level: number }

interface ParentLite { id: number; name: string; email: string; phone: string | null; avatar_url?: string | null }

interface StudentProfile {
  student_code: string
  grade_level_id: number | null
  date_of_birth: string | null
  gender: 'male' | 'female' | null
  address: string | null
  enrollment_date: string | null
  fee_status: 'paid' | 'pending' | 'overdue' | null
  fee_due_date: string | null
  grade_level: GradeLevel | null
}

interface Student {
  id: number
  name: string
  email: string
  phone: string | null
  avatar_url?: string | null
  is_active: boolean
  student_profile: StudentProfile | null
}

interface CourseEnrollment {
  id: number
  course_id: number
  enrolled_at: string
  course: { id: number; name: string; status: string } | null
}

interface CourseListItem {
  id: number
  name: string
  status: string
}

interface StudentDetail extends Student {
  parents: Array<{ id: number; name: string; email: string; phone: string | null }>
  enrollments?: CourseEnrollment[]
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

interface CreatePayload {
  name: string
  email: string
  password: string
  grade_level_id: number | ''
  phone: string
  date_of_birth: string
  gender: string
  address: string
  enrollment_date: string
  parent_id?: number
}

interface UpdateStudentPayload {
  name?: string
  email?: string
  phone?: string
  password?: string
  grade_level_id?: number | ''
  date_of_birth?: string
  gender?: string
  address?: string
  enrollment_date?: string
  is_active?: boolean
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchStudents(p: {
  page: number; search: string; grade_level_id: string; is_active: string
}) {
  const params: Record<string, string | number> = { page: p.page, per_page: 15 }
  if (p.search) params.search = p.search
  if (p.grade_level_id) params.grade_level_id = p.grade_level_id
  if (p.is_active !== '') params.is_active = p.is_active
  const { data } = await api.get('/manager/students', { params })
  return data.data as Paginated<Student>
}

async function fetchGradeLevels() {
  const { data } = await api.get('/manager/grade-levels')
  return data.data as GradeLevel[]
}

async function fetchStudentDetail(id: number) {
  const { data } = await api.get(`/manager/students/${id}`)
  return data.data as StudentDetail
}

async function fetchManagerCourses() {
  const { data } = await api.get('/manager/courses', { params: { per_page: 100 } })
  const raw = data.data
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
  return list as CourseListItem[]
}

async function toggleStudentStatus(id: number) {
  await api.patch(`/manager/students/${id}/toggle-status`)
}

async function createStudentApi(payload: CreatePayload) {
  const { data } = await api.post('/manager/students', payload)
  return data
}

async function searchParentsApi(q: string) {
  const { data } = await api.get('/manager/parents', { params: { search: q, per_page: 15 } })
  const raw = data.data
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
  return list as ParentLite[]
}

async function assignParentApi(studentId: number, parentId: number) {
  await api.post(`/manager/students/${studentId}/assign-parent`, { parent_id: parentId })
}

async function removeParentApi(studentId: number, parentId: number) {
  await api.delete(`/manager/students/${studentId}/parents/${parentId}`)
}

async function updateStudentApi(id: number, payload: UpdateStudentPayload) {
  const { data } = await api.put(`/manager/students/${id}`, payload)
  return data.data as StudentDetail
}

async function updateFeeStatusApi(id: number, payload: { fee_status: string; fee_due_date?: string }) {
  await api.patch(`/manager/students/${id}/fee-status`, payload)
}

// ─── FeeBadge ─────────────────────────────────────────────────────────────────

function FeeBadge({ status }: { status: string | null | undefined }) {
  const { t } = useTranslation()
  if (!status) return <span className={styles.badgeNone}>—</span>
  const cls: Record<string, string> = {
    paid: styles.badgePaid,
    pending: styles.badgePending,
    overdue: styles.badgeOverdue,
  }
  return (
    <span className={cls[status] ?? styles.badgeNone}>
      {translateStatus(status, t)}
    </span>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, disabled, onChange, label }: {
  checked: boolean; disabled?: boolean; onChange: () => void; label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`${styles.toggle}${checked ? ' ' + styles.toggleOn : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange() }}
    >
      <span className={styles.toggleThumb} />
    </button>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ width }: { width?: string }) {
  return <span className={styles.skeleton} style={width ? { width } : undefined} />
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className={styles.skRow}>
          <td><Sk width="15px" /></td>
          <td>
            <div className={styles.cellName}>
              <span className={`${styles.avatarInitials} ${styles.skCircle}`} />
              <div className={styles.nameStack}>
                <Sk width="120px" />
                <Sk width="80px" />
              </div>
            </div>
          </td>
          <td><Sk width="72px" /></td>
          <td><Sk width="88px" /></td>
          <td><Sk width="96px" /></td>
          <td><Sk width="56px" /></td>
          <td><Sk width="32px" /></td>
        </tr>
      ))}
    </>
  )
}

// ─── SlideOver ────────────────────────────────────────────────────────────────

function SlideOver({ open, onClose, title, children, width = 480 }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number
}) {
  const { t } = useTranslation()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => closeRef.current?.focus(), 50)
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className={styles.slideOverRoot}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.panel}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.panelClose}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 2L13 13M13 2L2 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className={styles.panelBody}>{children}</div>
      </div>
    </div>,
    document.body
  )
}

// ─── AddStudentForm ───────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<keyof CreatePayload | string, string>>

function AddStudentForm({ gradeLevels, onSuccess, onCancel }: {
  gradeLevels: GradeLevel[]; onSuccess: () => void; onCancel: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CreatePayload>({
    name: '', email: '', password: '', grade_level_id: '',
    phone: '', date_of_birth: '', gender: '', address: '', enrollment_date: '',
  })
  const [selectedParent, setSelectedParent] = useState<ParentLite | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: CreatePayload) => createStudentApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-students'] })
      onSuccess()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      if (e.response?.data?.errors) {
        const mapped: FieldErrors = {}
        for (const [k, v] of Object.entries(e.response.data.errors)) mapped[k] = v[0]
        setErrors(mapped)
      } else {
        setServerError(e.response?.data?.message ?? 'Something went wrong. Please try again.')
      }
    },
  })

  const field = (key: keyof CreatePayload, val: string | number) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
    setServerError(null)
  }

  const validate = (): boolean => {
    const e: FieldErrors = {}
    if (!form.name.trim())   e.name = 'Name is required'
    if (!form.email.trim())  e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password)      e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters'
    if (!form.grade_level_id) e.grade_level_id = 'Grade level is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      ...form,
      ...(selectedParent ? { parent_id: selectedParent.id } : {}),
    })
  }

  const inp = (hasErr?: string) => `${styles.formInput}${hasErr ? ' ' + styles.inputError : ''}`
  const sel = (hasErr?: string) => `${styles.formSelect}${hasErr ? ' ' + styles.inputError : ''}`

  const { t } = useTranslation()

  return (
    <form className={styles.addForm} onSubmit={handleSubmit} noValidate>
      {serverError && <div className={styles.formBanner} role="alert">{serverError}</div>}

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>{t('manager.teachers.account')}</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-name">{t('manager.teachers.fullName')} <span aria-hidden>*</span></label>
          <input id="fs-name" type="text" className={inp(errors.name)} value={form.name}
            onChange={e => field('name', e.target.value)} autoComplete="name" />
          {errors.name && <p className={styles.fieldErr}>{errors.name}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-email">{t('profile.fields.email')} <span aria-hidden>*</span></label>
          <input id="fs-email" type="email" className={inp(errors.email)} value={form.email}
            onChange={e => field('email', e.target.value)} autoComplete="email" />
          {errors.email && <p className={styles.fieldErr}>{errors.email}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-pw">{t('manager.teachers.password')} <span aria-hidden>*</span></label>
          <input id="fs-pw" type="password" className={inp(errors.password)} value={form.password}
            onChange={e => field('password', e.target.value)} autoComplete="new-password" />
          {errors.password && <p className={styles.fieldErr}>{errors.password}</p>}
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>{t('profile.sections.academic')}</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-grade">{t('profile.fields.gradeLevel')} <span aria-hidden>*</span></label>
          <select id="fs-grade" className={sel(errors.grade_level_id)}
            value={form.grade_level_id}
            onChange={e => field('grade_level_id', e.target.value ? Number(e.target.value) : '')}>
            <option value="">{t('manager.students.selectGrade')}</option>
            {gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {errors.grade_level_id && <p className={styles.fieldErr}>{errors.grade_level_id}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-enroll">{t('profile.fields.enrolled')}</label>
          <input id="fs-enroll" type="date" className={styles.formInput} value={form.enrollment_date}
            onChange={e => field('enrollment_date', e.target.value)} />
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>{t('profile.sections.parents')}</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('students.columns.parent')}</label>
          <ParentSingleCombobox value={selectedParent} onChange={setSelectedParent} />
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>{t('manager.teachers.contact')}</p>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="fs-phone">{t('profile.fields.phone')}</label>
            <input id="fs-phone" type="tel" className={styles.formInput} value={form.phone}
              onChange={e => field('phone', e.target.value)} autoComplete="tel" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="fs-gender">{t('profile.fields.gender')}</label>
            <select id="fs-gender" className={styles.formSelect} value={form.gender}
              onChange={e => field('gender', e.target.value)}>
              <option value="">—</option>
              <option value="male">{t('common.male')}</option>
              <option value="female">{t('common.female')}</option>
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-dob">{t('profile.fields.dateOfBirth')}</label>
          <input id="fs-dob" type="date" className={styles.formInput} value={form.date_of_birth}
            onChange={e => field('date_of_birth', e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-addr">{t('profile.fields.address')}</label>
          <textarea id="fs-addr" rows={2} className={styles.formTextarea} value={form.address}
            onChange={e => field('address', e.target.value)} />
        </div>
      </div>

      <div className={styles.formFooter}>
        <button type="button" className={styles.formCancel} onClick={onCancel}>{t('common.cancel')}</button>
        <button type="submit" className={styles.formSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? t('manager.students.adding') : t('students.actions.add')}
        </button>
      </div>
    </form>
  )
}

// ─── EnrollCourseInline ───────────────────────────────────────────────────────

function EnrollCourseInline({ studentId, enrolledIds }: { studentId: number; enrolledIds: Set<number> }) {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [enrollError, setEnrollError] = useState<string | null>(null)

  const coursesQ = useQuery({
    queryKey: ['manager-courses-list'],
    queryFn: fetchManagerCourses,
    staleTime: 5 * 60 * 1000,
  })

  const enrollMut = useMutation({
    mutationFn: (courseId: number) =>
      api.post(`/manager/students/${studentId}/enroll`, { course_id: courseId }),
    onSuccess: () => {
      setSelectedId('')
      setEnrollError(null)
      qc.invalidateQueries({ queryKey: ['manager-student-detail', studentId] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Enrollment failed'
      setEnrollError(msg)
    },
  })

  const available = (coursesQ.data ?? []).filter(c => c.status === 'active' && !enrolledIds.has(c.id))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setEnrollError(null)
    enrollMut.mutate(selectedId as number)
  }

  if (coursesQ.isLoading) return <p className={styles.dPlaceholder}>Loading courses…</p>

  if (available.length === 0) {
    return <p className={styles.dPlaceholder}>No additional active courses available.</p>
  }

  return (
    <form className={styles.enrollForm} onSubmit={handleSubmit}>
      <select
        className={styles.enrollSelect}
        value={selectedId}
        onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : '')}
        aria-label="Select course to enroll student"
        disabled={enrollMut.isPending}
      >
        <option value="">Select a course…</option>
        {available.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <button
        type="submit"
        className={styles.enrollSubmitBtn}
        disabled={!selectedId || enrollMut.isPending}
      >
        {enrollMut.isPending ? 'Enrolling…' : 'Enroll'}
      </button>
      {enrollError && <p className={styles.enrollError} role="alert">{enrollError}</p>}
    </form>
  )
}

// ─── ParentSingleCombobox ─────────────────────────────────────────────────────

function ParentSingleCombobox({ value, onChange }: {
  value: ParentLite | null
  onChange: (p: ParentLite | null) => void
}) {
  const [query, setQuery] = useState('')
  const [debQuery, setDebQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDebQuery(query), 300)
    return () => clearTimeout(timer.current)
  }, [query])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const parentsQ = useQuery({
    queryKey: ['parent-search', debQuery],
    queryFn: () => searchParentsApi(debQuery),
    enabled: debQuery.length >= 1,
    staleTime: 30_000,
  })

  if (value) {
    return (
      <div className={styles.chips}>
        <span className={styles.chip} style={{ maxWidth: 'none', flex: '0 1 auto' }}>
          <span className={styles.chipLabel}>{value.name}</span>
          <button
            type="button"
            className={styles.chipX}
            onClick={() => onChange(null)}
            aria-label={`Remove ${value.name}`}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
          {value.email}
        </span>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className={styles.comboWrap}>
      <svg className={styles.comboSearchIcon} width="13" height="13" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <input
        type="text"
        className={styles.comboInput}
        placeholder="Search parents by name or email…"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { if (query) setOpen(true) }}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && debQuery.length >= 1 && (
        <div className={styles.comboDropdown} role="listbox">
          {parentsQ.isFetching ? (
            <div className={styles.comboEmpty}>Searching…</div>
          ) : (parentsQ.data ?? []).length > 0 ? (
            (parentsQ.data ?? []).slice(0, 8).map(p => {
              return (
                <div
                  key={p.id}
                  className={styles.comboOption}
                  role="option"
                  aria-selected={false}
                  onMouseDown={() => { onChange(p); setQuery(''); setOpen(false) }}
                >
                  <UserAvatar
                    name={p.name}
                    avatarUrl={p.avatar_url}
                    className={styles.avatarInitials}
                    style={{ width: '26px', height: '26px', fontSize: '0.5rem', flexShrink: 0 }}
                  />
                  <div className={styles.nameStack} style={{ flex: 1, minWidth: 0 }}>
                    <span className={styles.studentName}>{p.name}</span>
                    <span className={styles.studentEmail}>{p.email}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className={styles.comboEmpty}>No parents found for "{debQuery}"</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── AssignParentInline ───────────────────────────────────────────────────────

function AssignParentInline({ studentId }: { studentId: number }) {
  const qc = useQueryClient()
  const [selectedParent, setSelectedParent] = useState<ParentLite | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)

  const assignMut = useMutation({
    mutationFn: (parentId: number) => assignParentApi(studentId, parentId),
    onSuccess: () => {
      setSelectedParent(null)
      setAssignError(null)
      qc.invalidateQueries({ queryKey: ['manager-student-detail', studentId] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not assign parent'
      setAssignError(msg)
    },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <ParentSingleCombobox value={selectedParent} onChange={p => { setSelectedParent(p); setAssignError(null) }} />
      {selectedParent && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className={styles.enrollSubmitBtn}
            style={{ height: '28px' }}
            disabled={assignMut.isPending}
            onClick={() => assignMut.mutate(selectedParent.id)}
          >
            {assignMut.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}
      {assignError && <p className={styles.enrollError} role="alert">{assignError}</p>}
    </div>
  )
}

// ─── StudentEditForm ──────────────────────────────────────────────────────────

function StudentEditForm({ data, gradeLevels, onSuccess, onCancel }: {
  data: StudentDetail
  gradeLevels: GradeLevel[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const p = data.student_profile
  const [name, setName]         = useState(data.name)
  const [email, setEmail]       = useState(data.email)
  const [phone, setPhone]       = useState(data.phone ?? '')
  const [password, setPassword] = useState('')
  const [gradeId, setGradeId]   = useState<number | ''>(p?.grade_level_id ?? '')
  const [dob, setDob]           = useState(p?.date_of_birth ?? '')
  const [gender, setGender]     = useState(p?.gender ?? '')
  const [address, setAddress]   = useState(p?.address ?? '')
  const [enrollDate, setEnrollDate] = useState(p?.enrollment_date ?? '')
  const [isActive, setIsActive] = useState(data.is_active)
  const [errors, setErrors]     = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: UpdateStudentPayload) => updateStudentApi(data.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-students'] })
      qc.invalidateQueries({ queryKey: ['manager-student-detail', data.id] })
      onSuccess()
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

  const clearErr = (key: string) => setErrors(e => ({ ...e, [key]: undefined }))

  const validate = (): boolean => {
    const e: FieldErrors = {}
    if (!name.trim())  e.name = 'Name is required'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email'
    if (password && password.length < 8) e.password = 'Minimum 8 characters'
    if (!gradeId) e.grade_level_id = 'Grade level is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const payload: UpdateStudentPayload = {
      name:           name.trim(),
      email:          email.trim(),
      grade_level_id: gradeId || undefined,
      is_active:      isActive,
    }
    if (phone.trim())   payload.phone = phone.trim()
    if (password)       payload.password = password
    if (dob)            payload.date_of_birth = dob
    if (gender)         payload.gender = gender
    if (address.trim()) payload.address = address.trim()
    if (enrollDate)     payload.enrollment_date = enrollDate
    mutation.mutate(payload)
  }

  const { t } = useTranslation()
  const inp = (hasErr?: string) => `${styles.formInput}${hasErr ? ' ' + styles.inputError : ''}`
  const sel = (hasErr?: string) => `${styles.formSelect}${hasErr ? ' ' + styles.inputError : ''}`

  return (
    <form className={styles.addForm} onSubmit={handleSubmit} noValidate>
      {serverError && <div className={styles.formBanner} role="alert">{serverError}</div>}

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>{t('manager.teachers.account')}</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="se-name">{t('manager.teachers.fullName')} <span aria-hidden>*</span></label>
          <input id="se-name" type="text" className={inp(errors.name)} value={name}
            onChange={e => { setName(e.target.value); clearErr('name'); setServerError(null) }} />
          {errors.name && <p className={styles.fieldErr}>{errors.name}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="se-email">{t('profile.fields.email')} <span aria-hidden>*</span></label>
          <input id="se-email" type="email" className={inp(errors.email)} value={email}
            onChange={e => { setEmail(e.target.value); clearErr('email'); setServerError(null) }} />
          {errors.email && <p className={styles.fieldErr}>{errors.email}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="se-phone">{t('profile.fields.phone')}</label>
          <input id="se-phone" type="tel" className={styles.formInput} value={phone}
            onChange={e => setPhone(e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="se-pw">{t('manager.students.newPassword')}</label>
          <input id="se-pw" type="password" className={inp(errors.password)} value={password}
            placeholder={t('manager.students.keepCurrentPassword')}
            onChange={e => { setPassword(e.target.value); clearErr('password') }}
            autoComplete="new-password" />
          {errors.password && <p className={styles.fieldErr}>{errors.password}</p>}
        </div>
        <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
          <label className={styles.formLabel} style={{ marginBottom: 0 }}>{t('students.columns.active')}</label>
          <Toggle checked={isActive} onChange={() => setIsActive(a => !a)} label={t('students.columns.active')} />
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>{t('profile.sections.academic')}</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="se-grade">{t('profile.fields.gradeLevel')} <span aria-hidden>*</span></label>
          <select id="se-grade" className={sel(errors.grade_level_id)} value={gradeId}
            onChange={e => { setGradeId(e.target.value ? Number(e.target.value) : ''); clearErr('grade_level_id') }}>
            <option value="">{t('manager.students.selectGrade')}</option>
            {gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {errors.grade_level_id && <p className={styles.fieldErr}>{errors.grade_level_id}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="se-enroll">{t('profile.fields.enrolled')}</label>
          <input id="se-enroll" type="date" className={styles.formInput} value={enrollDate}
            onChange={e => setEnrollDate(e.target.value)} />
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>{t('manager.teachers.contact')}</p>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="se-gender">{t('profile.fields.gender')}</label>
            <select id="se-gender" className={styles.formSelect} value={gender}
              onChange={e => setGender(e.target.value)}>
              <option value="">—</option>
              <option value="male">{t('common.male')}</option>
              <option value="female">{t('common.female')}</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="se-dob">{t('profile.fields.dateOfBirth')}</label>
            <input id="se-dob" type="date" className={styles.formInput} value={dob}
              onChange={e => setDob(e.target.value)} />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="se-addr">{t('profile.fields.address')}</label>
          <textarea id="se-addr" rows={2} className={styles.formTextarea} value={address}
            onChange={e => setAddress(e.target.value)} />
        </div>
      </div>

      <div className={styles.formFooter}>
        <button type="button" className={styles.formCancel} onClick={onCancel}>{t('common.cancel')}</button>
        <button type="submit" className={styles.formSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}

// ─── FeeStatusInlineEdit ──────────────────────────────────────────────────────

function FeeStatusInlineEdit({ studentId, feeStatus, feeDueDate, onCancel, onSuccess }: {
  studentId: number
  feeStatus: string | null
  feeDueDate: string | null
  onCancel: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [status, setStatus]   = useState(feeStatus ?? 'pending')
  const [dueDate, setDueDate] = useState(feeDueDate ?? '')
  const [error, setError]     = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: (vars: { fee_status: string; fee_due_date?: string }) =>
      updateFeeStatusApi(studentId, vars),
    onSuccess: () => {
      setError(null)
      qc.invalidateQueries({ queryKey: ['manager-student-detail', studentId] })
      onSuccess()
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Failed to update fee status'
      )
    },
  })

  const { t } = useTranslation()

  return (
    <form
      className={styles.feeEditForm}
      onSubmit={e => {
        e.preventDefault()
        mut.mutate({ fee_status: status, ...(dueDate ? { fee_due_date: dueDate } : {}) })
      }}
    >
      <select
        className={styles.feeSelect}
        value={status}
        onChange={e => setStatus(e.target.value)}
        aria-label={t('profile.fields.feeStatus')}
        disabled={mut.isPending}
      >
        <option value="paid">{t('students.status.paid')}</option>
        <option value="pending">{t('students.status.pending')}</option>
        <option value="overdue">{t('students.status.overdue')}</option>
      </select>
      <input
        type="date"
        className={styles.feeDateInput}
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
        aria-label={t('profile.fields.dueDate')}
        disabled={mut.isPending}
      />
      <div className={styles.feeEditActions}>
        <button type="button" className={styles.feeEditCancel} onClick={onCancel} disabled={mut.isPending}>
          {t('common.cancel')}
        </button>
        <button type="submit" className={styles.enrollSubmitBtn} disabled={mut.isPending}
          style={{ height: '30px' }}>
          {mut.isPending ? '…' : t('common.save')}
        </button>
      </div>
      {error && <p className={styles.enrollError} role="alert" style={{ width: '100%' }}>{error}</p>}
    </form>
  )
}

// ─── StudentDetailPanel ───────────────────────────────────────────────────────

function DRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.dRow}>
      <dt className={styles.dLabel}>{label}</dt>
      <dd className={styles.dValue}>{children ?? '—'}</dd>
    </div>
  )
}

function StudentDetailPanel({ id }: { id: number }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [isEditing, setIsEditing]       = useState(false)
  const [editingFee, setEditingFee]     = useState(false)
  const [removingParentIds, setRemovingParentIds] = useState<Set<number>>(new Set())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['manager-student-detail', id],
    queryFn: () => fetchStudentDetail(id),
  })

  const gradesQ = useQuery({
    queryKey: ['manager-grade-levels'],
    queryFn: fetchGradeLevels,
    staleTime: 30 * 60 * 1000,
  })

  const removeParentMut = useMutation({
    mutationFn: (parentId: number) => removeParentApi(id, parentId),
    onMutate: (parentId: number) => {
      setRemovingParentIds(s => { const n = new Set(s); n.add(parentId); return n })
    },
    onSettled: (_d, _e, parentId: number) => {
      setRemovingParentIds(s => { const n = new Set(s); n.delete(parentId); return n })
      qc.invalidateQueries({ queryKey: ['manager-student-detail', id] })
    },
  })

  if (isLoading) {
    return (
      <div className={styles.dLoading}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.dSkRow}>
            <Sk width="72px" /><Sk width="110px" />
          </div>
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className={styles.dError}>
        <p>{t('manager.students.failedToLoad')}</p>
        <button type="button" className={styles.retryBtn} onClick={() => refetch()}>{t('common.retry')}</button>
      </div>
    )
  }

  if (isEditing) {
    return (
      <StudentEditForm
        data={data}
        gradeLevels={gradesQ.data ?? []}
        onSuccess={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  const p = data.student_profile
  const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString() : null

  return (
    <div className={styles.dContent}>
      <div className={styles.dHero}>
        <UserAvatar name={data.name} avatarUrl={data.avatar_url} className={styles.dAvatar} />
        <div className={styles.dHeroInfo}>
          <p className={styles.dName}>{data.name}</p>
          <p className={styles.dCode}>{p?.student_code ?? '—'}</p>
          <div className={styles.dPills}>
            <span className={data.is_active ? styles.pillActive : styles.pillInactive}>
              {translateStatus(data.is_active ? 'active' : 'inactive', t)}
            </span>
            {p?.fee_status && <FeeBadge status={p.fee_status} />}
          </div>
          <button
            type="button"
            className={styles.dEditBtn}
            onClick={() => setIsEditing(true)}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path d="M7.5 1.5l2 2L3 10H1V8L7.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
            {t('students.actions.edit')}
          </button>
        </div>
      </div>

      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>{t('profile.sections.academic')}</h3>
        <dl className={styles.dGrid}>
          <DRow label={t('profile.fields.gradeLevel')}>{p?.grade_level?.name}</DRow>
          <DRow label={t('profile.fields.studentCode')}>{p?.student_code}</DRow>
          <DRow label={t('profile.fields.enrolled')}>{fmt(p?.enrollment_date)}</DRow>
        </dl>
      </section>

      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>{t('profile.sections.contact')}</h3>
        <dl className={styles.dGrid}>
          <DRow label={t('profile.fields.email')}>{data.email}</DRow>
          <DRow label={t('profile.fields.phone')}>{data.phone}</DRow>
          <DRow label={t('profile.fields.gender')}>
            {p?.gender ? translateStatus(p.gender, t) : null}
          </DRow>
          <DRow label={t('profile.fields.dateOfBirth')}>{fmt(p?.date_of_birth)}</DRow>
          <DRow label={t('profile.fields.address')}>{p?.address}</DRow>
        </dl>
      </section>

      <section className={styles.dSection}>
        <div className={styles.dSectionHeader}>
          <h3 className={styles.dSectionTitle} style={{ margin: 0 }}>{t('profile.sections.finance')}</h3>
          {!editingFee && (
            <button type="button" className={styles.dSectionHeaderBtn} onClick={() => setEditingFee(true)}>
              {t('common.edit')}
            </button>
          )}
        </div>
        <dl className={styles.dGrid}>
          <DRow label={t('profile.fields.feeStatus')}><FeeBadge status={p?.fee_status} /></DRow>
          <DRow label={t('profile.fields.dueDate')}>{fmt(p?.fee_due_date)}</DRow>
        </dl>
        {editingFee && (
          <FeeStatusInlineEdit
            studentId={data.id}
            feeStatus={p?.fee_status ?? null}
            feeDueDate={p?.fee_due_date ?? null}
            onCancel={() => setEditingFee(false)}
            onSuccess={() => setEditingFee(false)}
          />
        )}
      </section>

      <section className={styles.dSection}>
        <div className={styles.dSectionHeader}>
          <h3 className={styles.dSectionTitle} style={{ margin: 0 }}>{t('profile.sections.parents')}</h3>
          <span className={styles.guardianCapacity}>{data.parents.length}/2</span>
        </div>
        {data.parents.length > 0 ? (
          <ul className={styles.enrolledList}>
            {data.parents.map(parent => {
              const pInitials = parent.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
              return (
                <li key={parent.id} className={styles.enrolledItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <div
                      className={styles.avatarInitials}
                      style={{ width: '26px', height: '26px', fontSize: '0.5rem', flexShrink: 0 }}
                    >
                      {pInitials}
                    </div>
                    <div className={styles.nameStack} style={{ minWidth: 0 }}>
                      <span className={styles.enrolledCourseName}>{parent.name}</span>
                      <span className={styles.enrolledDate}>{parent.email}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`${t('students.actions.remove')} ${parent.name}`}
                    disabled={removingParentIds.has(parent.id)}
                    onClick={() => removeParentMut.mutate(parent.id)}
                    style={{
                      flexShrink: 0,
                      height: '24px',
                      padding: '0 10px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'var(--color-red)',
                      background: 'var(--color-red-dim)',
                      border: '1px solid oklch(58% 0.22 27 / 0.22)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      opacity: removingParentIds.has(parent.id) ? 0.5 : 1,
                      transition: 'opacity var(--dur-fast) var(--ease-out-quart)',
                      fontFamily: 'inherit',
                    }}
                  >
                    {removingParentIds.has(parent.id) ? '…' : t('students.actions.remove')}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className={styles.dPlaceholder}>{t('manager.students.noGuardians')}</p>
        )}
        {data.parents.length < 2 ? (
          <div style={{ marginTop: '12px' }}>
            <p style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              {data.parents.length === 1 ? t('profile.actions.addGuardian') : t('profile.actions.addFirstGuardian')}
            </p>
            <AssignParentInline studentId={data.id} />
          </div>
        ) : (
          <p className={styles.guardianSlotNote}>{t('manager.students.guardianSlotsFilled')}</p>
        )}
      </section>

      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>{t('profile.sections.enrolledCourses')}</h3>
        {data.enrollments && data.enrollments.length > 0 ? (
          <ul className={styles.enrolledList}>
            {data.enrollments.map(e => (
              <li key={e.id} className={styles.enrolledItem}>
                <span className={styles.enrolledCourseName}>{e.course?.name ?? '—'}</span>
                {e.enrolled_at && (
                  <span className={styles.enrolledDate}>
                    {new Date(e.enrolled_at).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.dPlaceholder}>No courses enrolled yet.</p>
        )}
        <EnrollCourseInline
          studentId={data.id}
          enrolledIds={new Set((data.enrollments ?? []).map(e => e.course_id))}
        />
      </section>
    </div>
  )
}

// ─── StudentsPage ─────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [gradeId, setGradeId]     = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [selected, setSelected]   = useState<Set<number>>(new Set())
  const [addOpen, setAddOpen]     = useState(false)
  const [addKey, setAddKey]       = useState(0)
  const [detailId, setDetailId]   = useState<number | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())
  const [bulkBusy, setBulkBusy]   = useState(false)

  const headerCheckRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setDebSearch(search); setPage(1) }, 320)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  useEffect(() => { setPage(1) }, [gradeId, activeFilter])

  const studentsQ = useQuery({
    queryKey: ['manager-students', page, debSearch, gradeId, activeFilter],
    queryFn: () => fetchStudents({ page, search: debSearch, grade_level_id: gradeId, is_active: activeFilter }),
    placeholderData: prev => prev,
  })

  const gradesQ = useQuery({
    queryKey: ['manager-grade-levels'],
    queryFn: fetchGradeLevels,
    staleTime: 30 * 60 * 1000,
  })

  const toggleMut = useMutation({
    mutationFn: toggleStudentStatus,
    onMutate: (id: number) => setTogglingIds(s => { const n = new Set(s); n.add(id); return n }),
    onSettled: (_d, _e, id: number) => {
      setTogglingIds(s => { const n = new Set(s); n.delete(id); return n })
      qc.invalidateQueries({ queryKey: ['manager-students'] })
      qc.invalidateQueries({ queryKey: ['manager-student-detail', id] })
    },
  })

  const students = studentsQ.data?.data ?? []
  const pagination = studentsQ.data

  const allIds   = students.map(s => s.id)
  const allSel   = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someSel  = allIds.some(id => selected.has(id)) && !allSel

  useEffect(() => {
    if (headerCheckRef.current) headerCheckRef.current.indeterminate = someSel
  }, [someSel])

  const toggleRow = (id: number) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleAll = () =>
    setSelected(s => allSel
      ? new Set([...s].filter(id => !allIds.includes(id)))
      : new Set([...s, ...allIds])
    )

  const bulkActivate = async () => {
    if (bulkBusy) return
    setBulkBusy(true)
    await Promise.all(students.filter(s => selected.has(s.id) && !s.is_active).map(s => toggleMut.mutateAsync(s.id)))
    setSelected(new Set()); setBulkBusy(false)
  }

  const bulkDeactivate = async () => {
    if (bulkBusy) return
    setBulkBusy(true)
    await Promise.all(students.filter(s => selected.has(s.id) && s.is_active).map(s => toggleMut.mutateAsync(s.id)))
    setSelected(new Set()); setBulkBusy(false)
  }

  const openAdd  = () => { setAddKey(k => k + 1); setAddOpen(true) }
  const hasFilters = !!(search || gradeId || activeFilter)

  // Page number pills with ellipsis
  const pageNumbers = (() => {
    if (!pagination || pagination.last_page <= 1) return []
    const total = pagination.last_page
    const arr: Array<number | '…'> = []
    const show = (n: number) => n === 1 || n === total || Math.abs(n - page) <= 1
    for (let n = 1; n <= total; n++) {
      if (show(n)) {
        if (arr.length && (arr[arr.length - 1] as number) < n - 1) arr.push('…')
        arr.push(n)
      }
    }
    return arr
  })()

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{t('common.students')}</h1>
          {pagination && (
            <p className={styles.pageCount}>{pagination.total.toLocaleString()} {t('manager.teachers.total')}</p>
          )}
        </div>
        <div className={styles.pageActions}>
          <button type="button" className={styles.exportBtn}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 9.5v2h10v-2M6.5 1v8M4 5.5l2.5 3 2.5-3"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('students.actions.export')}
          </button>
          <button type="button" className={styles.addBtn} onClick={openAdd}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            {t('students.actions.add')}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            placeholder={t('students.filters.searchPlaceholder')}
            className={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className={styles.clearSearch} onClick={() => setSearch('')} aria-label={t('common.search')}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
        <div className={styles.filters}>
          <select className={styles.filterSelect} value={gradeId}
            onChange={e => setGradeId(e.target.value)}>
            <option value="">{t('students.filters.allGrades')}</option>
            {gradesQ.data?.map(g => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
          </select>
          <select className={styles.filterSelect} value={activeFilter}
            onChange={e => setActiveFilter(e.target.value)}>
            <option value="">{t('students.filters.allStatuses')}</option>
            <option value="1">{t('students.status.active')}</option>
            <option value="0">{t('students.status.inactive')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {studentsQ.isError ? (
          <div className={styles.stateBox}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={styles.stateIcon}>
              <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M16 10v7M16 21v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            <p className={styles.stateMsg}>Failed to load students.</p>
            <button type="button" className={styles.retryBtn} onClick={() => studentsQ.refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thCheck}>
                  <input
                    ref={headerCheckRef}
                    type="checkbox"
                    className={styles.check}
                    checked={allSel}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className={styles.th}>{t('students.columns.student')}</th>
                <th className={styles.th}>{t('students.columns.code')}</th>
                <th className={`${styles.th} ${styles.hideOnMobile}`}>{t('students.columns.grade')}</th>
                <th className={`${styles.th} ${styles.hideOnMobile}`}>{t('students.columns.parent')}</th>
                <th className={styles.th}>{t('students.columns.fees')}</th>
                <th className={`${styles.th} ${styles.thCenter}`}>{t('students.columns.active')}</th>
              </tr>
            </thead>
            <tbody>
              {studentsQ.isLoading ? (
                <SkeletonRows />
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyTd}>
                    <div className={styles.stateBox}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className={styles.stateIcon}>
                        <circle cx="18" cy="12" r="6" stroke="currentColor" strokeWidth="1.75"/>
                        <path d="M6 32c0-6.627 5.373-12 12-12s12 5.373 12 12"
                          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                      </svg>
                      <p className={styles.stateMsg}>
                        {hasFilters ? t('manager.students.noStudentsFilter') : t('manager.students.noStudents')}
                      </p>
                      {hasFilters ? (
                        <button type="button" className={styles.stateCta}
                          onClick={() => { setSearch(''); setGradeId(''); setActiveFilter('') }}>
                          {t('manager.students.clear')}
                        </button>
                      ) : (
                        <button type="button" className={styles.stateCta} onClick={openAdd}>
                          {t('manager.students.addStudent')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                students.map(s => {
                  const p = s.student_profile
                  const isSel = selected.has(s.id)
                  return (
                    <tr
                      key={s.id}
                      className={`${styles.row}${isSel ? ' ' + styles.rowSel : ''}`}
                      onClick={() => setDetailId(s.id)}
                    >
                      <td className={styles.tdCheck} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className={styles.check}
                          checked={isSel}
                          onChange={() => toggleRow(s.id)}
                          aria-label={`Select ${s.name}`}
                        />
                      </td>
                      <td className={styles.td}>
                        <div className={styles.cellName}>
                          <UserAvatar name={s.name} avatarUrl={s.avatar_url} className={styles.avatarInitials} />
                          <div className={styles.nameStack}>
                            <span className={styles.studentName}>{s.name}</span>
                            <span className={styles.studentEmail}>{s.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.codeChip}>{p?.student_code ?? '—'}</span>
                      </td>
                      <td className={`${styles.td} ${styles.hideOnMobile}`}>
                        {p?.grade_level?.name ?? '—'}
                      </td>
                      <td className={`${styles.td} ${styles.hideOnMobile}`}>
                        <span className={styles.dimText}>—</span>
                      </td>
                      <td className={styles.td}>
                        <FeeBadge status={p?.fee_status} />
                      </td>
                      <td className={`${styles.td} ${styles.tdCenter}`} onClick={e => e.stopPropagation()}>
                        <Toggle
                          checked={s.is_active}
                          disabled={togglingIds.has(s.id)}
                          onChange={() => toggleMut.mutate(s.id)}
                          label={`Toggle ${s.name} active`}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div className={styles.pagination}>
          <p className={styles.pageInfo}>
            {pagination.from}–{pagination.to} of {pagination.total.toLocaleString()}
          </p>
          <div className={styles.pageControls}>
            <button type="button" className={styles.pageBtn}
              disabled={page === 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M8.5 10.5L4.5 6.5l4-4" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {pageNumbers.map((n, i) =>
              n === '…'
                ? <span key={`e${i}`} className={styles.pageEllipsis}>…</span>
                : (
                  <button key={n} type="button"
                    className={`${styles.pageBtn}${n === page ? ' ' + styles.pageBtnActive : ''}`}
                    onClick={() => setPage(n as number)}
                    aria-current={n === page ? 'page' : undefined}
                  >{n}</button>
                )
            )}
            <button type="button" className={styles.pageBtn}
              disabled={page === pagination.last_page}
              onClick={() => setPage(p => p + 1)} aria-label="Next page">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className={styles.bulkBar} role="region" aria-label="Bulk actions">
          <span className={styles.bulkCount}>{selected.size} {t('manager.students.selected')}</span>
          <div className={styles.bulkActions}>
            <button type="button" className={styles.bulkActivate}
              onClick={bulkActivate} disabled={bulkBusy}>{t('manager.students.activate')}</button>
            <button type="button" className={styles.bulkDeactivate}
              onClick={bulkDeactivate} disabled={bulkBusy}>{t('manager.students.deactivate')}</button>
            <button type="button" className={styles.bulkClear}
              onClick={() => setSelected(new Set())}>{t('manager.students.clear')}</button>
          </div>
        </div>
      )}

      {/* Add student slide-over */}
      <SlideOver open={addOpen} onClose={() => setAddOpen(false)} title={t('students.actions.add')}>
        <AddStudentForm
          key={addKey}
          gradeLevels={gradesQ.data ?? []}
          onSuccess={() => setAddOpen(false)}
          onCancel={() => setAddOpen(false)}
        />
      </SlideOver>

      {/* Detail slide-over */}
      <SlideOver
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title={t('manager.students.profileTitle')}
        width={520}
      >
        {detailId !== null && <StudentDetailPanel id={detailId} />}
      </SlideOver>
    </div>
  )
}
