import { useState, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import styles from './Students.module.css'
import UserAvatar from '../../components/UserAvatar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Parent {
  id: number
  name: string
  email: string
  phone: string | null
  national_id: string | null
  avatar_url?: string | null
  is_active: boolean
  children_count: number
}

interface ParentDetail extends Parent {
  children: Array<{ id: number; name: string; email: string; phone: string | null; avatar_url?: string | null }>
}

interface Student {
  id: number
  name: string
  email: string
  avatar_url?: string | null
}

interface GradeLevel {
  id: number
  name: string
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

interface CreateParentPayload {
  name: string
  email: string
  password: string
  phone: string
  national_id: string
  student_ids: number[]
}

interface UpdateParentPayload {
  name?: string
  email?: string
  phone?: string
  national_id?: string
  password?: string
}

interface NewStudentPayload {
  name: string
  email: string
  password: string
  grade_level_id: number | ''
  parent_id?: number
}

type FieldErrors = Partial<Record<string, string>>

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchParents(p: { page: number; search: string }) {
  const params: Record<string, string | number> = { page: p.page, per_page: 15 }
  if (p.search) params.search = p.search
  const { data } = await api.get('/manager/parents', { params })
  return data.data as Paginated<Parent>
}

async function fetchParentDetail(id: number) {
  const { data } = await api.get(`/manager/parents/${id}`)
  return data.data as ParentDetail
}

async function searchStudentsApi(q: string) {
  const { data } = await api.get('/manager/students', { params: { search: q, per_page: 20 } })
  const raw = data.data
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
  return list as Student[]
}

async function createStudentForLinkingApi(payload: NewStudentPayload) {
  const { data } = await api.post('/manager/students', payload)
  return data.data as Student
}

async function fetchGradeLevels() {
  const { data } = await api.get('/manager/grade-levels')
  return data.data as GradeLevel[]
}

async function updateParentApi(id: number, payload: UpdateParentPayload) {
  const { data } = await api.put(`/manager/parents/${id}`, payload)
  return data.data as ParentDetail
}

async function createParentApi(payload: CreateParentPayload) {
  const { data } = await api.post('/manager/parents', payload)
  return data
}

async function linkStudentApi({ parentId, studentId }: { parentId: number; studentId: number }) {
  await api.post(`/manager/parents/${parentId}/link-student`, { student_id: studentId })
}

async function unlinkStudentApi({ parentId, studentId }: { parentId: number; studentId: number }) {
  await api.delete(`/manager/parents/${parentId}/students/${studentId}`)
}

// ─── ChildrenCountBadge ───────────────────────────────────────────────────────

function ChildrenCountBadge({ count }: { count: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '22px',
        height: '22px',
        padding: '0 7px',
        borderRadius: '999px',
        fontSize: '0.6875rem',
        fontWeight: 700,
        lineHeight: 1,
        background: 'oklch(62% 0.26 255 / 0.12)',
        color: 'var(--color-blue)',
        border: '1px solid oklch(62% 0.26 255 / 0.24)',
      }}
    >
      {count}
    </span>
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
          <td>
            <div className={styles.cellName}>
              <span className={`${styles.avatarInitials} ${styles.skCircle}`} />
              <div className={styles.nameStack}>
                <Sk width="120px" />
                <Sk width="80px" />
              </div>
            </div>
          </td>
          <td><Sk width="110px" /></td>
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

// ─── CreateStudentMiniForm ────────────────────────────────────────────────────

function CreateStudentMiniForm({ initialName, onSuccess, onCancel, parentId }: {
  initialName: string
  onSuccess: (student: Student) => void
  onCancel: () => void
  parentId?: number
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gradeId, setGradeId] = useState<number | ''>('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const gradesQ = useQuery({
    queryKey: ['manager-grade-levels'],
    queryFn: fetchGradeLevels,
    staleTime: 30 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: createStudentForLinkingApi,
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: ['manager-students'] })
      onSuccess(student)
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      if (e.response?.data?.errors) {
        const mapped: FieldErrors = {}
        for (const [k, v] of Object.entries(e.response.data.errors)) mapped[k] = v[0]
        setErrors(mapped)
      }
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: FieldErrors = {}
    if (!name.trim()) errs.name = 'Required'
    if (!email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email'
    if (!password) errs.password = 'Required'
    else if (password.length < 8) errs.password = 'Min 8 characters'
    if (!gradeId) errs.grade_level_id = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length === 0) {
      mutation.mutate({
        name: name.trim(),
        email: email.trim(),
        password,
        grade_level_id: gradeId,
        ...(parentId ? { parent_id: parentId } : {}),
      })
    }
  }

  const inp = (k: string) => `${styles.formInput}${errors[k] ? ' ' + styles.inputError : ''}`

  return (
    <div className={styles.createStudentCard}>
      <p className={styles.createStudentCardTitle}>New student</p>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="cs-name">Full name <span aria-hidden>*</span></label>
        <input
          id="cs-name" type="text" className={inp('name')} value={name}
          onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: undefined })) }}
        />
        {errors.name && <p className={styles.fieldErr}>{errors.name}</p>}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="cs-email">Email <span aria-hidden>*</span></label>
        <input
          id="cs-email" type="email" className={inp('email')} value={email}
          onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: undefined })) }}
        />
        {errors.email && <p className={styles.fieldErr}>{errors.email}</p>}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="cs-pw">Password <span aria-hidden>*</span></label>
        <input
          id="cs-pw" type="password" className={inp('password')} value={password}
          onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: undefined })) }}
          autoComplete="new-password"
        />
        {errors.password && <p className={styles.fieldErr}>{errors.password}</p>}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="cs-grade">Grade level <span aria-hidden>*</span></label>
        <select
          id="cs-grade"
          className={`${styles.formSelect}${errors.grade_level_id ? ' ' + styles.inputError : ''}`}
          value={gradeId}
          onChange={e => {
            setGradeId(e.target.value ? Number(e.target.value) : '')
            setErrors(er => ({ ...er, grade_level_id: undefined }))
          }}
        >
          <option value="">Select grade…</option>
          {(gradesQ.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {errors.grade_level_id && <p className={styles.fieldErr}>{errors.grade_level_id}</p>}
      </div>
      <div className={styles.createStudentActions}>
        <button type="button" className={styles.createStudentCancel} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.createStudentSubmit}
          disabled={mutation.isPending}
          onClick={submit}
        >
          {mutation.isPending ? 'Creating…' : 'Create student'}
        </button>
      </div>
    </div>
  )
}

