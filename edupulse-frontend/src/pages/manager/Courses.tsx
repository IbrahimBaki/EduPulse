import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './Courses.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subject    { id: number; name: string }
interface GradeLevel { id: number; name: string; level: number }
interface TeacherMin { id: number; name: string }

interface TeacherFull extends TeacherMin {
  teacher_assignments: Array<{ subject_id: number; grade_level_id: number }>
}

type CourseStatus = 'draft' | 'active' | 'archived'

interface Course {
  id: number
  name: string
  description: string | null
  status: CourseStatus
  start_date: string | null
  end_date: string | null
  max_students: number | null
  subject_id: number
  grade_level_id: number
  teacher_id: number
  subject: Subject
  grade_level: GradeLevel
  teacher: TeacherMin
  created_at: string
  updated_at: string
}

interface CourseDetail extends Course {
  lessons_count?: number
  enrollments_count?: number
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

interface CourseFormValues {
  name: string
  description: string
  subject_id: number | ''
  grade_level_id: number | ''
  teacher_id: number | ''
  start_date: string
  end_date: string
  max_students: string
}

type FieldErrors = Partial<Record<string, string>>

// ─── Subject color palette ────────────────────────────────────────────────────

const SUBJECT_HUES = [250, 145, 68, 308, 22, 195, 328, 170]

function subjectAccent(subjectId: number) {
  const hue = SUBJECT_HUES[subjectId % SUBJECT_HUES.length]
  return `oklch(64% 0.22 ${hue})`
}

function subjectAccentDim(subjectId: number) {
  const hue = SUBJECT_HUES[subjectId % SUBJECT_HUES.length]
  return `oklch(64% 0.22 ${hue} / 0.13)`
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchCourses(p: {
  page: number; status: string; grade_level_id: string; subject_id: string; teacher_id: string
}) {
  const params: Record<string, string | number> = { page: p.page, per_page: 15 }
  if (p.status)          params.status          = p.status
  if (p.grade_level_id)  params.grade_level_id  = p.grade_level_id
  if (p.subject_id)      params.subject_id      = p.subject_id
  if (p.teacher_id)      params.teacher_id      = p.teacher_id
  const { data } = await api.get('/manager/courses', { params })
  return data.data as Paginated<Course>
}

async function fetchCourseDetail(id: number) {
  const { data } = await api.get(`/manager/courses/${id}`)
  return data.data as CourseDetail
}

async function createCourseApi(payload: object) {
  const { data } = await api.post('/manager/courses', payload)
  return data.data as Course
}

async function updateCourseApi(id: number, payload: object) {
  const { data } = await api.put(`/manager/courses/${id}`, payload)
  return data.data as Course
}

async function updateCourseStatus(id: number, status: CourseStatus) {
  await api.patch(`/manager/courses/${id}/status`, { status })
}

async function deleteCourseApi(id: number) {
  await api.delete(`/manager/courses/${id}`)
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

async function fetchTeachersAll() {
  const { data } = await api.get('/manager/teachers', { params: { per_page: 100 } })
  const raw = data.data
  return (Array.isArray(raw) ? raw : (raw.data ?? [])) as TeacherFull[]
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CourseStatus }) {
  const cls = { draft: styles.statusDraft, active: styles.statusActive, archived: styles.statusArchived }
  return <span className={`${styles.statusBadge} ${cls[status]}`}>{status}</span>
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ width, height, circle }: { width?: string; height?: string; circle?: boolean }) {
  return (
    <span
      className={styles.skeleton}
      style={{
        width: width ?? '100%',
        height: height ?? '11px',
        borderRadius: circle ? '50%' : '4px',
      }}
    />
  )
}

function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.skCard}>
          <div className={styles.skBand} />
          <div className={styles.skBody}>
            <Sk width="70%" height="15px" />
            <Sk width="90%" height="10px" />
            <div className={styles.skRow}>
              <Sk width="22px" height="22px" circle />
              <Sk width="100px" />
            </div>
            <div className={styles.skRow}>
              <Sk width="56px" height="18px" />
              <Sk width="48px" height="18px" />
            </div>
          </div>
        </div>
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
    return () => { clearTimeout(t); document.body.style.overflow = '' }
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
      <div className={styles.panel} style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>{title}</h2>
          <button ref={closeRef} type="button" className={styles.panelClose} onClick={onClose} aria-label="Close">
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

