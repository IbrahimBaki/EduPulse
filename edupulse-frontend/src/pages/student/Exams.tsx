import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './Exams.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InProgressAttempt {
  started_at: string | null
}

interface UpcomingExam {
  id: number
  title: string
  course: { name: string }
  total_marks: number
  duration_minutes: number
  status: string
  starts_at: string | null
  ends_at: string | null
  in_progress_attempt: InProgressAttempt | null
}

interface CompletedExam {
  id: number
  exam_id: number
  status: 'submitted' | 'auto_submitted' | 'graded'
  submitted_at: string | null
  percentage: number
  is_passed: boolean
  result_available: boolean
  exam: {
    id: number
    title: string
    total_marks: number
    course: { id: number; name: string }
  }
}

interface ExamsData {
  upcoming: UpcomingExam[]
  completed: CompletedExam[]
}

// ─── Display state engine ─────────────────────────────────────────────────────

type DisplayState =
  | 'in-progress'   // started, not submitted — resume
  | 'closing-soon'  // window closes in < 60 min
  | 'live'          // window open, no urgency
  | 'starting-soon' // starts in < 24 h
  | 'scheduled'     // starts in > 24 h
  | 'missed'        // window closed, never attempted

const STATE_PRIORITY: Record<DisplayState, number> = {
  'in-progress':  0,
  'closing-soon': 1,
  'live':         2,
  'starting-soon':3,
  'scheduled':    4,
  'missed':       5,
}

function computeState(exam: UpcomingExam, now: Date): DisplayState {
  if (exam.in_progress_attempt) return 'in-progress'

  const start = exam.starts_at ? new Date(exam.starts_at) : null
  const end   = exam.ends_at   ? new Date(exam.ends_at)   : null
  const nowMs = now.getTime()

  if (end && end.getTime() < nowMs) return 'missed'

  const windowOpen = exam.status === 'active' || !start || start.getTime() <= nowMs

  if (windowOpen) {
    if (end && end.getTime() - nowMs < 60 * 60 * 1000) return 'closing-soon'
    return 'live'
  }

  if (start && start.getTime() - nowMs < 24 * 60 * 60 * 1000) return 'starting-soon'
  return 'scheduled'
}

function sortUpcoming(exams: UpcomingExam[], now: Date): UpcomingExam[] {
  return [...exams].sort((a, b) => {
    const pa = STATE_PRIORITY[computeState(a, now)]
    const pb = STATE_PRIORITY[computeState(b, now)]
    if (pa !== pb) return pa - pb
    const ta = a.starts_at ? new Date(a.starts_at).getTime() : 0
    const tb = b.starts_at ? new Date(b.starts_at).getTime() : 0
    return ta - tb
  })
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

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}

function CalendarIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}

function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

