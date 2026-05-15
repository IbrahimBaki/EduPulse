import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './Finance.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceSummary {
  expected: number
  collected: number
  pending: number
  overdue: number
  collection_rate: number
  expected_trend: number
  collected_trend: number
}

interface Transaction {
  id: number
  student_name: string
  amount: number
  payment_method: string
  created_at: string
}

interface StudentFee {
  id: number
  student_name: string
  student_code: string
  description: string
  amount: number
  due_date: string
  status: 'paid' | 'pending' | 'overdue' | 'waived'
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(d: string | number | Date | null | undefined): Date {
  if (!d) return new Date(0)
  const parsed = new Date(d)
  return isNaN(parsed.getTime()) ? new Date(0) : parsed
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-EG', { style: 'decimal', minimumFractionDigits: 0 }).format(amount)
}

function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [end, duration])
  return count
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchSummary() {
  const { data } = await api.get('/manager/finance/summary')
  return data.data as FinanceSummary
}

async function fetchTransactions() {
  const { data } = await api.get('/manager/finance/transactions')
  const raw = data.data
  return (Array.isArray(raw) ? raw : (raw.data ?? [])) as Transaction[]
}

async function fetchStudentFees(p: { page: number; status: string; search: string }) {
  const params: any = { page: p.page, per_page: 15 }
  if (p.status) params.status = p.status
  if (p.search) params.search = p.search
  const { data } = await api.get('/manager/student-fees', { params })
  return data.data as Paginated<StudentFee>
}

async function fetchFeeStructures() {
  const { data } = await api.get('/manager/fee-structures')
  const raw = data.data
  return Array.isArray(raw) ? raw : (raw?.data ?? [])
}

async function fetchGradeLevels() {
  const { data } = await api.get('/manager/grade-levels')
  const raw = data.data
  return Array.isArray(raw) ? raw : (raw?.data ?? [])
}