// ─── CourseForm ───────────────────────────────────────────────────────────────

function CourseForm({ course, subjects, gradeLevels, teachers, onSuccess, onCancel }: {
  course?: Course
  subjects: Subject[]
  gradeLevels: GradeLevel[]
  teachers: TeacherFull[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!course

  const [form, setForm] = useState<CourseFormValues>({
    name:          course?.name          ?? '',
    description:   course?.description   ?? '',
    subject_id:    course?.subject_id    ?? '',
    grade_level_id: course?.grade_level_id ?? '',
    teacher_id:    course?.teacher_id    ?? '',
    start_date:    course?.start_date    ?? '',
    end_date:      course?.end_date      ?? '',
    max_students:  course?.max_students?.toString() ?? '',
  })
  const [errors, setErrors]           = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const eligibleTeachers = useMemo(() => {
    if (isEdit || !form.subject_id || !form.grade_level_id) return teachers
    const filtered = teachers.filter(t =>
      (t.teacher_assignments ?? []).some(a =>
        a.subject_id === Number(form.subject_id) &&
        a.grade_level_id === Number(form.grade_level_id)
      )
    )
    return filtered.length > 0 ? filtered : teachers
  }, [teachers, form.subject_id, form.grade_level_id, isEdit])

  const teacherFiltered = !isEdit && !!form.subject_id && !!form.grade_level_id &&
    eligibleTeachers.length < teachers.length

  const mutation = useMutation({
    mutationFn: async (values: CourseFormValues) => {
      const payload = {
        name: values.name,
        ...(values.description && { description: values.description }),
        subject_id:     Number(values.subject_id),
        grade_level_id: Number(values.grade_level_id),
        teacher_id:     Number(values.teacher_id),
        ...(values.start_date   && { start_date:   values.start_date }),
        ...(values.end_date     && { end_date:     values.end_date }),
        ...(values.max_students && { max_students: parseInt(values.max_students) }),
      }
      return isEdit && course
        ? updateCourseApi(course.id, payload)
        : createCourseApi(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-courses'] })
      if (isEdit && course) qc.invalidateQueries({ queryKey: ['manager-course-detail', course.id] })
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

  const field = (key: keyof CourseFormValues, val: string | number) => {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      if (!isEdit && (key === 'subject_id' || key === 'grade_level_id')) next.teacher_id = ''
      return next
    })
    setErrors(e => ({ ...e, [key]: undefined }))
    setServerError(null)
  }

  const validate = (): boolean => {
    const e: FieldErrors = {}
    if (!form.name.trim())      e.name = 'Course name is required'
    if (!form.subject_id)       e.subject_id = 'Select a subject'
    if (!form.grade_level_id)   e.grade_level_id = 'Select a grade level'
    if (!form.teacher_id)       e.teacher_id = 'Select a teacher'
    if (form.max_students && isNaN(parseInt(form.max_students))) e.max_students = 'Must be a number'
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
        <p className={styles.formSectionHeading}>Identity</p>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="cf-name">Course name <span aria-hidden>*</span></label>
          <input id="cf-name" type="text" className={inp('name')} value={form.name}
            onChange={e => field('name', e.target.value)} />
          {errors.name && <p className={styles.fieldErr}>{errors.name}</p>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="cf-desc">Description</label>
          <textarea id="cf-desc" rows={3} className={styles.formTextarea} value={form.description}
            onChange={e => field('description', e.target.value)} />
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Assignment</p>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="cf-subj">Subject <span aria-hidden>*</span></label>
            <select id="cf-subj" className={sel('subject_id')} value={form.subject_id}
              onChange={e => field('subject_id', e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.subject_id && <p className={styles.fieldErr}>{errors.subject_id}</p>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="cf-grade">Grade level <span aria-hidden>*</span></label>
            <select id="cf-grade" className={sel('grade_level_id')} value={form.grade_level_id}
              onChange={e => field('grade_level_id', e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select grade</option>
              {gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {errors.grade_level_id && <p className={styles.fieldErr}>{errors.grade_level_id}</p>}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="cf-teacher">
            Teacher <span aria-hidden>*</span>
          </label>
          <select id="cf-teacher" className={sel('teacher_id')} value={form.teacher_id}
            onChange={e => field('teacher_id', e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select teacher</option>
            {eligibleTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {teacherFiltered && (
            <p className={styles.formHint}>Showing teachers qualified for this subject and grade.</p>
          )}
          {errors.teacher_id && <p className={styles.fieldErr}>{errors.teacher_id}</p>}
        </div>
      </div>

      <div className={styles.formSection}>
        <p className={styles.formSectionHeading}>Schedule</p>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="cf-start">Start date</label>
            <input id="cf-start" type="date" className={styles.formInput} value={form.start_date}
              onChange={e => field('start_date', e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="cf-end">End date</label>
            <input id="cf-end" type="date" className={styles.formInput} value={form.end_date}
              onChange={e => field('end_date', e.target.value)} />
          </div>
        </div>
        <div className={styles.formGroup} style={{ maxWidth: '160px' }}>
          <label className={styles.formLabel} htmlFor="cf-max">Max students</label>
          <input id="cf-max" type="number" min="1" className={inp('max_students')} value={form.max_students}
            onChange={e => field('max_students', e.target.value)} placeholder="Unlimited" />
          {errors.max_students && <p className={styles.fieldErr}>{errors.max_students}</p>}
        </div>
      </div>

      <div className={styles.formFooter}>
        <button type="button" className={styles.formCancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.formSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save changes' : 'Create course')}
        </button>
      </div>
    </form>
  )
}

// ─── CourseDetailPanel ────────────────────────────────────────────────────────

function DRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.dRow}>
      <dt className={styles.dLabel}>{label}</dt>
      <dd className={styles.dValue}>{children ?? <span className={styles.dimText}>—</span>}</dd>
    </div>
  )
}

function CourseDetailPanel({ id, onEdit, onDeleted }: {
  id: number
  onEdit: (course: Course) => void
  onDeleted: () => void
}) {
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError]     = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['manager-course-detail', id],
    queryFn: () => fetchCourseDetail(id),
  })

  const statusMutation = useMutation({
    mutationFn: (status: CourseStatus) => updateCourseStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-courses'] })
      qc.invalidateQueries({ queryKey: ['manager-course-detail', id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCourseApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-courses'] })
      onDeleted()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      setDeleteError(e.response?.data?.message ?? 'Cannot delete this course.')
      setConfirmDelete(false)
    },
  })

  if (isLoading) {
    return (
      <div className={styles.dLoading}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.dSkRow}>
            <Sk width="72px" /><Sk width="140px" />
          </div>
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className={styles.dError}>
        <p>Failed to load course details.</p>
        <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Try again</button>
      </div>
    )
  }

  const accent  = subjectAccent(data.subject_id)
  const accentDim = subjectAccentDim(data.subject_id)
  const startFmt = fmtDate(data.start_date)
  const endFmt   = fmtDate(data.end_date)

  const canActivate = data.status === 'draft'
  const canArchive  = data.status === 'active'
  const canDelete   = data.status === 'draft'

  return (
    <div className={styles.dContent}>
      {/* Header band */}
      <div className={styles.dBand} style={{ background: accent }} />

      <div className={styles.dHero}>
        <div>
          <p className={styles.dName}>{data.name}</p>
          <div className={styles.dPills}>
            <StatusBadge status={data.status} />
            <span className={styles.dSubjectChip} style={{ background: accentDim, color: accent }}>
              {data.subject.name}
            </span>
          </div>
        </div>
      </div>

      {/* Status actions */}
      {(canActivate || canArchive) && (
        <div className={styles.dStatusRow}>
          {canActivate && (
            <button
              type="button"
              className={styles.dActivateBtn}
              onClick={() => statusMutation.mutate('active')}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? 'Activating…' : 'Activate course'}
            </button>
          )}
          {canArchive && (
            <button
              type="button"
              className={styles.dArchiveBtn}
              onClick={() => statusMutation.mutate('archived')}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? 'Archiving…' : 'Archive course'}
            </button>
          )}
          {statusMutation.isError && (
            <p className={styles.fieldErr}>Failed to update status.</p>
          )}
        </div>
      )}

      <section className={styles.dSection}>
        <h3 className={styles.dSectionTitle}>Course info</h3>
        <dl className={styles.dGrid}>
          <DRow label="Grade">{data.grade_level.name}</DRow>
          <DRow label="Teacher">{data.teacher.name}</DRow>
          {data.description && <DRow label="Description">{data.description}</DRow>}
          {startFmt && endFmt && (
            <DRow label="Dates">{startFmt} – {endFmt}</DRow>
          )}
          {data.max_students && (
            <DRow label="Capacity">{data.max_students} students max</DRow>
          )}
        </dl>
      </section>

      {(data.enrollments_count !== undefined || data.lessons_count !== undefined) && (
        <section className={styles.dSection}>
          <h3 className={styles.dSectionTitle}>Activity</h3>
          <dl className={styles.dGrid}>
            {data.enrollments_count !== undefined && (
              <DRow label="Enrolled">{data.enrollments_count} students</DRow>
            )}
            {data.lessons_count !== undefined && (
              <DRow label="Lessons">{data.lessons_count}</DRow>
            )}
          </dl>
        </section>
      )}

      <div className={styles.dFooter}>
        <button type="button" className={styles.dEditBtn} onClick={() => onEdit(data)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L10 4.5L4 10.5H1.5V8L7.5 2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
          </svg>
          Edit course
        </button>

        {canDelete && !confirmDelete && (
          <button type="button" className={styles.dDeleteBtn}
            onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        )}

        {confirmDelete && (
          <div className={styles.dDeleteConfirm}>
            <span className={styles.dDeleteConfirmText}>Delete this draft permanently?</span>
            <button type="button" className={styles.dDeleteConfirmYes}
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? '…' : 'Delete'}
            </button>
            <button type="button" className={styles.dDeleteConfirmNo}
              onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        )}

        {deleteError && <p className={styles.fieldErr}>{deleteError}</p>}
      </div>
    </div>
  )
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: Course
  isUpdating: boolean
  onCardClick: (id: number) => void
  onEdit: (course: Course) => void
  onStatusAction: (id: number, status: CourseStatus) => void
}

function CourseCard({ course, isUpdating, onCardClick, onEdit, onStatusAction }: CourseCardProps) {
  const accent    = subjectAccent(course.subject_id)
  const accentDim = subjectAccentDim(course.subject_id)

  const teacherInitials = course.teacher.name
    .split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()

  const nextStatus: CourseStatus | null =
    course.status === 'draft' ? 'active' :
    course.status === 'active' ? 'archived' : null

  const actionLabel =
    course.status === 'draft' ? 'Activate' :
    course.status === 'active' ? 'Archive' : null

  const start = fmtDate(course.start_date)
  const end   = fmtDate(course.end_date)
  const dates = start && end ? `${start} – ${end}` : start ?? end

  return (
    <article className={styles.card}>
      <div
        className={styles.cardMain}
        role="button"
        tabIndex={0}
        onClick={() => onCardClick(course.id)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(course.id) } }}
        aria-label={`View ${course.name} details`}
      >
        <div className={styles.cardBand} style={{ background: accent }} />
        <div className={styles.cardBody}>
          <p className={styles.cardName}>{course.name}</p>
          {course.description && (
            <p className={styles.cardDesc}>{course.description}</p>
          )}

          <div className={styles.cardTeacher}>
            <span
              className={styles.cardTeacherAvatar}
              style={{ background: accentDim, color: accent }}
            >
              {teacherInitials}
            </span>
            <span className={styles.cardTeacherName}>{course.teacher.name}</span>
          </div>

          <div className={styles.cardMeta}>
            <span className={styles.cardGrade}>{course.grade_level.name}</span>
            <span className={styles.cardSubject} style={{ color: accent }}>{course.subject.name}</span>
          </div>

          <div className={styles.cardStats}>
            <StatusBadge status={course.status} />
            {dates && <span className={styles.cardDate}>{dates}</span>}
            {course.max_students && (
              <span className={styles.cardCap}>{course.max_students} max</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.cardActions} role="group" aria-label={`Actions for ${course.name}`}>
        {actionLabel && nextStatus && (
          <button
            type="button"
            className={`${styles.cardActionBtn} ${course.status === 'active' ? styles.cardActionArchive : styles.cardActionActivate}`}
            onClick={e => { e.stopPropagation(); onStatusAction(course.id, nextStatus) }}
            disabled={isUpdating}
          >
            {isUpdating ? '…' : actionLabel}
          </button>
        )}
        <button
          type="button"
          className={styles.cardEditBtn}
          onClick={e => { e.stopPropagation(); onEdit(course) }}
          aria-label={`Edit ${course.name}`}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M7 1.5L9.5 4L3.5 10H1V7.5L7 1.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
          </svg>
          Edit
        </button>
      </div>
    </article>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyCourses({ hasFilters, onAdd, onClear }: {
  hasFilters: boolean; onAdd: () => void; onClear: () => void
}) {
  return (
    <div className={styles.emptyState}>
      <svg className={styles.emptyIllo} width="72" height="72" viewBox="0 0 72 72" fill="none">
        <rect x="10" y="18" width="52" height="36" rx="5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="14" y="22" width="44" height="28" rx="3" stroke="currentColor" strokeWidth="1.25" opacity="0.45"/>
        <path d="M36 30v12M30 36h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
      <p className={styles.emptyMsg}>
        {hasFilters ? 'No courses match your filters.' : 'No courses yet.'}
      </p>
      {hasFilters
        ? <button type="button" className={styles.stateCta} onClick={onClear}>Clear filters</button>
        : <button type="button" className={styles.stateCta} onClick={onAdd}>Create first course</button>
      }
    </div>
  )
}

// ─── CoursesPage ──────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const qc = useQueryClient()

  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [debSearch, setDebSearch]     = useState('')
  const [statusFilter, setStatusFilter]     = useState('')
  const [gradeFilter, setGradeFilter]       = useState('')
  const [subjectFilter, setSubjectFilter]   = useState('')
  const [teacherFilter, setTeacherFilter]   = useState('')
  const [detailId, setDetailId]       = useState<number | null>(null)
  const [editCourse, setEditCourse]   = useState<Course | null>(null)
  const [addOpen, setAddOpen]         = useState(false)
  const [addKey, setAddKey]           = useState(0)
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set())

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebSearch(search), 320)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  useEffect(() => { setPage(1) }, [statusFilter, gradeFilter, subjectFilter, teacherFilter])

  const coursesQ = useQuery({
    queryKey: ['manager-courses', page, statusFilter, gradeFilter, subjectFilter, teacherFilter],
    queryFn: () => fetchCourses({
      page, status: statusFilter, grade_level_id: gradeFilter,
      subject_id: subjectFilter, teacher_id: teacherFilter,
    }),
    placeholderData: prev => prev,
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

  const teachersQ = useQuery({
    queryKey: ['manager-teachers-all'],
    queryFn: fetchTeachersAll,
    staleTime: 5 * 60 * 1000,
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: CourseStatus }) => updateCourseStatus(id, status),
    onMutate: ({ id }) => setUpdatingIds(s => { const n = new Set(s); n.add(id); return n }),
    onSettled: (_d, _e, { id }) => {
      setUpdatingIds(s => { const n = new Set(s); n.delete(id); return n })
      qc.invalidateQueries({ queryKey: ['manager-courses'] })
    },
  })

  const allCourses = coursesQ.data?.data ?? []
  const pagination = coursesQ.data

  const courses = useMemo(() => {
    if (!debSearch) return allCourses
    const q = debSearch.toLowerCase()
    return allCourses.filter(c => c.name.toLowerCase().includes(q))
  }, [allCourses, debSearch])

  const hasFilters = !!(search || statusFilter || gradeFilter || subjectFilter || teacherFilter)

  const openAdd  = () => { setAddKey(k => k + 1); setAddOpen(true) }
  const openEdit = (course: Course) => { setEditCourse(course); setDetailId(null) }
  const closeForm = () => { setAddOpen(false); setEditCourse(null) }

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setGradeFilter('')
    setSubjectFilter(''); setTeacherFilter('')
  }

  // Page number ellipsis
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
          <h1 className={styles.pageTitle}>Courses</h1>
          {pagination && (
            <p className={styles.pageCount}>{pagination.total.toLocaleString()} total</p>
          )}
        </div>
        <button type="button" className={styles.addBtn} onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
          Add course
        </button>
      </div>

      {/* Filter bar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            placeholder="Search by name"
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
          <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <select className={styles.filterSelect} value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
            <option value="">All subjects</option>
            {subjectsQ.data?.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
          <select className={styles.filterSelect} value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
            <option value="">All grades</option>
            {gradesQ.data?.map(g => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
          </select>
          <select className={styles.filterSelect} value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)}>
            <option value="">All teachers</option>
            {teachersQ.data?.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {coursesQ.isError ? (
        <div className={styles.stateBox}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={styles.stateIcon}>
            <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.75"/>
            <path d="M16 10v7M16 21v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
          <p className={styles.stateMsg}>Failed to load courses.</p>
          <button type="button" className={styles.retryBtn} onClick={() => coursesQ.refetch()}>Try again</button>
        </div>
      ) : coursesQ.isLoading ? (
        <div className={styles.grid}><SkeletonCards /></div>
      ) : courses.length === 0 ? (
        <EmptyCourses hasFilters={hasFilters} onAdd={openAdd} onClear={clearFilters} />
      ) : (
        <div className={styles.grid}>
          {courses.map(c => (
            <CourseCard
              key={c.id}
              course={c}
              isUpdating={updatingIds.has(c.id)}
              onCardClick={id => setDetailId(id)}
              onEdit={openEdit}
              onStatusAction={(id, status) => statusMut.mutate({ id, status })}
            />
          ))}
        </div>
      )}

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
                <path d="M8.5 10.5L4.5 6.5l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit slide-over */}
      <SlideOver
        open={addOpen || editCourse !== null}
        onClose={closeForm}
        title={editCourse ? 'Edit course' : 'Add course'}
      >
        <CourseForm
          key={editCourse?.id ?? addKey}
          course={editCourse ?? undefined}
          subjects={subjectsQ.data ?? []}
          gradeLevels={gradesQ.data ?? []}
          teachers={teachersQ.data ?? []}
          onSuccess={closeForm}
          onCancel={closeForm}
        />
      </SlideOver>

      {/* Detail slide-over */}
      <SlideOver
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title="Course details"
        width={520}
      >
        {detailId !== null && (
          <CourseDetailPanel
            id={detailId}
            onEdit={openEdit}
            onDeleted={() => setDetailId(null)}
          />
        )}
      </SlideOver>
    </div>
  )
}
