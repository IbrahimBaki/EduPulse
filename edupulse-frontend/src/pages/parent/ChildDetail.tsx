import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import api from '../../lib/axios'
import styles from './ChildDetail.module.css'
import UserAvatar from '../../components/UserAvatar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildDetail {
  id: number
  name: string
  avatar_url?: string | null
  grade: string
  student_code: string
  academy_name: string
  attendance_rate: number
  avg_score: number
  score_history: { label: string; score: number }[]
  weak_topics: { name: string; score: number }[]
  strong_topics: { name: string; score: number }[]
  courses: { name: string; progress: number }[]
}

interface AttendanceDay {
  date: string
  status: 'present' | 'absent' | 'late' | 'none'
}

interface AttendanceData {
  month: string
  days: AttendanceDay[]
  summary: { present: number; absent: number; late: number }
  rate: number
  trend: { month: string; rate: number }[]
}

interface CompletedExam {
  id: number
  title: string
  course: string
  score: number
  total: number
  percentage: number
  passed: boolean
  taken_at: string
}

interface UpcomingExam {
  id: number
  title: string
  course: string
  scheduled_at: string
  duration_minutes: number
}

interface ExamsData {
  completed: CompletedExam[]
  upcoming: UpcomingExam[]
}

interface Fee {
  id: number
  description: string
  amount: number
  due_date: string
  status: 'paid' | 'pending' | 'overdue'
}