async function bulkAssignFee(feeStructureId: number, target: string, targetId: number) {
  const { data } = await api.post(`/manager/fee-structures/${feeStructureId}/assign-bulk`, { target, target_id: targetId })
  return data
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, currency = 'EGP', trend }: { label: string; value: number; currency?: string; trend?: number }) {
  const animatedValue = useCountUp(value)
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statValueWrap}>
        <span className={styles.statValue}>{formatCurrency(animatedValue)}</span>
        <span className={styles.statCurrency}>{currency}</span>
      </div>
      {trend !== undefined && (
        <div className={`${styles.statTrend} ${trend >= 0 ? styles.trendUp : styles.trendDown}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: StudentFee['status'] }) {
  const labels: Record<string, string> = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue', waived: 'Waived' }
  const classes: Record<string, string> = { paid: styles.badgePaid, pending: styles.badgePending, overdue: styles.badgeOverdue, waived: styles.badgeWaived }
  return <span className={`${styles.badge} ${classes[status]}`}>{labels[status]}</span>
}

function SlideOver({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return createPortal(
    <div className={styles.slideOverRoot}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--neutral-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>{children}</div>
      </div>
    </div>,
    document.body
  )
}

function PaymentModal({ open, onClose, onConfirm, isPending }: { open: boolean; onClose: () => void; onConfirm: (method: string, ref: string) => void; isPending: boolean }) {
  const [method, setMethod] = useState('cash')
  const [ref, setRef] = useState('')
  if (!open) return null
  return createPortal(
    <div className={styles.modalRoot}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.modalPanel}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBlockEnd: '20px' }}>Confirm Payment</h3>
        <div className={styles.formGroup}>
          <label className={styles.label}>Payment Method</label>
          <select className={styles.select} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Transaction Reference</label>
          <input className={styles.input} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ref # or notes" />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onConfirm(method, ref)} disabled={isPending}>
            {isPending ? 'Processing...' : 'Mark as Paid'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null)
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false)
  const [isGenerateModalOpen, setGenerateModalOpen] = useState(false)
  const [genFeeStructureId, setGenFeeStructureId] = useState('')
  const [genTarget, setGenTarget] = useState('grade_level')
  const [genTargetId, setGenTargetId] = useState('')

  const { data: summary, isLoading: summaryLoading } = useQuery({ queryKey: ['manager-finance-summary'], queryFn: fetchSummary })
  const { data: transactions, isLoading: transactionsLoading } = useQuery({ queryKey: ['manager-finance-transactions'], queryFn: fetchTransactions })
  const { data: feesData, isLoading: feesLoading } = useQuery({
    queryKey: ['manager-student-fees', page, statusFilter, search],
    queryFn: () => fetchStudentFees({ page, status: statusFilter, search })
  })
  const { data: feeStructures } = useQuery({ queryKey: ['manager-fee-structures'], queryFn: fetchFeeStructures })
  const { data: gradeLevels } = useQuery({ queryKey: ['manager-grade-levels'], queryFn: fetchGradeLevels })

  const generateMutation = useMutation({
    mutationFn: () => bulkAssignFee(Number(genFeeStructureId), genTarget, Number(genTargetId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['manager-student-fees'] })
      setGenerateModalOpen(false)
      setGenFeeStructureId('')
      setGenTargetId('')
    }
  })

  const markPaidMutation = useMutation({
    mutationFn: (payload: { method: string; ref: string }) => api.post(`/manager/student-fees/${selectedFee?.id}/pay`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['manager-finance-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['manager-student-fees'] })
      setPaymentModalOpen(false)
      setSelectedFee(null)
    }
  })

  const statusActionMutation = useMutation({
    mutationFn: (action: 'overdue' | 'waive') => api.post(`/manager/student-fees/${selectedFee?.id}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['manager-student-fees'] })
      setSelectedFee(null)
    }
  })

  const collectionRate = summary?.collection_rate ?? 0

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Financial Management</h1>
      </header>

      {/* SECTION 1: Summary */}
      <section className={styles.summaryGrid}>
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${styles.statCard} ${styles.skeleton}`} style={{ height: '120px' }} />)
        ) : (
          <>
            <MetricCard label="Total Expected" value={summary?.expected ?? 0} trend={summary?.expected_trend} />
            <MetricCard label="Total Collected" value={summary?.collected ?? 0} trend={summary?.collected_trend} />
            <MetricCard label="Total Pending" value={summary?.pending ?? 0} />
            <MetricCard label="Total Overdue" value={summary?.overdue ?? 0} />
          </>
        )}
      </section>

      {/* SECTION 2: Main Columns */}
      <div className={styles.mainContent}>
        {/* LEFT: Fees Table */}
        <section className={styles.tableSection}>
          <div className={styles.tableToolbar}>
            <div className={styles.searchWrap}>
              <input 
                className={styles.searchInput} 
                placeholder="Search student name..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="waived">Waived</option>
            </select>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setGenerateModalOpen(true)}>
              Generate Fees
            </button>
          </div>

          <div style={{ flex: 1, overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Student</th>
                  <th className={styles.th}>Description</th>
                  <th className={styles.th}>Amount</th>
                  <th className={styles.th}>Due Date</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {feesLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className={styles.td}><div className={styles.skeleton} style={{ height: '24px' }} /></td>
                    </tr>
                  ))
                ) : feesData?.data.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.emptyState}>
                        <h3 className={styles.emptyTitle}>No fees assigned yet</h3>
                        <p className={styles.emptyText}>Fees will appear here once they are generated for students.</p>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: '12px' }} onClick={() => setGenerateModalOpen(true)}>Generate Fees</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  feesData?.data.map(fee => (
                    <tr key={fee.id} className={styles.row} onClick={() => setSelectedFee(fee)}>
                      <td className={styles.td}>
                        <span className={styles.studentName}>{fee.student_name}</span>
                        <span className={styles.studentCode}>{fee.student_code}</span>
                      </td>
                      <td className={styles.td}>{fee.description}</td>
                      <td className={styles.td} style={{ fontWeight: 700 }}>{formatCurrency(fee.amount)} EGP</td>
                      <td className={styles.td}>{safeDate(fee.due_date).toLocaleDateString()}</td>
                      <td className={styles.td}><StatusBadge status={fee.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {feesData && feesData.last_page > 1 && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--neutral-border)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className={styles.btn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span style={{ fontSize: '0.875rem', alignSelf: 'center' }}>Page {page} of {feesData.last_page}</span>
              <button className={styles.btn} disabled={page === feesData.last_page} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </section>

        {/* RIGHT: Transactions */}
        <aside className={styles.transactionsCard}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>Recent Transactions</h3>
            <a href="#" className={styles.viewAll}>View all</a>
          </div>
          <div className={styles.transactionsList}>
            {transactionsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.txItem}><div className={styles.skeleton} style={{ height: '40px', width: '100%' }} /></div>)
            ) : transactions?.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>No payments recorded yet</p>
              </div>
            ) : (
              transactions?.map(tx => (
                <div key={tx.id} className={styles.txItem}>
                  <div className={styles.txInfo}>
                    <span className={styles.txName}>{tx.student_name}</span>
                    <span className={styles.txDate}>{safeDate(tx.created_at).toLocaleDateString()} &bull; {tx.payment_method}</span>
                  </div>
                  <span className={styles.txAmount}>+{formatCurrency(tx.amount)}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* SECTION 3: Collection Rate */}
      <section className={styles.collectionSection}>
        <div className={styles.progressBarWrap}>
          <div className={styles.progressLabelWrap}>
            <span className={styles.collectionLabel}>Overall Collection Rate</span>
            <span className={styles.collectionPct}>{collectionRate}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={`${styles.progressSegment} ${styles.segCollected}`} style={{ width: `${collectionRate}%` }} />
            <div className={`${styles.progressSegment} ${styles.segPending}`} style={{ width: `${(summary?.pending ?? 0) / (summary?.expected || 1) * 100}%` }} />
            <div className={`${styles.progressSegment} ${styles.segOverdue}`} style={{ width: `${(summary?.overdue ?? 0) / (summary?.expected || 1) * 100}%` }} />
          </div>
          <div className={styles.breakdown}>
            <div className={styles.breakdownItem}><span className={`${styles.dot} ${styles.segCollected}`} /> Collected</div>
            <div className={styles.breakdownItem}><span className={`${styles.dot} ${styles.segPending}`} /> Pending</div>
            <div className={styles.breakdownItem}><span className={`${styles.dot} ${styles.segOverdue}`} /> Overdue</div>
          </div>
        </div>
      </section>

      {/* Slide-over for Generate Fees */}
      <SlideOver 
        open={isGenerateModalOpen} 
        onClose={() => setGenerateModalOpen(false)} 
        title="Generate Fees"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label className={styles.label}>Fee Structure</label>
            <select className={styles.select} value={genFeeStructureId} onChange={(e) => setGenFeeStructureId(e.target.value)}>
              <option value="">Select Fee Structure...</option>
              {feeStructures?.map((fs: any) => (
                <option key={fs.id} value={fs.id}>{fs.name} ({formatCurrency(fs.amount)} {fs.currency})</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label className={styles.label}>Target Group</label>
            <select className={styles.select} value={genTarget} onChange={(e) => {
              setGenTarget(e.target.value);
              setGenTargetId(''); // Reset target ID when changing target type
            }}>
              <option value="grade_level">Grade Level</option>
              <option value="course">Course</option>
              <option value="all">All Students</option>
            </select>
          </div>

          {genTarget !== 'all' && (
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label}>
                Select {genTarget === 'grade_level' ? 'Grade Level' : 'Course'}
              </label>
              {genTarget === 'grade_level' ? (
                <select className={styles.select} value={genTargetId} onChange={(e) => setGenTargetId(e.target.value)}>
                  <option value="">Select Grade Level...</option>
                  {gradeLevels?.map((gl: any) => (
                    <option key={gl.id} value={gl.id}>{gl.name}</option>
                  ))}
                </select>
              ) : (
                <input 
                  className={styles.input} 
                  type="number" 
                  placeholder="Enter Course ID" 
                  value={genTargetId} 
                  onChange={(e) => setGenTargetId(e.target.value)} 
                />
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`} 
              onClick={() => generateMutation.mutate()} 
              disabled={generateMutation.isPending || !genFeeStructureId || (genTarget !== 'all' && !genTargetId)}
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Fees'}
            </button>
          </div>
        </div>
      </SlideOver>

      {/* Slide-over for Fee Details */}
      <SlideOver 
        open={!!selectedFee} 
        onClose={() => setSelectedFee(null)} 
        title="Fee Details"
      >
        {selectedFee && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <StatusBadge status={selectedFee.status} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '12px' }}>{selectedFee.student_name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Student Code: {selectedFee.student_code}</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Amount</label>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatCurrency(selectedFee.amount)} EGP</div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Due Date</label>
                <div style={{ fontSize: '1rem' }}>{safeDate(selectedFee.due_date).toLocaleDateString()}</div>
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label className={styles.label}>Description</label>
                <div style={{ fontSize: '0.875rem' }}>{selectedFee.description}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(selectedFee.status === 'pending' || selectedFee.status === 'overdue') && (
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setPaymentModalOpen(true)}>Mark as Paid</button>
              )}
              {selectedFee.status === 'pending' && (
                <button className={styles.btn} onClick={() => statusActionMutation.mutate('overdue')}>Mark as Overdue</button>
              )}
              {selectedFee.status !== 'paid' && selectedFee.status !== 'waived' && (
                <button className={styles.btn} style={{ color: 'oklch(58% 0.22 27)' }} onClick={() => statusActionMutation.mutate('waive')}>Waive Fee</button>
              )}
            </div>
          </div>
        )}
      </SlideOver>

      {/* Nested Payment Modal */}
      <PaymentModal 
        open={isPaymentModalOpen} 
        onClose={() => setPaymentModalOpen(false)} 
        onConfirm={(method, ref) => markPaidMutation.mutate({ method, ref })}
        isPending={markPaidMutation.isPending}
      />
    </div>
  )
}
