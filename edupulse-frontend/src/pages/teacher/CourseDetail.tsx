import { useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import { SlideOver } from '../../components/SlideOver'
import styles from './CourseDetail.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: number
  name: string
  subject: string | { name?: string; [k: string]: unknown }
  grade_level: string | { name?: string; level?: string | number; [k: string]: unknown }
  status: 'draft' | 'active' | 'archived'
  enrolled_count: number
  lessons_count: number
  published_lessons_count: number
  teacher?: { id: number; name: string }
}

function str(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>
    return String(o.name ?? o.level ?? '')
  }
  return String(val)
}

interface Lesson {
  id: number
  order: number
  title: string
  description?: string
  is_published: boolean
  pdf_processed: boolean
  chunks_count?: number
}

interface Student {
  id: number
  name: string
  code: string
  attendance_rate: number
  avg_quiz_score: number | null
  weak_topics_count: number
  last_activity_at?: string
}

interface CourseSession {
  id: number
  title: string
  starts_at: string
  ends_at: string
  type: 'online' | 'in_person' | 'recorded'
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  jitsi_url?: string
}

type TabKey = 'lessons' | 'students' | 'schedule'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_HUE: Record<string, number> = {
  mathematics: 255, math: 255,
  science: 145, biology: 145,
  arabic: 75,
  english: 300,
  history: 45, geography: 160,
  physics: 205, chemistry: 178,
  art: 340, music: 305,
  computer: 218, programming: 218, ict: 218,
  religion: 28, sports: 130, pe: 130,
}

function hashHue(s: string): number {
  const hues = [255, 145, 75, 300, 45, 205, 178, 340, 305, 28, 130]
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff
  return hues[h % hues.length]
}

function subjectColor(subject: unknown): string {
  const s = str(subject)
  const key = s.toLowerCase().split(/\s+/)[0]
  const hue = SUBJECT_HUE[key] ?? hashHue(s)
  return `oklch(62% 0.22 ${hue})`
}

