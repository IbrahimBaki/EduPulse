import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import styles from './Courses.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: number
  name: string
  subject: string | { name?: string; [k: string]: unknown }
  grade_level: string | { name?: string; level?: string | number; [k: string]: unknown }
  teacher?: { id: number; name: string }
  status: 'active' | 'archived' | string
  lessons_count: number
  completed_lessons_count?: number
  next_session?: { starts_at: string; ends_at: string }
}

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

const SUBJECT_HUE: Record<string, number> = {
  mathematics: 255, math: 255, science: 145, biology: 145, arabic: 75,
  english: 300, history: 45, geography: 160, physics: 205, chemistry: 178,
  art: 340, music: 305, computer: 218, programming: 218, ict: 218,
  religion: 28, sports: 130, pe: 130,
}

function hashHue(s: string): number {
  const hues = [255, 145, 75, 300, 45, 205, 178, 340, 305, 28, 130]
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff
  return hues[h % hues.length]
}

function subjectHue(subject: unknown): number {
  const s = str(subject)
  const key = s.toLowerCase().split(/\s+/)[0]
  return SUBJECT_HUE[key] ?? hashHue(s)
}

function teacherInitials(name?: string): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function formatNextSession(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (isToday) return `Today ${time}`
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${time}`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BookIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-rtl-flip="">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonAccent} />
      <div className={styles.skeletonBody}>
        <span className={styles.skeleton} style={{ height: 18, width: '72%' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <span className={styles.skeleton} style={{ height: 18, width: 56 }} />
          <span className={styles.skeleton} style={{ height: 18, width: 64 }} />
        </div>
        <span className={styles.skeleton} style={{ height: 24, width: '45%' }} />
        <span className={styles.skeleton} style={{ height: 5, borderRadius: 999 }} />
        <span className={styles.skeleton} style={{ height: 12, width: '55%' }} />
      </div>
    </div>
  )
}

// ─── Course card ──────────────────────────────────────────────────────────────

function CourseCard({ course }: { course: Course }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hue = subjectHue(course.subject)
  const color = `oklch(62% 0.22 ${hue})`
  const total     = course.lessons_count || 1
  const completed = course.completed_lessons_count ?? 0
  const pct       = Math.round((completed / total) * 100)

  return (
    <article
      className={styles.courseCard}
      role="button"
      tabIndex={0}
      aria-label={`View ${course.name}`}
      onClick={() => navigate(`/student/courses/${course.id}`)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/student/courses/${course.id}`) }}
    >
      <div className={styles.cardAccent} style={{ background: color }} />
      <div className={styles.cardBody}>
        <h3 className={styles.courseName}>{course.name}</h3>

        <div className={styles.cardBadges}>
          <span className={styles.badgeGrade}>{str(course.grade_level)}</span>
          <span className={styles.badgeSubject} style={{ background: `oklch(62% 0.22 ${hue} / 0.15)`, color }}>{str(course.subject)}</span>
          {course.status === 'archived' && <span className={styles.badgeArchived}>{t('student.courses.archived')}</span>}
        </div>

        {course.teacher && (
          <div className={styles.teacherRow}>
            <span className={styles.teacherAvatar} style={{ background: `oklch(62% 0.22 ${hue} / 0.2)`, color }}>
              {teacherInitials(course.teacher.name)}
            </span>
            <span className={styles.teacherName}>{course.teacher.name}</span>
          </div>
        )}

        <div
          className={styles.progressWrap}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% ${t('student.courses.lessonsCompleted')}`}
        >
          <div className={styles.progressBar} style={{ width: `${pct}%`, background: color }} />
        </div>
        <p className={styles.progressLabel}>{completed}/{course.lessons_count ?? 0} {t('student.courses.lessonsCompleted')}</p>

        {course.next_session && (
          <p className={styles.nextSession}>
            {t('student.courses.next')}: {formatNextSession(course.next_session.starts_at)}
          </p>
        )}
      </div>
      <div className={styles.cardOverlay} aria-hidden="true">
        {t('student.courses.openCourse')} <ArrowRightIcon />
      </div>
    </article>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentCourses() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const { data: courses, isLoading, isError, refetch } = useQuery<Course[]>({
    queryKey: ['student-courses'],
    queryFn: () => api.get('/student/courses').then(r => normalizeArray<Course>(r.data.data ?? r.data)),
    staleTime: 3 * 60 * 1000,
  })

  const filtered = (courses ?? []).filter(c =>
    !search
    || c.name.toLowerCase().includes(search.toLowerCase())
    || str(c.subject).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{t('student.courses.myCourses')}</h1>
          <p className={styles.pageCount}>
            {isLoading ? t('common.loading') : `${filtered.length} course${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className={styles.searchWrap}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder={t('student.courses.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={t('student.courses.searchPlaceholder')}
          />
        </div>
      </header>

      <div className={styles.grid}>
        {isLoading ? (
          Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
        ) : isError ? (
          <div className={styles.emptyState}>
            <div style={{ color: 'var(--color-amber)' }}><AlertIcon /></div>
            <p className={styles.emptyTitle}>{t('common.errorLoadFailed')}</p>
            <button type="button" className={styles.retryBtn} onClick={() => refetch()}>{t('common.retry')}</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ color: 'var(--text-muted)' }}><BookIcon /></div>
            <p className={styles.emptyTitle}>{search ? t('student.courses.noMatchingCourses') : t('student.courses.noCoursesEnrolled')}</p>
            <p className={styles.emptyText}>
              {search ? t('student.courses.noMatchingCoursesHint') : t('student.courses.noCoursesEnrolledHint')}
            </p>
          </div>
        ) : (
          filtered.map(c => <CourseCard key={c.id} course={c} />)
        )}
      </div>
    </div>
  )
}
