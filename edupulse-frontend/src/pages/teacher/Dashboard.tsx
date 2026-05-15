import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import api from '../../lib/axios'
import styles from './Dashboard.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeacherDashboardData {
  stats?: {
    my_courses?: number
    total_students?: number
    sessions_today?: number
    at_risk_count?: number
  }
  sessions_today?: Session[]
  at_risk_students?: AtRiskStudent[]
  recent_quiz_activity?: QuizActivity[]
  topic_performance?: TopicPerformance[]
}

interface Session {
  id: number
  course_name: string
  grade_level: string
  type: 'online' | 'in_person'
  starts_at: string
  ends_at: string
  jitsi_url?: string
}

interface AtRiskStudent {
  id: number
  name: string
  course_name: string
  weakest_topic: string
  weakest_score: number
}

interface QuizActivity {
  id: number
  student_name: string
  topic: string
  score: number
  grade_level: string
  submitted_at: string
}

interface TopicPerformance {
  topic: string
  avg_score: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function getGreeting(name: string, t: (key: string) => string): string {
  const hour = new Date().getHours()
  const salutation = hour < 12 ? t('teacher.dashboard.goodMorning') : hour < 17 ? t('teacher.dashboard.goodAfternoon') : t('teacher.dashboard.goodEvening')
  return `${salutation}, ${name.trim().split(/\s+/)[0]}`
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatTimeRange(starts: string, ends: string): string {
  return `${formatTime(starts)} – ${formatTime(ends)}`
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type SessionStatus = 'live' | 'soon' | 'upcoming' | 'past'

function getSessionStatus(session: Session): SessionStatus {
  const now = Date.now()
  const start = new Date(session.starts_at).getTime()
  const end   = new Date(session.ends_at).getTime()
  if (now >= start && now <= end) return 'live'
  if (start > now && start - now <= 30 * 60 * 1000) return 'soon'
  if (start > now) return 'upcoming'
  return 'past'
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCountUp(target: number, enabled: boolean, duration = 900): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (target === 0) { setValue(0); return }
    setValue(0)
    let startTs: number | null = null
    const step = (ts: number) => {
      if (startTs === null) startTs = ts
      const progress = Math.min((ts - startTs) / duration, 1)
      setValue(Math.round((1 - Math.pow(1 - progress, 4)) * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
      else setValue(target)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, enabled, duration])

  return value
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function AlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  )
}

function CalendarEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function QuizEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )
}

function BarEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = '14px', radius = '4px' }: { w?: string; h?: string; radius?: string }) {
  return <span className={styles.skeleton} style={{ width: w, height: h, borderRadius: radius }} aria-hidden="true" />
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>{icon}</div>
      <p className={styles.emptyStateMsg}>{message}</p>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, loading, amber }: {
  label: string
  value: number
  sub?: string
  loading: boolean
  amber?: boolean
}) {
  const animated = useCountUp(value, !loading)

  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue}${amber && !loading && value > 0 ? ' ' + styles.statValueAmber : ''}`}>
        {loading ? <Skeleton w="52px" h="28px" radius="4px" /> : animated.toLocaleString()}
      </span>
      {sub && (
        <span className={styles.statSub}>{loading ? <Skeleton w="60%" h="11px" /> : sub}</span>
      )}
    </div>
  )
}

// ─── Dot class map ────────────────────────────────────────────────────────────

const DOT_CLASS: Record<SessionStatus, string> = {
  live:     styles.timelineDotLive,
  soon:     styles.timelineDotSoon,
  upcoming: styles.timelineDotUpcoming,
  past:     styles.timelineDotPast,
}

// ─── Today's sessions ─────────────────────────────────────────────────────────

function TodaySessions({ sessions, loading, error, refetch }: {
  sessions?: Session[]
  loading: boolean
  error: boolean
  refetch: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Today's sessions</h2>
        {!loading && !error && (
          <span className={styles.panelCount}>{sessions?.length ?? 0}</span>
        )}
      </div>

      {loading ? (
        <div className={styles.skeletonStack}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.sessionSkeletonRow}>
              <Skeleton w="10px" h="10px" radius="50%" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Skeleton w="35%" h="11px" />
                <Skeleton w="62%" h="13px" />
                <Skeleton w="45%" h="10px" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorInline} role="alert">
          <AlertIcon />
          <span>Failed to load sessions</span>
          <button type="button" onClick={refetch} className={styles.retryBtnSmall}>Retry</button>
        </div>
      ) : !sessions?.length ? (
        <EmptyState icon={<CalendarEmptyIcon />} message={t('teacher.dashboard.noSessionsToday')} />
      ) : (
        <ul className={styles.timelineList} aria-label="Today's sessions">
          {sessions.map((session, i) => {
            const status = getSessionStatus(session)
            const showJoin =
              (status === 'live' || (status === 'soon' && session.type === 'online')) &&
              !!session.jitsi_url

            return (
              <li key={session.id} className={styles.timelineItem}>
                <div className={styles.timelineTrack}>
                  <div
                    className={`${styles.timelineDot} ${DOT_CLASS[status]}`}
                    aria-hidden="true"
                  />
                  {i < sessions.length - 1 && (
                    <div className={styles.trackLine} aria-hidden="true" />
                  )}
                </div>

                <div className={styles.sessionBody}>
                  <div className={styles.sessionTopRow}>
                    <span className={styles.sessionTime}>
                      {formatTimeRange(session.starts_at, session.ends_at)}
                    </span>
                    {status === 'live' && (
                      <span className={styles.liveChip} aria-label={t('session.live')}>{t('session.live')}</span>
                    )}
                    {status === 'soon' && (
                      <span className={styles.soonChip} aria-label={t('session.startingSoon')}>{t('session.startingSoon')}</span>
                    )}
                  </div>

                  <div className={styles.sessionName}>{session.course_name}</div>

                  <div className={styles.sessionBadges}>
                    <span className={styles.gradeBadge}>{session.grade_level}</span>
                    <span className={styles.typeBadge}>
                      {session.type === 'online' ? t('common.online') : t('common.inPerson')}
                    </span>
                  </div>

                  {showJoin && (
                    <a
                      href={session.jitsi_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.joinBtn}
                      aria-label={`Join ${session.course_name} on Jitsi`}
                    >
                      <VideoIcon />
                      {t('session.joinNow')}
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ─── At-risk students ─────────────────────────────────────────────────────────

function AtRiskStudents({ students, loading, error, refetch }: {
  students?: AtRiskStudent[]
  loading: boolean
  error: boolean
  refetch: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>At-risk students</h2>
        {!loading && !error && !!students?.length && (
          <span className={styles.panelCount}>{students.length} flagged</span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Skeleton w="32px" h="32px" radius="50%" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skeleton w="55%" h="12px" />
                <Skeleton w="70%" h="10px" />
                <Skeleton w="45%" h="10px" />
              </div>
              <Skeleton w="30px" h="10px" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorInline} role="alert">
          <AlertIcon />
          <span>Failed to load</span>
          <button type="button" onClick={refetch} className={styles.retryBtnSmall}>Retry</button>
        </div>
      ) : !students?.length ? (
        <div className={styles.allGoodRow} role="status">
          <span style={{ color: 'oklch(68% 0.18 148)', display: 'flex' }}><CheckIcon /></span>
          <span>{t('teacher.dashboard.allPerformingWell')}</span>
        </div>
      ) : (
        <ul className={styles.atRiskList} aria-label="At-risk students">
          {students.map(s => (
            <li key={s.id} className={styles.atRiskRow}>
              <div className={styles.atRiskAvatar} aria-hidden="true">
                {nameInitials(s.name)}
              </div>
              <div className={styles.atRiskInfo}>
                <div className={styles.atRiskName}>{s.name}</div>
                <div className={styles.atRiskCourse}>{s.course_name}</div>
                <div className={styles.atRiskTopic}>
                  <span className={styles.topicLabel}>{s.weakest_topic}</span>
                  <span
                    className={s.weakest_score < 40 ? styles.scoreRed : styles.scoreAmber}
                    aria-label={`Score: ${s.weakest_score}%`}
                  >
                    {s.weakest_score}%
                  </span>
                </div>
              </div>
              <Link
                to="/teacher/students"
                className={styles.viewLink}
                aria-label={`View ${s.name}'s profile`}
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Recent quiz activity ─────────────────────────────────────────────────────