function statusBadgeClass(status: string): string {
  if (status === 'active') return styles.badgeActive
  if (status === 'archived') return styles.badgeArchived
  return styles.badgeDraft
}

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function generateJitsiUrl(title: string, courseId: string): string {
  const slug = `edupulse-${courseId}-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}`
  return `https://meet.jit.si/${slug}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function scoreClass(score: number | null): string {
  if (score === null) return ''
  if (score >= 70) return styles.scoreGreen
  if (score >= 50) return styles.scoreAmber
  return styles.scoreRed
}

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = (data as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  return []
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  )
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
      <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
    </svg>
  )
}


function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

// ─── Skeleton helpers ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-elevated)', border: '1px solid var(--neutral-border)', borderRadius: 'var(--radius-md)' }}>
      <span className={styles.skeleton} style={{ width: 14, height: 14, borderRadius: 2 }} />
      <span className={styles.skeleton} style={{ width: 24, height: 12 }} />
      <span className={styles.skeleton} style={{ flex: 1, height: 14 }} />
      <span className={styles.skeleton} style={{ width: 56, height: 18 }} />
      <span className={styles.skeleton} style={{ width: 48, height: 28 }} />
      <span className={styles.skeleton} style={{ width: 72, height: 28 }} />
    </li>
  )
}

function SkeletonStudentRow() {
  return (
    <tr>
      <td><span className={styles.skeleton} style={{ display: 'block', height: 32, width: 140 }} /></td>
      <td><span className={styles.skeleton} style={{ display: 'block', height: 14, width: 80 }} /></td>
      <td><span className={styles.skeleton} style={{ display: 'block', height: 14, width: 64 }} /></td>
      <td><span className={styles.skeleton} style={{ display: 'block', height: 14, width: 40 }} /></td>
      <td><span className={styles.skeleton} style={{ display: 'block', height: 14, width: 32 }} /></td>
    </tr>
  )
}

// ─── Header skeleton ───────────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className={styles.courseHeader}>
      <span className={styles.skeleton} style={{ display: 'block', height: 14, width: 80, marginBlockEnd: 16 }} />
      <div className={styles.headerTop}>
        <span className={styles.skeleton} style={{ width: 4, height: 48, borderRadius: 999, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span className={styles.skeleton} style={{ display: 'block', height: 28, width: '40%', marginBlockEnd: 10 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <span className={styles.skeleton} style={{ height: 18, width: 64 }} />
            <span className={styles.skeleton} style={{ height: 18, width: 80 }} />
            <span className={styles.skeleton} style={{ height: 18, width: 56 }} />
          </div>
        </div>
      </div>
      <div className={styles.tabs} style={{ gap: 0 }}>
        {[80, 76, 76].map((w, i) => (
          <span key={i} className={styles.skeleton} style={{ height: 38, width: w, borderRadius: 0, margin: '0 2px' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Lessons tab ──────────────────────────────────────────────────────────────

function LessonsTab({ courseId }: { courseId: string }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })
  const fileInputRef     = useRef<HTMLInputElement>(null)
  const [pendingLessonId, setPendingLessonId] = useState<number | null>(null)
  const [queuedIds, setQueuedIds]             = useState<Set<number>>(new Set())
  const [uploadError, setUploadError]         = useState<string | null>(null)

  const { data: lessons = [], isLoading, isError, refetch } = useQuery<Lesson[]>({
    queryKey: ['teacher-lessons', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}/lessons`).then(r => normalizeArray<Lesson>(r.data.data ?? r.data)),
    staleTime: 2 * 60 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: (body: { title: string; description: string }) =>
      api.post(`/teacher/courses/${courseId}/lessons`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-lessons', courseId] })
      setForm({ title: '', description: '' })
      setShowForm(false)
    },
  })

  const publishMutation = useMutation({
    mutationFn: ({ lessonId, published }: { lessonId: number; published: boolean }) =>
      api.patch(`/teacher/courses/${courseId}/lessons/${lessonId}/publish`, { is_published: !published }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-lessons', courseId] }),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ lessonId, file }: { lessonId: number; file: File }) => {
      const fd = new FormData()
      fd.append('pdf', file)
      // Pass Content-Type as undefined so axios doesn't override the multipart boundary
      return api.post(`/lessons/${lessonId}/upload-pdf`, fd, {
        headers: { 'Content-Type': undefined as unknown as string },
      })
    },
    onSuccess: (_data, vars) => {
      setQueuedIds(prev => new Set(prev).add(vars.lessonId))
      setPendingLessonId(null)
      setUploadError(null)
      qc.invalidateQueries({ queryKey: ['teacher-lessons', courseId] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Upload failed'
      setUploadError(msg)
      setPendingLessonId(null)
    },
  })

  function handleUploadClick(lessonId: number) {
    setUploadError(null)
    setPendingLessonId(lessonId)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || pendingLessonId === null) return
    uploadMutation.mutate({ lessonId: pendingLessonId, file })
    e.target.value = ''
  }

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    addMutation.mutate(form)
  }, [form, addMutation])

