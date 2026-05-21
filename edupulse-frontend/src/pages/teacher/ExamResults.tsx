import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './ExamResults.module.css'
import UserAvatar from '../../components/UserAvatar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnswerDetail {
  question_text: string
  question_type: string
  student_answer: string | null
  correct_answer: string | null
  score: number
  marks: number
  is_correct: boolean | null
  ai_feedback: string | null
}

interface ViolationEntry {
  type: 'tab_switch' | 'fullscreen_exit' | 'copy_attempt'
  at: string
}

interface StudentAttempt {
  id: number
  status: string
  total_score: number
  percentage: number
  is_passed: boolean
  started_at: string | null
  submitted_at: string | null
  teacher_approved_at: string | null
  violations_count: number
  student: { id: number; name: string; email: string; avatar_url?: string | null }
}

interface ResultsData {
  exam: { id: number; title: string; total_marks: number; passing_percentage: number }
  stats: {
    total_attempts: number
    average_score: number
    pass_rate: number
    highest_score: number
    lowest_score: number
  }
  attempts: StudentAttempt[]
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-rtl-flip=""><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
}

function AlertIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

function ChevronDownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
}

function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────


function timeTaken(start: string | null, end: string | null): string {
  if (!start || !end) return '—'
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue} style={accent ? { color: accent } : undefined}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <span className={styles.skeleton} style={{ width: 80, height: 14, display: 'block', marginBlockEnd: 24, borderRadius: 4 }} />
      <div className={styles.statsRow}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={styles.statCard} aria-hidden="true">
            <span className={styles.skeleton} style={{ width: 80, height: 12, display: 'block', marginBlockEnd: 8, borderRadius: 4 }} />
            <span className={styles.skeleton} style={{ width: 56, height: 28, display: 'block', borderRadius: 6 }} />
          </div>
        ))}
      </div>
      <div className={styles.tableWrap} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--neutral-border)', display: 'flex', gap: 16, alignItems: 'center' }}>
            <span className={styles.skeleton} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
            <span className={styles.skeleton} style={{ flex: 1, height: 13, borderRadius: 4 }} />
            <span className={styles.skeleton} style={{ width: 60, height: 13, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Attempt row ──────────────────────────────────────────────────────────────

function AttemptRow({
  attempt,
  totalMarks,
  examId,
  onApprovalChange,
}: {
  attempt: StudentAttempt
  totalMarks: number
  examId: string
  onApprovalChange: () => void
}) {
  const [expanded, setExpanded]         = useState(false)
  const [answers, setAnswers]           = useState<AnswerDetail[] | null>(null)
  const [violationLog, setViolationLog] = useState<ViolationEntry[] | null>(null)
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const [approved, setApproved]         = useState(!!attempt.teacher_approved_at)
  const [approving, setApproving]       = useState(false)

  const handleExpand = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && answers === null) {
      setLoadingAnswers(true)
      try {
        const r = await api.get(`/teacher/exams/${examId}/results/${attempt.student.id}`)
        setAnswers(r.data.data.answers ?? [])
        setViolationLog(r.data.data.attempt?.violation_log ?? [])
      } catch {
        setAnswers([])
        setViolationLog([])
      } finally {
        setLoadingAnswers(false)
      }
    }
  }

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setApproving(true)
    try {
      if (approved) {
        await api.delete(`/teacher/exams/${examId}/results/${attempt.student.id}/approve`)
        setApproved(false)
      } else {
        await api.post(`/teacher/exams/${examId}/results/${attempt.student.id}/approve`)
        setApproved(true)
      }
      onApprovalChange()
    } catch {
      // keep current state on error
    } finally {
      setApproving(false)
    }
  }

  return (
    <>
      <tr
        className={styles.tableRow}
        onClick={handleExpand}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleExpand() }}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-label={`${attempt.student.name} — ${attempt.percentage.toFixed(1)}%`}
      >
        <td>
          <div className={styles.studentCell}>
            <UserAvatar name={attempt.student.name} avatarUrl={attempt.student.avatar_url} className={styles.avatar} />
            <div>
              <span className={styles.studentName}>{attempt.student.name}</span>
              <span className={styles.studentEmail}>{attempt.student.email}</span>
            </div>
            {attempt.violations_count > 0 && (
              <span className={styles.violationBadge} title={`${attempt.violations_count} violation(s) recorded`}>
                ⚠ {attempt.violations_count}
              </span>
            )}
          </div>
        </td>
        <td className={styles.numCell}>
          <span className={styles.scoreNum}>{attempt.total_score}</span>
          <span className={styles.scoreOf}>/{totalMarks}</span>
        </td>
        <td className={styles.numCell}>
          <span className={styles.pctNum}>{Number(attempt.percentage).toFixed(1)}%</span>
        </td>
        <td>
          <span className={`${styles.passBadge} ${attempt.is_passed ? styles.passGreen : styles.passFail}`}>
            {attempt.is_passed ? 'Pass' : 'Fail'}
          </span>
        </td>
        <td className={styles.dateCell}>{formatDate(attempt.submitted_at)}</td>
        <td className={styles.durationCell}>{timeTaken(attempt.started_at, attempt.submitted_at)}</td>
        <td>
          <div className={styles.approvalCell} onClick={e => e.stopPropagation()}>
            {approved
              ? <span className={styles.approvedBadge}>Approved</span>
              : <span className={styles.pendingBadge}>Pending</span>}
            <button
              type="button"
              className={`${styles.approveBtn} ${approved ? styles.approveBtnRevoke : styles.approveBtnGreen}`}
              disabled={approving}
              onClick={handleApprove}
              title={approved ? 'Revoke approval' : 'Approve result'}
            >
              {approving ? '…' : approved ? 'Revoke' : 'Approve'}
            </button>
          </div>
        </td>
        <td>
          <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}><ChevronDownIcon /></span>
        </td>
      </tr>

      {expanded && (
        <tr className={styles.expandedRow}>
          <td colSpan={8}>
            {loadingAnswers ? (
              <div className={styles.loadingAnswers}>Loading answers…</div>
            ) : answers !== null ? (
              <div className={styles.answerBreakdown}>
                {violationLog && violationLog.length > 0 && (
                  <div className={styles.violationLog}>
                    <p className={styles.breakdownTitle}>Violations ({violationLog.length})</p>
                    <div className={styles.violationList}>
                      {violationLog.map((v, i) => (
                        <div key={i} className={styles.violationEntry}>
                          <span className={styles.violationTypeBadge}>{v.type.replace('_', ' ')}</span>
                          <span className={styles.violationTime}>{new Date(v.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {answers.length > 0 && <p className={styles.breakdownTitle}>Answer Breakdown</p>}
                {answers.length > 0 && answers.map((a, i) => (
                  <div key={i} className={`${styles.answerItem} ${a.is_correct ? styles.answerCorrect : a.is_correct === false ? styles.answerWrong : ''}`}>
                    <p className={styles.answerQ}>{i + 1}. {a.question_text}</p>
                    <div className={styles.answerMeta}>
                      <span>Student: <strong>{a.student_answer ?? 'No answer'}</strong></span>
                      {a.correct_answer && <span>Correct: <strong style={{ color: 'var(--color-green)' }}>{a.correct_answer}</strong></span>}
                      <span className={styles.answerScore}>{a.score}/{a.marks}</span>
                    </div>
                    {a.ai_feedback && (
                      <p className={styles.aiFeedback}>{a.ai_feedback}</p>
                    )}
                  </div>
                ))}
                {answers.length === 0 && (!violationLog || violationLog.length === 0) && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No answers or violations recorded.</p>
                )}
              </div>
            ) : null}
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamResults() {
  const { examId } = useParams<{ examId: string }>()
  const navigate   = useNavigate()

  const { data, isLoading, isError, refetch } = useQuery<ResultsData>({
    queryKey: ['teacher-exam-results', Number(examId)],
    queryFn: () => api.get(`/teacher/exams/${examId}/results`).then(r => r.data.data as ResultsData),
    staleTime: 30 * 1000,
  })

  if (isLoading) return <PageSkeleton />

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertIcon />
          <p>Failed to load results.</p>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    )
  }

  const { exam, stats, attempts } = data

  return (
    <div className={styles.page}>

      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(`/teacher/exams/${examId}`)}>
          <ArrowLeftIcon /> Back to Exam
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnOutline}`} aria-label="Export results (coming soon)" title="Export — coming soon">
          <DownloadIcon /> Export
        </button>
      </div>

      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{exam.title}</h1>
        <p className={styles.pageSub}>
          {exam.total_marks} marks · Pass {exam.passing_percentage}%
        </p>
      </header>

      <div className={styles.statsRow}>
        <StatCard label="Total Attempts"  value={stats.total_attempts} />
        <StatCard label="Average Score"   value={`${Number(stats.average_score ?? 0).toFixed(1)}%`} accent="var(--color-blue)" />
        <StatCard label="Pass Rate"       value={`${Number(stats.pass_rate ?? 0).toFixed(1)}%`} accent={Number(stats.pass_rate) >= 60 ? 'var(--color-green)' : 'var(--color-amber)'} />
        <StatCard label="Highest Score"   value={`${Number(stats.highest_score ?? 0).toFixed(1)}%`} accent="var(--color-green)" />
      </div>

      {attempts.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No submissions yet</p>
          <p className={styles.emptyText}>Students have not started this exam.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Student results">
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Score</th>
                <th scope="col">Percentage</th>
                <th scope="col">Result</th>
                <th scope="col">Date</th>
                <th scope="col">Duration</th>
                <th scope="col">Approval</th>
                <th scope="col" aria-label="Expand"></th>
              </tr>
            </thead>
            <tbody>
              {attempts.map(a => (
                <AttemptRow
                  key={a.id}
                  attempt={a}
                  totalMarks={exam.total_marks}
                  examId={examId!}
                  onApprovalChange={refetch}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
