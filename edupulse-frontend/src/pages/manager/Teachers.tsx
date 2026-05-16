import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import styles from './Teachers.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subject { id: number; name: string }
interface GradeLevel { id: number; name: string; level: number }

interface TeacherAssignment {
  id: number
  subject_id: number
  grade_level_id: number
  subject: Subject
  grade_level: GradeLevel
}

interface Teacher {
  id: number
  name: string
  email: string
  phone: string | null
  national_id: string | null
  is_active: boolean
  teacher_assignments: TeacherAssignment[]
}

interface CreatePayload {
  name: string
  email: string
  password: string
  phone: string
  national_id: string
  assignments: Array<{ subject_id: number | ''; grade_level_id: number | '' }>
}

type FieldErrors = Partial<Record<string, string>>

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchTeachers() {
  const { data } = await api.get('/manager/teachers', { params: { per_page: 100 } })
  const raw = data.data
  return (Array.isArray(raw) ? raw : (raw.data ?? [])) as Teacher[]
}

async function fetchTeacherDetail(id: number) {
  const { data } = await api.get(`/manager/teachers/${id}`)
  return data.data as Teacher
}

async function createTeacherApi(payload: CreatePayload) {
  const body = {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone || undefined,
    national_id: payload.national_id || undefined,
    assignments: payload.assignments
      .filter(a => a.subject_id !== '' && a.grade_level_id !== '')
      .map(a => ({ subject_id: Number(a.subject_id), grade_level_id: Number(a.grade_level_id) })),
  }
  const { data } = await api.post('/manager/teachers', body)
  return data
}

async function toggleTeacherStatus(id: number) {
  await api.patch(`/manager/teachers/${id}/toggle-status`)
}

async function addTeacherAssignment(teacherId: number, subjectId: number, gradeLevelId: number) {
  const { data } = await api.post(`/manager/teachers/${teacherId}/assignments`, {
    subject_id: subjectId,
    grade_level_id: gradeLevelId,
  })
  return data
}

async function removeTeacherAssignment(teacherId: number, assignmentId: number) {
  await api.delete(`/manager/teachers/${teacherId}/assignments/${assignmentId}`)
}

async function fetchSubjects() {
  const { data } = await api.get('/manager/subjects', { params: { per_page: 100 } })
  const raw = data.data
  return (Array.isArray(raw) ? raw : (raw.data ?? [])) as Subject[]
}

