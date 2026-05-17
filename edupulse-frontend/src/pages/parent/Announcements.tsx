import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/axios'
import styles from './Announcements.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Announcement {
  id: number
  title: string
  body: string
  scope: 'school' | 'grade' | 'course'
  scope_label: string
  child_name?: string
  created_at: string
  is_read: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

function MegaphoneIcon() {
  return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 1 0 8"/><path d="M3 8v8a1 1 0 0 0 1 1h2l4 4V4L6 7H4a1 1 0 0 0-1 1z"/><path d="M18 8a6 6 0 0 1 0 8"/><line x1="13" y1="8" x2="13" y2="16"/></svg>
}

// ─── Announcement item ────────────────────────────────────────────────────────

function AnnouncementItem({ item, index }: { item: Announcement; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = item.body.length > 200

  return (
    <motion.li
      className={styles.annoItem}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.annoHeader}>
        <div className={styles.annoMeta}>
          {!item.is_read && <span className={styles.unreadDot} aria-label="Unread" />}
          <h3 className={`${styles.annoTitle} ${!item.is_read ? styles.annoTitleUnread : ''}`}>
            {item.title}
          </h3>
        </div>
        <div className={styles.annoChips}>
          <span className={`${styles.scopeChip} ${item.scope === 'school' ? styles.scopeSchool : item.scope === 'grade' ? styles.scopeGrade : styles.scopeCourse}`}>
            {item.scope_label}
          </span>
          {item.child_name && (
            <span className={styles.childChip}>{item.child_name}</span>
          )}
        </div>
      </div>

      <p className={`${styles.annoBody} ${!expanded && isLong ? styles.annoBodyTruncated : ''}`}>
        {item.body}
      </p>
      {isLong && (
        <button type="button" className={styles.readMoreBtn} onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      <p className={styles.annoTime}>{relativeTime(item.created_at)}</p>
    </motion.li>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <span className={styles.skeleton} style={{ width: 160, height: 24, borderRadius: 6, display: 'block' }} />
      </div>
      <ul className={styles.annoList}>
        {[0, 1, 2].map(i => (
          <li key={i} className={styles.annoItem} aria-hidden="true">
            <span className={styles.skeleton} style={{ width: '50%', height: 14, borderRadius: 4, display: 'block', marginBlockEnd: 10 }} />
            <span className={styles.skeleton} style={{ width: '80%', height: 11, borderRadius: 4, display: 'block', marginBlockEnd: 6 }} />
            <span className={styles.skeleton} style={{ width: '60%', height: 11, borderRadius: 4, display: 'block' }} />
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentAnnouncements() {
  const [filter, setFilter] = useState<'all' | 'school' | 'grade' | 'course'>('all')

  const { data, isLoading, isError, refetch } = useQuery<{ announcements: Announcement[] }>({
    queryKey: ['parent-announcements'],
    queryFn: () => api.get('/parent/announcements').then(r => r.data.data),
    staleTime: 30_000,
  })

  if (isLoading) return <Skeleton />

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertIcon />
          <p>Failed to load announcements.</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    )
  }

  const items = data.announcements
  const unreadCount = items.filter(a => !a.is_read).length
  const filtered = filter === 'all' ? items : items.filter(a => a.scope === filter)

  return (
    <div className={styles.page}>

      <div className={styles.pageHead}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>Announcements</h1>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount} unread</span>
          )}
        </div>
      </div>

      <div className={styles.filterRow} role="group" aria-label="Filter announcements">
        {(['all', 'school', 'grade', 'course'] as const).map(f => (
          <button
            key={f}
            type="button"
            className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'school' ? 'School' : f === 'grade' ? 'Grade' : 'Course'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            className={styles.emptyState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MegaphoneIcon />
            <p className={styles.emptyTitle}>No announcements yet</p>
            <p className={styles.emptyText}>New announcements will appear here.</p>
          </motion.div>
        ) : (
          <motion.ul
            key={filter}
            className={styles.annoList}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {filtered.map((item, i) => (
              <AnnouncementItem key={item.id} item={item} index={i} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

    </div>
  )
}
