import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import { SlideOver } from '../../components/SlideOver'
import styles from './Announcements.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: number
  name: string
}

interface Announcement {
  id: number
  title: string
  body: string
  is_published: boolean
  course_id?: number
  course?: { id: number; name: string }
  published_at?: string
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = (data as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  return []
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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

function BellOffIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8"/>
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/>
      <path d="M18 8a6 6 0 0 0-9.33-5"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <span className={styles.skeleton} style={{ height: 18, width: '55%' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <span className={styles.skeleton} style={{ height: 16, width: 60 }} />
        <span className={styles.skeleton} style={{ height: 16, width: 80 }} />
        <span className={styles.skeleton} style={{ height: 16, width: 72 }} />
      </div>
    </div>
  )
}

// ─── Simple rich text area (no external lib) ───────────────────────────────────

function RichTextArea({ value, onChange, placeholder, id }: { value: string; onChange: (v: string) => void; placeholder?: string; id: string }) {
  return (
    <textarea
      id={id}
      className={styles.textarea}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={6}
      aria-label="Announcement body"
    />
  )
}

// ─── Add announcement slide-over ───────────────────────────────────────────────

function AddAnnouncementPanel({ open, onClose, courses }: { open: boolean; onClose: () => void; courses: Course[] }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', body: '', course_id: '', publish_immediately: false })

  const addMutation = useMutation({
    mutationFn: (body: object) => api.post('/teacher/announcements', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-announcements'] })
      setForm({ title: '', body: '', course_id: '', publish_immediately: false })
      onClose()
    },
  })

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    addMutation.mutate({
      title: form.title,
      body: form.body,
      audience: 'course',
      audience_id: Number(form.course_id),
      publish_immediately: form.publish_immediately,
    })
  }, [form, addMutation])

  const canSubmit = !!form.title.trim() && !!form.body.trim() && !!form.course_id

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={t('teacher.announcements.new')}
      description={t('teacher.announcements.description')}
      footer={
        <>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>{t('common.cancel')}</button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={addMutation.isPending || !canSubmit}
            onClick={e => handleSubmit(e as unknown as React.FormEvent)}
          >
            {addMutation.isPending ? t('teacher.announcements.posting') : form.publish_immediately ? t('common.publish') : t('teacher.announcements.saveDraft')}
          </button>
        </>
      }
    >
      <form className={styles.fieldGroup} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="ann-title">Title</label>
          <input
            id="ann-title"
            className={styles.input}
            placeholder="e.g. Assignment reminder"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            autoFocus
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="ann-body">Body</label>
          <RichTextArea
            id="ann-body"
            value={form.body}
            onChange={body => setForm(f => ({ ...f, body }))}
            placeholder={t('teacher.announcements.writePlaceholder')}
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="ann-course">Course</label>
          <select
            id="ann-course"
            className={styles.soSelect}
            value={form.course_id}
            onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
            required
          >
            <option value="">{t('teacher.announcements.selectCourse')}</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Publish immediately</span>
          <label className={styles.toggleSwitch} aria-label="Publish immediately toggle">
            <input
              type="checkbox"
              checked={form.publish_immediately}
              onChange={e => setForm(f => ({ ...f, publish_immediately: e.target.checked }))}
            />
            <span className={styles.toggleTrack} />
          </label>
        </div>
      </form>
    </SlideOver>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeacherAnnouncements() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['teacher-courses-ann'],
    queryFn: () => api.get('/teacher/courses').then(r => normalizeArray<Course>(r.data.data ?? r.data)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: announcements = [], isLoading, isError, refetch } = useQuery<Announcement[]>({
    queryKey: ['teacher-announcements'],
    queryFn: () => api.get('/teacher/announcements').then(r => normalizeArray<Announcement>(r.data.data ?? r.data)),
    staleTime: 2 * 60 * 1000,
  })

  const publishMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/teacher/announcements/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-announcements'] }),
  })

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{t('teacher.announcements.title')}</h1>
          <p className={styles.pageCount}>
            {isLoading ? t('common.loading') : `${announcements.length} announcement${announcements.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowAdd(true)}>
          <PlusIcon /> {t('teacher.announcements.new')}
        </button>
      </header>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 5 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'var(--color-amber)' }}><AlertIcon /></div>
          <p className={styles.emptyTitle}>{t('common.errorLoadFailed')}</p>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>{t('common.retry')}</button>
        </div>
      ) : announcements.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'oklch(44% 0.018 255)' }}><BellOffIcon /></div>
          <p className={styles.emptyTitle}>{t('teacher.announcements.noAnnouncements')}</p>
          <p className={styles.emptyText}>{t('teacher.announcements.noAnnouncementsText')}</p>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowAdd(true)}>
            <PlusIcon /> {t('teacher.announcements.new')}
          </button>
        </div>
      ) : (
        <div className={styles.list} role="list">
          {announcements.map(a => (
            <article key={a.id} className={styles.card} role="listitem">
              <div className={styles.cardMain}>
                <h2 className={styles.cardTitle}>{a.title}</h2>
                <div className={styles.cardMeta}>
                  <span className={`${styles.badge} ${a.is_published ? styles.badgePublished : styles.badgeDraft}`}>
                    {a.is_published ? t('common.publish') : t('common.draft')}
                  </span>
                  {a.course && (
                    <span className={`${styles.badge} ${styles.badgeCourse}`}>{a.course.name}</span>
                  )}
                  <span className={styles.cardDate}>
                    {a.is_published && a.published_at
                      ? `Published ${formatDate(a.published_at)}`
                      : `Created ${formatDate(a.created_at)}`}
                  </span>
                </div>
              </div>
              {!a.is_published && (
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate(a.id)}
                    aria-label={`${t('common.publish')} ${a.title}`}
                  >
                    {t('common.publish')}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <AddAnnouncementPanel
        open={showAdd}
        onClose={() => setShowAdd(false)}
        courses={courses}
      />
    </div>
  )
}