function ClipboardIcon() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/></svg>
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <span className={styles.skeleton} style={{ width: 140, height: 13, display: 'block', borderRadius: 4, marginBlockEnd: 16 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className={styles.examRow} aria-hidden="true">
            <div className={styles.rowMain}>
              <span className={styles.skeleton} style={{ width: '55%', height: 14, display: 'block', borderRadius: 4 }} />
              <span className={styles.skeleton} style={{ width: '30%', height: 11, display: 'block', borderRadius: 4, marginBlockStart: 8 }} />
            </div>
            <span className={styles.skeleton} style={{ width: 76, height: 24, borderRadius: 12 }} />
            <span className={styles.skeleton} style={{ width: 88, height: 32, borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Pulse dot ────────────────────────────────────────────────────────────────

function PulseDot({ variant }: { variant: 'green' | 'blue' | 'amber' }) {
  return <span className={`${styles.pulseDot} ${styles[`dot${variant.charAt(0).toUpperCase()}${variant.slice(1)}`]}`} aria-hidden="true" />
}

// ─── Upcoming exam row ────────────────────────────────────────────────────────

function UpcomingRow({ exam }: { exam: UpcomingExam }) {
  const navigate = useNavigate()

  const [now, setNow] = useState(() => new Date())

  const state = computeState(exam, now)
  const needsTicker = state === 'starting-soon' || state === 'closing-soon'

  useEffect(() => {
    if (!needsTicker) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [needsTicker])

  // Recompute with live `now`
  const s = computeState(exam, now)

  const countdownMs =
    s === 'closing-soon' && exam.ends_at
      ? Math.max(0, new Date(exam.ends_at).getTime() - now.getTime())
      : s === 'starting-soon' && exam.starts_at
      ? Math.max(0, new Date(exam.starts_at).getTime() - now.getTime())
      : 0

  const canTake = s === 'live' || s === 'closing-soon' || s === 'in-progress'
  const isMissed = s === 'missed'

  // ── Status badge config ──
  type BadgeCfg = { label: string; cls: string; dot?: 'green' | 'blue' | 'amber' }

  const badge: BadgeCfg = (() => {
    switch (s) {
      case 'in-progress':  return { label: 'In Progress',                      cls: styles.stInProgress, dot: 'blue' }
      case 'closing-soon': return { label: `Closes in ${fmtCountdown(countdownMs)}`, cls: styles.stClosing }
      case 'live':         return { label: 'Open Now',                          cls: styles.stLive,       dot: 'green' }
      case 'starting-soon':return { label: `Opens in ${fmtCountdown(countdownMs)}`, cls: styles.stSoon }
      case 'scheduled':    return { label: exam.starts_at ? `Opens ${fmtDateTime(exam.starts_at)}` : 'Scheduled', cls: styles.stScheduled }
      case 'missed':       return { label: 'Missed',                            cls: styles.stMissed }
    }
  })()

  const rowCls = {
    'in-progress':  styles.rowInProgress,
    'closing-soon': styles.rowClosing,
    'live':         styles.rowLive,
    'starting-soon':styles.rowSoon,
    'scheduled':    '',
    'missed':       styles.rowMissed,
  }[s]

  const btnLabel =
    s === 'in-progress'  ? 'Resume' :
    s === 'closing-soon' ? 'Take Now!' :
    s === 'live'         ? 'Take Exam' :
    s === 'starting-soon'? 'Not Yet' :
                           'Scheduled'

  const btnCls = [
    styles.takeBtn,
    !canTake               ? styles.takeBtnDisabled : '',
    s === 'closing-soon'   ? styles.takeBtnUrgent   : '',
    s === 'in-progress'    ? styles.takeBtnResume   : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={`${styles.examRow} ${rowCls}`} role="listitem">
      <div className={styles.rowMain}>
        <p className={`${styles.examTitle} ${isMissed ? styles.examTitleMissed : ''}`}>
          {exam.title}
        </p>
        <div className={styles.rowMeta}>
          <span className={styles.courseChip}>{exam.course.name}</span>
          <span className={styles.metaItem}><ClockIcon /> {exam.duration_minutes} min</span>
          {exam.total_marks > 0 && (
            <span className={styles.metaItem}>{exam.total_marks} marks</span>
          )}
          {s === 'in-progress' && exam.in_progress_attempt?.started_at && (
            <span className={styles.metaItem} style={{ color: 'var(--color-blue)' }}>
              Started {timeAgo(exam.in_progress_attempt.started_at)}
            </span>
          )}
          {(s === 'live' || s === 'closing-soon') && exam.ends_at && (
            <span className={styles.metaItem}>
              <CalendarIcon /> Ends {fmtDateTime(exam.ends_at)}
            </span>
          )}
          {s === 'scheduled' && exam.starts_at && (
            <span className={styles.metaItem}>
              <CalendarIcon /> {fmtDateTime(exam.starts_at)}
            </span>
          )}
          {s === 'missed' && exam.ends_at && (
            <span className={styles.metaItem}>
              Closed {fmtDate(exam.ends_at)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.rowActions}>
        <span className={`${styles.statusBadge} ${badge.cls}`}>
          {badge.dot && <PulseDot variant={badge.dot} />}
          {badge.label}
        </span>

        {!isMissed && (
          <button
            type="button"
            className={btnCls}
            disabled={!canTake}
            onClick={() => canTake && navigate(`/student/exams/${exam.id}/take`)}
          >
            {btnLabel}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentExams() {
  const { data, isLoading, isError, refetch } = useQuery<ExamsData>({
    queryKey: ['student-exams'],
    queryFn: () => api.get('/student/exams').then(r => r.data.data as ExamsData),
    staleTime: 30 * 1000,
  })

  if (isLoading) return <PageSkeleton />

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertIcon />
          <p>Failed to load exams.</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    )
  }

  const { upcoming, completed } = data
  const now = new Date()
  const sorted = sortUpcoming(upcoming, now)

  const missedCount   = sorted.filter(e => computeState(e, now) === 'missed').length
  const activeCount   = sorted.length - missedCount

  return (
    <div className={styles.page}>

      {/* ── Upcoming ── */}
      <section className={styles.section} aria-labelledby="upcoming-heading">
        <h2 className={styles.sectionHeading} id="upcoming-heading">
          Upcoming Exams
          {activeCount > 0 && <span className={styles.sectionCount}>{activeCount}</span>}
          {missedCount > 0 && <span className={styles.missedCount}>{missedCount} missed</span>}
        </h2>

        {sorted.length === 0 ? (
          <div className={styles.emptyState}>
            <ClipboardIcon />
            <p className={styles.emptyTitle}>No upcoming exams</p>
            <p className={styles.emptyText}>You're all caught up. Check back later.</p>
          </div>
        ) : (
          <div className={styles.examList} role="list">
            {sorted.map(e => <UpcomingRow key={e.id} exam={e} />)}
          </div>
        )}
      </section>

      {/* ── Completed ── */}
      <section className={styles.section} aria-labelledby="completed-heading">
        <h2 className={styles.sectionHeading} id="completed-heading">
          Completed Exams
          {completed.length > 0 && <span className={styles.sectionCount}>{completed.length}</span>}
        </h2>

        {completed.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No completed exams yet</p>
            <p className={styles.emptyText}>Your results will appear here after you submit.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Completed exams">
              <thead>
                <tr>
                  <th scope="col">Exam</th>
                  <th scope="col">Course</th>
                  <th scope="col">Score</th>
                  <th scope="col">Result</th>
                  <th scope="col">Submitted</th>
                  <th scope="col" aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {completed.map(e => (
                  <tr key={e.id} className={styles.tableRow}>
                    <td className={styles.examNameCell}>{e.exam?.title ?? '—'}</td>
                    <td><span className={styles.courseChip}>{e.exam?.course?.name ?? '—'}</span></td>
                    <td className={styles.numCell}>
                      {e.result_available
                        ? <span className={`${styles.pctNum} ${e.is_passed ? styles.pctPass : styles.pctFail}`}>{Number(e.percentage).toFixed(1)}%</span>
                        : <span className={styles.pendingText}>—</span>}
                    </td>
                    <td>
                      {e.result_available
                        ? <span className={`${styles.passBadge} ${e.is_passed ? styles.passGreen : styles.passFail}`}>{e.is_passed ? 'Pass' : 'Fail'}</span>
                        : e.status === 'graded'
                          ? <span className={styles.pendingApproval}>Pending Approval</span>
                          : <span className={styles.pendingBadge}>{e.status === 'auto_submitted' ? 'Auto-submitted' : 'Submitted'}</span>}
                    </td>
                    <td className={styles.dateCell}>{fmtDate(e.submitted_at)}</td>
                    <td>
                      {e.result_available
                        ? <Link to={`/student/exams/${e.exam_id}/result`} className={styles.viewLink}>View Details</Link>
                        : <span className={styles.pendingText}>Awaiting review</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}
