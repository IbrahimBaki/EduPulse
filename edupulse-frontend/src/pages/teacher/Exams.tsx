import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import styles from './Exams.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExamStatus = 'draft' | 'published' | 'scheduled' | 'active' | 'completed' | 'archived'

interface ExamItem {
  id: number
  title: string
  status: ExamStatus
  total_marks: number
  duration_minutes: number
  questions_count: number
  attempts_count: number
  scheduled_at: string | null
  starts_at: string | null
  ends_at: string | null
  course: { id: number; name: string }
  avg_score?: number | null
}

interface PaginatedExams {
  data: ExamItem[]
  total: number
  per_page: number
  current_page: number
  last_page: number
}

// ─── Display state engine ─────────────────────────────────────────────────────

type DisplayState =
  | 'draft'
  | 'published'
  | 'scheduled-future'  // window > 24 h away
  | 'scheduled-soon'    // window starts in < 24 h
  | 'window-open'       // window open, > 60 min remaining
  | 'closing-soon'      // window closes in < 60 min
  | 'window-expired'    // scheduled but window already closed
  | 'active'            // teacher manually went live
  | 'completed'
  | 'archived'

function computeState(exam: ExamItem, now: Date): DisplayState {
  const { status, starts_at, ends_at } = exam
  if (status === 'draft')     return 'draft'
  if (status === 'published') return 'published'
  if (status === 'active')    return 'active'
  if (status === 'completed') return 'completed'
  if (status === 'archived')  return 'archived'

  // status === 'scheduled'
  const start  = starts_at ? new Date(starts_at) : null
  const end    = ends_at   ? new Date(ends_at)   : null
  const nowMs  = now.getTime()

  if (end && end.getTime() < nowMs) return 'window-expired'

  const windowOpen = !start || start.getTime() <= nowMs
  if (windowOpen) {
    if (end && end.getTime() - nowMs < 60 * 60 * 1000) return 'closing-soon'
    return 'window-open'
  }

  if (start && start.getTime() - nowMs < 24 * 60 * 60 * 1000) return 'scheduled-soon'
  return 'scheduled-future'
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h >= 1) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtShort(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}

function SparkIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z"/></svg>
}

function AlertIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

function ClipboardEmptyIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  )
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === 'left' ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
    </svg>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className={styles.skeletonRow} aria-hidden="true">
      {[160, 96, 40, 40, 88, 96, 48, 40].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <span className={styles.skeleton} style={{ width: w, height: 13, display: 'block', borderRadius: 4 }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Pulse dot ────────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: 'green' | 'amber' | 'blue' }) {
  return <span className={`${styles.pulseDot} ${styles[`dot${color.charAt(0).toUpperCase()}${color.slice(1)}`]}`} aria-hidden="true" />
}

// ─── Smart exam row ───────────────────────────────────────────────────────────

