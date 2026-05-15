import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './Announcements.module.css'

interface Announcement {
  id: number
  title: string
  content: string
  status: 'draft' | 'published'
  created_at: string
}

function SlideOver({ open, onClose, title, children, onSave, isPending }: { 
  open: boolean; onClose: () => void; title: string; children: ReactNode; onSave: () => void; isPending: boolean 
}) {
  if (!open) return null
  return createPortal(
    <div className={styles.slideOverRoot}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--neutral-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
        </div>
        <div style={{ flex: 1, padding: '24px 0', overflowY: 'auto' }}>{children}</div>
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--neutral-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Create Announcement'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient()
  const [isSlideOverOpen, setSlideOverOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['manager-announcements'],
    queryFn: () => api.get('/manager/announcements').then(res => {
      const raw = res.data.data
      return (Array.isArray(raw) ? raw : (raw.data ?? [])) as Announcement[]
    })
  })

  const createMutation = useMutation({
    mutationFn: (payload: { title: string, content: string }) => api.post('/manager/announcements', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-announcements'] })
      setSlideOverOpen(false)
      setNewTitle('')
      setNewContent('')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/manager/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-announcements'] })
  })

  const publishMutation = useMutation({
    mutationFn: (id: number) => api.post(`/manager/announcements/${id}/publish`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-announcements'] })
  })

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Announcements</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setSlideOverOpen(true)}>
          + New Announcement
        </button>
      </header>

      <main className={styles.announcementsList}>
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className={`${styles.announcementCard} ${styles.skeleton}`} style={{ height: '140px' }} />)
        ) : announcements?.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No announcements found.</p>
          </div>
        ) : (
          announcements?.map(a => (
            <div key={a.id} className={styles.announcementCard}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{a.title}</h2>
                <span className={`${styles.badge} ${a.status === 'published' ? styles.badgePublished : ''}`}>
                  {a.status}
                </span>
              </div>
              <p className={styles.cardDate}>{new Date(a.created_at).toLocaleDateString()}</p>
              <div className={styles.cardContent}>{a.content}</div>
              <div className={styles.cardActions}>
                {a.status === 'draft' && (
                  <button className={styles.btn} onClick={() => publishMutation.mutate(a.id)}>Publish</button>
                )}
                <button className={styles.btn} style={{ color: 'var(--color-red)' }} onClick={() => { if(confirm('Delete?')) deleteMutation.mutate(a.id) }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </main>

      <SlideOver 
        open={isSlideOverOpen} 
        onClose={() => setSlideOverOpen(false)} 
        title="New Announcement"
        onSave={() => createMutation.mutate({ title: newTitle, content: newContent })}
        isPending={createMutation.isPending}
      >
        <div className={styles.formGroup}>
          <label className={styles.label}>Title</label>
          <input className={styles.input} value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Announcement heading" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Content</label>
          <textarea className={styles.textarea} rows={6} value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Full message..." />
        </div>
      </SlideOver>
    </div>
  )
}
