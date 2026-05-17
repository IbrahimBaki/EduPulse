import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import api from '../../lib/axios'
import styles from './Attendance.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildOption {
  id: number
  name: string
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

// ─── Icons ────────────────────────────────────────────────────────────────────

function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
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
            <span
              key={dateStr}
              className={`${styles.calDay} ${statusClass[status]}`}
              title={status === 'none' ? 'No session' : status.charAt(0).toUpperCase() + status.slice(1)}
            >
              {day}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <span className={styles.skeleton} style={{ width: 160, height: 24, borderRadius: 6, display: 'block' }} />
      <span className={styles.skeleton} style={{ width: 220, height: 36, borderRadius: 6, display: 'block' }} />
      <div style={{ border: '1px solid var(--neutral-border)', borderRadius: 12, padding: 16 }}>
        <span className={styles.skeleton} style={{ width: '100%', height: 220, borderRadius: 8, display: 'block' }} />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentAttendance() {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [selectedChild, setSelectedChild] = useState<number | null>(null)

  const { data: children, isLoading: loadingChildren } = useQuery<{ children: ChildOption[] }>({
    queryKey: ['parent-children-list'],
    queryFn: () => api.get('/parent/children').then(r => r.data.data),
    staleTime: 300_000,
  })

  const childId = selectedChild ?? children?.children[0]?.id ?? null

  const { data, isLoading, isError, refetch } = useQuery<AttendanceData>({
    queryKey: ['parent-attendance', childId, month],
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

  if (loadingChildren) return <PageSkeleton />

  return (
    <div className={styles.page}>
      <motion.h1
        className={styles.pageTitle}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        Attendance
      </motion.h1>

      {children && children.children.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
        >
          <label htmlFor="child-select" className={styles.selectLabel}>Child</label>
          <select
            id="child-select"
            className={styles.childSelect}
            value={selectedChild ?? children.children[0]?.id}
            onChange={e => setSelectedChild(Number(e.target.value))}
          >
            {children.children.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </motion.div>
      )}

      {isLoading && (
        <div>
          <span className={styles.skeleton} style={{ width: '100%', height: 260, borderRadius: 12, display: 'block' }} />
        </div>
      )}

      {isError && (
        <div className={styles.errorState}>
          <AlertIcon />
          <p>Failed to load attendance data.</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {data && !isLoading && (
        <motion.div
          className={styles.main}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
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
            <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotNone}`} />No Session</span>
          </div>

          <div className={styles.attStats}>
            <div className={styles.attStat}>
              <span className={styles.attStatVal} style={{ color: 'var(--color-green)' }}>{data.summary.present}</span>
              <span className={styles.attStatLabel}>Present Days</span>
            </div>
            <div className={styles.attStat}>
              <span className={styles.attStatVal} style={{ color: 'var(--color-red)' }}>{data.summary.absent}</span>
              <span className={styles.attStatLabel}>Absent Days</span>
            </div>
            <div className={styles.attStat}>
              <span className={styles.attStatVal} style={{ color: 'var(--color-amber)' }}>{data.summary.late}</span>
              <span className={styles.attStatLabel}>Late Days</span>
            </div>
            <div className={styles.attStat}>
              <span className={styles.attStatVal}>{data.rate}%</span>
              <span className={styles.attStatLabel}>Monthly Rate</span>
            </div>
          </div>

          {data.trend.length > 0 && (
            <section className={styles.trendSection} aria-labelledby="trend-heading">
              <h2 className={styles.sectionTitle} id="trend-heading">6-Month Trend</h2>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data.trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--neutral-border)', borderRadius: 6, fontSize: 12 }}
                    formatter={(v: number) => [`${v}%`, 'Rate']}
                  />
                  <Line type="monotone" dataKey="rate" stroke="var(--color-green)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-green)' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </section>
          )}
        </motion.div>
      )}
    </div>
  )
}
