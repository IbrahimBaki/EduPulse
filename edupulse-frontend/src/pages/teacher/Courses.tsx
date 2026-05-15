import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './Courses.module.css'

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

// ─── Subject color map ────────────────────────────────────────────────────────

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

function progressColor(subject: unknown): string {
  const s = str(subject)
  const key = s.toLowerCase().split(/\s+/)[0]
  const hue = SUBJECT_HUE[key] ?? hashHue(s)
  return `oklch(62% 0.22 ${hue} / 0.85)`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  if (status === 'active') return styles.badgeActive
  if (status === 'archived') return styles.badgeArchived
  return styles.badgeDraft
}

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonAccent} />
      <div className={styles.skeletonBody}>
        <span className={styles.skeleton} style={{ height: '18px', width: '75%' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <span className={styles.skeleton} style={{ height: '18px', width: '56px' }} />
          <span className={styles.skeleton} style={{ height: '18px', width: '64px' }} />
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <span className={styles.skeleton} style={{ height: '12px', width: '60px' }} />
          <span className={styles.skeleton} style={{ height: '12px', width: '52px' }} />
        </div>
        <span className={styles.skeleton} style={{ height: '4px', borderRadius: '999px' }} />
      </div>
    </div>
  )
}

// ─── Course card ──────────────────────────────────────────────────────────────

function CourseCard({ course }: { course: Course }) {
  const navigate = useNavigate()
  const total = course.lessons_count || 1
  const published = course.published_lessons_count ?? 0
  const pct = Math.round((published / total) * 100)
  const color = subjectColor(course.subject)

  return (
    <article
      className={styles.courseCard}
      role="button"
      tabIndex={0}
      aria-label={`View ${course.name}`}
      onClick={() => navigate(`/teacher/courses/${course.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/teacher/courses/${course.id}`) }}
    >
      <div className={styles.cardAccent} style={{ background: color }} />
      <div className={styles.cardBody}>
        <h3 className={styles.courseName}>{course.name}</h3>
        <div className={styles.cardBadges}>
          <span className={`${styles.badge} ${styles.badgeGrade}`}>{str(course.grade_level)}</span>
          <span className={`${styles.badge} ${styles.badgeSubject}`}>{str(course.subject)}</span>
          <span className={`${styles.badge} ${statusBadgeClass(course.status)}`}>{statusLabel(course.status)}</span>
        </div>
        <div className={styles.cardStats}>
          <span className={styles.statItem}>
            <span className={styles.statNum}>{course.enrolled_count ?? 0}</span> students
          </span>
          <span className={styles.statItem}>
            <span className={styles.statNum}>{course.lessons_count ?? 0}</span> lessons
          </span>
        </div>
        <div className={styles.progressWrap} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% lessons published`}>
          <div className={styles.progressBar} style={{ width: `${pct}%`, background: progressColor(course.subject) }} />
        </div>
        <p className={styles.progressLabel}>{published} / {course.lessons_count ?? 0} lessons published</p>
      </div>
      <div className={styles.cardOverlay} aria-hidden="true">
        View Course <ArrowRightIcon />
      </div>
    </article>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeacherCourses() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | 'draft' | 'active' | 'archived'>('')

  const { data: courses, isLoading, isError, refetch } = useQuery<Course[]>({
    queryKey: ['teacher-courses'],
    queryFn: () => api.get('/teacher/courses').then(r => {
      const d = r.data.data
      return (Array.isArray(d) ? d : (d?.data ?? [])) as Course[]
    }),
    staleTime: 3 * 60 * 1000,
  })

  const filtered = (courses ?? []).filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || str(c.subject).toLowerCase().includes(search.toLowerCase())
    const matchStatus = !status || c.status === status
    return matchSearch && matchStatus
  })

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>My Courses</h1>
          <p className={styles.pageCount}>
            {isLoading ? 'Loading...' : `${filtered.length} course${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><SearchIcon /></span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by name or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search courses"
          />
        </div>
        <select
          className={styles.filterSelect}
          value={status}
          onChange={e => setStatus(e.target.value as typeof status)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className={styles.grid}>
        {isLoading ? (
          Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
        ) : isError ? (
          <div className={styles.emptyState}>
            <div style={{ color: 'var(--color-amber)' }}><AlertIcon /></div>
            <p className={styles.emptyTitle}>Failed to load courses</p>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ color: 'oklch(44% 0.018 255)' }}><BookIcon /></div>
            <p className={styles.emptyTitle}>{search || status ? 'No matching courses' : 'No courses assigned'}</p>
            <p className={styles.emptyText}>
              {search || status ? 'Try adjusting your search or filter.' : 'Courses assigned to you will appear here.'}
            </p>
          </div>
        ) : (
          filtered.map(c => <CourseCard key={c.id} course={c} />)
        )}
      </div>
    </div>
  )
}