// ─── StudentMultiCombobox ─────────────────────────────────────────────────────

function StudentMultiCombobox({ selected, onAdd, onRemove }: {
  selected: Student[]
  onAdd: (s: Student) => void
  onRemove: (id: number) => void
}) {
  const [query, setQuery] = useState('')
  const [debQuery, setDebQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [showCreate, setShowCreate] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
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

  const selectedIds = new Set(selected.map(s => s.id))

  const studentsQ = useQuery({
    queryKey: ['student-search', debQuery],
    queryFn: () => searchStudentsApi(debQuery),
    enabled: debQuery.length >= 1,
    staleTime: 30_000,
  })

  const results = (studentsQ.data ?? []).filter(s => !selectedIds.has(s.id))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setFocusedIdx(i => Math.min(i + 1, results.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault()
      if (focusedIdx < results.length) {
        onAdd(results[focusedIdx])
        setQuery('')
        setFocusedIdx(-1)
        setOpen(false)
      } else {
        setShowCreate(true)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const selectStudent = (s: Student) => {
    onAdd(s)
    setQuery('')
    setFocusedIdx(-1)
    setOpen(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div ref={wrapRef}>
      {selected.length > 0 && (
        <div className={styles.chips}>
          {selected.map(s => (
            <span key={s.id} className={styles.chip}>
              <span className={styles.chipLabel}>{s.name}</span>
              <button
                type="button"
                className={styles.chipX}
                onClick={() => onRemove(s.id)}
                aria-label={`Remove ${s.name}`}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={styles.comboWrap}>
        <svg className={styles.comboSearchIcon} width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          className={styles.comboInput}
          placeholder="Search students by name or email…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setFocusedIdx(-1) }}
          onFocus={() => { if (query) setOpen(true) }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {open && debQuery.length >= 1 && (
          <div className={styles.comboDropdown} role="listbox">
            {studentsQ.isFetching ? (
              <div className={styles.comboEmpty}>Searching…</div>
            ) : (
              <>
                {results.slice(0, 8).map((s, i) => {
                  return (
                    <div
                      key={s.id}
                      className={`${styles.comboOption}${focusedIdx === i ? ' ' + styles.comboOptionActive : ''}`}
                      role="option"
                      aria-selected={false}
                      onMouseDown={() => selectStudent(s)}
                    >
                      <UserAvatar
                        name={s.name}
                        avatarUrl={s.avatar_url}
                        className={styles.avatarInitials}
                        style={{ width: '26px', height: '26px', fontSize: '0.5rem', flexShrink: 0 }}
                      />
                      <div className={styles.nameStack} style={{ flex: 1, minWidth: 0 }}>
                        <span className={styles.studentName}>{s.name}</span>
                        <span className={styles.studentEmail}>{s.email}</span>
                      </div>
                    </div>
                  )
                })}
                {results.length === 0 && !studentsQ.isFetching && (
                  <div className={styles.comboEmpty}>No students found for "{debQuery}"</div>
                )}
                <div
                  className={`${styles.comboCreateRow}${focusedIdx === results.length ? ' ' + styles.comboOptionActive : ''}`}
                  role="option"
                  aria-selected={false}
                  onMouseDown={() => { setShowCreate(true); setOpen(false) }}
                >
                  <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                  </svg>
                  Create student "{debQuery}"
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {showCreate && (
        <CreateStudentMiniForm
          initialName={debQuery}
          onSuccess={s => {
            onAdd(s)
            setQuery('')
            setDebQuery('')
            setShowCreate(false)
            requestAnimationFrame(() => inputRef.current?.focus())
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}

// ─── AddParentForm ────────────────────────────────────────────────────────────

function AddParentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', national_id: '' })
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: CreateParentPayload) => createParentApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-parents'] })
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

  const field = (key: keyof typeof form, val: string) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
    setServerError(null)
  }

  const validate = (): boolean => {
    const e: FieldErrors = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({ ...form, student_ids: selectedStudents.map(s => s.id) })
  }

  const inp = (hasErr?: string) => `${styles.formInput}${hasErr ? ' ' + styles.inputError : ''}`

  return (
    <form className={styles.addForm} onSubmit={handleSubmit} noValidate>
      {serverError && <div className={styles.formBanner} role="alert">{serverError}</div>}

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Account</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fp-name">Full name <span aria-hidden>*</span></label>
          <input id="fp-name" type="text" className={inp(errors.name)} value={form.name}
            onChange={e => field('name', e.target.value)} autoComplete="name" />
          {errors.name && <p className={styles.fieldErr}>{errors.name}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fp-email">Email <span aria-hidden>*</span></label>
          <input id="fp-email" type="email" className={inp(errors.email)} value={form.email}
            onChange={e => field('email', e.target.value)} autoComplete="email" />
          {errors.email && <p className={styles.fieldErr}>{errors.email}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fp-pw">Password <span aria-hidden>*</span></label>
          <input id="fp-pw" type="password" className={inp(errors.password)} value={form.password}
            onChange={e => field('password', e.target.value)} autoComplete="new-password" />
          {errors.password && <p className={styles.fieldErr}>{errors.password}</p>}
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Contact</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fp-phone">Phone</label>
          <input id="fp-phone" type="tel" className={styles.formInput} value={form.phone}
            onChange={e => field('phone', e.target.value)} autoComplete="tel" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="fp-nid">National ID</label>
          <input id="fp-nid" type="text" className={styles.formInput} value={form.national_id}
            onChange={e => field('national_id', e.target.value)} />
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Link students (optional)</p>
        <StudentMultiCombobox
          selected={selectedStudents}
          onAdd={s => {
            if (!selectedStudents.find(x => x.id === s.id)) {
              setSelectedStudents(prev => [...prev, s])
            }
          }}
          onRemove={id => setSelectedStudents(prev => prev.filter(s => s.id !== id))}
        />
      </div>

      <div className={styles.formFooter}>
        <button type="button" className={styles.formCancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.formSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Adding…' : 'Add parent'}
        </button>
      </div>
    </form>
  )
}

// ─── ParentEditForm ───────────────────────────────────────────────────────────

function ParentEditForm({ data, onSuccess, onCancel }: {
  data: ParentDetail
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name:        data.name,
    email:       data.email,
    phone:       data.phone ?? '',
    national_id: data.national_id ?? '',
    password:    '',
  })
  const [errors, setErrors]           = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: UpdateParentPayload) => updateParentApi(data.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-parent-detail', data.id] })
      qc.invalidateQueries({ queryKey: ['manager-parents'] })
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

  const field = (k: keyof typeof form, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
    setServerError(null)
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

    const payload: UpdateParentPayload = {
      name:        form.name.trim(),
      email:       form.email.trim(),
      phone:       form.phone || undefined,
      national_id: form.national_id || undefined,
    }
    if (form.password) payload.password = form.password
    mutation.mutate(payload)
  }

  const inp = (k: string) => `${styles.formInput}${errors[k] ? ' ' + styles.inputError : ''}`

  return (
    <form className={styles.addForm} onSubmit={handleSubmit} noValidate>
      {serverError && <div className={styles.formBanner} role="alert">{serverError}</div>}

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Account</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="pe-name">Full name <span aria-hidden>*</span></label>
          <input id="pe-name" type="text" className={inp('name')} value={form.name}
            onChange={e => field('name', e.target.value)} />
          {errors.name && <p className={styles.fieldErr}>{errors.name}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="pe-email">Email <span aria-hidden>*</span></label>
          <input id="pe-email" type="email" className={inp('email')} value={form.email}
            onChange={e => field('email', e.target.value)} />
          {errors.email && <p className={styles.fieldErr}>{errors.email}</p>}
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Contact</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="pe-phone">Phone</label>
          <input id="pe-phone" type="tel" className={styles.formInput} value={form.phone}
            onChange={e => field('phone', e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="pe-nid">National ID</label>
          <input id="pe-nid" type="text" className={styles.formInput} value={form.national_id}
            onChange={e => field('national_id', e.target.value)} />
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Security</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="pe-pw">New password</label>
          <input
            id="pe-pw" type="password" className={inp('password')} value={form.password}
            placeholder="Leave blank to keep current"
            onChange={e => field('password', e.target.value)}
            autoComplete="new-password"
          />
          {errors.password && <p className={styles.fieldErr}>{errors.password}</p>}
        </div>
      </div>

      <div className={styles.formFooter}>
        <button type="button" className={styles.formCancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.formSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

// ─── LinkStudentInline ────────────────────────────────────────────────────────

function LinkStudentInline({ parentId, linkedIds }: { parentId: number; linkedIds: Set<number> }) {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [debQuery, setDebQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Student | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
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

  const studentsQ = useQuery({
    queryKey: ['student-search', debQuery],
    queryFn: () => searchStudentsApi(debQuery),
    enabled: debQuery.length >= 1,
    staleTime: 30_000,
  })

  const results = (studentsQ.data ?? []).filter(s => !linkedIds.has(s.id))

  const linkMut = useMutation({
    mutationFn: (studentId: number) => linkStudentApi({ parentId, studentId }),
    onSuccess: () => {
      setSelected(null)
      setQuery('')
      setDebQuery('')
      setLinkError(null)
      qc.invalidateQueries({ queryKey: ['manager-parent-detail', parentId] })
      qc.invalidateQueries({ queryKey: ['manager-parents'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Link failed'
      setLinkError(msg)
    },
  })

  if (showCreate) {
    return (
      <CreateStudentMiniForm
        initialName={query}
        parentId={parentId}
        onSuccess={() => {
          setShowCreate(false)
          setQuery('')
          setDebQuery('')
          qc.invalidateQueries({ queryKey: ['manager-parent-detail', parentId] })
          qc.invalidateQueries({ queryKey: ['manager-parents'] })
          qc.invalidateQueries({ queryKey: ['manager-students'] })
        }}
        onCancel={() => setShowCreate(false)}
      />
    )
  }

  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={styles.chip} style={{ flex: 1, maxWidth: 'none' }}>
            <span className={styles.chipLabel}>{selected.name}</span>
            <button
              type="button"
              className={styles.chipX}
              onClick={() => { setSelected(null); setLinkError(null) }}
              aria-label={`Remove ${selected.name}`}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </span>
          <button
            type="button"
            className={styles.enrollSubmitBtn}
            style={{ height: '28px', flexShrink: 0 }}
            disabled={linkMut.isPending}
            onClick={() => linkMut.mutate(selected.id)}
          >
            {linkMut.isPending ? 'Linking…' : 'Link'}
          </button>
        </div>
        {linkError && <p className={styles.enrollError} role="alert">{linkError}</p>}
      </div>
    )
  }

  return (
    <div ref={wrapRef}>
      <div className={styles.comboWrap}>
        <svg className={styles.comboSearchIcon} width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          className={styles.comboInput}
          placeholder="Search students…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { if (query) setOpen(true) }}
          autoComplete="off"
        />
        {open && debQuery.length >= 1 && (
          <div className={styles.comboDropdown} role="listbox">
            {studentsQ.isFetching ? (
              <div className={styles.comboEmpty}>Searching…</div>
            ) : (
              <>
                {results.slice(0, 8).map(s => {
                  return (
                    <div
                      key={s.id}
                      className={styles.comboOption}
                      role="option"
                      aria-selected={false}
                      onMouseDown={() => { setSelected(s); setOpen(false) }}
                    >
                      <UserAvatar
                        name={s.name}
                        avatarUrl={s.avatar_url}
                        className={styles.avatarInitials}
                        style={{ width: '26px', height: '26px', fontSize: '0.5rem', flexShrink: 0 }}
                      />
                      <div className={styles.nameStack} style={{ flex: 1, minWidth: 0 }}>
                        <span className={styles.studentName}>{s.name}</span>
                        <span className={styles.studentEmail}>{s.email}</span>
                      </div>
                    </div>
                  )
                })}
                {results.length === 0 && !studentsQ.isFetching && (
                  <div className={styles.comboEmpty}>No students found for "{debQuery}"</div>
                )}
                <div
                  className={styles.comboCreateRow}
                  role="option"
                  aria-selected={false}
                  onMouseDown={() => { setShowCreate(true); setOpen(false) }}
                >
                  <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                  </svg>
                  Create student "{debQuery}"
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ParentDetailPanel ────────────────────────────────────────────────────────

function DRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.dRow}>
      <dt className={styles.dLabel}>{label}</dt>
      <dd className={styles.dValue}>{children ?? '—'}</dd>
    </div>
  )
}

function ParentDetailPanel({ id }: { id: number }) {
  const qc = useQueryClient()
  const [isEditing, setIsEditing]       = useState(false)
  const [unlinkingIds, setUnlinkingIds] = useState<Set<number>>(new Set())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['manager-parent-detail', id],
    queryFn: () => fetchParentDetail(id),
  })

  const unlinkMut = useMutation({
    mutationFn: (studentId: number) => unlinkStudentApi({ parentId: id, studentId }),
    onMutate: (studentId: number) => {
      setUnlinkingIds(s => { const n = new Set(s); n.add(studentId); return n })
    },
    onSettled: (_d, _e, studentId: number) => {
      setUnlinkingIds(s => { const n = new Set(s); n.delete(studentId); return n })
      qc.invalidateQueries({ queryKey: ['manager-parent-detail', id] })
      qc.invalidateQueries({ queryKey: ['manager-parents'] })
    },
  })

  if (isLoading) {
    return (
      <div className={styles.dLoading}>
        {Array.from({ length: 6 }).map((_, i) => (
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
        <p>Failed to load parent details.</p>
        <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Try again</button>
      </div>
    )
  }

  const linkedIds = new Set((data.children ?? []).map(c => c.id))

  if (isEditing) {
    return (
      <ParentEditForm
        data={data}
        onSuccess={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div className={styles.dContent}>
      {/* Hero */}
      <div className={styles.dHero}>
        <UserAvatar name={data.name} avatarUrl={data.avatar_url} className={styles.dAvatar} />
        <div className={styles.dHeroInfo}>
          <p className={styles.dName}>{data.name}</p>
          <p className={styles.dCode}>{data.email}</p>
          <div className={styles.dPills}>
            <span className={data.is_active ? styles.pillActive : styles.pillInactive}>
              {data.is_active ? 'Active' : 'Inactive'}
            </span>
            <ChildrenCountBadge count={data.children?.length ?? data.children_count} />
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {(data.children?.length ?? data.children_count) === 1 ? 'child' : 'children'}
            </span>
          </div>
          <button type="button" className={styles.dEditBtn} onClick={() => setIsEditing(true)}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Edit parent
          </button>
        </div>
      </div>

      {/* Contact */}
      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>Contact</h3>
        <dl className={styles.dGrid}>
          <DRow label="Email">{data.email}</DRow>
          <DRow label="Phone">{data.phone}</DRow>
          <DRow label="National ID">{data.national_id}</DRow>
        </dl>
      </section>

      {/* Children */}
      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>Children</h3>
        {data.children && data.children.length > 0 ? (
          <ul className={styles.enrolledList}>
            {data.children.map(child => {
              return (
                <li key={child.id} className={styles.enrolledItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <UserAvatar
                      name={child.name}
                      avatarUrl={child.avatar_url}
                      className={styles.avatarInitials}
                      style={{ width: '26px', height: '26px', fontSize: '0.5rem', flexShrink: 0 }}
                    />
                    <div className={styles.nameStack} style={{ minWidth: 0 }}>
                      <span className={styles.enrolledCourseName}>{child.name}</span>
                      <span className={styles.enrolledDate}>{child.email}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Unlink ${child.name}`}
                    disabled={unlinkingIds.has(child.id)}
                    onClick={() => unlinkMut.mutate(child.id)}
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
                      opacity: unlinkingIds.has(child.id) ? 0.5 : 1,
                      transition: 'opacity var(--dur-fast) var(--ease-out-quart)',
                      fontFamily: 'inherit',
                    }}
                  >
                    {unlinkingIds.has(child.id) ? '…' : 'Unlink'}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className={styles.dPlaceholder}>No children linked yet.</p>
        )}

        <div style={{ marginTop: '12px' }}>
          <p style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            Link student
          </p>
          <LinkStudentInline parentId={id} linkedIds={linkedIds} />
        </div>
      </section>
    </div>
  )
}

// ─── ParentsPage ──────────────────────────────────────────────────────────────

export default function ParentsPage() {
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [addOpen, setAddOpen]     = useState(false)
  const [addKey, setAddKey]       = useState(0)
  const [detailId, setDetailId]   = useState<number | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setDebSearch(search); setPage(1) }, 320)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  const parentsQ = useQuery({
    queryKey: ['manager-parents', page, debSearch],
    queryFn: () => fetchParents({ page, search: debSearch }),
    placeholderData: prev => prev,
  })

  const parents = parentsQ.data?.data ?? []
  const pagination = parentsQ.data

  const openAdd = () => { setAddKey(k => k + 1); setAddOpen(true) }
  const hasFilters = !!search

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
          <h1 className={styles.pageTitle}>Parents</h1>
          {pagination && (
            <p className={styles.pageCount}>{pagination.total.toLocaleString()} total</p>
          )}
        </div>
        <div className={styles.pageActions}>
          <button type="button" className={styles.addBtn} onClick={openAdd}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            Add parent
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
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {parentsQ.isError ? (
          <div className={styles.stateBox}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={styles.stateIcon}>
              <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M16 10v7M16 21v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            <p className={styles.stateMsg}>Failed to load parents.</p>
            <button type="button" className={styles.retryBtn} onClick={() => parentsQ.refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Parent</th>
                <th className={`${styles.th} ${styles.hideOnMobile}`}>Phone</th>
                <th className={styles.th}>Children</th>
                <th className={`${styles.th} ${styles.thCenter}`}>Active</th>
              </tr>
            </thead>
            <tbody>
              {parentsQ.isLoading ? (
                <SkeletonRows />
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.emptyTd}>
                    <div className={styles.stateBox}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className={styles.stateIcon}>
                        <path d="M24 33v-3a6 6 0 0 0-6-6H8a6 6 0 0 0-6 6v3"/>
                        <circle cx="13" cy="11" r="5" stroke="currentColor" strokeWidth="1.75"/>
                        <path d="M34 33v-3a6 6 0 0 0-4.5-5.8M24 4.2a6 6 0 0 1 0 11.6"
                          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                      </svg>
                      <p className={styles.stateMsg}>
                        {hasFilters ? 'No parents match your search.' : 'No parents yet.'}
                      </p>
                      {hasFilters ? (
                        <button type="button" className={styles.stateCta} onClick={() => setSearch('')}>
                          Clear search
                        </button>
                      ) : (
                        <button type="button" className={styles.stateCta} onClick={openAdd}>
                          Add first parent
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                parents.map(p => {
                  return (
                    <tr key={p.id} className={styles.row} onClick={() => setDetailId(p.id)}>
                      <td className={styles.td}>
                        <div className={styles.cellName}>
                          <UserAvatar name={p.name} avatarUrl={p.avatar_url} className={styles.avatarInitials} />
                          <div className={styles.nameStack}>
                            <span className={styles.studentName}>{p.name}</span>
                            <span className={styles.studentEmail}>{p.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className={`${styles.td} ${styles.hideOnMobile}`}>
                        {p.phone ?? <span className={styles.dimText}>—</span>}
                      </td>
                      <td className={styles.td}>
                        <ChildrenCountBadge count={p.children_count} />
                      </td>
                      <td className={`${styles.td} ${styles.tdCenter}`} onClick={e => e.stopPropagation()}>
                        <span className={p.is_active ? styles.pillActive : styles.pillInactive}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
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
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              aria-label="Previous page"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M8.5 10.5L4.5 6.5l4-4" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {pageNumbers.map((n, i) =>
              n === '…'
                ? <span key={`e${i}`} className={styles.pageEllipsis}>…</span>
                : (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.pageBtn}${n === page ? ' ' + styles.pageBtnActive : ''}`}
                    onClick={() => setPage(n as number)}
                    aria-current={n === page ? 'page' : undefined}
                  >
                    {n}
                  </button>
                )
            )}
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page === pagination.last_page}
              onClick={() => setPage(p => p + 1)}
              aria-label="Next page"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Add parent slide-over */}
      <SlideOver open={addOpen} onClose={() => setAddOpen(false)} title="Add parent">
        <AddParentForm
          key={addKey}
          onSuccess={() => setAddOpen(false)}
          onCancel={() => setAddOpen(false)}
        />
      </SlideOver>

      {/* Detail slide-over */}
      <SlideOver
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title="Parent profile"
        width={640}
      >
        {detailId !== null && <ParentDetailPanel id={detailId} />}
      </SlideOver>
    </div>
  )
}