interface FeesData {
  summary: { pending: number; overdue: number; paid_this_year: number }
  fees: Fee[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameHue(name: string): number {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff
  const hues = [255, 145, 75, 300, 45, 205, 178, 28, 130, 340]
  return hues[h % hues.length]
}


function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtScheduled(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
}

function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

// ─── Circular progress ─────────────────────────────────────────────────────────

function RingProgress({ rate }: { rate: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(rate, 100) / 100)
  const color = rate >= 80 ? 'var(--color-green)' : rate >= 60 ? 'var(--color-amber)' : 'var(--color-red)'
  return (
    <div className={styles.ringWrap} aria-label={`${rate}% attendance`}>
      <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--neutral-border)" strokeWidth="10" />
        <circle
          cx="66" cy="66" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 66 66)"
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div className={styles.ringLabel}>
        <span className={styles.ringPct} style={{ color }}>{rate}%</span>
        <span className={styles.ringCaption}>Attendance</span>
      </div>
    </div>
  )
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function CalendarGrid({ days, month }: { days: AttendanceDay[]; month: string }) {
  const [y, m] = month.split('-').map(Number)
  const firstDow = new Date(y, m - 1, 1).getDay()
  const blanks = Array(firstDow).fill(null)
  const statusClass: Record<string, string> = {
    present: styles.dayPresent,
    absent: styles.dayAbsent,
    late: styles.dayLate,
    none: styles.dayNone,
  }
  const dayMap = new Map(days.map(d => [d.date, d.status]))
  const totalDays = new Date(y, m, 0).getDate()

  return (
    <div className={styles.calendar} aria-label="Attendance calendar">
      <div className={styles.calGrid}>
        {DAY_HEADERS.map(h => <span key={h} className={styles.calHeader}>{h}</span>)}
        {blanks.map((_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: totalDays }, (_, i) => {
          const day = i + 1
          const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const status = dayMap.get(dateStr) ?? 'none'
          return (
            <span key={dateStr} className={`${styles.calDay} ${statusClass[status]}`} title={status === 'none' ? 'No session' : status}>
              {day}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'attendance' | 'exams' | 'fees'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview',    label: 'Overview' },
  { key: 'attendance',  label: 'Attendance' },
  { key: 'exams',       label: 'Exams' },
  { key: 'fees',        label: 'Fees' },
]

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ child }: { child: ChildDetail }) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.overviewGrid}>

        <section className={styles.overviewCard} aria-labelledby="att-heading">
          <h3 className={styles.cardTitle} id="att-heading">Attendance Rate</h3>
          <RingProgress rate={child.attendance_rate} />
        </section>

        <section className={styles.overviewCard} aria-labelledby="perf-heading">
          <h3 className={styles.cardTitle} id="perf-heading">Score History</h3>
          {child.score_history.length === 0 ? (
            <p className={styles.emptyMsg}>No scores yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={child.score_history} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--neutral-border)', borderRadius: 6, fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, 'Score']}
                />
                <Line type="monotone" dataKey="score" stroke="var(--color-blue)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-blue)' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {(child.weak_topics.length > 0 || child.strong_topics.length > 0) && (
        <section className={styles.topicsSection} aria-labelledby="topics-heading">
          <h3 className={styles.cardTitle} id="topics-heading">Topic Performance</h3>
          <div className={styles.topicsBlock}>
            {child.strong_topics.length > 0 && (
              <div>
                <p className={styles.topicsLabel}>Strong</p>
                <div className={styles.pillRow}>
                  {child.strong_topics.map(t => (
                    <span key={t.name} className={`${styles.topicPill} ${styles.pillGreen}`}>{t.name} · {t.score}%</span>
                  ))}
                </div>
              </div>
            )}
            {child.weak_topics.length > 0 && (
              <div>
                <p className={styles.topicsLabel}>Needs Work</p>
                <div className={styles.pillRow}>
                  {child.weak_topics.map(t => (
                    <span key={t.name} className={`${styles.topicPill} ${styles.pillAmber}`}>{t.name} · {t.score}%</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {child.courses.length > 0 && (
        <section className={styles.coursesSection} aria-labelledby="courses-heading">
          <h3 className={styles.cardTitle} id="courses-heading">Current Courses</h3>
          <div className={styles.courseList}>
            {child.courses.map(c => (
              <div key={c.name} className={styles.courseRow}>
                <div className={styles.courseRowTop}>
                  <span className={styles.courseName}>{c.name}</span>
                  <span className={styles.coursePct}>{c.progress}%</span>
                </div>
                <div className={styles.progressTrack} aria-label={`${c.name} progress ${c.progress}%`}>
                  <div className={styles.progressFill} style={{ width: `${c.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Attendance tab ───────────────────────────────────────────────────────────

function AttendanceTab({ childId }: { childId: string }) {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const { data, isLoading, isError } = useQuery<AttendanceData>({
    queryKey: ['child-attendance', childId, month],
    queryFn: () => api.get(`/parent/children/${childId}/attendance`, { params: { month } }).then(r => r.data.data),
    staleTime: 60_000,
    enabled: !!childId,
  })

  function prevMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function nextMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  if (isLoading) return <div className={styles.tabContent}><p className={styles.loadingMsg}>Loading attendance…</p></div>
  if (isError || !data) return <div className={styles.tabContent}><p className={styles.errorMsg}>Failed to load attendance.</p></div>

  return (
    <div className={styles.tabContent}>
      <div className={styles.monthNav}>
        <button type="button" className={styles.monthNavBtn} onClick={prevMonth} aria-label="Previous month">‹</button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button type="button" className={styles.monthNavBtn} onClick={nextMonth} aria-label="Next month">›</button>
      </div>

      <CalendarGrid days={data.days} month={month} />

      <div className={styles.attLegend}>
        <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotPresent}`} />Present</span>
        <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotAbsent}`} />Absent</span>
        <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotLate}`} />Late</span>
      </div>

      <div className={styles.attStats}>
        <div className={styles.attStat}>
          <span className={styles.attStatVal} style={{ color: 'var(--color-green)' }}>{data.summary.present}</span>
          <span className={styles.attStatLabel}>Present</span>
        </div>
        <div className={styles.attStat}>
          <span className={styles.attStatVal} style={{ color: 'var(--color-red)' }}>{data.summary.absent}</span>
          <span className={styles.attStatLabel}>Absent</span>
        </div>
        <div className={styles.attStat}>
          <span className={styles.attStatVal} style={{ color: 'var(--color-amber)' }}>{data.summary.late}</span>
          <span className={styles.attStatLabel}>Late</span>
        </div>
        <div className={styles.attStat}>
          <span className={styles.attStatVal}>{data.rate}%</span>
          <span className={styles.attStatLabel}>Rate</span>
        </div>
      </div>

      {data.trend.length > 0 && (
        <section className={styles.trendSection} aria-labelledby="att-trend-heading">
          <h3 className={styles.cardTitle} id="att-trend-heading">6-Month Trend</h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data.trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--neutral-border)', borderRadius: 6, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Rate']}
              />
              <Line type="monotone" dataKey="rate" stroke="var(--color-green)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  )
}

// ─── Exams tab ────────────────────────────────────────────────────────────────

function ExamsTab({ childId }: { childId: string }) {
  const { data, isLoading, isError } = useQuery<ExamsData>({
    queryKey: ['child-exams', childId],
    queryFn: () => api.get(`/parent/children/${childId}/exams`).then(r => r.data.data),
    staleTime: 60_000,
    enabled: !!childId,
  })

  if (isLoading) return <div className={styles.tabContent}><p className={styles.loadingMsg}>Loading exams…</p></div>
  if (isError || !data) return <div className={styles.tabContent}><p className={styles.errorMsg}>Failed to load exams.</p></div>

  return (
    <div className={styles.tabContent}>
      {data.upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading">
          <h3 className={styles.cardTitle} id="upcoming-heading">Upcoming Exams</h3>
          <div className={styles.upcomingList}>
            {data.upcoming.map(e => (
              <div key={e.id} className={styles.upcomingRow}>
                <div>
                  <p className={styles.examTitle}>{e.title}</p>
                  <p className={styles.examMeta}>{e.course} · {fmtScheduled(e.scheduled_at)} · {e.duration_minutes} min</p>
                </div>
                <span className={styles.upcomingBadge}>Scheduled</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="completed-heading">
        <h3 className={styles.cardTitle} id="completed-heading">Completed Exams</h3>
        {data.completed.length === 0 ? (
          <p className={styles.emptyMsg}>No completed exams yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.examsTable}>
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Course</th>
                  <th>Score</th>
                  <th>Result</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.completed.map(e => (
                  <tr key={e.id}>
                    <td className={styles.examTitleCell}>{e.title}</td>
                    <td className={styles.examCourseCell}>{e.course}</td>
                    <td><strong>{e.score}/{e.total}</strong> <span className={styles.examPct}>({e.percentage}%)</span></td>
                    <td>
                      <span className={`${styles.passBadge} ${e.passed ? styles.badgePass : styles.badgeFail}`}>
                        {e.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className={styles.examDateCell}>{fmt(e.taken_at)}</td>
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

// ─── Fees tab ─────────────────────────────────────────────────────────────────

function FeesTab({ childId }: { childId: string }) {
  const { data, isLoading, isError } = useQuery<FeesData>({
    queryKey: ['child-fees', childId],
    queryFn: () => api.get('/parent/fees', { params: { child_id: childId } }).then(r => r.data.data),
    staleTime: 60_000,
    enabled: !!childId,
  })

  if (isLoading) return <div className={styles.tabContent}><p className={styles.loadingMsg}>Loading fees…</p></div>
  if (isError || !data) return <div className={styles.tabContent}><p className={styles.errorMsg}>Failed to load fees.</p></div>

  const statusCls: Record<string, string> = {
    paid: styles.feePaid,
    pending: styles.feePending,
    overdue: styles.feeOverdue,
  }
  const rowBg: Record<string, string> = {
    paid: '',
    pending: styles.rowPending,
    overdue: styles.rowOverdue,
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.feeSummary}>
        <div className={`${styles.feeSumCard} ${styles.sumPending}`}>
          <span className={styles.feeSumVal}>{data.summary.pending} EGP</span>
          <span className={styles.feeSumLabel}>Pending</span>
        </div>
        <div className={`${styles.feeSumCard} ${styles.sumOverdue}`}>
          <span className={styles.feeSumVal}>{data.summary.overdue} EGP</span>
          <span className={styles.feeSumLabel}>Overdue</span>
        </div>
        <div className={`${styles.feeSumCard} ${styles.sumPaid}`}>
          <span className={styles.feeSumVal}>{data.summary.paid_this_year} EGP</span>
          <span className={styles.feeSumLabel}>Paid This Year</span>
        </div>
      </div>

      {data.fees.length === 0 ? (
        <p className={styles.emptyMsg}>No fees on record.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.feesTable}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.fees.map(f => (
                <tr key={f.id} className={rowBg[f.status]}>
                  <td>{f.description}</td>
                  <td><strong>{f.amount} EGP</strong></td>
                  <td>{fmt(f.due_date)}</td>
                  <td><span className={`${styles.feeStatusBadge} ${statusCls[f.status]}`}>{f.status.charAt(0).toUpperCase() + f.status.slice(1)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <span className={styles.skeleton} style={{ width: 80, height: 14, borderRadius: 4, display: 'block' }} />
      <div className={styles.childHeader}>
        <span className={styles.skeleton} style={{ width: 72, height: 72, borderRadius: '50%', display: 'block', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <span className={styles.skeleton} style={{ width: 200, height: 20, borderRadius: 4, display: 'block' }} />
          <span className={styles.skeleton} style={{ width: 120, height: 14, borderRadius: 4, display: 'block' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentChildDetail() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  const { data, isLoading, isError, refetch } = useQuery<{ child: ChildDetail }>({
    queryKey: ['child-detail', childId],
    queryFn: () => api.get(`/parent/children/${childId}`).then(r => r.data.data),
    staleTime: 60_000,
    enabled: !!childId,
  })

  if (isLoading) return <PageSkeleton />

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertIcon />
          <p>Failed to load child data.</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    )
  }

  const { child } = data
  const hue = nameHue(child.name)
  const avatarColor = `oklch(58% 0.18 ${hue})`

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backBtn} onClick={() => navigate('/parent/children')}>
        <ChevronLeftIcon /> Back to Children
      </button>

      <motion.div
        className={styles.childHeader}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <UserAvatar name={child.name} avatarUrl={child.avatar_url} className={styles.childAvatar} style={{ background: avatarColor }} />
        <div className={styles.childMeta}>
          <h1 className={styles.childName}>{child.name}</h1>
          <div className={styles.childMetaRow}>
            <span className={styles.gradeBadge}>{child.grade}</span>
            <span className={styles.metaDetail}>{child.student_code}</span>
            <span className={styles.metaDetail}>{child.academy_name}</span>
          </div>
        </div>
      </motion.div>

      <div className={styles.tabBar} role="tablist">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.tabBtn} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === 'overview'   && <OverviewTab child={child} />}
          {tab === 'attendance' && <AttendanceTab childId={childId!} />}
          {tab === 'exams'      && <ExamsTab childId={childId!} />}
          {tab === 'fees'       && <FeesTab childId={childId!} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