async function fetchGradeLevels() {
  const { data } = await api.get('/manager/grade-levels', { params: { per_page: 100 } })
  const raw = data.data
  return (Array.isArray(raw) ? raw : (raw.data ?? [])) as GradeLevel[]
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
          <td>
            <div className={styles.cellName}>
              <span className={`${styles.avatarInitials} ${styles.skCircle}`} />
              <div className={styles.nameStack}>
                <Sk width="120px" />
                <Sk width="90px" />
              </div>
            </div>
          </td>
          <td className={styles.hideOnMobile}><Sk width="80px" /></td>
          <td>
            <div className={styles.assignList}>
              <Sk width="72px" /><Sk width="72px" />
            </div>
          </td>
          <td><div style={{ display: 'flex', justifyContent: 'center' }}><Sk width="32px" /></div></td>
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

// ─── AddTeacherForm ───────────────────────────────────────────────────────────

function AddTeacherForm({ subjects, gradeLevels, onSuccess, onCancel }: {
  subjects: Subject[]
  gradeLevels: GradeLevel[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState<CreatePayload>({
    name: '', email: '', password: '', phone: '', national_id: '', assignments: [],
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: createTeacherApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-teachers'] })
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

  const field = (key: keyof Omit<CreatePayload, 'assignments'>, val: string) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
    setServerError(null)
  }

  const addAssignmentRow = () =>
    setForm(f => ({ ...f, assignments: [...f.assignments, { subject_id: '', grade_level_id: '' }] }))

  const removeAssignmentRow = (i: number) =>
    setForm(f => ({ ...f, assignments: f.assignments.filter((_, idx) => idx !== i) }))

  const setAssignment = (i: number, key: 'subject_id' | 'grade_level_id', val: number | '') => {
    setForm(f => ({
      ...f,
      assignments: f.assignments.map((a, idx) => idx === i ? { ...a, [key]: val } : a),
    }))
    setErrors(e => ({ ...e, [`assignments.${i}.${key}`]: undefined }))
  }

  const validate = (): boolean => {
    const e: FieldErrors = {}
    if (!form.name.trim())   e.name = 'Name is required'
    if (!form.email.trim())  e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password)      e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters'
    form.assignments.forEach((a, i) => {
      if (a.subject_id === '')    e[`assignments.${i}.subject_id`] = 'Select a subject'
      if (a.grade_level_id === '') e[`assignments.${i}.grade_level_id`] = 'Select a grade'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate(form)
  }

  const inp = (key: string) => `${styles.formInput}${errors[key] ? ' ' + styles.inputError : ''}`
  const sel = (key: string) => `${styles.formSelect}${errors[key] ? ' ' + styles.inputError : ''}`

  return (
    <form className={styles.addForm} onSubmit={handleSubmit} noValidate>
      {serverError && <div className={styles.formBanner} role="alert">{serverError}</div>}

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>{t('manager.teachers.account')}</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="ft-name">{t('manager.teachers.fullName')} <span aria-hidden>*</span></label>
          <input id="ft-name" type="text" className={inp('name')} value={form.name}
            onChange={e => field('name', e.target.value)} autoComplete="name" />
          {errors.name && <p className={styles.fieldErr}>{errors.name}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="ft-email">{t('manager.teachers.email')} <span aria-hidden>*</span></label>
          <input id="ft-email" type="email" className={inp('email')} value={form.email}
            onChange={e => field('email', e.target.value)} autoComplete="email" />
          {errors.email && <p className={styles.fieldErr}>{errors.email}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="ft-pw">{t('manager.teachers.password')} <span aria-hidden>*</span></label>
          <input id="ft-pw" type="password" className={inp('password')} value={form.password}
            onChange={e => field('password', e.target.value)} autoComplete="new-password" />
          {errors.password && <p className={styles.fieldErr}>{errors.password}</p>}
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="ft-phone">{t('manager.teachers.phone')}</label>
            <input id="ft-phone" type="tel" className={styles.formInput} value={form.phone}
              onChange={e => field('phone', e.target.value)} autoComplete="tel" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="ft-nid">{t('manager.teachers.nationalId')}</label>
            <input id="ft-nid" type="text" className={styles.formInput} value={form.national_id}
              onChange={e => field('national_id', e.target.value)} />
          </div>
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionHeadRow}>
          <p className={styles.formSectionHeading}>{t('manager.teachers.assignmentsSection')}</p>
          <button type="button" className={styles.addAssignBtn} onClick={addAssignmentRow}>
            {t('manager.teachers.addAssignment')}
          </button>
        </div>
        {form.assignments.length === 0 ? (
          <p className={styles.assignEmptyHint}>{t('manager.teachers.noAssignmentsYet')}</p>
        ) : (
          <div className={styles.assignRows}>
            {form.assignments.map((a, i) => (
              <div key={i} className={styles.assignRow}>
                <select
                  className={sel(`assignments.${i}.subject_id`)}
                  value={a.subject_id}
                  onChange={e => setAssignment(i, 'subject_id', e.target.value ? Number(e.target.value) : '')}
                  aria-label="Subject"
                >
                  <option value="">{t('manager.teachers.subjectPlaceholder')}</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select
                  className={sel(`assignments.${i}.grade_level_id`)}
                  value={a.grade_level_id}
                  onChange={e => setAssignment(i, 'grade_level_id', e.target.value ? Number(e.target.value) : '')}
                  aria-label="Grade level"
                >
                  <option value="">{t('manager.teachers.gradePlaceholder')}</option>
                  {gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button
                  type="button"
                  className={styles.removeAssignBtn}
                  onClick={() => removeAssignmentRow(i)}
                  aria-label="Remove assignment"
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {(errors[`assignments.${i}.subject_id`] || errors[`assignments.${i}.grade_level_id`]) && (
                  <p className={`${styles.fieldErr} ${styles.assignRowErr}`}>
                    {errors[`assignments.${i}.subject_id`] ?? errors[`assignments.${i}.grade_level_id`]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.formFooter}>
        <button type="button" className={styles.formCancel} onClick={onCancel}>{t('manager.teachers.cancel')}</button>
        <button type="submit" className={styles.formSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? t('manager.teachers.adding') : t('manager.teachers.addTeacherSubmit')}
        </button>
      </div>
    </form>
  )
}

// ─── TeacherDetailPanel ───────────────────────────────────────────────────────

function DRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.dRow}>
      <dt className={styles.dLabel}>{label}</dt>
      <dd className={styles.dValue}>{children ?? <span className={styles.dimText}>—</span>}</dd>
    </div>
  )
}

function TeacherDetailPanel({ id, subjects, gradeLevels }: {
  id: number
  subjects: Subject[]
  gradeLevels: GradeLevel[]
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [addingAssign, setAddingAssign]   = useState(false)
  const [newSubjectId, setNewSubjectId]   = useState<number | ''>('')
  const [newGradeId, setNewGradeId]       = useState<number | ''>('')
  const [addError, setAddError]           = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['manager-teacher-detail', id],
    queryFn: () => fetchTeacherDetail(id),
  })

  const addMutation = useMutation({
    mutationFn: ({ subjectId, gradeLevelId }: { subjectId: number; gradeLevelId: number }) =>
      addTeacherAssignment(id, subjectId, gradeLevelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-teacher-detail', id] })
      qc.invalidateQueries({ queryKey: ['manager-teachers'] })
      setAddingAssign(false)
      setNewSubjectId('')
      setNewGradeId('')
      setAddError(null)
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      setAddError(e.response?.data?.message ?? 'Failed to add assignment.')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (assignmentId: number) => removeTeacherAssignment(id, assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-teacher-detail', id] })
      qc.invalidateQueries({ queryKey: ['manager-teachers'] })
      setConfirmRemoveId(null)
    },
  })

  const submitAdd = () => {
    if (newSubjectId === '' || newGradeId === '') {
      setAddError('Select both a subject and grade level.')
      return
    }
    setAddError(null)
    addMutation.mutate({ subjectId: Number(newSubjectId), gradeLevelId: Number(newGradeId) })
  }

  const cancelAdd = () => {
    setAddingAssign(false)
    setNewSubjectId('')
    setNewGradeId('')
    setAddError(null)
  }

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
        <p>{t('manager.teachers.failedToLoadDetails')}</p>
        <button type="button" className={styles.retryBtn} onClick={() => refetch()}>{t('manager.teachers.tryAgain')}</button>
      </div>
    )
  }

  const initials = data.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()

  return (
    <div className={styles.dContent}>
      <div className={styles.dHero}>
        <div className={styles.dAvatar}>{initials}</div>
        <div className={styles.dHeroInfo}>
          <p className={styles.dName}>{data.name}</p>
          <p className={styles.dSubName}>{data.email}</p>
          <div className={styles.dPills}>
            <span className={data.is_active ? styles.pillActive : styles.pillInactive}>
              {data.is_active ? t('manager.teachers.statusActive') : t('manager.teachers.statusInactive')}
            </span>
          </div>
        </div>
      </div>

      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>{t('manager.teachers.contact')}</h3>
        <dl className={styles.dGrid}>
          <DRow label={t('manager.teachers.phone')}>{data.phone}</DRow>
          <DRow label={t('manager.teachers.nationalId')}>{data.national_id}</DRow>
        </dl>
      </section>

      <section className={styles.dSection}>
        <div className={styles.dSectionHead}>
          <h3 className={styles.dSectionTitle}>{t('manager.teachers.assignmentsSection')}</h3>
          {!addingAssign && (
            <button type="button" className={styles.dAddBtn} onClick={() => setAddingAssign(true)}>
              {t('manager.teachers.addAssignment')}
            </button>
          )}
        </div>

        {data.teacher_assignments.length === 0 && !addingAssign && (
          <p className={styles.dPlaceholder}>{t('manager.teachers.noAssignmentsHint')}</p>
        )}

        {data.teacher_assignments.length > 0 && (
          <ul className={styles.assignDetailList}>
            {data.teacher_assignments.map(a => (
              <li key={a.id} className={styles.assignDetailItem}>
                {confirmRemoveId === a.id ? (
                  <div className={styles.assignConfirm}>
                    <span className={styles.assignConfirmText}>{t('manager.teachers.removeAssignment')}</span>
                    <button
                      type="button"
                      className={styles.assignConfirmYes}
                      onClick={() => removeMutation.mutate(a.id)}
                      disabled={removeMutation.isPending}
                    >
                      {removeMutation.isPending ? '…' : t('manager.teachers.remove')}
                    </button>
                    <button type="button" className={styles.assignConfirmNo}
                      onClick={() => setConfirmRemoveId(null)}>
                      {t('manager.teachers.cancel')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={styles.assignDetailBadges}>
                      <span className={styles.assignSubjectFull}>{a.subject.name}</span>
                      <span className={styles.assignGradeFull}>{a.grade_level.name}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.assignRemoveBtn}
                      onClick={() => setConfirmRemoveId(a.id)}
                      aria-label={`Remove ${a.subject.name} ${a.grade_level.name} assignment`}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {addingAssign && (
          <div className={styles.assignAddBlock}>
            <div className={styles.assignAddSelects}>
              <select
                className={styles.formSelect}
                value={newSubjectId}
                onChange={e => { setNewSubjectId(e.target.value ? Number(e.target.value) : ''); setAddError(null) }}
                aria-label="Subject"
              >
                <option value="">{t('manager.teachers.subjectPlaceholder')}</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select
                className={styles.formSelect}
                value={newGradeId}
                onChange={e => { setNewGradeId(e.target.value ? Number(e.target.value) : ''); setAddError(null) }}
                aria-label="Grade level"
              >
                <option value="">{t('manager.teachers.gradePlaceholder')}</option>
                {gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            {addError && <p className={styles.fieldErr}>{addError}</p>}
            <div className={styles.assignAddActions}>
              <button type="button" className={styles.formSubmit} onClick={submitAdd}
                disabled={addMutation.isPending}>
                {addMutation.isPending ? t('manager.teachers.adding') : t('manager.teachers.add')}
              </button>
              <button type="button" className={styles.formCancel} onClick={cancelAdd}>
                {t('manager.teachers.cancel')}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── TeachersPage ─────────────────────────────────────────────────────────────

export default function TeachersPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [search, setSearch]           = useState('')
  const [debSearch, setDebSearch]     = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [addOpen, setAddOpen]         = useState(false)
  const [addKey, setAddKey]           = useState(0)
  const [detailId, setDetailId]       = useState<number | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebSearch(search), 320)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  const teachersQ = useQuery({
    queryKey: ['manager-teachers'],
    queryFn: fetchTeachers,
    staleTime: 2 * 60 * 1000,
  })

  const subjectsQ = useQuery({
    queryKey: ['manager-subjects'],
    queryFn: fetchSubjects,
    staleTime: 30 * 60 * 1000,
  })

  const gradesQ = useQuery({
    queryKey: ['manager-grade-levels'],
    queryFn: fetchGradeLevels,
    staleTime: 30 * 60 * 1000,
  })

  const toggleMut = useMutation({
    mutationFn: toggleTeacherStatus,
    onMutate: (id: number) => setTogglingIds(s => { const n = new Set(s); n.add(id); return n }),
    onSettled: (_d, _e, id: number) => {
      setTogglingIds(s => { const n = new Set(s); n.delete(id); return n })
      qc.invalidateQueries({ queryKey: ['manager-teachers'] })
      qc.invalidateQueries({ queryKey: ['manager-teacher-detail', id] })
    },
  })

  const allTeachers = teachersQ.data ?? []

  const filtered = useMemo(() => {
    let result = allTeachers
    if (debSearch) {
      const q = debSearch.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
      )
    }
    if (subjectFilter) {
      result = result.filter(t =>
        t.teacher_assignments.some(a => String(a.subject_id) === subjectFilter)
      )
    }
    if (gradeFilter) {
      result = result.filter(t =>
        t.teacher_assignments.some(a => String(a.grade_level_id) === gradeFilter)
      )
    }
    return result
  }, [allTeachers, debSearch, subjectFilter, gradeFilter])

  const hasFilters = !!(search || subjectFilter || gradeFilter)
  const openAdd = () => { setAddKey(k => k + 1); setAddOpen(true) }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{t('manager.teachers.title')}</h1>
          {!teachersQ.isLoading && (
            <p className={styles.pageCount}>{allTeachers.length.toLocaleString()} {t('manager.teachers.total')}</p>
          )}
        </div>
        <button type="button" className={styles.addBtn} onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
          {t('manager.teachers.addTeacher')}
        </button>
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
            placeholder={t('manager.teachers.searchPlaceholder')}
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
          <select className={styles.filterSelect} value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}>
            <option value="">{t('manager.teachers.allSubjects')}</option>
            {subjectsQ.data?.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
          <select className={styles.filterSelect} value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}>
            <option value="">{t('manager.teachers.allGrades')}</option>
            {gradesQ.data?.map(g => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {teachersQ.isError ? (
          <div className={styles.stateBox}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={styles.stateIcon}>
              <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M16 10v7M16 21v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            <p className={styles.stateMsg}>{t('manager.teachers.failedToLoad')}</p>
            <button type="button" className={styles.retryBtn} onClick={() => teachersQ.refetch()}>
              {t('manager.teachers.tryAgain')}
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>{t('manager.teachers.teacherHeader')}</th>
                <th className={`${styles.th} ${styles.hideOnMobile}`}>{t('manager.teachers.phone')}</th>
                <th className={styles.th}>{t('manager.teachers.assignments')}</th>
                <th className={`${styles.th} ${styles.thCenter}`}>{t('manager.teachers.active')}</th>
              </tr>
            </thead>
            <tbody>
              {teachersQ.isLoading ? (
                <SkeletonRows />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.emptyTd}>
                    <div className={styles.stateBox}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className={styles.stateIcon}>
                        <circle cx="18" cy="12" r="6" stroke="currentColor" strokeWidth="1.75"/>
                        <path d="M6 32c0-6.627 5.373-12 12-12s12 5.373 12 12"
                          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                      </svg>
                      <p className={styles.stateMsg}>
                        {hasFilters ? t('manager.teachers.noTeachersMatch') : t('manager.teachers.noTeachersYet')}
                      </p>
                      {hasFilters ? (
                        <button type="button" className={styles.stateCta}
                          onClick={() => { setSearch(''); setSubjectFilter(''); setGradeFilter('') }}>
                          {t('manager.teachers.clearFilters')}
                        </button>
                      ) : (
                        <button type="button" className={styles.stateCta} onClick={openAdd}>
                          {t('manager.teachers.addFirstTeacher')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const initials = t.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
                  const shown = t.teacher_assignments.slice(0, 3)
                  const extra = t.teacher_assignments.length - shown.length
                  return (
                    <tr key={t.id} className={styles.row} onClick={() => setDetailId(t.id)}>
                      <td className={styles.td}>
                        <div className={styles.cellName}>
                          <div className={styles.avatarInitials}>{initials}</div>
                          <div className={styles.nameStack}>
                            <span className={styles.teacherName}>{t.name}</span>
                            <span className={styles.teacherEmail}>{t.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className={`${styles.td} ${styles.hideOnMobile}`}>
                        {t.phone ?? <span className={styles.dimText}>—</span>}
                      </td>
                      <td className={styles.td}>
                        <div className={styles.assignList}>
                          {t.teacher_assignments.length === 0 ? (
                            <span className={styles.dimText}>—</span>
                          ) : (
                            <>
                              {shown.map(a => (
                                <span key={a.id} className={styles.assignBadge}>
                                  <span className={styles.assignSubject}>{a.subject.name}</span>
                                  <span className={styles.assignSep}>·</span>
                                  <span className={styles.assignGrade}>G{a.grade_level.level}</span>
                                </span>
                              ))}
                              {extra > 0 && (
                                <span className={styles.assignMore}>+{extra}</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className={`${styles.td} ${styles.tdCenter}`} onClick={e => e.stopPropagation()}>
                        <Toggle
                          checked={t.is_active}
                          disabled={togglingIds.has(t.id)}
                          onChange={() => toggleMut.mutate(t.id)}
                          label={`Toggle ${t.name} active`}
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

      {/* Add teacher slide-over */}
      <SlideOver open={addOpen} onClose={() => setAddOpen(false)} title={t('manager.teachers.addTeacherTitle')}>
        <AddTeacherForm
          key={addKey}
          subjects={subjectsQ.data ?? []}
          gradeLevels={gradesQ.data ?? []}
          onSuccess={() => setAddOpen(false)}
          onCancel={() => setAddOpen(false)}
        />
      </SlideOver>

      {/* Detail slide-over */}
      <SlideOver
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title={t('manager.teachers.teacherProfileTitle')}
        width={520}
      >
        {detailId !== null && (
          <TeacherDetailPanel
            id={detailId}
            subjects={subjectsQ.data ?? []}
            gradeLevels={gradesQ.data ?? []}
          />
        )}
      </SlideOver>
    </div>
  )
}
