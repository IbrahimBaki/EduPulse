import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import api from '../../lib/axios'
import styles from './Dashboard.module.css'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UpcomingSession {
  id: number
  title: string
  starts_at: string
  ends_at: string
  type: 'online' | 'offline'
  jitsi_url: string | null
  status: string
}

interface WeakTopic {
  topic: string
  score: number
  attempts: number
}

interface RecentQuiz {
  topic: string
  score: number
  passed: boolean
  level: number
  created_at: string
}

interface AttendanceSummary {
  rate: number
  total: number
  present: number
}

interface DashboardData {
  enrolled_courses: number
  upcoming_sessions: UpcomingSession[]
  my_weak_topics: WeakTopic[]
  recent_quizzes: RecentQuiz[]
  attendance_summary: AttendanceSummary
  pending_fees: number
  unread_notifications: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = name.trim().split(/\s+/)[0]
  return `${salutation}, ${firstName}`
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function isToday(isoString: string): boolean {
  const d = new Date(isoString)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isTomorrow(isoString: string): boolean {
  const d = new Date(isoString)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  )
}

function isWithin30Min(isoString: string): boolean {
  const diff = new Date(isoString).getTime() - Date.now()
  return diff > 0 && diff <= 30 * 60 * 1000
}

function minutesUntil(isoString: string): number {
  return Math.ceil((new Date(isoString).getTime() - Date.now()) / 60_000)
}

function formatSessionDay(isoString: string): string {
  if (isToday(isoString)) return 'Today'
  if (isTomorrow(isoString)) return 'Tomorrow'
  return new Date(isoString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatSessionTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatRelativeDate(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = '14px', radius = '4px' }: { w?: string; h?: string; radius?: string }) {
  return <div className={styles.skeleton} style={{ width: w, height: h, borderRadius: radius }} />
}

// ─── Next session banner ─────────────────────────────────────────────────────

function NextSessionBanner({ session }: { session: UpcomingSession }) {
  const mins = minutesUntil(session.starts_at)
  const label = mins <= 1 ? 'Starting now' : `Starts in ${mins} min`

  return (
    <div className={styles.sessionBanner} role="status">
      <AlertTriangleIcon />
      <div className={styles.sessionBannerBody}>
        <span className={styles.sessionBannerTitle}>{session.title}</span>
        <span className={styles.sessionBannerTime}>{label}</span>
      </div>
      {session.jitsi_url && session.type === 'online' && (
        <a
          href={session.jitsi_url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.joinBtn}
        >
          Join now
          <ExternalLinkIcon />
        </a>
      )}
    </div>
  )
}

// ─── Upcoming sessions ───────────────────────────────────────────────────────

function UpcomingSessions({ sessions, loading }: { sessions?: UpcomingSession[]; loading: boolean }) {
  return (
    <section aria-labelledby="upcoming-label">
      <h2 id="upcoming-label" className={styles.sectionLabel}>Upcoming sessions</h2>

      {loading ? (
        <div className={styles.sessionsScroll}>
          {[148, 148, 148].map((w, i) => (
            <Skeleton key={i} w={`${w}px`} h="100px" radius="8px" />
          ))}
        </div>
      ) : !sessions?.length ? (
        <p className={styles.emptyNote}>No sessions scheduled.</p>
      ) : (
        <div className={styles.sessionsScroll} role="list">
          {sessions.map(session => {
            const today = isToday(session.starts_at)
            return (
              <div
                key={session.id}
                role="listitem"
                className={`${styles.sessionItem} ${today ? styles.sessionItemToday : ''}`}
              >
                <span className={`${styles.sessionDay} ${today ? styles.sessionDayToday : ''}`}>
                  {formatSessionDay(session.starts_at)}
                </span>
                <span className={styles.sessionTime}>
                  {formatSessionTime(session.starts_at)}
                </span>
                <span className={styles.sessionTitle} lang="ar">{session.title}</span>
                <span className={`${styles.sessionTypeBadge} ${session.type === 'online' ? styles.sessionTypeOnline : styles.sessionTypeOffline}`}>
                  {session.type}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ─── Recent quiz results ─────────────────────────────────────────────────────

function RecentQuizzes({ quizzes, loading }: { quizzes?: RecentQuiz[]; loading: boolean }) {
  return (
    <section aria-labelledby="quizzes-label">
      <h2 id="quizzes-label" className={styles.sectionLabel}>Recent results</h2>

      {loading ? (
        <div className={styles.quizList}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={styles.quizRowSkeleton}>
              <Skeleton w="55%" h="13px" />
              <Skeleton w="32px" h="13px" />
              <Skeleton w="40px" h="11px" />
            </div>
          ))}
        </div>
      ) : !quizzes?.length ? (
        <p className={styles.emptyNote}>No quiz attempts yet.</p>
      ) : (
        <ul className={styles.quizList} aria-label="Recent quiz results">
          {quizzes.map((q, i) => (
            <li key={i} className={styles.quizRow}>
              <span className={styles.quizTopic} lang="ar">{q.topic}</span>
              <span className={`${styles.quizScore} ${q.passed ? styles.quizScorePassed : styles.quizScoreFailed}`}>
                {q.score}%
              </span>
              <span className={styles.quizDate}>{formatRelativeDate(q.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Attendance summary ───────────────────────────────────────────────────────

function AttendanceSummary({ summary, loading }: { summary?: AttendanceSummary; loading: boolean }) {
  return (
    <section aria-labelledby="attendance-label">
      <h2 id="attendance-label" className={styles.sectionLabel}>Attendance</h2>

      {loading ? (
        <>
          <Skeleton w="60%" h="16px" />
          <div style={{ height: '8px' }} />
          <Skeleton w="100%" h="6px" radius="999px" />
          <div style={{ height: '12px' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <Skeleton w="48px" h="28px" />
            <Skeleton w="48px" h="28px" />
            <Skeleton w="48px" h="28px" />
          </div>
        </>
      ) : !summary || summary.total === 0 ? (
        <p className={styles.emptyNote}>No session records yet.</p>
      ) : (
        <>
          <p className={styles.attendanceFraction}>
            {summary.present} <span className={styles.attendanceFractionOf}>of {summary.total}</span> sessions attended
          </p>
          <div
            className={styles.attendanceBar}
            role="progressbar"
            aria-valuenow={summary.rate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${summary.rate}% attendance`}
          >
            <div
              className={styles.attendanceBarFill}
              style={{ width: `${summary.rate}%` }}
            />
          </div>
          <div className={styles.attendanceBreakdown}>
            <div className={styles.attendanceStat}>
              <span className={styles.attendanceStatNum}>{summary.rate}%</span>
              <span className={styles.attendanceStatLabel}>Rate</span>
            </div>
            <div className={styles.attendanceDivider} />
            <div className={styles.attendanceStat}>
              <span className={styles.attendanceStatNum}>{summary.total - summary.present}</span>
              <span className={styles.attendanceStatLabel}>Absent</span>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

// ─── Weak topics ─────────────────────────────────────────────────────────────

function WeakTopics({ topics }: { topics?: WeakTopic[] }) {
  if (!topics?.length) return null
  return (
    <section aria-labelledby="topics-label">
      <h2 id="topics-label" className={styles.sectionLabel}>Topics to review</h2>
      <div className={styles.topicPills} role="list">
        {topics.map((t, i) => (
          <span
            key={i}
            role="listitem"
            className={`${styles.topicPill} ${t.score < 60 ? styles.topicPillWeak : ''}`}
          >
            <span lang="ar">{t.topic}</span>
            <span className={styles.topicScore}>{t.score}%</span>
          </span>
        ))}
      </div>
    </section>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)

  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ['student-dashboard'],
    queryFn: () => api.get('/student/dashboard').then(r => r.data.data),
  })

  const nextSession = data?.upcoming_sessions?.[0]
  const showBanner  = nextSession ? isWithin30Min(nextSession.starts_at) : false

  return (
    <div className={styles.page}>

      {/* Greeting */}
      <header className={styles.pageHead}>
        <h1 className={styles.greeting}>
          {user?.name ? getGreeting(user.name) : 'Welcome back'}
        </h1>
        <p className={styles.greetingDate}>{formatTodayDate()}</p>
      </header>

      {/* Next session alert */}
      {showBanner && nextSession && (
        <NextSessionBanner session={nextSession} />
      )}

      {/* Error state */}
      {isError && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangleIcon />
          <span>Could not load your dashboard.</span>
          <button type="button" onClick={() => refetch()} className={styles.retryBtn}>
            Retry
          </button>
        </div>
      )}

      {/* Upcoming sessions */}
      <UpcomingSessions sessions={data?.upcoming_sessions} loading={isLoading} />

      {/* Quiz + Attendance */}
      <div className={styles.twoCol}>
        <RecentQuizzes quizzes={data?.recent_quizzes} loading={isLoading} />
        <AttendanceSummary summary={data?.attendance_summary} loading={isLoading} />
      </div>

      {/* Weak topics */}
      {!isLoading && <WeakTopics topics={data?.my_weak_topics} />}

      {/* Summary bar */}
      {!isLoading && data && (
        <footer className={styles.summaryBar}>
          <Link to="/student/courses" className={styles.summaryLink}>
            {data.enrolled_courses} {data.enrolled_courses === 1 ? 'course' : 'courses'} enrolled
            <ChevronRightIcon />
          </Link>
          {data.pending_fees > 0 && (
            <Link to="/student/fees" className={styles.feesBadge}>
              <AlertTriangleIcon />
              {data.pending_fees.toLocaleString()} pending
            </Link>
          )}
        </footer>
      )}

    </div>
  )
}
