import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './ExamResult.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnswerItem {
  question_text: string
  question_type: string
  student_answer: string | null
  correct_answer: string | null
  score: number
  marks: number
  is_correct: boolean | null
  ai_feedback: string | null
}

interface ResultData {
  exam: { title: string; total_marks: number; passing_percentage: number }
  attempt: {
    total_score: number
    percentage: number
    is_passed: boolean
    submitted_at: string | null
    started_at: string | null
  }
  answers: AnswerItem[]
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
}

function ChevronDownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
}

function CheckIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}

function XIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}

function SparkleIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l1.68 5.16L19 9l-5.16 1.84L12 16l-1.84-5.16L5 9l5.16-1.84z"/><path d="M5 3l.77 2.37L8 6l-2.23.63L5 9l-.77-2.37L2 6l2.23-.63z"/><path d="M19 15l.77 2.37L22 18l-2.23.63L19 21l-.77-2.37L16 18l2.23-.63z"/></svg>
}

function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeTaken(start: string | null, end: string | null): string {
  if (!start || !end) return '—'
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <span className={styles.skeleton} style={{ width: 80, height: 14, display: 'block', marginBlockEnd: 32 }} />
      <div className={styles.summary}>
        <span className={styles.skeleton} style={{ width: 120, height: 60, borderRadius: 8 }} />
        <span className={styles.skeleton} style={{ width: 80, height: 20, borderRadius: 4 }} />
      </div>
    </div>
  )
}

// ─── Answer accordion item ────────────────────────────────────────────────────

function AnswerItem({ item, index }: { item: AnswerItem; index: number }) {
  const [open, setOpen] = useState(false)

  const isCorrect = item.is_correct === true
  const isWrong = item.is_correct === false
  const isPartial = item.is_correct === null

  return (
    <div className={`${styles.accordionItem} ${isCorrect ? styles.aCorrect : isWrong ? styles.aWrong : styles.aPartial}`}>
      <button
        type="button"
        className={styles.accordionTrigger}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={`${styles.statusIcon} ${isCorrect ? styles.iconCorrect : isWrong ? styles.iconWrong : styles.iconPartial}`} aria-hidden="true">
          {isCorrect ? <CheckIcon /> : isWrong ? <XIcon /> : <span style={{ fontSize: '0.625rem', fontWeight: 700 }}>~</span>}
        </span>
        <span className={styles.accordionQ}>
          <span className={styles.qNum}>{index + 1}.</span>
          {item.question_text}
        </span>
        <span className={styles.accordionScore}>{item.score}/{item.marks}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}><ChevronDownIcon /></span>
      </button>

      {open && (
        <div className={styles.accordionBody}>
          <div className={styles.answerRow}>
            <span className={styles.answerLabel}>Your answer</span>
            <span className={`${styles.answerVal} ${isCorrect ? styles.answerValCorrect : isWrong ? styles.answerValWrong : ''}`}>
              {item.student_answer ?? <em className={styles.noAnswer}>No answer provided</em>}
            </span>
          </div>
          {item.correct_answer && (
            <div className={styles.answerRow}>
              <span className={styles.answerLabel}>Correct answer</span>
              <span className={`${styles.answerVal} ${styles.answerValCorrect}`}>{item.correct_answer}</span>
            </div>
          )}
          {item.ai_feedback && (
            <div className={styles.aiFeedbackBox}>
              <span className={styles.aiFeedbackIcon}><SparkleIcon /> AI Feedback</span>
              <p className={styles.aiFeedbackText}>{item.ai_feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamResult() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError, refetch } = useQuery<ResultData>({
    queryKey: ['student-exam-result', Number(examId)],
    queryFn: () => api.get(`/student/exams/${examId}/result`).then(r => r.data.data as ResultData),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <PageSkeleton />

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertIcon />
          <p>Failed to load result.</p>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    )
  }

  const { exam, attempt, answers } = data
  const correctCount = answers.filter(a => a.is_correct === true).length
  const duration = timeTaken(attempt.started_at, attempt.submitted_at)

  return (
    <div className={styles.page}>

      <button type="button" className={styles.backBtn} onClick={() => navigate('/student/exams')}>
        <ArrowLeftIcon /> Back to Exams
      </button>

      {/* ── Result summary ── */}
      <div className={styles.summaryCard}>
        <div className={styles.resultHeader}>
          <div className={styles.examMeta}>
            <h1 className={styles.examTitle}>{exam.title}</h1>
            <p className={styles.passMark}>Pass mark: {exam.passing_percentage}%</p>
          </div>
          <div className={`${styles.resultVerdict} ${attempt.is_passed ? styles.verdictPass : styles.verdictFail}`}>
            <span className={styles.verdictPct}>{Number(attempt.percentage).toFixed(1)}%</span>
            <span className={styles.verdictLabel}>{attempt.is_passed ? 'Passed' : 'Failed'}</span>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{attempt.total_score}/{exam.total_marks}</span>
            <span className={styles.statLabel}>Score</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{correctCount}/{answers.length}</span>
            <span className={styles.statLabel}>Correct</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{answers.length}</span>
            <span className={styles.statLabel}>Questions</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{duration}</span>
            <span className={styles.statLabel}>Time taken</span>
          </div>
        </div>
      </div>

      {/* ── Answer review ── */}
      {answers.length > 0 && (
        <section aria-labelledby="review-heading">
          <h2 className={styles.sectionHeading} id="review-heading">Answer Review</h2>
          <div className={styles.accordion}>
            {answers.map((a, i) => (
              <AnswerItem key={i} item={a} index={i} />
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
