import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import api from '../../lib/axios'
import styles from './Exams.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildOption {
  id: number
  name: string
}

interface UpcomingExam {
  id: number
  title: string
  course: string
  scheduled_at: string
  duration_minutes: number
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

interface ScoreTrend {
  label: string
  score: number
}

interface ExamsData {
  upcoming: UpcomingExam[]
  completed: CompletedExam[]
  trend: ScoreTrend[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtScheduled(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Now'
  const days = Math.floor(diff / 86400000)
  const hrs = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hrs}h`
  const mins = Math.floor((diff % 3600000) / 60000)
  return `${hrs}h ${mins}m`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

function ClockIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}

function EmptyExamsIcon() {
  return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><path d="M13 8h5M13 12h5M13 16h5"/></svg>
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <span className={styles.skeleton} style={{ width: 180, height: 24, borderRadius: 6, display: 'block' }} />
      <span className={styles.skeleton} style={{ width: 220, height: 36, borderRadius: 6, display: 'block' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1, 2].map(i => (
          <span key={i} className={styles.skeleton} style={{ width: '100%', height: 64, borderRadius: 8, display: 'block' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentExams() {
  const [selectedChild, setSelectedChild] = useState<number | null>(null)

  const { data: children, isLoading: loadingChildren } = useQuery<{ children: ChildOption[] }>({
    queryKey: ['parent-children-list'],
    queryFn: () => api.get('/parent/children').then(r => r.data.data),
    staleTime: 300_000,
  })

  const childId = selectedChild ?? children?.children[0]?.id ?? null

  const { data, isLoading, isError, refetch } = useQuery<ExamsData>({
    queryKey: ['parent-exams', childId],
    queryFn: () => api.get(`/parent/children/${childId}/exams`).then(r => r.data.data),
    staleTime: 60_000,
    enabled: !!childId,
  })

  if (loadingChildren) return <PageSkeleton />

  return (
    <div className={styles.page}>
      <motion.h1
        className={styles.pageTitle}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        Exams & Results
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <span key={i} className={styles.skeleton} style={{ width: '100%', height: 64, borderRadius: 8, display: 'block' }} />
          ))}
        </div>
      )}

      {isError && (
        <div className={styles.errorState}>
          <AlertIcon />
          <p>Failed to load exam data.</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Upcoming exams */}
          <motion.section
            aria-labelledby="upcoming-heading"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className={styles.sectionTitle} id="upcoming-heading">Upcoming Exams</h2>
            {data.upcoming.length === 0 ? (
              <p className={styles.emptyMsg}>No upcoming exams scheduled.</p>
            ) : (
              <div className={styles.upcomingList}>
                {data.upcoming.map((e, idx) => (
                  <motion.div
                    key={e.id}
                    className={styles.upcomingRow}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                  >
                    <div className={styles.upcomingInfo}>
                      <p className={styles.examTitle}>{e.title}</p>
                      <p className={styles.examMeta}>{e.course} · {fmtScheduled(e.scheduled_at)}</p>
                    </div>
                    <div className={styles.upcomingRight}>
                      <span className={styles.countdownBadge}>
                        <ClockIcon /> In {countdown(e.scheduled_at)}
                      </span>
                      <span className={styles.durationChip}>{e.duration_minutes} min</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Completed exams */}
          <motion.section
            aria-labelledby="completed-heading"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className={styles.sectionTitle} id="completed-heading">Completed Exams</h2>
            {data.completed.length === 0 ? (
              <div className={styles.emptyState}>
                <EmptyExamsIcon />
                <p className={styles.emptyTitle}>No exams taken yet</p>
                <p className={styles.emptyText}>Completed exams and results will appear here.</p>
              </div>
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
                        <td>
                          <strong>{e.score}/{e.total}</strong>
                          <span className={styles.examPct}> ({e.percentage}%)</span>
                        </td>
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
          </motion.section>

          {/* Score trend */}
          {data.trend.length > 0 && (
            <motion.section
              className={styles.trendSection}
              aria-labelledby="trend-heading"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className={styles.sectionTitle} id="trend-heading">Score Trend</h2>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data.trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
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
            </motion.section>
          )}
        </>
      )}
    </div>
  )
}
