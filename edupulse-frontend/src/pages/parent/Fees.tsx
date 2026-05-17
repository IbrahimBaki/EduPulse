import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/axios'
import styles from './Fees.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildOption {
  id: number
  name: string
}

interface Fee {
  id: number
  child_name: string
  description: string
  amount: number
  due_date: string
  status: 'paid' | 'pending' | 'overdue'
}

interface FeesData {
  summary: { pending: number; overdue: number; paid_this_year: number }
  fees: Fee[]
}

type Filter = 'all' | 'pending' | 'overdue' | 'paid'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

function CheckIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}

function EmptyFeesIcon() {
  return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <span className={styles.skeleton} style={{ width: 80, height: 24, borderRadius: 6, display: 'block' }} />
      <div className={styles.summaryRow}>
        {[0, 1, 2].map(i => (
          <span key={i} className={styles.skeleton} style={{ height: 80, borderRadius: 12, display: 'block', flex: 1 }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--neutral-border)', borderRadius: 10, overflow: 'hidden' }}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={styles.skeleton} style={{ width: '100%', height: 52, borderRadius: 0, display: 'block', borderBlockEnd: '1px solid var(--neutral-border)' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentFees() {
  const [selectedChild, setSelectedChild] = useState<number | 'all'>('all')
  const [filter, setFilter] = useState<Filter>('all')

  const { data: children, isLoading: loadingChildren } = useQuery<{ children: ChildOption[] }>({
    queryKey: ['parent-children-list'],
    queryFn: () => api.get('/parent/children').then(r => r.data.data),
    staleTime: 300_000,
  })

  const childParam = selectedChild === 'all' ? undefined : selectedChild

  const { data, isLoading, isError, refetch } = useQuery<FeesData>({
    queryKey: ['parent-fees', selectedChild],
    queryFn: () => api.get('/parent/fees', { params: childParam ? { child_id: childParam } : {} }).then(r => r.data.data),
    staleTime: 60_000,
  })

  const filtered = (data?.fees ?? []).filter(f => filter === 'all' || f.status === filter)

  if (loadingChildren) return <PageSkeleton />

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'paid',    label: 'Paid' },
  ]

  const statusCls: Record<string, string> = {
    paid: styles.feePaid,
    pending: styles.feePending,
    overdue: styles.feeOverdue,
  }
  const rowBg: Record<string, string> = {
    paid: '',
    pending: styles.rowPending,
    overdue: styles.rowOverdue,
  }

  return (
    <div className={styles.page}>
      <motion.h1
        className={styles.pageTitle}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        Fees
      </motion.h1>

      {children && children.children.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
        >
          <label htmlFor="child-select" className={styles.selectLabel}>Child</label>
          <select
            id="child-select"
            className={styles.childSelect}
            value={selectedChild}
            onChange={e => {
              const v = e.target.value
              setSelectedChild(v === 'all' ? 'all' : Number(v))
            }}
          >
            <option value="all">All Children</option>
            {children.children.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </motion.div>
      )}

      {/* Summary */}
      {data && (
        <motion.div
          className={styles.summaryRow}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={`${styles.sumCard} ${styles.sumPending}`}>
            <span className={styles.sumVal}>{data.summary.pending.toLocaleString()} EGP</span>
            <span className={styles.sumLabel}>Pending</span>
          </div>
          <div className={`${styles.sumCard} ${styles.sumOverdue}`}>
            <span className={styles.sumVal}>{data.summary.overdue.toLocaleString()} EGP</span>
            <span className={styles.sumLabel}>Overdue</span>
          </div>
          <div className={`${styles.sumCard} ${styles.sumPaid}`}>
            <span className={styles.sumVal}>{data.summary.paid_this_year.toLocaleString()} EGP</span>
            <span className={styles.sumLabel}>Paid This Year</span>
          </div>
        </motion.div>
      )}

      {/* Filter tabs */}
      <motion.div
        className={styles.filterRow}
        role="tablist"
        aria-label="Fee status filter"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`${styles.filterBtn} ${filter === f.key ? styles.filterActive : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--neutral-border)', borderRadius: 10, overflow: 'hidden' }}>
          {[0, 1, 2, 3].map(i => (
            <span key={i} className={styles.skeleton} style={{ width: '100%', height: 52, borderRadius: 0, display: 'block' }} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className={styles.errorState}>
          <AlertIcon />
          <p>Failed to load fees data.</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Table */}
      {data && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <EmptyFeesIcon />
              <p className={styles.emptyTitle}>No fees found</p>
              <p className={styles.emptyText}>
                {filter === 'all' ? 'No fee records on file.' : `No ${filter} fees.`}
              </p>
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.feesTable}>
                  <thead>
                    <tr>
                      {children && children.children.length > 1 && <th>Child</th>}
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(f => (
                      <tr key={f.id} className={rowBg[f.status]}>
                        {children && children.children.length > 1 && (
                          <td className={styles.childCell}>{f.child_name}</td>
                        )}
                        <td className={styles.descCell}>{f.description}</td>
                        <td className={styles.amountCell}>{f.amount.toLocaleString()} EGP</td>
                        <td className={styles.dateCell}>{fmt(f.due_date)}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${statusCls[f.status]}`}>
                            {f.status === 'paid' && <CheckIcon />}
                            {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={styles.readOnlyNote}>
                Fees are managed by the school. Contact the administration for payments or disputes.
              </p>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}
