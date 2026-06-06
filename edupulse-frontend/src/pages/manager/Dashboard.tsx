import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '../../stores/authStore'
import api from '../../lib/axios'
import styles from './Dashboard.module.css'
import UserAvatar from '../../components/UserAvatar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  totals: {
    teachers: number
    students: number
    parents: number
    courses: number
    active_courses: number
  }
  attendance: {
    this_week_rate: string | number
    absent_today: number
  }
  academics: {
    at_risk_students: number
    avg_quiz_score: number
  }
  finance: {
    collection_rate: string | number
    overdue_count: number
  }
  upcoming_sessions: UpcomingSession[]
}

interface UpcomingSession {
  id: number
  title?: string
  course: { id: number; name: string } | string
  starts_at: string
  teacher: { id: number; name: string } | string
  enrolled_count?: number
}

interface AtRiskStudent {
  student: { id: number; name: string; code: string; avatar_url?: string | null }
  avg_quiz_score: number
  weak_topics: string[] | null
  attendance_rate: string
  fee_status: string
  enrolled_courses: number
}

interface PaginatedAtRisk {
  data: AtRiskStudent[]
  current_page: number
  per_page: number
  total: number
}

interface TrendPoint {
  month: string
  count: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRate(s: string | number | null | undefined): number {
  if (s == null) return 0
  if (typeof s === 'number') return s
  return parseFloat(String(s).replace('%', '')) || 0
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}


function getSalutationKey(): string {
  const hour = new Date().getHours()
  return hour < 12 ? 'manager.dashboard.goodMorning' : hour < 17 ? 'manager.dashboard.goodAfternoon' : 'manager.dashboard.goodEvening'
}


function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function getLast6Months(): Array<{ label: string; from: string; to: string }> {
  const result = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    result.push({ label, from, to })
  }
  return result
}

// ─── Animated counter hook ────────────────────────────────────────────────────

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
      const elapsed = ts - startTs
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setValue(target)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, enabled, duration])

  return value
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function AlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

function TrendEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}

function CalendarEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  message,
  action,
  onAction,
}: {
  icon: ReactNode
  message: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>{icon}</div>
      <p className={styles.emptyStateMsg}>{message}</p>
      {action && onAction && (
        <button type="button" className={styles.emptyStateAction} onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = '14px', radius = '4px' }: { w?: string; h?: string; radius?: string }) {
  return (
    <span
      className={styles.skeleton}
      style={{ width: w, height: h, borderRadius: radius }}
      aria-hidden="true"
    />
  )
}

// ─── Zone A: KPI cell ─────────────────────────────────────────────────────────

function KpiCell({
  label,
  value,
  suffix = '',
  delta,
  deltaColor,
  loading,
  accent,
}: {
  label: string
  value: number
  suffix?: string
  delta?: string
  deltaColor?: 'amber' | 'red'
  loading: boolean
  accent?: string
}) {
  const animated = useCountUp(value, !loading)

  const deltaClass = [
    styles.kpiDelta,
    deltaColor === 'amber' ? styles.kpiDeltaAmber : '',
    deltaColor === 'red'   ? styles.kpiDeltaRed   : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={styles.kpiCell}>
      <span className={styles.kpiLabel}>{label}</span>
      <span
        className={`${styles.kpiNumber}${accent && !loading ? ' ' + styles.statValuePulse : ''}`}
        style={accent ? { color: accent } : undefined}
      >
        {loading
          ? <Skeleton w="52px" h="28px" radius="4px" />
          : <>{animated.toLocaleString()}{suffix}</>
        }
      </span>
      {delta && (
        <span className={deltaClass}>
          {loading ? <Skeleton w="60%" h="11px" /> : delta}
        </span>
      )}
    </div>
  )
}

// ─── Enrollment trend ─────────────────────────────────────────────────────────

function EnrollmentTrend({
  data,
  loading,
  error,
}: {
  data?: TrendPoint[]
  loading: boolean
  error: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{t('manager.dashboard.enrollmentTrend')}</h2>
        <span className={styles.panelCount}>{t('manager.dashboard.last6Months')}</span>
      </div>

      {loading ? (
        <Skeleton w="100%" h="240px" radius="6px" />
      ) : error || !data?.length ? (
        <EmptyState
          icon={<TrendEmptyIcon />}
          message={t('manager.dashboard.enrollmentNotAvailable')}
        />
      ) : (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(62% 0.26 255)" stopOpacity={0.22} />
                  <stop offset="85%" stopColor="oklch(62% 0.26 255)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(32% 0.02 255)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'oklch(44% 0.015 255)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'oklch(44% 0.015 255)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
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
                cursor={{ stroke: 'oklch(32% 0.02 255)', strokeWidth: 1 }}
                itemStyle={{ color: 'oklch(62% 0.26 255)' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Students"
                stroke="oklch(62% 0.26 255)"
                strokeWidth={2}
                fill="url(#enrollGrad)"
                dot={(props) => {
                  const isLast = props.index === (data.length - 1)
                  const { cx, cy } = props
                  if (!isLast) return (
                    <circle key={`dot-${props.index}`} cx={cx} cy={cy} r={3} fill="oklch(62% 0.26 255)" />
                  )
                  return (
                    <g key="last-dot">
                      <circle cx={cx} cy={cy} r={4} fill="oklch(62% 0.26 255)" />
                      <circle cx={cx} cy={cy} r={8} className={styles.dotPulse} />
                    </g>
                  )
                }}
                activeDot={{ r: 5, fill: 'oklch(62% 0.26 255)', strokeWidth: 0 }}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── At-risk students ─────────────────────────────────────────────────────────

function AtRiskStudents({
  data,
  loading,
  error,
  refetch,
}: {
  data?: AtRiskStudent[]
  loading: boolean
  error: boolean
  refetch: () => void
}) {
  const { t } = useTranslation()
  const atRisk = data?.filter(s => s.avg_quiz_score < 60 || (s.weak_topics?.length ?? 0) > 0) ?? []

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{t('manager.dashboard.atRiskStudents')}</h2>
        {!loading && !error && (
          <span className={styles.panelCount}>{atRisk.length} {t('manager.dashboard.flagged')}</span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Skeleton w="30px" h="30px" radius="50%" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skeleton w="55%" h="12px" />
                <Skeleton w="80%" h="10px" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorInline} role="alert">
          <AlertIcon />
          <span>{t('manager.dashboard.failedToLoad')}</span>
          <button type="button" onClick={refetch} className={styles.retryBtnSmall}>{t('manager.dashboard.retry')}</button>
        </div>
      ) : atRisk.length === 0 ? (
        <div className={styles.emptyGood}>
          <CheckCircleIcon />
          <span>{t('manager.dashboard.allPerformingWell')}</span>
        </div>
      ) : (
        <ul className={styles.atRiskList} aria-label={t('manager.dashboard.atRiskStudents')}>
          {atRisk.slice(0, 8).map(s => (
            <li key={s.student.id} className={styles.atRiskRow}>
              <UserAvatar name={s.student.name} avatarUrl={s.student.avatar_url} className={styles.atRiskAvatar} />
              <div className={styles.atRiskInfo}>
                <div className={styles.atRiskName}>{s.student.name}</div>
                <div className={styles.atRiskScore}>
                  {s.avg_quiz_score}{t('manager.dashboard.avg')}
                  {(s.weak_topics?.length ?? 0) > 0 &&
                    ` · ${s.weak_topics!.length} ${s.weak_topics!.length !== 1 ? t('manager.dashboard.weakTopics') : t('manager.dashboard.weakTopic')}`
                  }
                </div>
                {(s.weak_topics?.length ?? 0) > 0 && (
                  <div className={styles.atRiskTopics}>
                    {(s.weak_topics ?? []).slice(0, 3).map((t, i) => (
                      <span key={i} className={styles.topicBadge} lang="ar">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Zone D: Today's sessions (horizontal scroll) ────────────────────────────

function ZoneDSessions({
  sessions,
  loading,
  onSchedule,
}: {
  sessions?: UpcomingSession[]
  loading: boolean
  onSchedule?: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className={styles.sessionsZone}>
      <div className={styles.sessionsZoneHead}>
        <h2 className={styles.sessionsZoneTitle}>{t('manager.dashboard.sessionsToday')}</h2>
        {!loading && (
          <span className={styles.sessionsZoneCount}>{sessions?.length ?? 0}</span>
        )}
      </div>

      {loading ? (
        <div className={styles.sessionScrollTrack}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.sessionCardSkeleton}>
              <Skeleton w="38%" h="11px" />
              <Skeleton w="70%" h="13px" />
              <Skeleton w="52%" h="10px" />
            </div>
          ))}
        </div>
      ) : !sessions?.length ? (
        <EmptyState
          icon={<CalendarEmptyIcon />}
          message={t('manager.dashboard.noSessionsToday')}
          action={t('manager.dashboard.viewSchedule')}
          onAction={onSchedule}
        />
      ) : (
        <div className={styles.sessionScrollTrack} role="list" aria-label={t('manager.dashboard.sessionsToday')}>
          {sessions.map(s => {
            const courseName = typeof s.course === 'object' ? s.course?.name : s.course
            const teacherName = typeof s.teacher === 'object' ? s.teacher?.name : s.teacher
            return (
              <div key={s.id} className={styles.sessionCard} role="listitem">
                <span className={styles.sessionTime}>{formatTime(s.starts_at)}</span>
                {s.title && <span className={styles.sessionTitle}>{s.title}</span>}
                <span className={styles.sessionMeta}>
                  {[courseName, teacherName].filter(Boolean).join(' · ')}
                </span>
                {s.enrolled_count != null && (
                  <span className={styles.sessionEnrolled}>
                    {s.enrolled_count} {t('manager.dashboard.students')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { t } = useTranslation()
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()

  const {
    data: dash,
    isLoading: dashLoading,
    isError: dashError,
    refetch: dashRefetch,
  } = useQuery<DashboardData>({
    queryKey: ['manager-dashboard'],
    queryFn: () => api.get('/manager/dashboard').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: trendData,
    isLoading: trendLoading,
    isError: trendError,
  } = useQuery<TrendPoint[]>({
    queryKey: ['manager-enrollment-trend'],
    queryFn: async () => {
      const months = getLast6Months()
      return Promise.all(
        months.map(m =>
          api
            .get('/manager/reports/students', {
              params: { per_page: 1, page: 1, date_from: m.from, date_to: m.to },
            })
            .then(r => ({ month: m.label, count: (r.data.data?.total ?? 0) as number }))
        )
      )
    },
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: atRiskPage,
    isLoading: atRiskLoading,
    isError: atRiskError,
    refetch: atRiskRefetch,
  } = useQuery<PaginatedAtRisk>({
    queryKey: ['manager-at-risk'],
    queryFn: () =>
      api
        .get('/manager/reports/at-risk-students', { params: { per_page: 15, page: 1 } })
        .then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })


  const attendanceRate = dash?.attendance?.this_week_rate
    ? parseRate(dash.attendance.this_week_rate)
    : 0

  return (
    <div className={styles.page}>

      <div className={styles.pageAccent} aria-hidden="true" />

      <header className={styles.pageHead}>
        <h1 className={styles.greeting}>
          {user?.name
            ? `${t(getSalutationKey())}, ${user.name.trim().split(/\s+/)[0]}`
            : t('manager.dashboard.managerDashboard')}
        </h1>
        <p className={styles.greetingDate}>{formatDate()}</p>
      </header>

      {dashError && (
        <div className={styles.errorBanner} role="alert">
          <AlertIcon />
          <span>{t('manager.dashboard.dashboardOverviewFailed')}</span>
          <button type="button" onClick={() => dashRefetch()} className={styles.retryBtn}>
            {t('manager.dashboard.retry')}
          </button>
        </div>
      )}

      {/* Zone A — Hero KPI strip */}
      <div className={styles.kpiStrip}>
        <KpiCell
          label={t('manager.dashboard.totalStudents')}
          value={dash?.totals?.students ?? 0}
          delta={dash?.academics ? `${dash.academics.at_risk_students} ${t('manager.dashboard.atRisk')}` : undefined}
          deltaColor={dash?.academics?.at_risk_students ? 'amber' : undefined}
          loading={dashLoading}
        />
        <KpiCell
          label={t('manager.dashboard.totalTeachers')}
          value={dash?.totals?.teachers ?? 0}
          loading={dashLoading}
        />
        <KpiCell
          label={t('manager.dashboard.activeCourses')}
          value={dash?.totals?.active_courses ?? 0}
          delta={dash?.totals ? t('manager.dashboard.ofTotal', { total: dash.totals.courses }) : undefined}
          loading={dashLoading}
        />
        <KpiCell
          label={t('manager.dashboard.attendanceThisWeek')}
          value={attendanceRate}
          suffix="%"
          delta={dash?.attendance ? `${dash.attendance.absent_today} ${t('manager.dashboard.absentToday')}` : undefined}
          deltaColor={dash?.attendance?.absent_today ? 'amber' : undefined}
          loading={dashLoading}
          accent={attendanceRate > 0 && attendanceRate < 70 ? 'var(--color-amber)' : undefined}
        />
      </div>

      {/* Zone B + C — Alert panel + Enrollment chart */}
      <div className={styles.alertChart}>
        <AtRiskStudents
          data={atRiskPage?.data}
          loading={atRiskLoading}
          error={atRiskError}
          refetch={atRiskRefetch}
        />
        <EnrollmentTrend data={trendData} loading={trendLoading} error={trendError} />
      </div>

      {/* Zone D — Today's sessions (horizontal scroll) */}
      <ZoneDSessions
        sessions={dash?.upcoming_sessions}
        loading={dashLoading}
        onSchedule={() => navigate('/manager/schedule')}
      />

    </div>
  )
}
