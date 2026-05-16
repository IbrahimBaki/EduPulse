import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import styles from './Schedule.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: number
  name: string
  subject_id: number
  grade_level_id: number
  teacher_id: number
  description: string | null
  status: string
}

interface Schedule {
  id: number
  title: string
  starts_at: string
  ends_at: string
  type: 'online' | 'in-person' | 'recorded'
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  description: string | null
  meeting_url: string | null
}

interface CreateSchedulePayload {
  title: string
  starts_at: string
  ends_at: string
  type: string
  description: string
  meeting_url: string
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-rtl-flip="">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const IconChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-rtl-flip="">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconAlert = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="oklch(75% 0.18 75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(d: string | number | Date | null | undefined): Date {
  if (!d) return new Date(0)
  const parsed = new Date(d)
  return isNaN(parsed.getTime()) ? new Date(0) : parsed
}

function getStartOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatPeriodLabel(view: 'month' | 'week', date: Date) {
  if (view === 'month') {
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
  }
  const start = getStartOfWeek(date)
  const end = addDays(start, 6)
  
  if (start.getMonth() === end.getMonth()) {
    return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
  }
  return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${MONTHS[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchCourses() {
  const { data } = await api.get('/manager/courses', { params: { per_page: 100 } })
  const raw = data.data
  return (Array.isArray(raw) ? raw : (raw.data ?? [])) as Course[]
}

async function fetchSchedules(courseId: number | string) {
  if (!courseId) return []
  const { data } = await api.get(`/manager/courses/${courseId}/schedules`)
  const raw = data.data
  return (Array.isArray(raw) ? raw : (raw.data ?? [])) as Schedule[]
}

async function createScheduleApi(courseId: number, payload: CreateSchedulePayload) {
  const { data } = await api.post(`/manager/courses/${courseId}/schedules`, payload)
  return data.data as Schedule
}

// ─── Components ───────────────────────────────────────────────────────────────

function SlideOver({ open, onClose, onSave, isLoading, title, children }: {
  open: boolean; onClose: () => void; onSave: () => void; isLoading?: boolean; title: string; children: ReactNode
}) {
  const { t } = useTranslation()
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className={styles.slideOverRoot}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>{title}</h2>
          <button ref={closeRef} type="button" className={`${styles.btn} ${styles.btnIcon}`} onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className={styles.panelBody}>{children}</div>
        <div className={styles.panelFoot}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose} disabled={isLoading}>{t('common.cancel')}</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSave} disabled={isLoading}>
            {isLoading ? t('common.saving') : t('manager.schedule.saveSchedule')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function SchedulePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'month' | 'week' | 'list'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('')
  const [isSlideOverOpen, setSlideOverOpen] = useState(false)
  const [popover, setPopover] = useState<{ session: Schedule; x: number; y: number } | null>(null)

  const [formValues, setFormValues] = useState<CreateSchedulePayload>({
    title: '', starts_at: '', ends_at: '', type: 'online', description: '', meeting_url: '',
  })
  const [formError, setFormError] = useState('')

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['manager-courses'],
    queryFn: fetchCourses,
  })

  const { data: schedules, isLoading: schedulesLoading, isError, refetch } = useQuery({
    queryKey: ['manager-schedules', selectedCourseId],
    queryFn: () => fetchSchedules(selectedCourseId!),
    enabled: !!selectedCourseId,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateSchedulePayload) => createScheduleApi(Number(selectedCourseId), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-schedules', selectedCourseId] })
      setSlideOverOpen(false)
      setFormValues({ title: '', starts_at: '', ends_at: '', type: 'online', description: '', meeting_url: '' })
    },
  })

  const handleSave = () => {
    if (!formValues.title || !formValues.starts_at || !formValues.ends_at) {
      setFormError(t('manager.schedule.validationRequired'))
      return
    }
    setFormError('')
    createMutation.mutate(formValues)
  }

  const handleSessionClick = (e: React.MouseEvent, session: Schedule) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopover({
      session,
      x: Math.min(rect.left, window.innerWidth - 340),
      y: rect.bottom + 8,
    })
  }

  const handlePrev = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, -1))
    else setCurrentDate(addDays(currentDate, -7))
  }

  const handleNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1))
    else setCurrentDate(addDays(currentDate, 7))
  }

  const selectedCourse = courses?.find(c => c.id === selectedCourseId)

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{t('manager.schedule.title')}</h1>
          <p className={styles.pageCount}>
            {selectedCourse ? `${t('manager.schedule.viewingScheduleFor')} ${selectedCourse.name}` : t('manager.schedule.selectCoursePrompt')}
          </p>
        </div>

        <div className={styles.pageActions}>
          <div className={styles.dateNavigator}>
            <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnIcon}`} onClick={handlePrev}><IconChevronLeft /></button>
            <span className={styles.periodLabel}>{formatPeriodLabel(view === 'month' ? 'month' : 'week', currentDate)}</span>
            <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnIcon}`} onClick={handleNext}><IconChevronRight /></button>
            <button className={`${styles.btn} ${styles.btnOutline}`} style={{ marginInlineStart: '8px' }} onClick={() => setCurrentDate(new Date())}>{t('manager.schedule.today')}</button>
          </div>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setSlideOverOpen(true)}
            disabled={!selectedCourseId}
          >
            <IconPlus /> {t('manager.schedule.newSession')}
          </button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <select 
          className={styles.courseSelector}
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : '')}
          disabled={coursesLoading}
        >
          <option value="">{t('manager.schedule.selectCourse')}</option>
          {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className={styles.viewToggle} role="group" style={{ marginInlineStart: 'auto' }}>
          <button className={styles.viewToggleBtn} aria-pressed={view === 'week'} onClick={() => setView('week')}>{t('manager.schedule.week')}</button>
          <button className={styles.viewToggleBtn} aria-pressed={view === 'month'} onClick={() => setView('month')}>{t('manager.schedule.month')}</button>
          <button className={styles.viewToggleBtn} aria-pressed={view === 'list'} onClick={() => setView('list')}>{t('manager.schedule.list')}</button>
        </div>
      </div>

      <main>
        {!selectedCourseId ? (
          <div className={styles.emptyState}>
            <IconCalendar />
            <h3 className={styles.emptyTitle}>{t('manager.schedule.noCourseSelected')}</h3>
            <p className={styles.emptyText}>{t('manager.schedule.noCourseSelectedHint')}</p>
          </div>
        ) : schedulesLoading ? (
          <div className={`${styles.calendarContainer} ${styles.skeleton}`} style={{ height: '600px' }} />
        ) : isError ? (
          <div className={styles.emptyState}>
            <IconAlert />
            <h3 className={styles.emptyTitle}>{t('common.errorLoadFailed')}</h3>
            <p className={styles.emptyText}>{t('manager.schedule.errorHint')}</p>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>{t('common.retry')}</button>
          </div>
        ) : schedules?.length === 0 ? (
          <div className={styles.emptyState}>
            <IconCalendar />
            <h3 className={styles.emptyTitle}>{t('manager.schedule.emptySchedule')}</h3>
            <p className={styles.emptyText}>{t('manager.schedule.emptyScheduleHint')}</p>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setSlideOverOpen(true)}>
              <IconPlus /> {t('manager.schedule.createFirstSession')}
            </button>
          </div>
        ) : (
          <div className={styles.calendarContainer}>
            {view === 'week' && <WeekView sessions={schedules!} currentDate={currentDate} onSessionClick={handleSessionClick} />}
            {view === 'month' && <MonthView sessions={schedules!} currentDate={currentDate} onSessionClick={handleSessionClick} />}
            {view === 'list' && <ListView sessions={schedules!} />}
          </div>
        )}
      </main>

      {popover && (
        <>
          <div className={styles.backdrop} style={{ background: 'transparent', zIndex: 998 }} onClick={() => setPopover(null)} />
          <div className={styles.popoverPanel} style={{ top: `${popover.y}px`, left: `${popover.x}px` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{popover.session.title}</h3>
              {popover.session.status === 'live' && <span className={styles.statusLive}>{t('manager.schedule.live')}</span>}
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {popover.session.description || t('manager.schedule.noDescription')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <span className={styles.label} style={{ fontSize: '0.6875rem' }}>{t('manager.schedule.type')}</span>
                <span className={styles.statusBadge} style={{ background: 'oklch(22% 0.026 255)', color: 'var(--text-primary)' }}>{popover.session.type}</span>
              </div>
              <div>
                <span className={styles.label} style={{ fontSize: '0.6875rem' }}>{t('manager.schedule.time')}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{safeDate(popover.session.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            {popover.session.meeting_url && (
              <a href={popover.session.meeting_url} target="_blank" className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%', textDecoration: 'none' }}>{t('manager.schedule.launchSession')}</a>
            )}
          </div>
        </>
      )}

      <SlideOver open={isSlideOverOpen} onClose={() => { setSlideOverOpen(false); setFormError('') }} onSave={handleSave} isLoading={createMutation.isPending} title={t('manager.schedule.scheduleNewSession')}>
        {formError && (
          <p role="alert" style={{ fontSize: '0.8125rem', color: 'var(--color-red)', marginBottom: '4px' }}>{formError}</p>
        )}
        <div className={styles.formGroup}>
          <label className={styles.label}>{t('manager.schedule.sessionTitle')}</label>
          <input className={styles.input} placeholder={t('manager.schedule.sessionTitlePlaceholder')} value={formValues.title} onChange={(e) => { setFormError(''); setFormValues({ ...formValues, title: e.target.value }) }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className={styles.formGroup}><label className={styles.label}>{t('manager.schedule.startDateTime')}</label><input className={styles.input} type="datetime-local" value={formValues.starts_at} onChange={(e) => setFormValues({ ...formValues, starts_at: e.target.value })} /></div>
          <div className={styles.formGroup}><label className={styles.label}>{t('manager.schedule.endDateTime')}</label><input className={styles.input} type="datetime-local" value={formValues.ends_at} onChange={(e) => setFormValues({ ...formValues, ends_at: e.target.value })} /></div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>{t('manager.schedule.deliveryMode')}</label>
          <select className={styles.select} value={formValues.type} onChange={(e) => setFormValues({ ...formValues, type: e.target.value })}>
            <option value="online">{t('manager.schedule.online')}</option>
            <option value="in-person">{t('manager.schedule.inPerson')}</option>
            <option value="recorded">{t('manager.schedule.preRecorded')}</option>
          </select>
        </div>
        <div className={styles.formGroup}><label className={styles.label}>{t('manager.schedule.meetingUrl')}</label><input className={styles.input} placeholder="https://..." value={formValues.meeting_url} onChange={(e) => setFormValues({ ...formValues, meeting_url: e.target.value })} /></div>
        <div className={styles.formGroup}><label className={styles.label}>{t('manager.schedule.description')}</label><textarea className={styles.textarea} rows={3} placeholder={t('manager.schedule.descriptionPlaceholder')} value={formValues.description} onChange={(e) => setFormValues({ ...formValues, description: e.target.value })} /></div>
      </SlideOver>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WeekView({ sessions, currentDate, onSessionClick }: { 
  sessions: Schedule[], currentDate: Date, onSessionClick: (e: React.MouseEvent, s: Schedule) => void 
}) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const startOfWeek = getStartOfWeek(currentDate)
  const todayStr = new Date().toDateString()
  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

  return (
    <>
      <div className={styles.calendarHeader}>
        <div className={styles.calendarHeaderCell}>GMT+2</div>
        {days.map((day, i) => {
          const d = addDays(startOfWeek, i)
          return (
            <div key={day} className={`${styles.calendarHeaderCell} ${d.toDateString() === todayStr ? styles.today : ''}`}>
              <div style={{ fontSize: '0.625rem', opacity: 0.7 }}>{day}</div>
              <div style={{ fontSize: '1.125rem' }}>{d.getDate()}</div>
            </div>
          )
        })}
      </div>
      <div className={styles.calendarGrid} style={{ minHeight: '840px' }}>
        <div className={styles.timeCol}>{hours.map(h => <div key={h} className={styles.timeSlotLabel}>{h}:00</div>)}</div>
        {days.map((_, i) => {
          const d = addDays(startOfWeek, i)
          const daySessions = sessions.filter(s => safeDate(s.starts_at).toDateString() === d.toDateString())
          return (
            <div key={i} className={`${styles.dayCol} ${d.toDateString() === todayStr ? styles.today : ''}`}>
              {hours.map(h => <div key={h} className={styles.gridLine} />)}
              {daySessions.map(s => {
                const start = safeDate(s.starts_at)
                const end = safeDate(s.ends_at)
                const sH = start.getHours()
                const sM = start.getMinutes()
                const dM = (end.getTime() - start.getTime()) / 60000
                if (sH < hours[0] || sH > hours[hours.length - 1]) return null
                const top = ((sH - hours[0]) * 60) + sM
                return (
                  <div key={s.id} className={styles.sessionBlock} style={{ top: `${top}px`, height: `${Math.max(dM, 34)}px`, color: 'var(--color-blue)' }} onClick={(e) => onSessionClick(e, s)}>
                    <div className={styles.sessionTitle}>{s.title}</div>
                    <div className={styles.sessionTime}>{sH}:{sM.toString().padStart(2, '0')}</div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </>
  )
}

function MonthView({ sessions, currentDate, onSessionClick }: {
  sessions: Schedule[], currentDate: Date, onSessionClick: (e: React.MouseEvent, s: Schedule) => void
}) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const startOfGrid = getStartOfWeek(startOfMonth)
  const todayStr = new Date().toDateString()
  const grid = useMemo(() => {
    const temp = []; let curr = new Date(startOfGrid)
    for (let i = 0; i < 42; i++) { temp.push(new Date(curr)); curr.setDate(curr.getDate() + 1) }
    return temp
  }, [startOfGrid])

  return (
    <>
      <div className={styles.calendarHeader} style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map(day => <div key={day} className={styles.calendarHeaderCell}>{day}</div>)}
      </div>
      <div className={styles.monthGrid}>
        {grid.map((d, i) => {
          const isToday = d.toDateString() === todayStr
          const daySessions = sessions.filter(s => safeDate(s.starts_at).toDateString() === d.toDateString())
          return (
            <div key={i} className={`${styles.monthCell} ${d.getMonth() !== currentDate.getMonth() ? styles.monthCellOther : ''} ${isToday ? styles.monthCellToday : ''}`}>
              <div className={styles.dayNumber}>{d.getDate()}</div>
              {daySessions.slice(0, 3).map(s => (
                <div key={s.id} className={styles.monthEvent} onClick={(e) => onSessionClick(e, s)}>{s.title}</div>
              ))}
              {daySessions.length > 3 && <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textAlign: 'center' }}>+ {daySessions.length - 3} more</div>}
            </div>
          )
        })}
      </div>
    </>
  )
}

function ListView({ sessions }: { sessions: Schedule[] }) {
  const { t } = useTranslation()
  return (
    <div className={styles.listWrapper}>
      <h3 className={styles.listGroupTitle}>{t('manager.schedule.upcomingSessions')}</h3>
      {sessions.map(s => (
        <div key={s.id} className={styles.listCard}>
          <div className={styles.listCardTime}>{safeDate(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className={styles.listCardBody}>
            <div className={styles.listCardTitle}>{s.title}</div>
            <div className={styles.listCardMeta}>
              <span className={styles.statusBadge} style={{ background: 'oklch(22% 0.026 255)' }}>{s.type === 'online' ? t('common.online') : s.type === 'recorded' ? t('common.recorded') : t('common.inPerson')}</span>
              <span>&bull;</span><span>{s.status === 'live' ? t('common.live') : s.status === 'completed' ? t('common.completed') : s.status === 'cancelled' ? t('common.cancelled') : t('common.scheduled')}</span>
            </div>
          </div>
          <div className={styles.pageActions}><button className={`${styles.btn} ${styles.btnOutline} ${styles.btnIcon}`}>...</button></div>
        </div>
      ))}
    </div>
  )
}
