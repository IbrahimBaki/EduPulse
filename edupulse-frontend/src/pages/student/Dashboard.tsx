import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

function getGreeting(name: string, t: (key: string) => string): string {
  const hour = new Date().getHours()
  const salutation = hour < 12 ? t('student.dashboard.goodMorning') : hour < 17 ? t('student.dashboard.goodAfternoon') : t('student.dashboard.goodEvening')
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
  return new Date(isoString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatSessionTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatRelativeDate(isoString: string): string {
  const days = Math.floor(
    (Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

// ─── Data-driven motivation ───────────────────────────────────────────────────

function getMotivation(data?: DashboardData): string {
  if (!data) return ''
  const hour    = new Date().getHours()
  const quizzes = data.recent_quizzes ?? []
  const passed  = quizzes.filter(q => q.passed).length
  const rate    = data.attendance_summary?.rate ?? 0
  const total   = data.attendance_summary?.total ?? 0
  const weak    = (data.my_weak_topics ?? []).length

  if (quizzes.length === 0) {
    if (hour < 12) return 'No quizzes yet. Starting one today takes 5 minutes and begins your streak.'
    if (hour < 17) return 'Your score board is empty. Take a quick quiz and change that.'
    return 'A good evening for your first quiz. AI Tutor will walk you through it.'
  }
  if (passed === quizzes.length && quizzes.length >= 2) {
    return `All ${quizzes.length} recent quizzes passed. You're building real knowledge.`
  }
  if (rate >= 90 && total > 0) {
    return `${rate}% attendance this term. That consistency is what separates the best from the rest.`
  }
  if (weak >= 1) {
    return `${weak} topic${weak > 1 ? 's' : ''} where you can still improve. AI Tutor can work through each one with you.`
  }
  if (hour < 12) return "Let's build on yesterday. Your sessions and quizzes are ready."
  if (hour < 17) return 'Good progress. Every session this week moves you forward.'
  return 'Good session today. Come back tomorrow to keep the streak going.'
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 820): number {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number>(0)
  const hasRun = useRef(false)

  useEffect(() => {
    if (target === 0 || hasRun.current) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setDisplay(target)
      hasRun.current = true
      return
    }
    hasRun.current = true
    const t0 = performance.now()

    function step(now: number) {
      const p = Math.min((now - t0) / duration, 1)
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      setDisplay(Math.round(eased * target))
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return target === 0 ? 0 : display
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BookOpenIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
      <path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="8 21 12 17 16 21"/>
      <path d="M6 3H18V8C18 11.3 15.3 14 12 14C8.7 14 6 11.3 6 8V3Z"/>
      <path d="M6 7H3C3 7 3 12 6 12"/>
      <path d="M18 7H21C21 7 21 12 18 12"/>
    </svg>
  )
}

function UserCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({
  w = '100%',
  h = '14px',
  radius = '4px',
}: {
  w?: string
  h?: string
  radius?: string
}) {
  return (
    <div
      className={styles.skeleton}
      style={{ width: w, height: h, borderRadius: radius }}
    />
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  colorVariant,
  loading,
}: {
  icon: React.ReactNode
  value: number
  label: string
  colorVariant: 'blue' | 'amber' | 'green'
  loading: boolean
}) {
  const displayed = useCountUp(loading ? 0 : value)

  const cardClass =
    colorVariant === 'blue'
      ? styles.statCardBlue
      : colorVariant === 'amber'
      ? styles.statCardAmber
      : styles.statCardGreen

  const iconClass =
    colorVariant === 'blue'
      ? styles.statCardIconBlue
      : colorVariant === 'amber'
      ? styles.statCardIconAmber
      : styles.statCardIconGreen

  return (
    <div data-animate className={`${styles.statCard} ${cardClass}`}>
      <div className={`${styles.statCardIcon} ${iconClass}`}>{icon}</div>
      <div className={styles.statCardNum}>
        {loading ? (
          <span className={styles.statCardDash}>–</span>
        ) : (
          displayed
        )}
      </div>
      <div className={styles.statCardLabel}>{label}</div>
    </div>
  )
}

// ─── AI Tutor banner ──────────────────────────────────────────────────────────

function AiTutorBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = topic.trim()
    navigate(
      trimmed
        ? `/student/ai-tutor?topic=${encodeURIComponent(trimmed)}`
        : '/student/ai-tutor'
    )
  }

  return (
    <div
      data-animate
      className={styles.aiTutorBanner}
      role="region"
      aria-label={t('student.dashboard.aiTutorQuickStart')}
    >
      <div className={styles.aiTutorBannerIcon}>
        <SparklesIcon />
      </div>
      <div className={styles.aiTutorBannerBody}>
        <p className={styles.aiTutorBannerTitle}>{t('student.dashboard.aiTutorReady')}</p>
        <form className={styles.aiTutorBannerForm} onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.aiTutorBannerInput}
            placeholder={t('student.dashboard.whatToLearn')}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            aria-label={t('student.dashboard.topicAriaLabel')}
          />
          <button
            type="submit"
            className={styles.aiTutorBannerBtn}
            aria-label={t('student.dashboard.startLearning')}
          >
            <ArrowRightIcon />
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Hero section ─────────────────────────────────────────────────────────────

function HeroSection({
  userName,
  schoolName,
  data,
  loading,
}: {
  userName: string
  schoolName: string
  data?: DashboardData
  loading: boolean
}) {
  const { t } = useTranslation()
  const greeting   = userName ? getGreeting(userName, t) : t('student.dashboard.welcomeBack')
  const motivation = getMotivation(data)

  return (
    <header data-animate className={styles.hero}>
      <div className={styles.heroGreeting}>
        <span className={styles.waveEmoji} aria-hidden="true">👋</span>
        <h1 className={styles.greeting}>{greeting}</h1>
      </div>
      {schoolName && <p className={styles.heroSub}>{schoolName}</p>}
      <p className={styles.heroDate}>{formatTodayDate()}</p>
      {!loading && motivation && (
        <p className={styles.motivation}>{motivation}</p>
      )}
    </header>
  )
}

// ─── Next session banner ──────────────────────────────────────────────────────

function NextSessionBanner({ session }: { session: UpcomingSession }) {
  const { t } = useTranslation()
  const mins  = minutesUntil(session.starts_at)
  const label = mins <= 1 ? t('student.dashboard.startingNow') : t('student.dashboard.startsIn', { mins })

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
          {t('session.joinNow')} <ExternalLinkIcon />
        </a>
      )}
    </div>
  )
}

// ─── Upcoming sessions ────────────────────────────────────────────────────────

function UpcomingSessions({
  sessions,
  loading,
}: {
  sessions?: UpcomingSession[]
  loading: boolean
}) {
  const { t } = useTranslation()
  return (
    <section data-animate aria-labelledby="upcoming-label">
      <h2 id="upcoming-label" className={styles.sectionLabel}>
        <CalendarIcon /> {t('student.dashboard.upcomingSessions')}
      </h2>

      {loading ? (
        <div className={styles.sessionsScroll}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} w="148px" h="100px" radius="10px" />
          ))}
        </div>
      ) : !sessions?.length ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <polyline points="9 16 11 18 15 14"/>
            </svg>
          </div>
          <p className={styles.emptyTitle}>{t('student.dashboard.scheduleClear')}</p>
          <p className={styles.emptyHint}>{t('student.dashboard.scheduleClearHint')}</p>
          <div className={styles.emptyActions}>
            <Link to="/student/courses" className={styles.emptyBtn}>
              {t('student.dashboard.browseLessons')} <ChevronRightIcon />
            </Link>
            <Link to="/student/ai-tutor" className={styles.emptyBtnOutline}>
              {t('student.dashboard.practiceWithAiTutor')} <ChevronRightIcon />
            </Link>
          </div>
        </div>
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
                <span
                  className={`${styles.sessionDay} ${today ? styles.sessionDayToday : ''}`}
                >
                  {formatSessionDay(session.starts_at)}
                </span>
                <span className={styles.sessionTime}>
                  {formatSessionTime(session.starts_at)}
                </span>
                <span className={styles.sessionTitle} lang="ar">
                  {session.title}
                </span>
                <span
                  className={`${styles.sessionTypeBadge} ${
                    session.type === 'online'
                      ? styles.sessionTypeOnline
                      : styles.sessionTypeOffline
                  }`}
                >
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

// ─── Recent quiz results ──────────────────────────────────────────────────────

function RecentQuizzes({
  quizzes,
  loading,
}: {
  quizzes?: RecentQuiz[]
  loading: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section className={styles.card} aria-labelledby="quizzes-label">
      <header className={styles.cardHeader}>
        <span className={`${styles.cardHeaderIcon} ${styles.cardHeaderIconBlue}`}>
          <TrophyIcon />
        </span>
        <h2 id="quizzes-label" className={styles.cardTitle}>{t('student.dashboard.recentResults')}</h2>
      </header>

      {loading ? (
        <div className={styles.quizList}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={styles.quizRowSkeleton}>
              <Skeleton w="55%" h="13px" />
              <Skeleton w="32px" h="13px" />
              <Skeleton w="40px" h="11px" />
            </div>
          ))}
        </div>
      ) : !quizzes?.length ? (
        <div className={styles.cardEmpty}>
          <div className={styles.cardEmptyIcon} aria-hidden="true">
            <TrophyIcon />
          </div>
          <p className={styles.cardEmptyTitle}>{t('student.dashboard.scoreBoardEmpty')}</p>
          <p className={styles.cardEmptyHint}>
            {t('student.dashboard.scoreBoardEmptyHint')}
          </p>
          <button
            type="button"
            className={styles.emptyBtn}
            onClick={() => navigate('/student/ai-tutor')}
          >
            {t('student.dashboard.startWithAiTutor')} <ArrowRightIcon />
          </button>
        </div>
      ) : (
        <ul className={styles.quizList} aria-label={t('student.dashboard.recentResults')}>
          {quizzes.map((q, i) => (
            <li
              key={i}
              className={`${styles.quizRow} ${q.passed ? styles.quizRowPassed : ''}`}
              style={{ '--row-i': `${i * 48}ms` } as React.CSSProperties}
            >
              <span className={styles.quizTopic} lang="ar">
                {q.topic}
              </span>
              <span
                className={`${styles.quizScore} ${
                  q.passed ? styles.quizScorePassed : styles.quizScoreFailed
                }`}
              >
                {q.score === 100 && (
                  <span className={styles.quizStar} aria-label={t('student.dashboard.perfectScore')}>
                    ★
                  </span>
                )}
                {q.score}%
              </span>
              <span className={styles.quizDate}>
                {formatRelativeDate(q.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Attendance summary ───────────────────────────────────────────────────────

function AttendanceSummarySection({
  summary,
  loading,
}: {
  summary?: AttendanceSummary
  loading: boolean
}) {
  const { t } = useTranslation()
  const isExcellent =
    (summary?.rate ?? 0) >= 90 && (summary?.total ?? 0) > 0

  return (
    <section className={styles.card} aria-labelledby="attendance-label">
      <header className={styles.cardHeader}>
        <span
          className={`${styles.cardHeaderIcon} ${
            isExcellent ? styles.cardHeaderIconGreen : styles.cardHeaderIconAmber
          }`}
        >
          <UserCheckIcon />
        </span>
        <h2 id="attendance-label" className={styles.cardTitle}>
          {t('student.dashboard.attendance')}
        </h2>
      </header>

      {loading ? (
        <>
          <Skeleton w="60%" h="16px" />
          <div style={{ height: '8px' }} />
          <Skeleton w="100%" h="6px" radius="999px" />
          <div style={{ height: '12px' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <Skeleton w="48px" h="28px" />
            <Skeleton w="48px" h="28px" />
          </div>
        </>
      ) : !summary || summary.total === 0 ? (
        <div className={styles.cardEmpty}>
          <div className={styles.cardEmptyIcon} aria-hidden="true">
            <UserCheckIcon />
          </div>
          <p className={styles.cardEmptyTitle}>{t('student.dashboard.noRecords')}</p>
          <p className={styles.cardEmptyHint}>
            {t('student.dashboard.noRecordsHint')}
          </p>
        </div>
      ) : (
        <>
          <p className={styles.attendanceFraction}>
            {summary.present}{' '}
            <span className={styles.attendanceFractionOf}>
              {t('student.dashboard.of')} {summary.total}
            </span>{' '}
            {t('student.dashboard.attended')}
          </p>
          <div
            className={styles.attendanceBar}
            role="progressbar"
            aria-valuenow={summary.rate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${summary.rate}% ${t('student.dashboard.attendance')}`}
          >
            <div
              className={`${styles.attendanceBarFill} ${
                isExcellent ? styles.attendanceBarExcellent : ''
              }`}
              style={{ width: `${summary.rate}%` }}
            />
          </div>
          <div className={styles.attendanceBreakdown}>
            <div className={styles.attendanceStat}>
              <span className={styles.attendanceStatNum}>{summary.rate}%</span>
              <span className={styles.attendanceStatLabel}>{t('student.dashboard.rate')}</span>
            </div>
            <div className={styles.attendanceDivider} />
            <div className={styles.attendanceStat}>
              <span className={styles.attendanceStatNum}>
                {summary.total - summary.present}
              </span>
              <span className={styles.attendanceStatLabel}>{t('student.dashboard.absent')}</span>
            </div>
          </div>
          {isExcellent && (
            <div
              className={styles.attendanceCelebration}
              aria-label={t('student.dashboard.excellentAttendance')}
            >
              <FlameIcon />
              <span>{t('student.dashboard.excellentAttendance')}</span>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ─── Level-up topics ─────────────────────────────────────────────────────────

function LevelUpTopics({ topics }: { topics?: WeakTopic[] }) {
  const { t } = useTranslation()
  const navigate   = useNavigate()
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReduced) return
    sectionRef.current.animate(
      [
        { opacity: '0', transform: 'translateY(14px)' },
        { opacity: '1', transform: 'none' },
      ],
      { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' }
    )
  }, [])

  if (!topics?.length) return null

  return (
    <section ref={sectionRef} aria-labelledby="topics-label">
      <h2 id="topics-label" className={styles.sectionLabel}>
        <SparklesIcon /> {t('student.dashboard.levelUpTopics')}
      </h2>
      <div className={styles.topicPills} role="list">
        {topics.map((topic, i) => (
          <button
            key={i}
            role="listitem"
            type="button"
            className={`${styles.topicPill} ${
              topic.score < 60 ? styles.topicPillWeak : styles.topicPillMedium
            }`}
            onClick={() =>
              navigate(
                `/student/ai-tutor?topic=${encodeURIComponent(topic.topic)}`
              )
            }
            aria-label={`${t('student.dashboard.practice')} ${topic.topic} — ${topic.score}% ${t('student.dashboard.score')}`}
          >
            <span lang="ar">{topic.topic}</span>
            <span className={styles.topicScore}>{topic.score}%</span>
            <span className={styles.topicArrow} aria-hidden="true">
              <ChevronRightIcon />
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation()
  const user       = useAuthStore(s => s.user)
  const tenantCode = useAuthStore(s => s.tenantCode)
  const pageRef    = useRef<HTMLDivElement>(null)

  const schoolName = tenantCode
    ? tenantCode.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''

  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ['student-dashboard'],
    queryFn: () => api.get('/student/dashboard').then(r => r.data.data),
  })

  const nextSession = data?.upcoming_sessions?.[0]
  const showBanner  = nextSession ? isWithin30Min(nextSession.starts_at) : false

  // WAAPI directed entrance sequence
  useEffect(() => {
    if (!pageRef.current) return
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReduced) return

    const nodes = Array.from(
      pageRef.current.querySelectorAll<Element>('[data-animate]')
    )
    nodes.forEach((el, i) => {
      el.animate(
        [
          { opacity: '0', transform: 'translateY(16px)' },
          { opacity: '1', transform: 'translateY(0px)' },
        ],
        {
          duration: 380,
          delay: i * 55,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'both',
        }
      )
    })
  }, [])

  return (
    <div className={styles.page} ref={pageRef}>

      <HeroSection
        userName={user?.name ?? ''}
        schoolName={schoolName}
        data={data}
        loading={isLoading}
      />

      <div className={styles.statCardsGrid} aria-label={t('student.dashboard.quickOverview')}>
        <StatCard
          icon={<BookOpenIcon />}
          value={data?.enrolled_courses ?? 0}
          label={t('student.dashboard.coursesEnrolled')}
          colorVariant="blue"
          loading={isLoading}
        />
        <StatCard
          icon={<CalendarIcon />}
          value={data?.attendance_summary?.total ?? 0}
          label={t('student.dashboard.sessionsAttended')}
          colorVariant="amber"
          loading={isLoading}
        />
        <StatCard
          icon={<TrophyIcon />}
          value={data?.recent_quizzes?.length ?? 0}
          label={t('student.dashboard.quizzesTaken')}
          colorVariant="green"
          loading={isLoading}
        />
      </div>

      <AiTutorBanner />

      {showBanner && nextSession && (
        <NextSessionBanner session={nextSession} />
      )}

      {isError && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangleIcon />
          <span>{t('student.dashboard.couldNotLoad')}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className={styles.retryBtn}
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      <UpcomingSessions
        sessions={data?.upcoming_sessions}
        loading={isLoading}
      />

      <div data-animate className={styles.twoCol}>
        <RecentQuizzes
          quizzes={data?.recent_quizzes}
          loading={isLoading}
        />
        <AttendanceSummarySection
          summary={data?.attendance_summary}
          loading={isLoading}
        />
      </div>

      {!isLoading && <LevelUpTopics topics={data?.my_weak_topics} />}

      <footer data-animate className={styles.summaryBar}>
        <Link to="/student/courses" className={styles.coursePill}>
          <span className={styles.coursePillNum}>
            {data?.enrolled_courses ?? 0}
          </span>
          {t('student.dashboard.coursesEnrolled')}
          <ChevronRightIcon />
        </Link>

        {(data?.pending_fees ?? 0) > 0 && (
          <Link to="/student/fees" className={styles.feesBadge}>
            <AlertTriangleIcon />
            {data!.pending_fees.toLocaleString()} {t('student.dashboard.pending')}
          </Link>
        )}

        <Link to="/student/ai-tutor" className={styles.aiTutorCta}>
          <SparklesIcon /> {t('student.dashboard.goToAiTutor')} <ArrowRightIcon />
        </Link>
      </footer>

    </div>
  )
}
