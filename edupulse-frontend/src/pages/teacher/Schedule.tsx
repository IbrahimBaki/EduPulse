import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import { SlideOver } from '../../components/SlideOver'
import styles from './Schedule.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: number
  name: string
  status: 'draft' | 'active' | 'archived'
}

interface Session {
  id: number
  course_id: number
  title: string
  description?: string
  starts_at: string
  ends_at: string
  type: 'online' | 'in_person' | 'recorded'
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  jitsi_url?: string
  course?: { id: number; name: string }
}

interface StudentAttendee {
  id: number
  name: string
  code: string
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = (data as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  return []
}

function generateJitsiUrl(title: string, courseId: number): string {
  const slug = `edupulse-${courseId}-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}`
  return `https://meet.jit.si/${slug}`
}

function getWeekDates(anchorDate: Date): Date[] {
  const d = new Date(anchorDate)
  d.setDate(d.getDate() - d.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d)
    day.setDate(d.getDate() + i)
    return day
  })
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isWithin30Min(startIso: string): boolean {
  const diff = new Date(startIso).getTime() - Date.now()
  return diff > 0 && diff < 30 * 60 * 1000
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(d: Date): { day: string; month: string } {
  return {
    day: d.getDate().toString(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
  }
}

function formatWeekRange(dates: Date[]): string {
  const first = dates[0], last = dates[6]
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (first.getMonth() === last.getMonth()) {
    return `${first.toLocaleDateString('en-US', opts)} – ${last.getDate()}, ${last.getFullYear()}`
  }
  return `${first.toLocaleDateString('en-US', opts)} – ${last.toLocaleDateString('en-US', opts)}, ${last.getFullYear()}`
}

function chipClass(status: Session['status']): string {
  if (status === 'live') return styles.chipLive
  if (status === 'completed') return styles.chipCompleted
  if (status === 'cancelled') return styles.chipCancelled
  return styles.chipScheduled
}

function badgeClass(status: Session['status']): string {
  if (status === 'live') return styles.badgeLive
  if (status === 'completed') return styles.badgeCompleted
  if (status === 'cancelled') return styles.badgeCancelled
  return styles.badgeScheduled
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-rtl-flip="">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-rtl-flip="">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function CalendarEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

// ─── Add session slide-over ────────────────────────────────────────────────────

function AddSessionPanel({ open, onClose, courses }: { open: boolean; onClose: () => void; courses: Course[] }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ course_id: '', title: '', description: '', date: '', starts_at: '', ends_at: '', type: 'online' as 'online' | 'in_person' | 'recorded' })

  const jitsiUrl = form.type === 'online' && form.title && form.course_id
    ? generateJitsiUrl(form.title, Number(form.course_id))
    : null

  const addMutation = useMutation({
    mutationFn: (body: Record<string, unknown> & { course_id: number }) =>
      api.post(`/teacher/courses/${body.course_id}/schedules`, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher-schedules', String(vars.course_id)] })
      setForm({ course_id: '', title: '', description: '', date: '', starts_at: '', ends_at: '', type: 'online' })
      onClose()
    },
  })

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!form.course_id || !form.title.trim() || !form.date || !form.starts_at || !form.ends_at) return
    addMutation.mutate({
      course_id: Number(form.course_id),
      title: form.title,
      description: form.description,
      starts_at: `${form.date}T${form.starts_at}:00`,
      ends_at: `${form.date}T${form.ends_at}:00`,
      type: form.type,
      jitsi_url: jitsiUrl ?? undefined,
    })
  }, [form, jitsiUrl, addMutation])

  const canSubmit = !!form.course_id && !!form.title.trim() && !!form.date && !!form.starts_at && !!form.ends_at

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={t('teacher.schedule.addSession')}
      description={t('teacher.schedule.scheduleSession')}
      footer={
        <>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={addMutation.isPending || !canSubmit} onClick={e => handleSubmit(e as unknown as React.FormEvent)}>
            {addMutation.isPending ? t('common.saving') : t('teacher.schedule.saveSchedule')}
          </button>
        </>
      }
    >
      <form className={styles.fieldGroup} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="sess-course">{t('teacher.schedule.courseLabel')}</label>
          <select id="sess-course" className={styles.soSelect} value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))} required>
            <option value="">{t('teacher.schedule.selectCourse')}</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="sess-title">{t('teacher.schedule.titleLabel')}</label>
          <input id="sess-title" className={styles.input} placeholder="e.g. Chapter 4 Discussion" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </div>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="sess-desc">{t('teacher.schedule.descriptionLabel')}</label>
          <textarea id="sess-desc" className={styles.textarea} placeholder={t('teacher.schedule.optionalNotes')} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="sess-date">{t('teacher.schedule.dateLabel')}</label>
          <input id="sess-date" className={styles.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
        <div className={styles.fieldRow2}>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="sess-start">{t('teacher.schedule.startTimeLabel')}</label>
            <input id="sess-start" className={styles.input} type="time" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} required />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="sess-end">{t('teacher.schedule.endTimeLabel')}</label>
            <input id="sess-end" className={styles.input} type="time" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} required />
          </div>
        </div>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="sess-type">{t('teacher.schedule.typeLabel')}</label>
          <select id="sess-type" className={styles.soSelect} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof form.type }))}>
            <option value="online">{t('teacher.schedule.sessionType.online')}</option>
            <option value="in_person">{t('teacher.schedule.sessionType.inPerson')}</option>
            <option value="recorded">{t('teacher.schedule.sessionType.recorded')}</option>
          </select>
        </div>
        {jitsiUrl && (
          <div>
            <div className={styles.label} style={{ marginBlockEnd: 6 }}>{t('teacher.schedule.jitsiRoomAutoGenerated')}</div>
            <div className={styles.jitsiPreview}>{jitsiUrl}</div>
          </div>
        )}
      </form>
    </SlideOver>
  )
}

