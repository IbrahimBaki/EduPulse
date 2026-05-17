import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/axios'
import styles from './Children.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Child {
  id: number
  name: string
  student_code: string
  grade: string
  attendance_rate: number
  avg_score: number
  courses_count: number
  pending_fees: number
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

// ─── Icons ────────────────────────────────────────────────────────────────────

function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

function UsersIcon() {
  return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}

// ─── Child row ─────────────────────────────────────────────────────────────────

function ChildRow({ child, index }: { child: Child; index: number }) {
  const navigate = useNavigate()
  const hue = nameHue(child.name)
  const avatarColor = `oklch(58% 0.18 ${hue})`

  const attClass = child.attendance_rate < 75 ? styles.statAmber : styles.statGreen
  const scoreClass = child.avg_score < 60 ? styles.statRed : ''

  return (
    <motion.article
      className={styles.childRow}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      aria-label={child.name}
    >
      <div className={styles.childAvatar} style={{ background: avatarColor }} aria-hidden="true">
        {initials(child.name)}
      </div>

      <div className={styles.childInfo}>
        <div className={styles.childNameRow}>
          <h2 className={styles.childName}>{child.name}</h2>
          <span className={styles.gradeBadge}>{child.grade}</span>
        </div>
        <p className={styles.studentCode}>{child.student_code}</p>

        <div className={styles.statsRow}>
          <span className={`${styles.statPill} ${attClass}`}>Attendance: {child.attendance_rate}%</span>
          <span className={`${styles.statPill} ${scoreClass}`}>Avg Score: {child.avg_score}%</span>
          <span className={styles.statPill}>Courses: {child.courses_count}</span>
          {child.pending_fees > 0 && (
            <span className={`${styles.statPill} ${styles.statAmber}`}>Pending Fees: {child.pending_fees}</span>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate(`/parent/children/${child.id}`)}>
            View Details
          </button>
          <button type="button" className={styles.ghostBtn} onClick={() => navigate('/parent/attendance')}>
            Attendance
          </button>
          <button type="button" className={styles.ghostBtn} onClick={() => navigate('/parent/exams')}>
            Exams
          </button>
          <button type="button" className={styles.ghostBtn} onClick={() => navigate('/parent/fees')}>
            Fees
          </button>
        </div>
      </div>
    </motion.article>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <span className={styles.skeleton} style={{ width: 140, height: 24, borderRadius: 6, display: 'block' }} />
      {[0, 1].map(i => (
        <div key={i} className={styles.childRow} aria-hidden="true">
          <span className={styles.skeleton} style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className={styles.skeleton} style={{ width: 180, height: 16, borderRadius: 4 }} />
            <span className={styles.skeleton} style={{ width: 100, height: 12, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentChildren() {
  const { data, isLoading, isError, refetch } = useQuery<{ children: Child[] }>({
    queryKey: ['parent-children'],
    queryFn: () => api.get('/parent/children').then(r => r.data.data),
    staleTime: 60_000,
  })

  if (isLoading) return <PageSkeleton />

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertIcon />
          <p>Failed to load children.</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>My Children</h1>

      {data.children.length === 0 ? (
        <div className={styles.emptyState}>
          <UsersIcon />
          <p className={styles.emptyTitle}>No children linked</p>
          <p className={styles.emptyText}>Contact the school to link your children to your account.</p>
        </div>
      ) : (
        <div className={styles.childList} role="list">
          {data.children.map((c, i) => (
            <div key={c.id} role="listitem">
              <ChildRow child={c} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