if (isLoading) {
    return (
      <ul className={styles.lessonsList} aria-label="Lessons loading">
        {Array.from({ length: 4 }, (_, i) => <SkeletonRow key={i} />)}
      </ul>
    )
  }

  if (isError) {
    return (
      <div className={styles.emptyState}>
        <div style={{ color: 'var(--color-amber)' }}><AlertIcon /></div>
        <p className={styles.emptyTitle}>Failed to load lessons</p>
        <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>Retry</button>
      </div>
    )
  }

  return (
    <>
      {showForm && (
        <form className={styles.addLessonForm} onSubmit={handleSubmit} aria-label="Add lesson form">
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="lesson-title">Title</label>
            <input
              id="lesson-title"
              className={styles.input}
              placeholder="Lesson title..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="lesson-desc">Description (optional)</label>
            <textarea
              id="lesson-desc"
              className={styles.textarea}
              placeholder="Brief description..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className={styles.formFooter}>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={addMutation.isPending || !form.title.trim()}>
              {addMutation.isPending ? 'Saving...' : 'Add Lesson'}
            </button>
          </div>
        </form>
      )}

      {lessons.length === 0 && !showForm ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'oklch(44% 0.018 255)' }}><BookIcon /></div>
          <p className={styles.emptyTitle}>No lessons yet</p>
          <p className={styles.emptyText}>Add the first lesson to get started.</p>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowForm(true)}>
            <PlusIcon /> Add Lesson
          </button>
        </div>
      ) : (
        <>
          <ol className={styles.lessonsList} aria-label="Lessons">
            {lessons.map((lesson, idx) => (
              <li key={lesson.id} className={styles.lessonRow}>
                <span className={styles.dragHandle} aria-hidden="true" title="Drag to reorder">
                  <GripIcon />
                </span>
                <span className={styles.lessonOrder}>{idx + 1}</span>
                <span className={styles.lessonTitle}>{lesson.title}</span>
                <div className={styles.lessonBadges}>
                  <span className={`${styles.badge} ${lesson.is_published ? styles.badgePublished : styles.badgeUnpublished}`}>
                    {lesson.is_published ? 'Published' : 'Draft'}
                  </span>
                  {lesson.pdf_processed && (
                    <span className={`${styles.badge} ${styles.badgePdf}`}>PDF</span>
                  )}
                  {queuedIds.has(lesson.id) && !lesson.pdf_processed && (
                    <span className={`${styles.badge} ${styles.badgeQueued}`}>Processing…</span>
                  )}
                  {lesson.chunks_count != null && lesson.chunks_count > 0 && (
                    <span className={`${styles.badge} ${styles.badgeChunks}`}>{lesson.chunks_count} chunks</span>
                  )}
                </div>
                <div className={styles.lessonActions}>
                  <button
                    type="button"
                    className={`${styles.uploadPdfBtn} ${lesson.pdf_processed ? styles.uploadPdfBtnDone : ''}`}
                    onClick={() => handleUploadClick(lesson.id)}
                    disabled={uploadMutation.isPending && pendingLessonId === lesson.id}
                    aria-label={lesson.pdf_processed ? `Re-upload PDF for ${lesson.title}` : `Upload PDF for ${lesson.title}`}
                    title={lesson.pdf_processed ? 'Re-upload PDF' : 'Upload PDF'}
                  >
                    <UploadIcon />
                  </button>
                  <button
                    type="button"
                    className={`${styles.publishToggle} ${lesson.is_published ? styles.publishToggleOn : styles.publishToggleOff}`}
                    onClick={() => publishMutation.mutate({ lessonId: lesson.id, published: lesson.is_published })}
                    disabled={publishMutation.isPending}
                    aria-label={lesson.is_published ? `Unpublish ${lesson.title}` : `Publish ${lesson.title}`}
                  >
                    {lesson.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {uploadError && (
            <p className={styles.uploadPdfError} role="alert">{uploadError}</p>
          )}
          {!showForm && (
            <div className={styles.btnRow}>
              <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setShowForm(true)}>
                <PlusIcon /> Add Lesson
              </button>
            </div>
          )}
        </>
      )}
      <input
        type="file"
        accept=".pdf,application/pdf"
        className={styles.hiddenInput}
        ref={fileInputRef}
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
    </>
  )
}

// ─── Students tab ──────────────────────────────────────────────────────────────