// ─── Attendance slide-over ────────────────────────────────────────────────────

function AttendancePanel({ open, onClose, session }: { open: boolean; onClose: () => void; session: Session }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({})

  const { data: attendees = [], isLoading } = useQuery<StudentAttendee[]>({
    queryKey: ['session-attendees', session.id],
    queryFn: () => api.get(`/teacher/courses/${session.course_id}/students`).then(r => normalizeArray<StudentAttendee>(r.data.data ?? r.data)),
    enabled: open,
  })

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/teacher/schedules/${session.id}/attendance`, {
      attendance: attendees.map(a => ({ student_id: a.id, status: attendance[a.id] ?? 'absent' })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-schedules'] })  // invalidates all course schedule caches
      onClose()
    },
  })

  const markAll = useCallback((status: AttendanceStatus) => {
    const next: Record<number, AttendanceStatus> = {}
    attendees.forEach(a => { next[a.id] = status })
    setAttendance(next)
  }, [attendees])

  const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
    { value: 'present', label: 'P' },
    { value: 'absent',  label: 'A' },
    { value: 'late',    label: 'L' },
    { value: 'excused', label: 'E' },
  ]

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={t('teacher.attendance.title')}
      description={session.title}
      footer={
        <>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitMutation.isPending || attendees.length === 0} onClick={() => submitMutation.mutate()}>
            {submitMutation.isPending ? t('teacher.attendance.submitting') : t('teacher.attendance.submit')}
          </button>
        </>
      }
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={styles.skeleton} style={{ height: 48, borderRadius: 6 }} />
          ))}
        </div>
      ) : attendees.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('teacher.attendance.noStudents')}</p>
      ) : (
        <>
          <div className={styles.attendanceBulkRow}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{attendees.length} students</span>
            <button type="button" className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => markAll('present')}>
              {t('teacher.attendance.markAllPresent')}
            </button>
          </div>
          <ul className={styles.attendeeList} aria-label="Attendance list">
            {attendees.map(a => (
              <li key={a.id} className={styles.attendeeRow}>
                <div style={{ flex: 1 }}>
                  <div className={styles.attendeeName}>{a.name}</div>
                  <div className={styles.attendeeCode}>{a.code}</div>
                </div>
                <div className={styles.radioGroup} role="group" aria-label={`Attendance for ${a.name}`}>
                  {STATUS_OPTIONS.map(opt => (
                    <label key={opt.value} className={styles.radioLabel} title={opt.value}>
                      <input
                        type="radio"
                        name={`att-${a.id}`}
                        value={opt.value}
                        checked={attendance[a.id] === opt.value}
                        onChange={() => setAttendance(prev => ({ ...prev, [a.id]: opt.value }))}
                        aria-label={opt.value}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </SlideOver>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeacherSchedule() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const today = new Date()
  const [anchor, setAnchor] = useState(today)
  const [view, setView] = useState<'week' | 'list'>('week')
  const [courseFilter, setCourseFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null)

  const joinAsHost = useCallback(async (session: Session) => {
    try {
      const res = await api.get(`/teacher/courses/${session.course_id}/schedules/${session.id}/join`)
      const url = res.data.data?.url ?? res.data.url
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      if (session.jitsi_url) window.open(session.jitsi_url, '_blank', 'noopener,noreferrer')
    }
  }, [])

  const weekDates = getWeekDates(anchor)

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['teacher-courses-simple'],
    queryFn: () => api.get('/teacher/courses').then(r => normalizeArray<Course>(r.data.data ?? r.data)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: sessions = [], isLoading, isError, refetch } = useQuery<Session[]>({
    queryKey: ['teacher-schedules', courseFilter],
    queryFn: () => api.get(`/teacher/courses/${courseFilter}/schedules`).then(r => normalizeArray<Session>(r.data.data ?? r.data)),
    staleTime: 2 * 60 * 1000,
    enabled: !!courseFilter,
  })

  const statusMutation = useMutation({
    mutationFn: ({ session, status }: { session: Session; status: string }) =>
      api.patch(`/teacher/courses/${session.course_id}/schedules/${session.id}/status`, { status }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher-schedules', courseFilter] })
      if (vars.status === 'live') {
        joinAsHost(vars.session)
      }
      if (vars.status === 'completed') {
        setAttendanceSession(vars.session)
      }
    },
  })

  const filtered = sessions

  const sessionsForDay = (day: Date) =>
    filtered.filter(s => sameDay(new Date(s.starts_at), day))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  const goWeek = (dir: -1 | 1) => {
    const d = new Date(anchor)
    d.setDate(d.getDate() + dir * 7)
    setAnchor(d)
  }

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (isError) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <div style={{ color: 'var(--color-amber)' }}><AlertIcon /></div>
          <p className={styles.emptyTitle}>{t('teacher.schedule.failedToLoadSchedule')}</p>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>{t('common.retry')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{t('teacher.schedule.schedule')}</h1>
          <p className={styles.pageSubtitle}>
            {!courseFilter
              ? t('teacher.schedule.selectCourse')
              : isLoading
                ? t('common.loading')
                : `${filtered.length} session${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowAdd(true)}>
          <PlusIcon /> {t('teacher.schedule.addSession')}
        </button>
      </header>

      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={courseFilter}
          onChange={e => setCourseFilter(e.target.value)}
          aria-label="Filter by course"
        >
          <option value="">{t('teacher.schedule.allCourses')}</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className={styles.viewToggle} role="group" aria-label="View toggle">
          <button
            type="button"
            className={`${styles.viewBtn} ${view === 'week' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('week')}
            aria-label="Week view"
            aria-pressed={view === 'week'}
          >
            <GridIcon />
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('list')}
            aria-label="List view"
            aria-pressed={view === 'list'}
          >
            <ListIcon />
          </button>
        </div>
      </div>

      {/* No course selected */}
      {!courseFilter && (
        <div className={styles.emptyState}>
          <div style={{ color: 'oklch(44% 0.018 255)' }}><CalendarEmptyIcon /></div>
          <p className={styles.emptyTitle}>{t('teacher.schedule.selectACourse')}</p>
          <p className={styles.emptyText}>{t('teacher.schedule.chooseCourseToManage')}</p>
        </div>
      )}

      {/* Week navigator */}
      {courseFilter && <div className={styles.weekNav}>
        <button type="button" className={styles.weekNavBtn} onClick={() => goWeek(-1)} aria-label="Previous week">
          <ChevronLeftIcon />
        </button>
        <span className={styles.weekLabel}>{formatWeekRange(weekDates)}</span>
        <button type="button" className={styles.weekNavBtn} onClick={() => goWeek(1)} aria-label="Next week">
          <ChevronRightIcon />
        </button>
        <button type="button" className={styles.todayBtn} onClick={() => setAnchor(today)}>{t('teacher.schedule.today')}</button>
      </div>}

      {/* Week grid view */}
      {courseFilter && view === 'week' && (
        <div className={styles.weekGrid} role="grid" aria-label="Weekly schedule">
          {weekDates.map((day, i) => {
            const isToday = sameDay(day, today)
            const daySessions = sessionsForDay(day)
            return (
              <div key={i} className={styles.dayCol} role="gridcell">
                <div className={styles.dayHeader}>
                  <div className={styles.dayName}>{DAY_NAMES[i]}</div>
                  <div className={isToday ? styles.dayNumToday : styles.dayNum} aria-current={isToday ? 'date' : undefined}>
                    {day.getDate()}
                  </div>
                </div>
                <div className={styles.dayBody}>
                  {isLoading
                    ? Array.from({ length: 1 }, (_, j) => <span key={j} className={styles.skeleton} style={{ height: 44 }} />)
                    : daySessions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className={`${styles.sessionChip} ${chipClass(s.status)}`}
                        onClick={() => {
                          if (s.status === 'completed') setAttendanceSession(s)
                          else if (s.status === 'live') joinAsHost(s)
                        }}
                        aria-label={`${s.title} at ${formatTime(s.starts_at)}, status: ${s.status}`}
                      >
                        <span className={styles.chipTitle}>
                          {s.status === 'live' && <span className={styles.liveDot} />}
                          {s.status === 'scheduled' && isWithin30Min(s.starts_at) && <span className={styles.soonDot} />}
                          {s.title}
                        </span>
                        <span className={styles.chipTime}>{formatTime(s.starts_at)} – {formatTime(s.ends_at)}</span>
                      </button>
                    ))
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {courseFilter && view === 'list' && (
        isLoading ? (
          <div className={styles.listView}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={styles.listRow}>
                <span className={styles.skeleton} style={{ width: 40, height: 40 }} />
                <div style={{ flex: 1 }}>
                  <span className={styles.skeleton} style={{ display: 'block', height: 16, width: '40%', marginBlockEnd: 6 }} />
                  <span className={styles.skeleton} style={{ display: 'block', height: 12, width: '25%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ color: 'oklch(44% 0.018 255)' }}><CalendarEmptyIcon /></div>
            <p className={styles.emptyTitle}>{t('teacher.schedule.noSessionsScheduledList')}</p>
            <p className={styles.emptyText}>{t('teacher.schedule.addSessionToSchedule')}</p>
          </div>
        ) : (
          <div className={styles.listView}>
            {[...filtered]
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
              .map(s => {
                const { day, month } = formatDateShort(new Date(s.starts_at))
                const isLive = s.status === 'live'
                const isSoon = s.status === 'scheduled' && isWithin30Min(s.starts_at)
                return (
                  <div key={s.id} className={styles.listRow}>
                    <div className={styles.listDateBlock} aria-hidden="true">
                      <div className={styles.listDateDay}>{day}</div>
                      <div className={styles.listDateMonth}>{month}</div>
                    </div>
                    <div className={styles.listInfo}>
                      <div className={styles.listTitle}>
                        {isLive && <span className={styles.liveDot} />}
                        {isSoon && <span className={styles.soonDot} />}
                        {s.title}
                      </div>
                      <div className={styles.listMeta}>
                        {formatTime(s.starts_at)} – {formatTime(s.ends_at)}
                        {s.course && <><span aria-hidden="true"> · </span>{s.course.name}</>}
                      </div>
                    </div>
                    <div className={styles.listActions}>
                      <span className={`${styles.badge} ${badgeClass(s.status)}`}>{s.status === 'live' ? t('common.live') : s.status === 'completed' ? t('common.completed') : s.status === 'cancelled' ? t('common.cancelled') : t('common.scheduled')}</span>
                      {s.status === 'scheduled' && (
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnGreen} ${styles.btnSm}`}
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ session: s, status: 'live' })}
                        >
                          {t('session.goLive')}
                        </button>
                      )}
                      {s.status === 'live' && (
                        <>
                          {s.jitsi_url && (
                            <button
                              type="button"
                              className={`${styles.btn} ${styles.btnGreen} ${styles.btnSm}`}
                              onClick={() => joinAsHost(s)}
                            >
                              {t('session.joinNow')}
                            </button>
                          )}
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ session: s, status: 'completed' })}
                          >
                            {t('session.endSession')}
                          </button>
                        </>
                      )}
                      {s.status === 'completed' && (
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}
                          onClick={() => setAttendanceSession(s)}
                        >
                          {t('teacher.attendance.title')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )
      )}

      <AddSessionPanel open={showAdd} onClose={() => setShowAdd(false)} courses={courses} />

      {attendanceSession && (
        <AttendancePanel
          open={!!attendanceSession}
          onClose={() => setAttendanceSession(null)}
          session={attendanceSession}
        />
      )}
    </div>
  )
}
