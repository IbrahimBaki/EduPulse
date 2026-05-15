import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  student: { id: number; name: string; code: string }
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

interface FinanceSummary {
  total_expected: number
  collected: number
  pending: number
  overdue: number
  collection_rate: string | number
  overdue_students: Array<{ id?: number; name?: string }>
}

interface RecentStudent {
  id: number
  name: string
  email: string
  student_code: string
  grade_level: string
  parent_name: string | null
  is_active: boolean
}

interface PaginatedStudents {
  data: RecentStudent[]
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

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '0'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function nameInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  const salutation =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return `${salutation}, ${name.trim().split(/\s+/)[0]}`
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

function UsersEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function DollarEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
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

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  suffix = '',
  sub,
  loading,
  accent,
}: {
  label: string
  value: number
  suffix?: string
  sub?: string
  loading: boolean
  accent?: string
}) {
  const animated = useCountUp(value, !loading)

  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span
        className={`${styles.statValue}${accent && !loading ? ' ' + styles.statValuePulse : ''}`}
        style={accent ? { color: accent } : undefined}
      >
        {loading
          ? <Skeleton w="52px" h="28px" radius="4px" />
          : <>{animated.toLocaleString()}{suffix}</>
        }
      </span>
      {sub && (
        <span className={styles.statSub}>
          {loading ? <Skeleton w="60%" h="11px" /> : sub}
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
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Enrollment trend</h2>
        <span className={styles.panelCount}>Last 6 months</span>
      </div>

      {loading ? (
        <Skeleton w="100%" h="240px" radius="6px" />
      ) : error || !data?.length ? (
        <EmptyState
          icon={<TrendEmptyIcon />}
          message="Enrollment history not available yet."
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
  const atRisk = data?.filter(s => s.avg_quiz_score < 60 || (s.weak_topics?.length ?? 0) > 0) ?? []

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>At-risk students</h2>
        {!loading && !error && (
          <span className={styles.panelCount}>{atRisk.length} flagged</span>
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
          <span>Failed to load</span>
          <button type="button" onClick={refetch} className={styles.retryBtnSmall}>Retry</button>
        </div>
      ) : atRisk.length === 0 ? (
        <div className={styles.emptyGood}>
          <CheckCircleIcon />
          <span>All students performing well</span>
        </div>
      ) : (
        <ul className={styles.atRiskList} aria-label="At-risk students">
          {atRisk.slice(0, 8).map(s => (
            <li key={s.student.id} className={styles.atRiskRow}>
              <div className={styles.atRiskAvatar} aria-hidden="true">
                {nameInitials(s.student.name)}
              </div>
              <div className={styles.atRiskInfo}>
                <div className={styles.atRiskName}>{s.student.name}</div>
                <div className={styles.atRiskScore}>
                  {s.avg_quiz_score}% avg
                  {(s.weak_topics?.length ?? 0) > 0 &&
                    ` · ${s.weak_topics!.length} weak topic${s.weak_topics!.length !== 1 ? 's' : ''}`
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

// ─── Upcoming sessions ────────────────────────────────────────────────────────

function UpcomingSessions({
  sessions,
  loading,
  onSchedule,
}: {
  sessions?: UpcomingSession[]
  loading: boolean
  onSchedule?: () => void
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Sessions today</h2>
        {!loading && (
          <span className={styles.panelCount}>{sessions?.length ?? 0}</span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                padding: '10px 12px',
                background: 'var(--surface-panel)',
                borderRadius: '8px',
                border: '1px solid var(--neutral-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <Skeleton w="38%" h="11px" />
              <Skeleton w="62%" h="13px" />
              <Skeleton w="50%" h="10px" />
            </div>
          ))}
        </div>
      ) : !sessions?.length ? (
        <EmptyState
          icon={<CalendarEmptyIcon />}
          message="No sessions scheduled for today."
          action="View schedule"
          onAction={onSchedule}
        />
      ) : (
        <ul className={styles.sessionList} aria-label="Today's sessions">
          {sessions.map(s => {
            const courseName = typeof s.course === 'object' ? s.course?.name : s.course
            const teacherName = typeof s.teacher === 'object' ? s.teacher?.name : s.teacher
            return (
              <li key={s.id} className={styles.sessionRow}>
                <span className={styles.sessionTime}>{formatTime(s.starts_at)}</span>
                {s.title && <span className={styles.sessionTitle}>{s.title}</span>}
                <span className={styles.sessionMeta}>
                  {[courseName, teacherName].filter(Boolean).join(' · ')}
                </span>
                {s.enrolled_count != null && (
                  <span className={styles.sessionEnrolled}>{s.enrolled_count} students</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ─── Recent enrollments ───────────────────────────────────────────────────────

function RecentEnrollments({
  data,
  loading,
  error,
  refetch,
  onAdd,
}: {
  data?: RecentStudent[]
  loading: boolean
  error: boolean
  refetch: () => void
  onAdd?: () => void
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Recent enrollments</h2>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Skeleton w="28px" h="28px" radius="50%" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skeleton w="55%" h="12px" />
                <Skeleton w="35%" h="10px" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorInline} role="alert">
          <AlertIcon />
          <span>Failed to load</span>
          <button type="button" onClick={refetch} className={styles.retryBtnSmall}>Retry</button>
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={<UsersEmptyIcon />}
          message="No students enrolled recently."
          action="Add student"
          onAction={onAdd}
        />
      ) : (
        <ul className={styles.enrollList} aria-label="Recent enrollments">
          {data.map(s => (
            <li key={s.id} className={styles.enrollRow}>
              <div className={styles.enrollAvatar} aria-hidden="true">
                {nameInitials(s.name)}
              </div>
              <div className={styles.enrollInfo}>
                <div className={styles.enrollName}>{s.name}</div>
                <div className={styles.enrollGrade}>{s.grade_level}</div>
              </div>
              <span className={styles.enrollCode}>{s.student_code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Finance summary ──────────────────────────────────────────────────────────

function FinanceSummary({
  data,
  loading,
  error,
  refetch,
}: {
  data?: FinanceSummary
  loading: boolean
  error: boolean
  refetch: () => void
}) {
  const rate = data ? parseRate(data.collection_rate) : 0
  const navigate = useNavigate()

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Finance</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {data && (data.overdue_students?.length ?? 0) > 0 && (
            <span className={styles.overdueBadge}>
              {data.overdue_students.length} overdue
            </span>
          )}
          <button 
            type="button" 
            onClick={() => navigate('/manager/finance')}
            className={styles.viewAllBtn}
            style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Manage
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton w="100%" h="12px" />
          <Skeleton w="100%" h="12px" />
          <Skeleton w="100%" h="6px" radius="999px" />
          <Skeleton w="45%" h="11px" />
          <div style={{ height: 1, background: 'var(--neutral-border)' }} />
          <Skeleton w="100%" h="12px" />
          <Skeleton w="100%" h="12px" />
        </div>
      ) : error ? (
        <div className={styles.errorInline} role="alert">
          <AlertIcon />
          <span>Failed to load</span>
          <button type="button" onClick={refetch} className={styles.retryBtnSmall}>Retry</button>
        </div>
      ) : !data ? (
        <EmptyState icon={<DollarEmptyIcon />} message="Finance data unavailable." />
      ) : (
        <div className={styles.financeStack}>
          <div className={styles.financeRow}>
            <span className={styles.financeLabel}>Expected</span>
            <span className={styles.financeAmount}>EGP {formatCurrency(data.total_expected)}</span>
          </div>
          <div className={styles.financeRow}>
            <span className={styles.financeLabel}>Collected</span>
            <span className={`${styles.financeAmount} ${styles.financeCollected}`}>
              EGP {formatCurrency(data.collected)}
            </span>
          </div>
          <div
            className={styles.progressWrap}
            role="progressbar"
            aria-valuenow={rate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${rate}% collected`}
          >
            <div className={styles.progressBar} style={{ width: `${rate}%` }} />
          </div>
          <span className={styles.progressRate}>{rate}% collection rate</span>
          <div className={styles.financeDivider} />
          <div className={styles.financeRow}>
            <span className={styles.financeLabel}>Pending</span>
            <span className={`${styles.financeAmount} ${styles.financePending}`}>
              EGP {formatCurrency(data.pending)}
            </span>
          </div>
          <div className={styles.financeRow}>
            <span className={styles.financeLabel}>Overdue</span>
            <span className={`${styles.financeAmount} ${styles.financeOverdue}`}>
              EGP {formatCurrency(data.overdue)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManagerDashboard() {
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
        .get('/manager/reports/students', { params: { per_page: 15, page: 1 } })
        .then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: financeData,
    isLoading: financeLoading,
    isError: financeError,
    refetch: financeRefetch,
  } = useQuery<FinanceSummary>({
    queryKey: ['manager-finance'],
    queryFn: () => api.get('/manager/finance/summary').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: studentsPage,
    isLoading: studentsLoading,
    isError: studentsError,
    refetch: studentsRefetch,
  } = useQuery<PaginatedStudents>({
    queryKey: ['manager-recent-students'],
    queryFn: () =>
      api.get('/manager/students', { params: { per_page: 5, page: 1 } }).then(r => r.data.data),
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
          {user?.name ? getGreeting(user.name) : 'Manager Dashboard'}
        </h1>
        <p className={styles.greetingDate}>{formatDate()}</p>
      </header>

      {dashError && (
        <div className={styles.errorBanner} role="alert">
          <AlertIcon />
          <span>Dashboard overview failed to load.</span>
          <button type="button" onClick={() => dashRefetch()} className={styles.retryBtn}>
            Retry
          </button>
        </div>
      )}

      <div className={styles.statsRow}>
        <StatCard
          label="Total students"
          value={dash?.totals?.students ?? 0}
          sub={dash?.academics ? `${dash.academics.at_risk_students} at risk` : undefined}
          loading={dashLoading}
        />
        <StatCard
          label="Total teachers"
          value={dash?.totals?.teachers ?? 0}
          loading={dashLoading}
        />
        <StatCard
          label="Active courses"
          value={dash?.totals?.active_courses ?? 0}
          sub={dash?.totals ? `of ${dash.totals.courses} total` : undefined}
          loading={dashLoading}
        />
        <StatCard
          label="Attendance this week"
          value={attendanceRate}
          suffix="%"
          sub={dash?.attendance ? `${dash.attendance.absent_today} absent today` : undefined}
          loading={dashLoading}
          accent={attendanceRate > 0 && attendanceRate < 70 ? 'var(--color-amber)' : undefined}
        />
      </div>

      <div className={styles.middleRow}>
        <EnrollmentTrend data={trendData} loading={trendLoading} error={trendError} />
        <AtRiskStudents
          data={atRiskPage?.data}
          loading={atRiskLoading}
          error={atRiskError}
          refetch={atRiskRefetch}
        />
      </div>

      <div className={styles.bottomRow}>
        <UpcomingSessions
          sessions={dash?.upcoming_sessions}
          loading={dashLoading}
          onSchedule={() => navigate('/manager/schedule')}
        />
        <RecentEnrollments
          data={studentsPage?.data}
          loading={studentsLoading}
          error={studentsError}
          refetch={studentsRefetch}
          onAdd={() => navigate('/manager/students')}
        />
        <FinanceSummary
          data={financeData}
          loading={financeLoading}
          error={financeError}
          refetch={financeRefetch}
        />
      </div>

    </div>
  )
}
