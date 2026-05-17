import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/axios'
import styles from './Dashboard.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildSummary {
  id: number
  name: string
  grade: string
  attendance_rate: number
  avg_score: number
  courses_count: number
  status: 'good' | 'at_risk' | 'overdue_fees'
}

interface Alert {
  type: 'overdue_fees' | 'low_score' | 'all_good'
  message: string
  child_name?: string
}

interface ActivityItem {
  id: number
  type: 'score' | 'absence' | 'fee' | 'announcement'
  message: string
  created_at: string
}

interface UpcomingSession {
  id: number
  course_name: string
  child_name: string
  starts_at: string
  type: 'online' | 'in_person' | 'recorded'
}

interface DashboardData {
  parent: { name: string }
  academy: { name: string }
  children: ChildSummary[]
  alerts: Alert[]
  activity: ActivityItem[]
  upcoming_sessions: UpcomingSession[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameHue(name: string): number {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff
  const hues = [255, 145, 75, 300, 45, 205, 178, 28, 130, 340]
  return hues[h % hues.length]
}

function initials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatSessionTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function todayDate(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckCircleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
}

function AlertTriangleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

function XCircleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
}

// ─── Components ───────────────────────────────────────────────────────────────

function AlertBox({ alert }: { alert: Alert }) {
  const isGood = alert.type === 'all_good'
  const isAmber = alert.type === 'overdue_fees'
  return (
    <div className={`${styles.alertBox} ${isGood ? styles.alertGreen : isAmber ? styles.alertAmber : styles.alertRed}`} role="alert">
      <span className={styles.alertIcon} aria-hidden="true">
        {isGood ? <CheckCircleIcon /> : isAmber ? <AlertTriangleIcon /> : <XCircleIcon />}
      </span>
      <p className={styles.alertMsg}>{alert.message}</p>
    </div>
  )
}

function ChildPanel({ child }: { child: ChildSummary }) {
  const navigate = useNavigate()
  const hue = nameHue(child.name)
  const avatarColor = `oklch(58% 0.18 ${hue})`
  const statusMap = {
    good: { label: 'All Good', cls: styles.statusGood },
    at_risk: { label: 'At Risk', cls: styles.statusRisk },
    overdue_fees: { label: 'Fees Overdue', cls: styles.statusOverdue },
  }
  const { label, cls } = statusMap[child.status]

  return (
    <div className={styles.childPanel}>
      <div className={styles.childAvatar} style={{ background: avatarColor }} aria-hidden="true">
        {initials(child.name)}
      </div>
      <p className={styles.childName}>{child.name}</p>
      <span className={styles.gradeBadge}>{child.grade}</span>
      <div className={styles.childStats}>
        <div className={styles.childStat}>
          <span className={styles.childStatVal}>{child.attendance_rate}%</span>
          <span className={styles.childStatLabel}>Attendance</span>
        </div>
        <div className={styles.childStat}>
          <span className={styles.childStatVal}>{child.avg_score}%</span>
          <span className={styles.childStatLabel}>Avg Score</span>
        </div>
        <div className={styles.childStat}>
          <span className={styles.childStatVal}>{child.courses_count}</span>
          <span className={styles.childStatLabel}>Courses</span>
        </div>
      </div>
      <span className={`${styles.statusPill} ${cls}`}>{label}</span>
      <button type="button" className={styles.viewDetailsBtn} onClick={() => navigate(`/parent/children/${child.id}`)}>
        View Details
      </button>
    </div>
  )
}

const activityDotClass: Record<string, string> = {
  score: styles.dotGreen,
  absence: styles.dotRed,
  fee: styles.dotAmber,
  announcement: styles.dotBlue,
}

const sessionTypeBadge: Record<string, string> = {
  online: styles.badgeOnline,
  in_person: styles.badgeInPerson,
  recorded: styles.badgeRecorded,
}

const sessionTypeLabel: Record<string, string> = { online: 'Online', in_person: 'In-Person', recorded: 'Recorded' }

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.welcomeSection}>
        <span className={styles.skeleton} style={{ width: 200, height: 28, borderRadius: 6, display: 'block' }} />
        <span className={styles.skeleton} style={{ width: 140, height: 14, borderRadius: 4, display: 'block', marginBlockStart: 8 }} />
      </div>
      <div className={styles.childrenRail}>
        {[0, 1].map(i => (
          <div key={i} className={styles.childPanel} aria-hidden="true">
            <span className={styles.skeleton} style={{ width: 56, height: 56, borderRadius: '50%', display: 'block', margin: '0 auto 12px' }} />
            <span className={styles.skeleton} style={{ width: 100, height: 14, borderRadius: 4, display: 'block', margin: '0 auto 8px' }} />
            <span className={styles.skeleton} style={{ width: 60, height: 10, borderRadius: 4, display: 'block', margin: '0 auto' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ['parent-dashboard'],
    queryFn: () => api.get('/parent/dashboard').then(r => r.data.data as DashboardData),
    staleTime: 30_000,
  })

  if (isLoading) return <PageSkeleton />

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertTriangleIcon />
          <p>Failed to load dashboard.</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    )
  }

  const firstName = data.parent.name.split(' ')[0]

  return (
    <div className={styles.page}>

      {data.alerts.length > 0 && (
        <motion.div className={styles.alertsSection} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {data.alerts.map((a, i) => <AlertBox key={i} alert={a} />)}
        </motion.div>
      )}

      <motion.div className={styles.welcomeSection} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
        <h1 className={styles.greeting}>مرحباً، {firstName} 👋</h1>
        <p className={styles.dateLine}>{todayDate()} · {data.academy.name}</p>
      </motion.div>

      {data.children.length > 0 && (
        <motion.section aria-labelledby="children-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}>
          <h2 className={styles.sectionTitle} id="children-heading">My Children</h2>
          <div className={styles.childrenRail} role="list">
            {data.children.map(c => <div key={c.id} role="listitem"><ChildPanel child={c} /></div>)}
          </div>
        </motion.section>
      )}

      <div className={styles.twoCol}>
        <motion.section aria-labelledby="activity-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle} id="activity-heading">Recent Activity</h2>
            <a href="/parent/announcements" className={styles.viewAllLink}>View all</a>
          </div>
          {data.activity.length === 0 ? (
            <p className={styles.emptyMsg}>No recent activity.</p>
          ) : (
            <ol className={styles.activityList}>
              {data.activity.slice(0, 10).map(item => (
                <li key={item.id} className={styles.activityItem}>
                  <span className={`${styles.activityDot} ${activityDotClass[item.type] ?? ''}`} aria-hidden="true" />
                  <span className={styles.activityMsg}>{item.message}</span>
                  <span className={styles.activityTime}>{relativeTime(item.created_at)}</span>
                </li>
              ))}
            </ol>
          )}
        </motion.section>

        <motion.section aria-labelledby="sessions-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle} id="sessions-heading">Upcoming Sessions</h2>
          </div>
          {data.upcoming_sessions.length === 0 ? (
            <p className={styles.emptyMsg}>No upcoming sessions.</p>
          ) : (
            <ul className={styles.sessionList}>
              {data.upcoming_sessions.slice(0, 5).map(s => (
                <li key={s.id} className={styles.sessionItem}>
                  <div className={styles.sessionMain}>
                    <span className={styles.childChip}>{s.child_name}</span>
                    <span className={styles.courseName}>{s.course_name}</span>
                    <span className={styles.sessionTime}>{formatSessionTime(s.starts_at)}</span>
                  </div>
                  <span className={`${styles.typeBadge} ${sessionTypeBadge[s.type] ?? ''}`}>
                    {sessionTypeLabel[s.type] ?? s.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>

    </div>
  )
}
