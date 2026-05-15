import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './Fees.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Fee {
  id: number
  description: string
  amount: number
  due_date: string
  status: 'paid' | 'pending' | 'overdue' | 'waived'
  course?: { id: number; name: string }
}

type FilterStatus = 'all' | 'pending' | 'paid' | 'overdue'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = (data as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  return []
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(fee: Fee): boolean {
  return fee.status === 'pending' && new Date(fee.due_date) < new Date()
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function AlertCircleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
      <line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/>
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <span className={styles.skeleton} style={{ height: 16, width: '55%' }} />
        <span className={styles.skeleton} style={{ height: 14, width: '30%' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <span className={styles.skeleton} style={{ height: 20, width: 72 }} />
        <span className={styles.skeleton} style={{ height: 18, width: 56 }} />
      </div>
    </div>
  )
}

// ─── Fee card ─────────────────────────────────────────────────────────────────

function FeeCard({ fee }: { fee: Fee }) {
  const actuallyOverdue = isOverdue(fee)
  const statusClass = fee.status === 'paid'
    ? styles.statusPaid
    : fee.status === 'waived'
    ? styles.statusWaived
    : actuallyOverdue || fee.status === 'overdue'
    ? styles.statusOverdue
    : styles.statusPending

  const label = fee.status === 'paid' ? 'Paid'
    : fee.status === 'waived' ? 'Waived'
    : actuallyOverdue || fee.status === 'overdue' ? 'Overdue'
    : 'Pending'

  return (
    <article className={`${styles.feeCard} ${(actuallyOverdue || fee.status === 'overdue') ? styles.feeCardOverdue : ''}`}>
      <div className={styles.feeMain}>
        <p className={styles.feeDesc}>{fee.description}</p>
        {fee.course && <p className={styles.feeCourse}>{fee.course.name}</p>}
        <p className={styles.feeDue}>Due {formatDate(fee.due_date)}</p>
      </div>
      <div className={styles.feeRight}>
        <span className={styles.feeAmount}>{formatCurrency(fee.amount)}</span>
        <span className={`${styles.statusBadge} ${statusClass}`}>
          {fee.status === 'paid' && <CheckCircleIcon />}
          {label}
        </span>
      </div>
    </article>
  )
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ fees }: { fees: Fee[] }) {
  const pending = fees.filter(f => f.status === 'pending' && !isOverdue(f)).reduce((s, f) => s + f.amount, 0)
  const overdue = fees.filter(f => f.status === 'overdue' || isOverdue(f)).reduce((s, f) => s + f.amount, 0)
  const paid    = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)

  return (
    <div className={styles.summaryBar}>
      <div className={styles.summaryItem}>
        <span className={styles.summaryAmount} style={{ color: 'var(--color-amber)' }}>{formatCurrency(pending)}</span>
        <span className={styles.summaryLabel}>Pending</span>
      </div>
      <div className={styles.summaryDivider} />
      <div className={styles.summaryItem}>
        <span className={styles.summaryAmount} style={{ color: 'var(--color-red)' }}>{formatCurrency(overdue)}</span>
        <span className={styles.summaryLabel}>Overdue</span>
      </div>
      <div className={styles.summaryDivider} />
      <div className={styles.summaryItem}>
        <span className={styles.summaryAmount} style={{ color: 'oklch(65% 0.2 145)' }}>{formatCurrency(paid)}</span>
        <span className={styles.summaryLabel}>Paid</span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentFees() {
  const [filter, setFilter] = useState<FilterStatus>('all')

  const { data: fees = [], isLoading, isError, refetch } = useQuery<Fee[]>({
    queryKey: ['student-fees'],
    queryFn: () => api.get('/student/fees').then(r => normalizeArray<Fee>(r.data.data ?? r.data)),
    staleTime: 3 * 60 * 1000,
  })

  const filtered = fees.filter(f => {
    if (filter === 'all') return true
    if (filter === 'overdue') return f.status === 'overdue' || isOverdue(f)
    return f.status === filter
  })

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'paid', label: 'Paid' },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Fees</h1>
        <p className={styles.pageCount}>
          {isLoading ? 'Loading...' : `${fees.length} fee${fees.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      {!isLoading && !isError && fees.length > 0 && <SummaryBar fees={fees} />}

      <div className={styles.filters} role="group" aria-label="Filter fees">
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
          {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'var(--color-amber)' }}><AlertCircleIcon /></div>
          <p className={styles.emptyTitle}>Failed to load fees</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'var(--text-muted)' }}><ReceiptIcon /></div>
          <p className={styles.emptyTitle}>{filter !== 'all' ? 'No fees in this category' : 'No fees assigned yet'}</p>
          <p className={styles.emptyText}>
            {filter !== 'all' ? 'Try viewing all fees.' : 'Your fee information will appear here once assigned.'}
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(f => <FeeCard key={f.id} fee={f} />)}
        </div>
      )}
    </div>
  )
}
