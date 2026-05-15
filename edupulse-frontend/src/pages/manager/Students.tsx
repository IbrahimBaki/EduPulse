import { useState, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './Students.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeLevel { id: number; name: string; level: number }

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

// ─── FeeBadge ─────────────────────────────────────────────────────────────────

function FeeBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className={styles.badgeNone}>—</span>
  const cls: Record<string, string> = {
    paid: styles.badgePaid,
    pending: styles.badgePending,
    overdue: styles.badgeOverdue,
  }
  return (
    <span className={cls[status] ?? styles.badgeNone}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
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
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => closeRef.current?.focus(), 50)
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
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
            aria-label="Close"
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
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: createStudentApi,
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
    mutation.mutate(form)
  }

  const inp = (hasErr?: string) => `${styles.formInput}${hasErr ? ' ' + styles.inputError : ''}`
  const sel = (hasErr?: string) => `${styles.formSelect}${hasErr ? ' ' + styles.inputError : ''}`

  return (
    <form className={styles.addForm} onSubmit={handleSubmit} noValidate>
      {serverError && <div className={styles.formBanner} role="alert">{serverError}</div>}

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Account</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-name">Full name <span aria-hidden>*</span></label>
          <input id="fs-name" type="text" className={inp(errors.name)} value={form.name}
            onChange={e => field('name', e.target.value)} autoComplete="name" />
          {errors.name && <p className={styles.fieldErr}>{errors.name}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-email">Email <span aria-hidden>*</span></label>
          <input id="fs-email" type="email" className={inp(errors.email)} value={form.email}
            onChange={e => field('email', e.target.value)} autoComplete="email" />
          {errors.email && <p className={styles.fieldErr}>{errors.email}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-pw">Password <span aria-hidden>*</span></label>
          <input id="fs-pw" type="password" className={inp(errors.password)} value={form.password}
            onChange={e => field('password', e.target.value)} autoComplete="new-password" />
          {errors.password && <p className={styles.fieldErr}>{errors.password}</p>}
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Academic</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-grade">Grade level <span aria-hidden>*</span></label>
          <select id="fs-grade" className={sel(errors.grade_level_id)}
            value={form.grade_level_id}
            onChange={e => field('grade_level_id', e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select grade level</option>
            {gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {errors.grade_level_id && <p className={styles.fieldErr}>{errors.grade_level_id}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-enroll">Enrollment date</label>
          <input id="fs-enroll" type="date" className={styles.formInput} value={form.enrollment_date}
            onChange={e => field('enrollment_date', e.target.value)} />
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Personal</p>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="fs-phone">Phone</label>
            <input id="fs-phone" type="tel" className={styles.formInput} value={form.phone}
              onChange={e => field('phone', e.target.value)} autoComplete="tel" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="fs-gender">Gender</label>
            <select id="fs-gender" className={styles.formSelect} value={form.gender}
              onChange={e => field('gender', e.target.value)}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-dob">Date of birth</label>
          <input id="fs-dob" type="date" className={styles.formInput} value={form.date_of_birth}
            onChange={e => field('date_of_birth', e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fs-addr">Address</label>
          <textarea id="fs-addr" rows={2} className={styles.formTextarea} value={form.address}
            onChange={e => field('address', e.target.value)} />
        </div>
      </div>

      <div className={styles.formFooter}>
        <button type="button" className={styles.formCancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.formSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Adding…' : 'Add student'}
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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['manager-student-detail', id],
    queryFn: () => fetchStudentDetail(id),
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
        <p>Failed to load student details.</p>
        <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Try again</button>
      </div>
    )
  }

  const p = data.student_profile
  const initials = data.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
  const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString() : null

  return (
    <div className={styles.dContent}>
      <div className={styles.dHero}>
        <div className={styles.dAvatar}>{initials}</div>
        <div className={styles.dHeroInfo}>
          <p className={styles.dName}>{data.name}</p>
          <p className={styles.dCode}>{p?.student_code ?? '—'}</p>
          <div className={styles.dPills}>
            <span className={data.is_active ? styles.pillActive : styles.pillInactive}>
              {data.is_active ? 'Active' : 'Inactive'}
            </span>
            {p?.fee_status && <FeeBadge status={p.fee_status} />}
          </div>
        </div>
      </div>

      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>Academic</h3>
        <dl className={styles.dGrid}>
          <DRow label="Grade level">{p?.grade_level?.name}</DRow>
          <DRow label="Student code">{p?.student_code}</DRow>
          <DRow label="Enrolled">{fmt(p?.enrollment_date)}</DRow>
        </dl>
      </section>

      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>Contact</h3>
        <dl className={styles.dGrid}>
          <DRow label="Email">{data.email}</DRow>
          <DRow label="Phone">{data.phone}</DRow>
          <DRow label="Gender">
            {p?.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : null}
          </DRow>
          <DRow label="Date of birth">{fmt(p?.date_of_birth)}</DRow>
          <DRow label="Address">{p?.address}</DRow>
        </dl>
      </section>

      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>Finance</h3>
        <dl className={styles.dGrid}>
          <DRow label="Fee status"><FeeBadge status={p?.fee_status} /></DRow>
          <DRow label="Due date">{fmt(p?.fee_due_date)}</DRow>
        </dl>
      </section>

      {data.parents.length > 0 && (
        <section className={styles.dSection}>
          <h3 className={styles.dSectionTitle}>Parents / Guardians</h3>
          <ul className={styles.parentList}>
            {data.parents.map(parent => (
              <li key={parent.id} className={styles.parentCard}>
                <p className={styles.parentName}>{parent.name}</p>
                <p className={styles.parentContact}>{parent.email}</p>
                {parent.phone && <p className={styles.parentContact}>{parent.phone}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>Enrolled Courses</h3>
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
          <h1 className={styles.pageTitle}>Students</h1>
          {pagination && (
            <p className={styles.pageCount}>{pagination.total.toLocaleString()} total</p>
          )}
        </div>
        <div className={styles.pageActions}>
          <button type="button" className={styles.exportBtn}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 9.5v2h10v-2M6.5 1v8M4 5.5l2.5 3 2.5-3"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export
          </button>
          <button type="button" className={styles.addBtn} onClick={openAdd}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            Add student
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
            placeholder="Search by name or email"
            className={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className={styles.clearSearch} onClick={() => setSearch('')} aria-label="Clear search">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
        <div className={styles.filters}>
          <select className={styles.filterSelect} value={gradeId}
            onChange={e => setGradeId(e.target.value)}>
            <option value="">All grades</option>
            {gradesQ.data?.map(g => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
          </select>
          <select className={styles.filterSelect} value={activeFilter}
            onChange={e => setActiveFilter(e.target.value)}>
            <option value="">All status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
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
                <th className={styles.th}>Student</th>
                <th className={styles.th}>Code</th>
                <th className={`${styles.th} ${styles.hideOnMobile}`}>Grade</th>
                <th className={`${styles.th} ${styles.hideOnMobile}`}>Parent</th>
                <th className={styles.th}>Fees</th>
                <th className={`${styles.th} ${styles.thCenter}`}>Active</th>
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
                        {hasFilters ? 'No students match your filters.' : 'No students yet.'}
                      </p>
                      {hasFilters ? (
                        <button type="button" className={styles.stateCta}
                          onClick={() => { setSearch(''); setGradeId(''); setActiveFilter('') }}>
                          Clear filters
                        </button>
                      ) : (
                        <button type="button" className={styles.stateCta} onClick={openAdd}>
                          Add first student
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                students.map(s => {
                  const p = s.student_profile
                  const isSel = selected.has(s.id)
                  const initials = s.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
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
                          <div className={styles.avatarInitials}>{initials}</div>
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
          <span className={styles.bulkCount}>{selected.size} selected</span>
          <div className={styles.bulkActions}>
            <button type="button" className={styles.bulkActivate}
              onClick={bulkActivate} disabled={bulkBusy}>Activate</button>
            <button type="button" className={styles.bulkDeactivate}
              onClick={bulkDeactivate} disabled={bulkBusy}>Deactivate</button>
            <button type="button" className={styles.bulkClear}
              onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {/* Add student slide-over */}
      <SlideOver open={addOpen} onClose={() => setAddOpen(false)} title="Add student">
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
        title="Student profile"
        width={520}
      >
        {detailId !== null && <StudentDetailPanel id={detailId} />}
      </SlideOver>
    </div>
  )
}
