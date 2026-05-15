import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import styles from './Schedule.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: number
  title: string
  course: { id: number; name: string; subject?: string | { name?: string } }
  teacher?: { id: number; name: string }
  starts_at: string
  ends_at: string
  type: 'online' | 'offline' | 'recorded'
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  jitsi_url?: string | null
  my_attendance?: 'present' | 'absent' | null
}

type GroupKey = 'today' | 'tomorrow' | 'this_week' | 'later'
type TypeFilter = 'all' | 'online' | 'offline' | 'today'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = (data as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  return []
}

function startOf(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function groupSession(starts_at: string): GroupKey {
  const now   = startOf(new Date())
  const day   = startOf(new Date(starts_at))
  const diff  = (day.getTime() - now.getTime()) / 86_400_000
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff <= 6)  return 'this_week'
  return 'later'
}

function isLive(s: Session): boolean {
  return s.status === 'live' || (s.status !== 'completed' && s.status !== 'cancelled' && new Date(s.ends_at) > new Date() && new Date(s.starts_at) <= new Date())
}

function isSoon(s: Session): boolean {
  const diff = new Date(s.starts_at).getTime() - Date.now()
  return diff > 0 && diff <= 30 * 60 * 1000
}

function canJoin(s: Session): boolean {
  return s.type === 'online' && (isLive(s) || isSoon(s)) && !!s.jitsi_url
}

function formatTimeRange(starts_at: string, ends_at: string): string {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${fmt(starts_at)} – ${fmt(ends_at)}`
}

function teacherInitials(name?: string): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CalendarEmptyIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
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

function VideoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <span className={styles.skeleton} style={{ height: 24, width: 90 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className={styles.skeleton} style={{ height: 16, width: '55%' }} />
        <span className={styles.skeleton} style={{ height: 14, width: '35%' }} />
      </div>
      <span className={styles.skeleton} style={{ height: 28, width: 56 }} />
    </div>
  )
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ s }: { s: Session }) {
  const { t } = useTranslation()
  const live   = isLive(s)
  const join   = canJoin(s)
  const completed = s.status === 'completed'

  return (
    <article className={`${styles.sessionCard} ${completed ? styles.sessionCompleted : ''} ${live ? styles.sessionLive : ''}`}>
      <div className={styles.sessionTime}>
        <span className={styles.timeRange}>{formatTimeRange(s.starts_at, s.ends_at)}</span>
        {live && <span className={styles.livePulse} aria-label="Live" />}
      </div>

      <div className={styles.sessionInfo}>
        <p className={styles.sessionTitle}>{s.title}</p>
        <p className={styles.sessionCourse}>{s.course?.name}</p>
        {s.teacher && (
          <div className={styles.teacherRow}>
            <span className={styles.teacherAvatar}>{teacherInitials(s.teacher.name)}</span>
            <span className={styles.teacherName}>{s.teacher.name}</span>
          </div>
        )}
      </div>

      <div className={styles.sessionRight}>
        <div className={styles.badgeRow}>
          <span className={`${styles.typeBadge} ${s.type === 'online' ? styles.typeOnline : s.type === 'recorded' ? styles.typeRecorded : styles.typeOffline}`}>
            {s.type === 'online' && <VideoIcon />}
            {s.type === 'online' ? t('common.online') : s.type === 'recorded' ? t('student.schedule.recorded') : t('common.inPerson')}
          </span>
          {completed && (
            <span className={`${styles.attendanceBadge} ${s.my_attendance === 'present' ? styles.attendPresent : s.my_attendance === 'absent' ? styles.attendAbsent : styles.attendUnknown}`}>
              {s.my_attendance === 'present' ? t('student.schedule.present') : s.my_attendance === 'absent' ? t('student.schedule.absent') : t('student.schedule.completed')}
            </span>
          )}
        </div>

        {join && s.jitsi_url && (
          <a
            href={s.jitsi_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.joinBtn} ${live ? styles.joinBtnLive : ''}`}
            aria-label={`${t('session.joinNow')} ${s.title}`}
          >
            <ExternalLinkIcon />
            {live ? t('session.joinNow') : t('student.schedule.joinSoon')}
          </a>
        )}
      </div>
    </article>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentSchedule() {
  const { t } = useTranslation()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const { data: sessions = [], isLoading, isError, refetch } = useQuery<Session[]>({
    queryKey: ['student-schedules'],
    queryFn: () => api.get('/student/schedules').then(r => normalizeArray<Session>(r.data.data ?? r.data)),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  const filtered = useMemo(() => sessions.filter(s => {
    if (typeFilter === 'online')  return s.type === 'online'
    if (typeFilter === 'offline') return s.type === 'offline'
    if (typeFilter === 'today')   return groupSession(s.starts_at) === 'today'
    return true
  }), [sessions, typeFilter])

  const grouped = useMemo(() => {
    const map: Record<GroupKey, Session[]> = { today: [], tomorrow: [], this_week: [], later: [] }
    for (const s of filtered) map[groupSession(s.starts_at)].push(s)
    return map
  }, [filtered])

  const ORDER: GroupKey[] = ['today', 'tomorrow', 'this_week', 'later']
  const GROUP_LABELS: Record<GroupKey, string> = {
    today: t('student.schedule.today'), tomorrow: t('student.schedule.tomorrow'), this_week: t('student.schedule.thisWeek'), later: t('student.schedule.later')
  }

  const FILTERS: { key: TypeFilter; label: string }[] = [
    { key: 'all',     label: t('common.all') },
    { key: 'today',   label: t('student.schedule.today') },
    { key: 'online',  label: t('common.online') },
    { key: 'offline', label: t('common.inPerson') },
  ]

  const hasAny = ORDER.some(k => grouped[k].length > 0)

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{t('student.schedule.title')}</h1>
          <p className={styles.pageCount}>
            {isLoading ? t('common.loading') : `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      <div className={styles.filters} role="group" aria-label={t('student.schedule.filterSessions')}>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`${styles.filterBtn} ${typeFilter === key ? styles.filterBtnActive : ''}`}
            onClick={() => setTypeFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.content}>
          {Array.from({ length: 5 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'var(--color-amber)' }}><AlertIcon /></div>
          <p className={styles.emptyTitle}>{t('common.errorLoadFailed')}</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>{t('common.retry')}</button>
        </div>
      ) : !hasAny ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'var(--text-muted)' }}><CalendarEmptyIcon /></div>
          <p className={styles.emptyTitle}>{t('student.schedule.noUpcomingSessions')}</p>
          <p className={styles.emptyText}>{t('student.schedule.noUpcomingSessionsHint')}</p>
        </div>
      ) : (
        <div className={styles.content}>
          {ORDER.map(key => grouped[key].length === 0 ? null : (
            <section key={key}>
              <h2 className={styles.groupLabel}>{GROUP_LABELS[key]}</h2>
              <div className={styles.group}>
                {grouped[key].map(s => <SessionCard key={s.id} s={s} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