function RecentQuizActivity({ activity, loading, error, refetch }: {
  activity?: QuizActivity[]
  loading: boolean
  error: boolean
  refetch: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Recent quiz activity</h2>
        {!loading && !error && !!activity?.length && (
          <span className={styles.panelCount}>{Math.min(activity.length, 8)} attempts</span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={styles.quizSkeletonRow}>
              <Skeleton w="26px" h="26px" radius="50%" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skeleton w="55%" h="11px" />
                <Skeleton w="40%" h="10px" />
              </div>
              <Skeleton w="36px" h="12px" />
              <Skeleton w="40px" h="18px" radius="3px" />
              <Skeleton w="34px" h="10px" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorInline} role="alert">
          <AlertIcon />
          <span>Failed to load</span>
          <button type="button" onClick={refetch} className={styles.retryBtnSmall}>Retry</button>
        </div>
      ) : !activity?.length ? (
        <EmptyState icon={<QuizEmptyIcon />} message={t('teacher.dashboard.noQuizAttempts')} />
      ) : (
        <ul className={styles.quizList} aria-label="Recent quiz activity">
          {activity.slice(0, 8).map(a => (
            <li key={a.id} className={styles.quizRow}>
              <div className={styles.quizAvatar} aria-hidden="true">
                {nameInitials(a.student_name)}
              </div>
              <div className={styles.quizInfo}>
                <div className={styles.quizStudent}>{a.student_name}</div>
                <div className={styles.quizTopic}>{a.topic}</div>
              </div>
              <span
                className={`${styles.quizScore} ${a.score >= 60 ? styles.quizScorePass : styles.quizScoreFail}`}
                aria-label={`Score: ${a.score}%`}
              >
                {a.score}%
              </span>
              <span className={styles.gradeLevelBadge}>{a.grade_level}</span>
              <span className={styles.quizTime}>{timeAgo(a.submitted_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Topic performance chart ──────────────────────────────────────────────────

function CustomYTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload) return null
  const label = payload.value.length > 15 ? payload.value.slice(0, 14) + '…' : payload.value
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="oklch(62% 0.02 255)" fontSize={11}>
      {label}
    </text>
  )
}

function TopicPerformance({ topics, loading, error, refetch }: {
  topics?: TopicPerformance[]
  loading: boolean
  error: boolean
  refetch: () => void
}) {
  const { t } = useTranslation()
  const chartH = topics?.length ? Math.max(200, topics.length * 42) : 200

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Topic performance</h2>
        <span className={styles.panelCount}>{t('teacher.dashboard.avgScore')}</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Skeleton w="80px" h="10px" />
              <Skeleton w="100%" h="20px" radius="4px" />
              <Skeleton w="28px" h="10px" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorInline} role="alert">
          <AlertIcon />
          <span>Failed to load</span>
          <button type="button" onClick={refetch} className={styles.retryBtnSmall}>Retry</button>
        </div>
      ) : !topics?.length ? (
        <EmptyState icon={<BarEmptyIcon />} message={t('teacher.dashboard.noTopicData')} />
      ) : (
        <div className={styles.chartWrap} style={{ height: chartH }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={topics}
              margin={{ top: 4, right: 36, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'oklch(44% 0.015 255)' }}
                axisLine={false}
                tickLine={false}
                tickCount={6}
              />
              <YAxis
                type="category"
                dataKey="topic"
                tick={<CustomYTick />}
                axisLine={false}
                tickLine={false}
                width={96}
              />
              <Tooltip
                contentStyle={{
                  background: 'oklch(13.5% 0.022 255)',
                  border: '1px solid oklch(32% 0.02 255)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: 'oklch(95% 0.01 255)',
                  padding: '6px 10px',
                  boxShadow: 'none',
                }}
                cursor={{ fill: 'oklch(62% 0.02 255 / 0.06)' }}
                formatter={(value) => [`${value ?? 0}%`, 'Avg Score']}
              />
              <Bar
                dataKey="avg_score"
                radius={[0, 4, 4, 0]}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              >
                {topics.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.avg_score < 60 ? 'oklch(75% 0.18 75)' : 'oklch(62% 0.26 255)'}
                    fillOpacity={0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function TeacherDashboard() {
  const { t } = useTranslation()
  const user = useAuthStore(s => s.user)

  const {
    data: dash,
    isLoading: loading,
    isError: hasError,
    refetch,
  } = useQuery<TeacherDashboardData>({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.get('/teacher/dashboard').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const doRefetch = () => { refetch() }

  return (
    <div className={styles.page}>
      <div className={styles.pageAccent} aria-hidden="true" />

      <header className={styles.pageHead}>
        <h1 className={styles.greeting}>
          {user?.name ? getGreeting(user.name, t) : 'Teacher Dashboard'}
        </h1>
        <p className={styles.greetingDate}>{formatDate()}</p>
      </header>

      {hasError && (
        <div className={styles.errorBanner} role="alert">
          <AlertIcon />
          <span>Dashboard failed to load.</span>
          <button type="button" onClick={doRefetch} className={styles.retryBtn}>Retry</button>
        </div>
      )}

      <div className={styles.statsRow}>
        <StatCard
          label={t('teacher.dashboard.myCourses')}
          value={dash?.stats?.my_courses ?? 0}
          loading={loading}
        />
        <StatCard
          label={t('teacher.dashboard.totalStudents')}
          value={dash?.stats?.total_students ?? 0}
          loading={loading}
        />
        <StatCard
          label={t('teacher.dashboard.sessionsToday')}
          value={dash?.stats?.sessions_today ?? 0}
          loading={loading}
        />
        <StatCard
          label={t('teacher.dashboard.atRisk')}
          value={dash?.stats?.at_risk_count ?? 0}
          sub="score below 60%"
          loading={loading}
          amber
        />
      </div>

      <div className={styles.midRow}>
        <TodaySessions
          sessions={dash?.sessions_today}
          loading={loading}
          error={hasError}
          refetch={doRefetch}
        />
        <AtRiskStudents
          students={dash?.at_risk_students}
          loading={loading}
          error={hasError}
          refetch={doRefetch}
        />
      </div>

      <div className={styles.bottomRow}>
        <RecentQuizActivity
          activity={dash?.recent_quiz_activity}
          loading={loading}
          error={hasError}
          refetch={doRefetch}
        />
        <TopicPerformance
          topics={dash?.topic_performance}
          loading={loading}
          error={hasError}
          refetch={doRefetch}
        />
      </div>
    </div>
  )
}