function StudentsTab({ courseId }: { courseId: string }) {
  const { data: students = [], isLoading, isError, refetch } = useQuery<Student[]>({
    queryKey: ['teacher-course-students', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}/students`).then(r => normalizeArray<Student>(r.data.data ?? r.data)),
    staleTime: 2 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <table className={styles.studentsTable} aria-label="Students loading">
        <thead>
          <tr>
            <th>Student</th><th>Attendance</th><th>Avg Score</th><th>Weak Topics</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, i) => <SkeletonStudentRow key={i} />)}
        </tbody>
      </table>
    )
  }

  if (isError) {
    return (
      <div className={styles.emptyState}>
        <div style={{ color: 'var(--color-amber)' }}><AlertIcon /></div>
        <p className={styles.emptyTitle}>Failed to load students</p>
        <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>Retry</button>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div style={{ color: 'oklch(44% 0.018 255)' }}><UsersIcon /></div>
        <p className={styles.emptyTitle}>No students enrolled</p>
        <p className={styles.emptyText}>Students enrolled in this course will appear here.</p>
      </div>
    )
  }

  return (
    <table className={styles.studentsTable} aria-label="Enrolled students">
      <thead>
        <tr>
          <th>Student</th>
          <th>Attendance</th>
          <th>Avg Score</th>
          <th>Weak Topics</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {students.map(s => {
          const atRisk = s.avg_quiz_score !== null && s.avg_quiz_score < 60
          return (
            <tr key={s.id}>
              <td>
                <div className={styles.studentName}>{s.name}</div>
                <div className={styles.studentCode}>{s.code}</div>
              </td>
              <td>
                <div className={styles.inlineProgress}>
                  <div className={styles.miniProgress} role="progressbar" aria-valuenow={s.attendance_rate} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.attendance_rate}% attendance`}>
                    <div className={styles.miniProgressBar} style={{ width: `${s.attendance_rate}%` }} />
                  </div>
                  <span className={styles.progressPct}>{s.attendance_rate}%</span>
                </div>
              </td>
              <td>
                <span className={scoreClass(s.avg_quiz_score)}>
                  {s.avg_quiz_score !== null ? `${s.avg_quiz_score}%` : '—'}
                </span>
              </td>
              <td style={{ color: s.weak_topics_count > 0 ? 'var(--color-amber)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {s.weak_topics_count}
              </td>
              <td>
                {atRisk && (
                  <span className={styles.atRiskBadge} aria-label="At risk student">
                    <AlertIcon /> At Risk
                  </span>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ courseId }: { courseId: string }) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', date: '', starts_at: '', ends_at: '', type: 'online' as 'online' | 'in_person' | 'recorded' })

  const jitsiUrl = form.type === 'online' && form.title
    ? generateJitsiUrl(form.title, courseId)
    : null

  const { data: sessions = [], isLoading, isError, refetch } = useQuery<CourseSession[]>({
    queryKey: ['teacher-course-schedules', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}/schedules`).then(r => normalizeArray<CourseSession>(r.data.data ?? r.data)),
    staleTime: 2 * 60 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: (body: object) => api.post('/teacher/schedules', { ...body, course_id: Number(courseId) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-course-schedules', courseId] })
      setForm({ title: '', description: '', date: '', starts_at: '', ends_at: '', type: 'online' })
      setShowAdd(false)
    },
  })

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date || !form.starts_at || !form.ends_at) return
    addMutation.mutate({
      title: form.title,
      description: form.description,
      starts_at: `${form.date}T${form.starts_at}:00`,
      ends_at: `${form.date}T${form.ends_at}:00`,
      type: form.type,
      jitsi_url: jitsiUrl ?? undefined,
    })
  }, [form, jitsiUrl, addMutation])

  const field = (label: string, id: string, node: React.ReactNode) => (
    <div className={styles.formRow}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      {node}
    </div>
  )

  if (isLoading) {
    return (
      <ul className={styles.sessionsList} aria-label="Sessions loading">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className={styles.sessionItem}>
            <div style={{ flex: 1 }}>
              <span className={styles.skeleton} style={{ display: 'block', height: 16, width: '50%', marginBlockEnd: 6 }} />
              <span className={styles.skeleton} style={{ display: 'block', height: 12, width: '30%' }} />
            </div>
            <span className={styles.skeleton} style={{ height: 28, width: 72 }} />
          </li>
        ))}
      </ul>
    )
  }

  if (isError) {
    return (
      <div className={styles.emptyState}>
        <div style={{ color: 'var(--color-amber)' }}><AlertIcon /></div>
        <p className={styles.emptyTitle}>Failed to load sessions</p>
        <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>Retry</button>
      </div>
    )
  }

  return (
    <>
      <div className={styles.btnRow}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowAdd(true)}>
          <PlusIcon /> Add Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'oklch(44% 0.018 255)' }}><CalendarIcon /></div>
          <p className={styles.emptyTitle}>No sessions scheduled</p>
          <p className={styles.emptyText}>Upcoming sessions for this course will appear here.</p>
        </div>
      ) : (
        <ul className={styles.sessionsList} aria-label="Course sessions">
          {sessions.map(s => (
            <li key={s.id} className={styles.sessionItem}>
              <div className={styles.sessionTime}>
                <div className={styles.sessionTimeLabel}>{s.title}</div>
                <div className={styles.sessionDate}>{formatDateTime(s.starts_at)}</div>
              </div>
              <span className={`${styles.badge} ${s.status === 'live' ? styles.badgeActive : s.status === 'scheduled' ? styles.badgeDraft : styles.badgeArchived}`}>
                {statusLabel(s.status)}
              </span>
              {s.jitsi_url && (
                <a href={s.jitsi_url} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnOutline}`} style={{ height: 28, fontSize: '0.75rem', paddingInline: 10 }}>
                  Join
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <SlideOver
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Session"
        description="Schedule a new session for this course"
        footer={
          <>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setShowAdd(false)}>Cancel</button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={addMutation.isPending || !form.title.trim() || !form.date || !form.starts_at || !form.ends_at}
              onClick={e => handleSubmit(e as unknown as React.FormEvent)}
            >
              {addMutation.isPending ? 'Saving...' : 'Save Session'}
            </button>
          </>
        }
      >
        <form className={styles.fieldGroup} onSubmit={handleSubmit}>
          {field('Title', 'sched-title',
            <input id="sched-title" className={styles.input} placeholder="e.g. Chapter 3 Review" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          )}
          {field('Description', 'sched-desc',
            <textarea id="sched-desc" className={styles.textarea} placeholder="Optional notes..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          )}
          {field('Date', 'sched-date',
            <input id="sched-date" className={styles.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          )}
          <div className={styles.fieldRow2}>
            <div className={styles.formRow}>
              <label className={styles.label} htmlFor="sched-start">Start Time</label>
              <input id="sched-start" className={styles.input} type="time" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} required />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label} htmlFor="sched-end">End Time</label>
              <input id="sched-end" className={styles.input} type="time" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} required />
            </div>
          </div>
          {field('Type', 'sched-type',
            <select id="sched-type" className={styles.select} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof form.type }))}>
              <option value="online">Online</option>
              <option value="in_person">In Person</option>
              <option value="recorded">Recorded</option>
            </select>
          )}
          {jitsiUrl && (
            <div>
              <div className={styles.label} style={{ marginBlockEnd: 6 }}>Jitsi Room (auto-generated)</div>
              <div className={styles.jitsiPreview}>{jitsiUrl}</div>
            </div>
          )}
        </form>
      </SlideOver>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'lessons', label: 'Lessons' },
  { key: 'students', label: 'Students' },
  { key: 'schedule', label: 'Schedule' },
]

