import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import api from '../../lib/axios'
import styles from './CourseDetail.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lesson {
  id: number
  title: string
  description?: string
  order: number
  is_published: boolean
  pdf_processed?: boolean
}

interface Session {
  id: number
  title: string
  starts_at: string
  ends_at: string
  type: 'online' | 'offline' | 'recorded'
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  jitsi_url?: string | null
}

interface QuizScore {
  topic: string
  score: number
  date: string
}

interface WeakTopic {
  topic: string
  score: number
}

interface Progress {
  attendance_rate?: number
  quiz_scores?: QuizScore[]
  weak_topics?: WeakTopic[]
  strong_topics?: WeakTopic[]
}

interface Course {
  id: number
  name: string
  subject: string | { name?: string }
  grade_level: string | { name?: string; level?: string | number }
  teacher?: { id: number; name: string }
  status?: string
}

type Tab = 'lessons' | 'schedule' | 'progress'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = (data as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  return []
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

function formatTimeRange(s: string, e: string): string {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${new Date(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmt(s)} – ${fmt(e)}`
}

function isLive(s: Session): boolean {
  return s.status === 'live'
}

function isSoon(s: Session): boolean {
  const diff = new Date(s.starts_at).getTime() - Date.now()
  return diff > 0 && diff <= 30 * 60 * 1000
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
      <path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z"/>
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

// ─── Circular progress ring ───────────────────────────────────────────────────

function CircularProgress({ value, label }: { value: number; label: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  const color = value >= 80 ? 'oklch(65% 0.2 145)' : value >= 60 ? 'var(--color-amber)' : 'var(--color-red)'

  return (
    <div className={styles.ringWrap} aria-label={`${label}: ${value}%`}>
      <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--surface-elevated)" strokeWidth="10"/>
        <circle
          cx="66" cy="66" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 66 66)"
          style={{ transition: 'stroke-dashoffset 0.8s var(--ease-out-expo)' }}
        />
      </svg>
      <div className={styles.ringInner}>
        <span className={styles.ringValue} style={{ color }}>{value}%</span>
        <span className={styles.ringLabel}>{label}</span>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className={styles.skeletonRow}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className={styles.skeleton} style={{ height: 15, width: '60%' }} />
        <span className={styles.skeleton} style={{ height: 13, width: '40%' }} />
      </div>
    </div>
  )
}

// ─── PDF Viewer modal ─────────────────────────────────────────────────────────

function PdfViewer({ lessonId, title, onClose }: { lessonId: number; title: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError]     = useState(false)
  const urlRef = useRef<string | null>(null)

  useState(() => {
    api.get(`/student/lessons/${lessonId}/pdf`, { responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
        urlRef.current = url
        setBlobUrl(url)
      })
      .catch(() => setError(true))

    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }
  })

  return (
    <div className={styles.pdfOverlay} onClick={onClose}>
      <div className={styles.pdfModal} onClick={e => e.stopPropagation()}>
        <div className={styles.pdfHeader}>
          <span className={styles.pdfTitle}>{title}</span>
          <button type="button" className={styles.pdfCloseBtn} onClick={onClose} aria-label={t('common.close')}><CloseIcon /></button>
        </div>
        <div className={styles.pdfBody}>
          {error ? (
            <p className={styles.pdfError}>{t('student.courses.pdfError')}</p>
          ) : !blobUrl ? (
            <div className={styles.pdfLoading}>
              <span className={styles.pdfSpinner} />
              <p>{t('student.courses.loadingPdf')}</p>
            </div>
          ) : (
            <iframe
              src={blobUrl}
              title={title}
              className={styles.pdfFrame}
              aria-label={`PDF: ${title}`}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Lessons tab ──────────────────────────────────────────────────────────────

function LessonsTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [pdfLesson, setPdfLesson] = useState<{ id: number; title: string } | null>(null)

  const { data: lessons = [], isLoading, isError, refetch } = useQuery<Lesson[]>({
    queryKey: ['student-course-lessons', courseId],
    queryFn: () => api.get(`/student/courses/${courseId}/lessons`).then(r => normalizeArray<Lesson>(r.data.data ?? r.data)),
    staleTime: 5 * 60 * 1000,
  })

  const sorted = [...lessons].sort((a, b) => a.order - b.order)

  if (isLoading) return <div className={styles.tabContent}>{Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)}</div>
  if (isError) return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>{t('common.errorLoadFailed')}</p>
      <button type="button" className={styles.retryBtn} onClick={() => refetch()}>{t('common.retry')}</button>
    </div>
  )
  if (sorted.length === 0) return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>{t('student.courses.tabs.noLessons')}</p>
      <p className={styles.emptyText}>{t('student.courses.tabs.noLessonsHint')}</p>
    </div>
  )

  return (
    <>
      {pdfLesson && (
        <PdfViewer lessonId={pdfLesson.id} title={pdfLesson.title} onClose={() => setPdfLesson(null)} />
      )}
      <div className={styles.tabContent}>
        {sorted.map((lesson, i) => (
          <div
            key={lesson.id}
            className={`${styles.lessonRow} ${!lesson.is_published ? styles.lessonLocked : ''}`}
          >
            <span className={styles.lessonOrder}>{String(lesson.order || i + 1).padStart(2, '0')}</span>
            <div className={styles.lessonInfo}>
              <p className={styles.lessonTitle}>
                {lesson.title}
                {!lesson.is_published && <span className={styles.lockIcon}><LockIcon /></span>}
              </p>
              {lesson.description && <p className={styles.lessonDesc}>{lesson.description}</p>}
            </div>
            {lesson.is_published && (
              <div className={styles.lessonActions}>
                {lesson.pdf_processed && (
                  <button
                    type="button"
                    className={styles.pdfBtn}
                    onClick={() => setPdfLesson({ id: lesson.id, title: lesson.title })}
                    aria-label={`${t('student.courses.tabs.viewPdf')} ${lesson.title}`}
                  >
                    <FileIcon /> {t('student.courses.tabs.viewPdf')}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.aiBtn}
                  onClick={() => navigate(`/student/ai-tutor?lesson_id=${lesson.id}&lesson=${encodeURIComponent(lesson.title)}`)}
                  aria-label={`${t('student.courses.tabs.askAi')} ${lesson.title}`}
                >
                  <SparklesIcon /> {t('student.courses.tabs.askAi')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation()
  const { data: sessions = [], isLoading, isError, refetch } = useQuery<Session[]>({
    queryKey: ['student-course-schedules', courseId],
    queryFn: () => api.get(`/student/courses/${courseId}/schedules`).then(r => normalizeArray<Session>(r.data.data ?? r.data)),
    staleTime: 2 * 60 * 1000,
  })

  const joinSession = async (session: Session) => {
    try {
      const res = await api.get(`/student/courses/${courseId}/schedules/${session.id}/join`)
      const url = res.data.data?.url ?? res.data.url
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      if (session.jitsi_url) window.open(session.jitsi_url, '_blank', 'noopener,noreferrer')
    }
  }

  if (isLoading) return <div className={styles.tabContent}>{Array.from({ length: 4 }, (_, i) => <SkeletonRow key={i} />)}</div>
  if (isError) return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>{t('common.errorLoadFailed')}</p>
      <button type="button" className={styles.retryBtn} onClick={() => refetch()}>{t('common.retry')}</button>
    </div>
  )
  if (sessions.length === 0) return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>{t('student.courses.tabs.noSessions')}</p>
      <p className={styles.emptyText}>{t('student.courses.tabs.noSessionsHint')}</p>
    </div>
  )

  return (
    <div className={styles.tabContent}>
      {sessions.map(s => {
        const live = isLive(s)
        const soon = isSoon(s)
        const canJoin = s.status === 'live' && s.type === 'online' && !!s.jitsi_url
        return (
          <div key={s.id} className={`${styles.scheduleRow} ${live ? styles.scheduleRowLive : ''}`}>
            <div className={styles.scheduleInfo}>
              <p className={styles.scheduleTitle}>{s.title}</p>
              <p className={styles.scheduleTime}>{formatTimeRange(s.starts_at, s.ends_at)}</p>
            </div>
            <div className={styles.scheduleRight}>
              <span className={`${styles.typeBadge} ${s.type === 'online' ? styles.typeOnline : styles.typeOffline}`}>
                {s.type === 'online' ? t('common.online') : s.type === 'recorded' ? t('student.courses.tabs.recorded') : t('common.inPerson')}
              </span>
              {soon && !live && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-amber)', fontWeight: 600 }}>{t('session.startingSoon')}</span>
              )}
              {canJoin && (
                <button
                  type="button"
                  className={`${styles.joinBtn} ${styles.joinBtnLive}`}
                  onClick={() => joinSession(s)}
                >
                  <ExternalLinkIcon /> {t('session.joinNow')}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Progress tab ─────────────────────────────────────────────────────────────

function ProgressTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation()
  const { data: progress, isLoading, isError, refetch } = useQuery<Progress>({
    queryKey: ['student-course-progress', courseId],
    queryFn: () => api.get(`/student/courses/${courseId}/progress`).then(r => r.data.data ?? r.data),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return (
    <div className={styles.tabContent} style={{ gap: 32 }}>
      <span className={styles.skeleton} style={{ height: 132, width: 132, borderRadius: '50%', display: 'block', margin: '0 auto' }} />
      {Array.from({ length: 4 }, (_, i) => <SkeletonRow key={i} />)}
    </div>
  )
  if (isError) return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>{t('common.errorLoadFailed')}</p>
      <button type="button" className={styles.retryBtn} onClick={() => refetch()}>{t('common.retry')}</button>
    </div>
  )

  const attendance = progress?.attendance_rate ?? 0
  const scores = progress?.quiz_scores ?? []
  const weak = progress?.weak_topics ?? []
  const strong = progress?.strong_topics ?? []

  const chartData = scores.map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: s.score,
  }))

  return (
    <div className={styles.progressContent}>
      <div className={styles.attendanceSection}>
        <CircularProgress value={Math.round(attendance)} label={t('student.dashboard.attendance')} />
      </div>

      {chartData.length > 0 && (
        <div className={styles.chartSection}>
          <h3 className={styles.sectionLabel}>{t('student.courses.tabs.quizScoresOverTime')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(32% 0.02 255)" />
              <XAxis dataKey="date" tick={{ fill: 'oklch(44% 0.015 255)', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'oklch(44% 0.015 255)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-panel)', border: '1px solid var(--neutral-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Line type="monotone" dataKey="score" stroke="oklch(62% 0.26 255)" strokeWidth={2} dot={{ fill: 'oklch(62% 0.26 255)', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {weak.length > 0 && (
        <div className={styles.topicsSection}>
          <h3 className={styles.sectionLabel}>{t('student.courses.tabs.weakTopics')}</h3>
          <div className={styles.pillRow}>
            {weak.map(topic => (
              <span key={topic.topic} className={styles.pillWeak}>
                {topic.topic} <span className={styles.pillScore}>{topic.score}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {strong.length > 0 && (
        <div className={styles.topicsSection}>
          <h3 className={styles.sectionLabel}>{t('student.courses.tabs.strongTopics')}</h3>
          <div className={styles.pillRow}>
            {strong.map(topic => (
              <span key={topic.topic} className={styles.pillStrong}>
                {topic.topic} <span className={styles.pillScore}>{topic.score}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {chartData.length === 0 && weak.length === 0 && strong.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>{t('student.courses.tabs.noProgressData')}</p>
          <p className={styles.emptyText}>{t('student.courses.tabs.noProgressDataHint')}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentCourseDetail() {
  const { t } = useTranslation()
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('lessons')

  const courseFromCache = qc.getQueryData<Course[]>(['student-courses'])?.find(c => String(c.id) === courseId)

  const { data: course } = useQuery<Course>({
    queryKey: ['student-course-detail', courseId],
    queryFn: () => api.get(`/student/courses/${courseId}`).then(r => r.data.data ?? r.data),
    placeholderData: courseFromCache,
    staleTime: 5 * 60 * 1000,
  })

  const TABS: { key: Tab; label: string }[] = [
    { key: 'lessons',  label: t('student.courses.tabs.lessons') },
    { key: 'schedule', label: t('student.courses.tabs.schedule') },
    { key: 'progress', label: t('student.courses.tabs.myProgress') },
  ]

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backBtn} onClick={() => navigate('/student/courses')}>
        <ChevronLeftIcon /> {t('student.courses.allCourses')}
      </button>

      <header className={styles.courseHeader}>
        <div className={styles.headerInfo}>
          <h1 className={styles.courseTitle}>{course?.name ?? t('student.courses.course')}</h1>
          <div className={styles.headerMeta}>
            {course?.subject && <span className={styles.metaBadge}>{str(course.subject)}</span>}
            {course?.grade_level && <span className={styles.metaBadge}>{str(course.grade_level)}</span>}
            {course?.teacher && <span className={styles.teacherChip}>{course.teacher.name}</span>}
          </div>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'lessons'  && <LessonsTab  courseId={courseId!} />}
        {tab === 'schedule' && <ScheduleTab courseId={courseId!} />}
        {tab === 'progress' && <ProgressTab courseId={courseId!} />}
      </div>
    </div>
  )
}