function ExamRow({ exam, index, onNavigate }: { exam: ExamItem; index: number; onNavigate: () => void }) {
  const [now, setNow] = useState(() => new Date())
  const state = computeState(exam, now)

  const needsTicker = state === 'scheduled-soon' || state === 'closing-soon' ||
    state === 'window-open' || state === 'active'

  useEffect(() => {
    if (!needsTicker) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [needsTicker])

  const s = computeState(exam, now)

  // ── Badge config ──
  type BadgeCfg = { label: string; cls: string; dot?: 'green' | 'amber' | 'blue' }

  const countdownMs = (() => {
    if ((s === 'closing-soon' || s === 'window-open') && exam.ends_at)
      return Math.max(0, new Date(exam.ends_at).getTime() - now.getTime())
    if (s === 'scheduled-soon' && exam.starts_at)
      return Math.max(0, new Date(exam.starts_at).getTime() - now.getTime())
    return 0
  })()

  const badge: BadgeCfg = (() => {
    switch (s) {
      case 'draft':            return { label: 'Draft',                              cls: styles.bdDraft }
      case 'published':        return { label: 'Published',                          cls: styles.bdPublished }
      case 'scheduled-future': return { label: 'Scheduled',                          cls: styles.bdScheduled }
      case 'scheduled-soon':   return { label: `Opens in ${fmtCountdown(countdownMs)}`, cls: styles.bdSoon,    dot: 'blue' }
      case 'window-open':      return { label: 'Live',                               cls: styles.bdActive,    dot: 'green' }
      case 'closing-soon':     return { label: `Closes ${fmtCountdown(countdownMs)}`, cls: styles.bdClosing }
      case 'window-expired':   return { label: 'Window Expired',                     cls: styles.bdExpired }
      case 'active':           return { label: 'Live Now',                           cls: styles.bdActive,    dot: 'green' }
      case 'completed':        return { label: 'Completed',                          cls: styles.bdCompleted }
      case 'archived':         return { label: 'Archived',                           cls: styles.bdArchived }
    }
  })()

  // ── Row left accent ──
  const rowAccent = {
    'active':          styles.rowAccentGreen,
    'window-open':     styles.rowAccentGreen,
    'closing-soon':    styles.rowAccentAmber,
    'scheduled-soon':  styles.rowAccentBlue,
    'window-expired':  styles.rowAccentRed,
    'draft':           styles.rowAccentDim,
  }[s as string] ?? ''

  // ── Window cell content ──
  const windowCell = (() => {
    if (s === 'window-open' || s === 'closing-soon') {
      return exam.ends_at
        ? <><span className={styles.windowLabel}>Ends</span> {fmtShort(exam.ends_at)}</>
        : '—'
    }
    if (s === 'scheduled-future' || s === 'scheduled-soon') {
      return exam.starts_at
        ? <><span className={styles.windowLabel}>Opens</span> {fmtShort(exam.starts_at)}</>
        : fmtDate(exam.scheduled_at)
    }
    if (s === 'window-expired') {
      return exam.ends_at
        ? <><span className={styles.windowLabel}>Closed</span> {fmtShort(exam.ends_at)}</>
        : fmtDate(exam.scheduled_at)
    }
    if (s === 'active') {
      return exam.ends_at
        ? <><span className={styles.windowLabel}>Ends</span> {fmtShort(exam.ends_at)}</>
        : <span className={styles.noWindow}>No time limit</span>
    }
    return fmtDate(exam.scheduled_at)
  })()

  return (
    <tr
      className={`${styles.tableRow} ${rowAccent}`}
      style={{ animationDelay: `${index * 0.025}s` }}
      onClick={onNavigate}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onNavigate() }}
      tabIndex={0}
      role="button"
      aria-label={`Open exam: ${exam.title}`}
    >
      <td className={styles.titleCell}>{exam.title}</td>
      <td className={styles.mutedCell}>{exam.course?.name ?? '—'}</td>
      <td className={styles.numCell}>{exam.questions_count ?? 0}</td>
      <td className={styles.numCell}>{exam.total_marks}</td>
      <td>
        <span className={`${styles.badge} ${badge.cls} ${s === 'closing-soon' ? styles.blinkBadge : ''}`}>
          {badge.dot && <PulseDot color={badge.dot} />}
          {badge.label}
        </span>
      </td>
      <td className={styles.windowCell}>{windowCell}</td>
      <td className={styles.numCell} style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
        {exam.attempts_count > 0
          ? <span className={styles.attemptsCount}>{exam.attempts_count}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
      <td className={styles.scoreCell}>
        {exam.avg_score != null ? `${Number(exam.avg_score).toFixed(1)}%` : '—'}
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeacherExams() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState<'' | ExamStatus>('')
  const [page, setPage]       = useState(1)

  const { data, isLoading, isError, refetch } = useQuery<PaginatedExams>({
    queryKey: ['teacher-exams', page, status],
    queryFn: () =>
      api.get('/teacher/exams', { params: { page, status: status || undefined, per_page: 15 } })
        .then(r => {
          const d = r.data.data
          if (d?.data) return d as PaginatedExams
          return { data: Array.isArray(d) ? d : [], total: 0, per_page: 15, current_page: 1, last_page: 1 } as PaginatedExams
        }),
    staleTime: 60 * 1000,
  })

  const exams = data?.data ?? []
  const filtered = search
    ? exams.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.course?.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : exams

  const totalPages = data?.last_page ?? 1

  return (
    <div className={styles.page}>

      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{t('nav.exams')}</h1>
          <p className={styles.pageCount}>
            {isLoading ? 'Loading…' : `${data?.total ?? 0} exam${(data?.total ?? 0) !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => navigate('/teacher/exams/generate')}
        >
          <SparkIcon />
          Generate AI Exam
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><SearchIcon /></span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by title or course…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search exams"
          />
        </div>
        <select
          className={styles.filterSelect}
          value={status}
          onChange={e => { setStatus(e.target.value as typeof status); setPage(1) }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Active / Live</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table} aria-label="Exams list">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Course</th>
              <th scope="col">Qs</th>
              <th scope="col">Marks</th>
              <th scope="col">Status</th>
              <th scope="col">Window</th>
              <th scope="col">Attempts</th>
              <th scope="col">Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
            ) : isError ? (
              <tr>
                <td colSpan={8}>
                  <div className={styles.emptyState}>
                    <span style={{ color: 'var(--color-amber)' }}><AlertIcon /></span>
                    <p className={styles.emptyTitle}>Failed to load exams</p>
                    <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>Retry</button>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className={styles.emptyState}>
                    <span style={{ color: 'var(--text-muted)' }}><ClipboardEmptyIcon /></span>
                    <p className={styles.emptyTitle}>
                      {search || status ? 'No exams match your filters' : 'No exams yet'}
                    </p>
                    <p className={styles.emptyText}>
                      {search || status ? 'Try adjusting your search or filter' : 'Generate your first AI exam to get started'}
                    </p>
                    {!search && !status && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        style={{ marginBlockStart: 4 }}
                        onClick={() => navigate('/teacher/exams/generate')}
                      >
                        <SparkIcon /> Generate AI Exam
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((exam, i) => (
                <ExamRow
                  key={exam.id}
                  exam={exam}
                  index={i}
                  onNavigate={() => navigate(`/teacher/exams/${exam.id}`)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronIcon dir="left" />
          </button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronIcon dir="right" />
          </button>
        </div>
      )}

    </div>
  )
}
