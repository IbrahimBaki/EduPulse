import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import styles from './Announcements.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Announcement {
  id: number
  title: string
  body: string
  published_at: string
  course?: { id: number; name: string }
  audience?: 'school' | 'grade' | 'course' | string
  is_published?: boolean
}

type Filter = 'all' | 'school' | 'course'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = (data as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  return []
}

const STORAGE_KEY = 'edupulse_read_announcements'

function getReadSet(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function markRead(id: number) {
  try {
    const set = getReadSet()
    set.add(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch { /* noop */ }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function audienceLabel(ann: Announcement): string {
  if (ann.course) return ann.course.name
  if (ann.audience === 'course') return 'My Course'
  if (ann.audience === 'grade') return 'My Grade'
  return 'School'
}

function audienceType(ann: Announcement): 'school' | 'course' {
  if (ann.course || ann.audience === 'course' || ann.audience === 'grade') return 'course'
  return 'school'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BellOffIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8"/>
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/>
      <path d="M18 8a6 6 0 0 0-9.33-5"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBlockEnd: 10 }}>
        <span className={styles.skeleton} style={{ height: 16, width: '60%' }} />
        <span className={styles.skeleton} style={{ height: 16, width: 8, marginInlineStart: 'auto', borderRadius: '50%' }} />
      </div>
      <span className={styles.skeleton} style={{ height: 12, width: '90%', display: 'block', marginBlockEnd: 6 }} />
      <span className={styles.skeleton} style={{ height: 12, width: '75%', display: 'block' }} />
      <div style={{ display: 'flex', gap: 8, marginBlockStart: 12 }}>
        <span className={styles.skeleton} style={{ height: 18, width: 60 }} />
        <span className={styles.skeleton} style={{ height: 18, width: 50 }} />
      </div>
    </div>
  )
}

// ─── Announcement card ─────────────────────────────────────────────────────────

function AnnouncementCard({ ann, isUnread, onRead }: { ann: Announcement; isUnread: boolean; onRead: (id: number) => void }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef<HTMLElement>(null)

  const handleExpand = () => {
    setExpanded(e => !e)
    if (isUnread) onRead(ann.id)
  }

  const type = audienceType(ann)

  return (
    <article
      ref={cardRef}
      className={`${styles.card} ${isUnread ? styles.cardUnread : ''}`}
      aria-label={ann.title}
    >
      <div className={styles.cardTop}>
        <h2 className={styles.cardTitle}>{ann.title}</h2>
        {isUnread && <span className={styles.unreadDot} aria-label={t('student.announcements.unread')} />}
      </div>
      <p className={`${styles.cardBody} ${expanded ? styles.cardBodyExpanded : ''}`}>
        {ann.body}
      </p>
      {ann.body.length > 160 && (
        <button
          type="button"
          className={styles.readMoreBtn}
          onClick={handleExpand}
          aria-expanded={expanded}
        >
          {expanded ? t('student.announcements.showLess') : t('student.announcements.readMore')}
        </button>
      )}
      <div className={styles.cardMeta}>
        <span className={`${styles.badge} ${type === 'school' ? styles.badgeSchool : styles.badgeCourse}`}>
          {audienceLabel(ann)}
        </span>
        <time className={styles.cardDate} dateTime={ann.published_at}>
          {relativeTime(ann.published_at)}
        </time>
      </div>
    </article>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentAnnouncements() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<Filter>('all')
  const [readSet, setReadSet] = useState<Set<number>>(getReadSet)

  const { data: announcements = [], isLoading, isError, refetch } = useQuery<Announcement[]>({
    queryKey: ['student-announcements'],
    queryFn: () => api.get('/student/announcements').then(r => normalizeArray<Announcement>(r.data.data ?? r.data)),
    staleTime: 2 * 60 * 1000,
  })

  const handleRead = (id: number) => {
    markRead(id)
    setReadSet(prev => new Set([...prev, id]))
  }

  const filtered = announcements.filter(a => {
    if (filter === 'all') return true
    return audienceType(a) === filter
  })

  const unreadCount = announcements.filter(a => !readSet.has(a.id)).length

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'school', label: t('student.announcements.school') },
    { key: 'course', label: t('student.announcements.myCourses') },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{t('student.announcements.title')}</h1>
          <p className={styles.pageCount}>
            {isLoading ? t('common.loading') : (
              <>
                {announcements.length} {t('student.announcements.total')}
                {unreadCount > 0 && <span className={styles.unreadCount}>{unreadCount} {t('student.announcements.unread')}</span>}
              </>
            )}
          </p>
        </div>
      </header>

      <div className={styles.filters} role="group" aria-label={t('student.announcements.filterAnnouncements')}>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`${styles.filterBtn} ${filter === key ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 5 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'var(--color-amber)' }}><AlertIcon /></div>
          <p className={styles.emptyTitle}>{t('common.errorLoadFailed')}</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>{t('common.retry')}</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'var(--text-muted)' }}><BellOffIcon /></div>
          <p className={styles.emptyTitle}>{t('student.announcements.noAnnouncements')}</p>
          <p className={styles.emptyText}>{t('student.announcements.noAnnouncementsHint')}</p>
        </div>
      ) : (
        <div className={styles.list} role="list">
          {filtered.map(a => (
            <AnnouncementCard
              key={a.id}
              ann={a}
              isUnread={!readSet.has(a.id)}
              onRead={handleRead}
            />
          ))}
        </div>
      )}
    </div>
  )
}