function getCourseFromCache(qc: QueryClient, courseId: string): Course | undefined {
  const list = qc.getQueryData<Course[]>(['teacher-courses'])
  return list?.find(c => String(c.id) === courseId)
}

export default function CourseDetail() {
  const { courseId = '' } = useParams<{ courseId: string }>()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('lessons')

  const course = getCourseFromCache(qc, courseId)

  if (!course) return <HeaderSkeleton />

  const accentColor = course ? subjectColor(course.subject) : 'var(--color-blue)'

  return (
    <div className={styles.page}>
      <div className={styles.courseHeader}>
        <Link to="/teacher/courses" className={styles.backLink} aria-label="Back to courses">
          <BackIcon /> My Courses
        </Link>

        {course && (
          <>
            <div className={styles.headerTop}>
              <div className={styles.accentBar} style={{ background: accentColor }} aria-hidden="true" />
              <div>
                <h1 className={styles.courseTitle}>{course.name}</h1>
                <div className={styles.headerMeta}>
                  <span className={`${styles.badge} ${styles.badgeGrade}`}>{str(course.grade_level)}</span>
                  <span className={`${styles.badge} ${styles.badgeSubject}`}>{str(course.subject)}</span>
                  <span className={`${styles.badge} ${statusBadgeClass(course.status)}`}>{statusLabel(course.status)}</span>
                  {course.teacher && (
                    <>
                      <div className={styles.metaDot} aria-hidden="true" />
                      <span className={styles.metaTeacher}>{course.teacher.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className={styles.tabs} role="tablist" aria-label="Course sections">
          {TABS.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={activeTab === t.key}
              aria-controls={`tabpanel-${t.key}`}
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div
        key={activeTab}
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-label={TABS.find(t => t.key === activeTab)?.label}
        className={styles.tabContent}
      >
        {activeTab === 'lessons'   && <LessonsTab   courseId={courseId} />}
        {activeTab === 'students'  && <StudentsTab  courseId={courseId} />}
        {activeTab === 'schedule'  && <ScheduleTab  courseId={courseId} />}
      </div>
    </div>
  )
}
