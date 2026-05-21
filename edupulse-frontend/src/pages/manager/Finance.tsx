import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  student: {
    id: number
    name: string
    email: string
    avatar_url?: string | null
    parents?: { id: number; name: string }[]
  }
  description: string
  amount: number
  currency: string
  due_date: string
  status: 'paid' | 'pending' | 'overdue' | 'waived'
}

interface ChildWithFees {
  id: number
  name: string
  email: string
  avatar_url?: string | null
  student_fees: {
    id: number
    description: string
    amount: number
    currency: string
    due_date: string | null
    status: 'paid' | 'pending' | 'overdue' | 'waived'
  }[]
}

interface ParentWithFees {
  id: number
  name: string
  email: string
  children: ChildWithFees[]
}

interface FeeStructure {
  id: number
  name: string
  type: 'registration' | 'monthly' | 'semester' | 'annual' | 'course'
  amount: number
  currency: string
  due_date: string | null
  is_active: boolean
  description: string | null
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
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
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
  const params: Record<string, unknown> = { page: p.page, per_page: 15 }
  if (p.status) params.status = p.status
  if (p.search) params.search = p.search
  const { data } = await api.get('/manager/student-fees', { params })
  return data.data as Paginated<StudentFee>
}

async function fetchFeeStructures() {
  const { data } = await api.get('/manager/fee-structures')
  const raw = data.data
  return (Array.isArray(raw) ? raw : (raw?.data ?? [])) as FeeStructure[]
}

async function fetchGradeLevels() {
  const { data } = await api.get('/manager/grade-levels')
  const raw = data.data
  return Array.isArray(raw) ? raw : (raw?.data ?? [])
}

async function fetchFeesByParent() {
  const { data } = await api.get('/manager/finance/fees-by-parent')
  const raw = data.data
  return (Array.isArray(raw) ? raw : []) as ParentWithFees[]
}

async function bulkAssignFee(feeStructureId: number, target: string, targetId: number) {
  const { data } = await api.post(`/manager/fee-structures/${feeStructureId}/assign-bulk`, { target, target_id: targetId })
  return data
}

async function createFeeStructure(payload: Record<string, unknown>) {
  const { data } = await api.post('/manager/fee-structures', payload)
  return data
}

async function toggleFeeStructure(id: number) {
  const { data } = await api.patch(`/manager/fee-structures/${id}/toggle`)
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
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'paid' | 'pending' | 'overdue' | 'waived' }) {
  const { t } = useTranslation()
  const labels: Record<string, string> = {
    paid: t('manager.finance.paid'),
    pending: t('manager.finance.pending'),
    overdue: t('manager.finance.overdue'),
    waived: t('manager.finance.waived')
  }
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
  const { t } = useTranslation()
  const [method, setMethod] = useState('cash')
  const [ref, setRef] = useState('')
  if (!open) return null
  return createPortal(
    <div className={styles.modalRoot}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.modalPanel}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBlockEnd: '20px' }}>{t('manager.finance.confirmPayment')}</h3>
        <div className={styles.formGroup}>
          <label className={styles.label}>{t('manager.finance.paymentMethod')}</label>
          <select className={styles.select} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">{t('manager.finance.cash')}</option>
            <option value="bank_transfer">{t('manager.finance.bankTransfer')}</option>
            <option value="cheque">{t('manager.finance.cheque')}</option>
            <option value="other">{t('manager.finance.other')}</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>{t('manager.finance.transactionRef')}</label>
          <input className={styles.input} value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t('manager.finance.refPlaceholder')} />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>{t('common.cancel')}</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onConfirm(method, ref)} disabled={isPending}>
            {isPending ? t('manager.finance.processing') : t('manager.finance.markAsPaid')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Parent Card (By Parent tab) ──────────────────────────────────────────────

function ParentCard({ parent }: { parent: ParentWithFees }) {
  const [expanded, setExpanded] = useState(true)

  const allFees = parent.children.flatMap(c => c.student_fees)
  const pendingTotal = allFees.filter(f => f.status === 'pending').reduce((s, f) => s + Number(f.amount), 0)
  const overdueTotal = allFees.filter(f => f.status === 'overdue').reduce((s, f) => s + Number(f.amount), 0)

  return (
    <div className={styles.parentCard}>
      <div className={styles.parentCardHead} onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.parentName}>{parent.name}</div>
          <div className={styles.parentEmail}>{parent.email}</div>
        </div>
        <div className={styles.parentTotals}>
          {pendingTotal > 0 && (
            <span className={styles.parentBadgePending}>{formatCurrency(pendingTotal)} pending</span>
          )}
          {overdueTotal > 0 && (
            <span className={styles.parentBadgeOverdue}>{formatCurrency(overdueTotal)} overdue</span>
          )}
        </div>
        <span className={`${styles.parentChevron} ${expanded ? styles.parentChevronOpen : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </div>

      {expanded && parent.children.map(child => (
        <div key={child.id} className={styles.childSection}>
          <div className={styles.childHeader}>
            <span className={styles.childNameLabel}>{child.name}</span>
            <span className={styles.childEmailLabel}>· {child.email}</span>
          </div>
          {child.student_fees.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>No fees</p>
          ) : (
            child.student_fees.map(fee => (
              <div key={fee.id} className={styles.childFeeRow}>
                <span className={styles.childFeeDesc}>{fee.description}</span>
                <span className={styles.childFeeAmount}>{formatCurrency(Number(fee.amount))} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{fee.currency}</span></span>
                {fee.due_date && <span className={styles.childFeeDue}>{safeDate(fee.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                <StatusBadge status={fee.status} />
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_STRUCTURE_FORM = { name: '', type: 'monthly', amount: '', currency: 'EGP', due_date: '', description: '' }

export default function FinancePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'fees' | 'structures'>('fees')
  const [feeView, setFeeView] = useState<'student' | 'parent'>('student')

  // Student fees tab state
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null)
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false)

  // Generate fees slide-over state
  const [isGenerateModalOpen, setGenerateModalOpen] = useState(false)
  const [genFeeStructureId, setGenFeeStructureId] = useState('')
  const [genTarget, setGenTarget] = useState('grade_level')
  const [genTargetId, setGenTargetId] = useState('')

  // Fee structures tab state
  const [isNewStructureOpen, setNewStructureOpen] = useState(false)
  const [structureForm, setStructureForm] = useState(EMPTY_STRUCTURE_FORM)

  // Queries
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useQuery({ queryKey: ['manager-finance-summary'], queryFn: fetchSummary })
  const { data: transactions, isLoading: transactionsLoading, isError: transactionsError, refetch: refetchTransactions } = useQuery({ queryKey: ['manager-finance-transactions'], queryFn: fetchTransactions })
  const { data: feesData, isLoading: feesLoading, isError: feesError, refetch: refetchFees } = useQuery({
    queryKey: ['manager-student-fees', page, statusFilter, search],
    queryFn: () => fetchStudentFees({ page, status: statusFilter, search })
  })
  const { data: feeStructures = [] } = useQuery({ queryKey: ['manager-fee-structures'], queryFn: fetchFeeStructures })
  const { data: gradeLevels } = useQuery({ queryKey: ['manager-grade-levels'], queryFn: fetchGradeLevels })
  const { data: feesByParent = [], isLoading: byParentLoading, isError: byParentError, refetch: refetchByParent } = useQuery({
    queryKey: ['manager-fees-by-parent'],
    queryFn: fetchFeesByParent,
    enabled: activeTab === 'fees' && feeView === 'parent',
  })

  // Mutations
  const generateMutation = useMutation({
    mutationFn: () => bulkAssignFee(Number(genFeeStructureId), genTarget, Number(genTargetId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['manager-student-fees'] })
      queryClient.invalidateQueries({ queryKey: ['manager-fees-by-parent'] })
      setGenerateModalOpen(false)
      setGenFeeStructureId('')
      setGenTargetId('')
    }
  })

  const markPaidMutation = useMutation({
    mutationFn: (payload: { method: string; ref: string }) =>
      api.patch(`/manager/student-fees/${selectedFee?.id}/mark-paid`, {
        payment_method: payload.method,
        transaction_ref: payload.ref,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['manager-finance-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['manager-student-fees'] })
      queryClient.invalidateQueries({ queryKey: ['manager-fees-by-parent'] })
      setPaymentModalOpen(false)
      setSelectedFee(null)
    }
  })

  const statusActionMutation = useMutation({
    mutationFn: (action: 'overdue' | 'waive') => {
      const endpoint = action === 'overdue' ? 'mark-overdue' : 'waive'
      const body = action === 'waive' ? { notes: 'Waived by manager' } : {}
      return api.patch(`/manager/student-fees/${selectedFee?.id}/${endpoint}`, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['manager-student-fees'] })
      queryClient.invalidateQueries({ queryKey: ['manager-fees-by-parent'] })
      setSelectedFee(null)
    }
  })

  const createStructureMutation = useMutation({
    mutationFn: () => createFeeStructure({
      name: structureForm.name,
      type: structureForm.type,
      amount: Number(structureForm.amount),
      currency: structureForm.currency || 'EGP',
      due_date: structureForm.due_date || undefined,
      description: structureForm.description || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-fee-structures'] })
      setNewStructureOpen(false)
      setStructureForm(EMPTY_STRUCTURE_FORM)
    }
  })

  const toggleStructureMutation = useMutation({
    mutationFn: (id: number) => toggleFeeStructure(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-fee-structures'] })
  })

  const collectionRate = summary?.collection_rate ?? 0

  const openNewStructure = () => {
    setActiveTab('structures')
    setNewStructureOpen(true)
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t('manager.finance.title')}</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openNewStructure}>
          + New Fee Structure
        </button>
      </header>

      {/* Tab Bar */}
      <div className={styles.tabBar}>
        <button className={`${styles.tab} ${activeTab === 'fees' ? styles.tabActive : ''}`} onClick={() => setActiveTab('fees')}>
          Student Fees
        </button>
        <button className={`${styles.tab} ${activeTab === 'structures' ? styles.tabActive : ''}`} onClick={() => setActiveTab('structures')}>
          Fee Structures {feeStructures.length > 0 && `(${feeStructures.length})`}
        </button>
      </div>

      {/* ── STUDENT FEES TAB ── */}
      {activeTab === 'fees' && (
        <>
          <section className={styles.summaryGrid}>
            {summaryLoading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${styles.statCard} ${styles.skeleton}`} style={{ height: '120px' }} />)
            ) : summaryError ? (
              <div style={{ gridColumn: '1 / -1', padding: '20px', color: 'var(--color-red)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {t('common.errorLoadFailed')}
                <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetchSummary()}>{t('common.retry')}</button>
              </div>
            ) : (
              <>
                <MetricCard label={t('manager.finance.totalExpected')} value={summary?.expected ?? 0} trend={summary?.expected_trend} />
                <MetricCard label={t('manager.finance.totalCollected')} value={summary?.collected ?? 0} trend={summary?.collected_trend} />
                <MetricCard label={t('manager.finance.totalPending')} value={summary?.pending ?? 0} />
                <MetricCard label={t('manager.finance.totalOverdue')} value={summary?.overdue ?? 0} />
              </>
            )}
          </section>

          <div className={styles.mainContent}>
            {/* LEFT: Fees Table */}
            <section className={styles.tableSection}>
              <div className={styles.tableToolbar}>
                {/* View toggle */}
                <div className={styles.viewToggle}>
                  <button
                    className={`${styles.viewToggleBtn} ${feeView === 'student' ? styles.viewToggleBtnActive : ''}`}
                    onClick={() => setFeeView('student')}
                  >
                    By Student
                  </button>
                  <button
                    className={`${styles.viewToggleBtn} ${feeView === 'parent' ? styles.viewToggleBtnActive : ''}`}
                    onClick={() => setFeeView('parent')}
                  >
                    By Parent
                  </button>
                </div>

                {feeView === 'student' && (
                  <>
                    <div className={styles.searchWrap}>
                      <input
                        className={styles.searchInput}
                        placeholder={t('manager.finance.searchStudentName')}
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                      />
                    </div>
                    <select className={styles.filterSelect} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
                      <option value="">{t('manager.finance.allStatuses')}</option>
                      <option value="paid">{t('manager.finance.paid')}</option>
                      <option value="pending">{t('manager.finance.pending')}</option>
                      <option value="overdue">{t('manager.finance.overdue')}</option>
                      <option value="waived">{t('manager.finance.waived')}</option>
                    </select>
                  </>
                )}

                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setGenerateModalOpen(true)} style={{ marginInlineStart: 'auto' }}>
                  {t('manager.finance.generateFees')}
                </button>
              </div>

              {/* ── By Student view ── */}
              {feeView === 'student' && (
                <>
                  <div style={{ flex: 1, overflowX: 'auto' }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.th}>{t('manager.finance.student')}</th>
                          <th className={styles.th}>Parent</th>
                          <th className={styles.th}>{t('manager.finance.description')}</th>
                          <th className={styles.th}>{t('manager.finance.amount')}</th>
                          <th className={styles.th}>{t('manager.finance.dueDate')}</th>
                          <th className={styles.th}>{t('manager.finance.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feesLoading ? (
                          Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i}>
                              <td colSpan={6} className={styles.td}><div className={styles.skeleton} style={{ height: '24px' }} /></td>
                            </tr>
                          ))
                        ) : feesError ? (
                          <tr>
                            <td colSpan={6}>
                              <div className={styles.emptyState} style={{ color: 'var(--color-red)' }}>
                                <p className={styles.emptyText}>{t('common.errorLoadFailed')}</p>
                                <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: '12px' }} onClick={() => refetchFees()}>{t('common.retry')}</button>
                              </div>
                            </td>
                          </tr>
                        ) : feesData?.data.length === 0 ? (
                          <tr>
                            <td colSpan={6}>
                              <div className={styles.emptyState}>
                                <h3 className={styles.emptyTitle}>{t('manager.finance.noFeesYet')}</h3>
                                <p className={styles.emptyText}>{t('manager.finance.noFeesYetHint')}</p>
                                <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: '12px' }} onClick={() => setGenerateModalOpen(true)}>{t('manager.finance.generateFees')}</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          feesData?.data.map(fee => (
                            <tr key={fee.id} className={styles.row} onClick={() => setSelectedFee(fee)}>
                              <td className={styles.td}>
                                <span className={styles.studentName}>{fee.student?.name ?? '—'}</span>
                                <span className={styles.studentCode}>{fee.student?.email}</span>
                              </td>
                              <td className={styles.td} style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                {fee.student?.parents?.[0]?.name ?? '—'}
                              </td>
                              <td className={styles.td}>{fee.description}</td>
                              <td className={styles.td} style={{ fontWeight: 700 }}>{formatCurrency(Number(fee.amount))} {fee.currency || 'EGP'}</td>
                              <td className={styles.td}>{fee.due_date ? safeDate(fee.due_date).toLocaleDateString() : '—'}</td>
                              <td className={styles.td}><StatusBadge status={fee.status} /></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {feesData && feesData.last_page > 1 && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--neutral-border)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className={`${styles.btn} ${styles.btnOutline}`} disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t('manager.finance.prev')}</button>
                      <span style={{ fontSize: '0.875rem', alignSelf: 'center' }}>{t('manager.finance.page')} {page} {t('manager.finance.of')} {feesData.last_page}</span>
                      <button className={`${styles.btn} ${styles.btnOutline}`} disabled={page === feesData.last_page} onClick={() => setPage(p => p + 1)}>{t('manager.finance.next')}</button>
                    </div>
                  )}
                </>
              )}

              {/* ── By Parent view ── */}
              {feeView === 'parent' && (
                <div style={{ padding: '16px' }}>
                  {byParentLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={styles.parentCard}>
                        <div className={styles.parentCardHead}>
                          <div style={{ flex: 1 }}>
                            <div className={styles.skeleton} style={{ height: 16, width: '40%', marginBottom: 6 }} />
                            <div className={styles.skeleton} style={{ height: 12, width: '28%' }} />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : byParentError ? (
                    <div className={styles.emptyState} style={{ color: 'var(--color-red)' }}>
                      <p className={styles.emptyText}>{t('common.errorLoadFailed')}</p>
                      <button className={`${styles.btn} ${styles.btnOutline}`} style={{ marginTop: '12px' }} onClick={() => refetchByParent()}>{t('common.retry')}</button>
                    </div>
                  ) : feesByParent.length === 0 ? (
                    <div className={styles.emptyState}>
                      <h3 className={styles.emptyTitle}>No parent fees yet</h3>
                      <p className={styles.emptyText}>Generate fees for students and their parents will appear here grouped by family.</p>
                    </div>
                  ) : (
                    feesByParent.map(parent => <ParentCard key={parent.id} parent={parent} />)
                  )}
                </div>
              )}
            </section>

            {/* RIGHT: Transactions */}
            <aside className={styles.transactionsCard}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>{t('manager.finance.recentTransactions')}</h3>
                <a href="#" className={styles.viewAll}>{t('manager.finance.viewAll')}</a>
              </div>
              <div className={styles.transactionsList}>
                {transactionsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.txItem}><div className={styles.skeleton} style={{ height: '40px', width: '100%' }} /></div>)
                ) : transactionsError ? (
                  <div className={styles.emptyState} style={{ color: 'var(--color-red)', fontSize: '0.8125rem' }}>
                    <p>{t('common.errorLoadFailed')}</p>
                    <button className={`${styles.btn} ${styles.btnOutline}`} style={{ marginTop: '8px' }} onClick={() => refetchTransactions()}>{t('common.retry')}</button>
                  </div>
                ) : transactions?.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyText}>{t('manager.finance.noPayments')}</p>
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

          <section className={styles.collectionSection}>
            <div className={styles.progressBarWrap}>
              <div className={styles.progressLabelWrap}>
                <span className={styles.collectionLabel}>{t('manager.finance.collectionRate')}</span>
                <span className={styles.collectionPct}>{collectionRate}%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={`${styles.progressSegment} ${styles.segCollected}`} style={{ width: `${collectionRate}%` }} />
                <div className={`${styles.progressSegment} ${styles.segPending}`} style={{ width: `${(summary?.pending ?? 0) / (summary?.expected || 1) * 100}%` }} />
                <div className={`${styles.progressSegment} ${styles.segOverdue}`} style={{ width: `${(summary?.overdue ?? 0) / (summary?.expected || 1) * 100}%` }} />
              </div>
              <div className={styles.breakdown}>
                <div className={styles.breakdownItem}><span className={`${styles.dot} ${styles.segCollected}`} /> {t('manager.finance.collected')}</div>
                <div className={styles.breakdownItem}><span className={`${styles.dot} ${styles.segPending}`} /> {t('manager.finance.pending')}</div>
                <div className={styles.breakdownItem}><span className={`${styles.dot} ${styles.segOverdue}`} /> {t('manager.finance.overdue')}</div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── FEE STRUCTURES TAB ── */}
      {activeTab === 'structures' && (
        <section>
          <div className={styles.structuresHeader}>
            <h2 className={styles.structuresTitle}>Fee Structures</h2>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setNewStructureOpen(true)}>
              + New Fee Structure
            </button>
          </div>

          {feeStructures.length === 0 ? (
            <div className={styles.emptyState}>
              <h3 className={styles.emptyTitle}>No fee structures yet</h3>
              <p className={styles.emptyText}>Create a fee structure to start generating and assigning fees to students.</p>
              <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: '12px' }} onClick={() => setNewStructureOpen(true)}>
                + New Fee Structure
              </button>
            </div>
          ) : (
            <div className={styles.feeStructureGrid}>
              {feeStructures.map(fs => (
                <div key={fs.id} className={styles.feeStructureRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.fsName}>{fs.name}</div>
                    {fs.description && <div className={styles.fsDesc}>{fs.description}</div>}
                  </div>
                  <span className={styles.fsType}>{fs.type}</span>
                  <span className={styles.fsAmount}>
                    {formatCurrency(Number(fs.amount))} <span className={styles.fsCurrency}>{fs.currency}</span>
                  </span>
                  {fs.due_date && (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      Due {safeDate(fs.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  <span className={fs.is_active ? styles.fsStatusActive : styles.fsStatusInactive}>
                    {fs.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    className={`${styles.btn} ${styles.btnOutline}`}
                    style={{ height: 30, fontSize: '0.75rem', padding: '0 12px' }}
                    onClick={() => toggleStructureMutation.mutate(fs.id)}
                    disabled={toggleStructureMutation.isPending}
                  >
                    {fs.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Slide-over: Generate Fees */}
      <SlideOver open={isGenerateModalOpen} onClose={() => setGenerateModalOpen(false)} title={t('manager.finance.generateFees')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label className={styles.label}>{t('manager.finance.feeStructure')}</label>
            {feeStructures.length === 0 ? (
              <div style={{ padding: '16px', background: 'oklch(26% 0.026 255)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                No fee structures created yet.{' '}
                <button
                  style={{ color: 'var(--color-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  onClick={() => { setGenerateModalOpen(false); openNewStructure() }}
                >
                  Create one first →
                </button>
              </div>
            ) : (
              <select className={styles.select} value={genFeeStructureId} onChange={(e) => setGenFeeStructureId(e.target.value)}>
                <option value="">{t('manager.finance.selectFeeStructure')}</option>
                {feeStructures.filter(fs => fs.is_active).map(fs => (
                  <option key={fs.id} value={fs.id}>{fs.name} ({formatCurrency(Number(fs.amount))} {fs.currency})</option>
                ))}
              </select>
            )}
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label className={styles.label}>{t('manager.finance.targetGroup')}</label>
            <select className={styles.select} value={genTarget} onChange={(e) => { setGenTarget(e.target.value); setGenTargetId('') }}>
              <option value="grade_level">{t('manager.finance.gradeLevel')}</option>
              <option value="course">{t('manager.finance.course')}</option>
            </select>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label className={styles.label}>
              {t('manager.finance.select')} {genTarget === 'grade_level' ? t('manager.finance.gradeLevel') : t('manager.finance.course')}
            </label>
            {genTarget === 'grade_level' ? (
              <select className={styles.select} value={genTargetId} onChange={(e) => setGenTargetId(e.target.value)}>
                <option value="">{t('manager.finance.selectGradeLevel')}</option>
                {(gradeLevels ?? []).map((gl: { id: number; name: string }) => (
                  <option key={gl.id} value={gl.id}>{gl.name}</option>
                ))}
              </select>
            ) : (
              <input
                className={styles.input}
                type="number"
                placeholder={t('manager.finance.enterCourseId')}
                value={genTargetId}
                onChange={(e) => setGenTargetId(e.target.value)}
              />
            )}
          </div>

          {generateMutation.isError && (
            <p style={{ fontSize: '0.8125rem', color: 'oklch(58% 0.22 27)' }}>Failed to assign fees. Please try again.</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setGenerateModalOpen(false)}>{t('common.cancel')}</button>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !genFeeStructureId || !genTargetId}
            >
              {generateMutation.isPending ? t('manager.finance.generating') : t('manager.finance.generateFees')}
            </button>
          </div>
        </div>
      </SlideOver>

      {/* Slide-over: Fee Details */}
      <SlideOver open={!!selectedFee} onClose={() => setSelectedFee(null)} title={t('manager.finance.feeDetails')}>
        {selectedFee && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <StatusBadge status={selectedFee.status} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '12px' }}>{selectedFee.student?.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{selectedFee.student?.email}</p>
              {selectedFee.student?.parents?.[0] && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Parent: {selectedFee.student.parents[0].name}</p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('manager.finance.amount')}</label>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatCurrency(Number(selectedFee.amount))} {selectedFee.currency || 'EGP'}</div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('manager.finance.dueDate')}</label>
                <div style={{ fontSize: '1rem' }}>{selectedFee.due_date ? safeDate(selectedFee.due_date).toLocaleDateString() : '—'}</div>
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label className={styles.label}>{t('manager.finance.description')}</label>
                <div style={{ fontSize: '0.875rem' }}>{selectedFee.description}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(selectedFee.status === 'pending' || selectedFee.status === 'overdue') && (
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setPaymentModalOpen(true)}>{t('manager.finance.markAsPaid')}</button>
              )}
              {selectedFee.status === 'pending' && (
                <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => statusActionMutation.mutate('overdue')}>{t('manager.finance.markAsOverdue')}</button>
              )}
              {selectedFee.status !== 'paid' && selectedFee.status !== 'waived' && (
                <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => statusActionMutation.mutate('waive')}>{t('manager.finance.waiveFee')}</button>
              )}
            </div>
          </div>
        )}
      </SlideOver>

      {/* Slide-over: New Fee Structure */}
      <SlideOver open={isNewStructureOpen} onClose={() => { setNewStructureOpen(false); setStructureForm(EMPTY_STRUCTURE_FORM) }} title="New Fee Structure">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label className={styles.label}>Name <span style={{ color: 'oklch(58% 0.22 27)' }}>*</span></label>
            <input className={styles.input} placeholder="e.g. Monthly Tuition" value={structureForm.name} onChange={e => setStructureForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label className={styles.label}>Type <span style={{ color: 'oklch(58% 0.22 27)' }}>*</span></label>
            <select className={styles.select} value={structureForm.type} onChange={e => setStructureForm(f => ({ ...f, type: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="semester">Semester</option>
              <option value="annual">Annual</option>
              <option value="registration">Registration</option>
              <option value="course">Course</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label}>Amount <span style={{ color: 'oklch(58% 0.22 27)' }}>*</span></label>
              <input className={styles.input} type="number" min="0" step="0.01" placeholder="0.00" value={structureForm.amount} onChange={e => setStructureForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label}>Currency</label>
              <input className={styles.input} placeholder="EGP" value={structureForm.currency} onChange={e => setStructureForm(f => ({ ...f, currency: e.target.value }))} />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label className={styles.label}>Due Date</label>
            <input className={styles.input} type="date" value={structureForm.due_date} onChange={e => setStructureForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} rows={3} placeholder="Optional description…" value={structureForm.description} onChange={e => setStructureForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>

          {createStructureMutation.isError && (
            <p style={{ fontSize: '0.8125rem', color: 'oklch(58% 0.22 27)' }}>Failed to create fee structure. Please try again.</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => { setNewStructureOpen(false); setStructureForm(EMPTY_STRUCTURE_FORM) }}>Cancel</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => createStructureMutation.mutate()} disabled={createStructureMutation.isPending || !structureForm.name || !structureForm.amount}>
              {createStructureMutation.isPending ? 'Creating…' : 'Create Fee Structure'}
            </button>
          </div>
        </div>
      </SlideOver>

      {/* Nested Payment Modal */}
      <PaymentModal open={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} onConfirm={(method, ref) => markPaidMutation.mutate({ method, ref })} isPending={markPaidMutation.isPending} />
    </div>
  )
}
