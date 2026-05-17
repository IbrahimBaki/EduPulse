import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './ExamTaking.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: number
  question_text: string
  question_type: 'mcq' | 'true_false' | 'short_answer' | 'essay'
  options: string[] | null
  marks: number
  order: number
}

interface StartData {
  attempt_id: number
  exam: { title: string; duration_minutes: number }
  questions: Question[]
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
}

function ChevronRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
}

function ClockIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}

function AlertIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Question input components ────────────────────────────────────────────────

function McqInput({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.mcqList} role="radiogroup">
      {options.map((opt, i) => (
        <label key={i} className={`${styles.mcqOption} ${value === opt ? styles.mcqSelected : ''}`}>
          <input
            type="radio"
            name="mcq"
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className={styles.radioInput}
          />
          <span className={styles.radioIndicator} aria-hidden="true" />
          <span className={styles.optionText}>{opt}</span>
        </label>
      ))}
    </div>
  )
}

function TrueFalseInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.tfGroup} role="radiogroup">
      {(['True', 'False'] as const).map(v => (
        <label key={v} className={`${styles.tfOption} ${value === v ? styles.tfSelected : ''}`}>
          <input
            type="radio"
            name="tf"
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            className={styles.radioInput}
          />
          <span className={styles.tfLabel}>{v}</span>
        </label>
      ))}
    </div>
  )
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  answeredCount,
  totalCount,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  answeredCount: number
  totalCount: number
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const unanswered = totalCount - answeredCount

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className={styles.modal}>
        <h2 className={styles.modalTitle} id="confirm-title">Submit Exam?</h2>
        {unanswered > 0 ? (
          <p className={styles.modalBody}>
            You have <strong>{unanswered} unanswered {unanswered === 1 ? 'question' : 'questions'}</strong>. Unanswered questions receive zero marks.
          </p>
        ) : (
          <p className={styles.modalBody}>All {totalCount} questions answered. Your exam will be graded immediately.</p>
        )}
        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={isSubmitting}>
            Keep Going
          </button>
          <button type="button" className={styles.submitConfirmBtn} onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamTaking() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  const [examData, setExamData] = useState<StartData | null>(null)
  const [startError, setStartError] = useState(false)
  const [starting, setStarting] = useState(true)

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSubmitRef = useRef(false)

  // ── Start exam ──
  useEffect(() => {
    api.post(`/student/exams/${examId}/start`)
      .then(r => {
        const d = r.data.data as StartData
        setExamData(d)
        setTimeLeft(d.exam.duration_minutes * 60)
        setStarting(false)
      })
      .catch(() => {
        setStartError(true)
        setStarting(false)
      })
  }, [examId])

  // ── Countdown ──
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) {
      if (!autoSubmitRef.current) {
        autoSubmitRef.current = true
        doSubmit()
      }
      return
    }
    const id = setTimeout(() => setTimeLeft(t => (t ?? 1) - 1), 1000)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  // ── Auto-save mutation ──
  const { mutate: saveAnswer } = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: number; answer: string }) =>
      api.post(`/student/exams/${examId}/answer`, {
        question_id: questionId,
        student_answer: answer,
      }),
  })

  // ── Submit mutation ──
  const { mutate: submitExam, isPending: isSubmitting } = useMutation({
    mutationFn: () => {
      // Include all current answers in the submit payload as a safety net
      // in case any individual auto-save calls failed
      const answersPayload = Object.entries(answers).map(([qId, ans]) => ({
        question_id: Number(qId),
        student_answer: ans,
      }))
      return api.post(`/student/exams/${examId}/submit`, { answers: answersPayload })
    },
    onSuccess: () => navigate(`/student/exams/${examId}/result`, { replace: true }),
  })

  const doSubmit = useCallback(() => {
    if (!examData) return
    submitExam()
  }, [examData, submitExam])

  const handleAnswerChange = useCallback((questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    if (saveDebounce.current) clearTimeout(saveDebounce.current)
    saveDebounce.current = setTimeout(() => {
      saveAnswer({ questionId, answer: value })
    }, 800)
  }, [saveAnswer])

  // ── Loading ──
  if (starting) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} aria-label="Starting exam…" role="status" />
        <p className={styles.loadingText}>Preparing your exam…</p>
      </div>
    )
  }

  if (startError || !examData) {
    return (
      <div className={styles.loadingScreen}>
        <AlertIcon />
        <p className={styles.loadingText}>Failed to start exam.</p>
        <button type="button" className={styles.retryBtn} onClick={() => navigate('/student/exams')}>
          Back to Exams
        </button>
      </div>
    )
  }

  const { questions, exam } = examData
  const q = questions[currentIdx]
  const answer = answers[q.id] ?? ''
  const answeredCount = Object.keys(answers).length
  const isLast = currentIdx === questions.length - 1

  const timerClass = timeLeft !== null && timeLeft <= 60
    ? styles.timerRed
    : timeLeft !== null && timeLeft <= 300
      ? styles.timerAmber
      : ''

  return (
    <div className={styles.shell}>

      {/* ── Header bar ── */}
      <header className={styles.header}>
        <h1 className={styles.examTitle}>{exam.title}</h1>
        <div className={styles.headerRight}>
          <span className={`${styles.timer} ${timerClass}`} role="timer" aria-live="off">
            <ClockIcon />
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </span>
          <button
            type="button"
            className={styles.submitHeaderBtn}
            onClick={() => setShowConfirm(true)}
          >
            Submit Exam
          </button>
        </div>
      </header>

      <div className={styles.body}>

        {/* ── Nav rail ── */}
        <nav className={styles.navRail} aria-label="Question navigation">
          <p className={styles.navHeading}>Questions</p>
          <div className={styles.navGrid}>
            {questions.map((qu, i) => (
              <button
                key={qu.id}
                type="button"
                className={`${styles.navBtn} ${i === currentIdx ? styles.navBtnCurrent : ''} ${answers[qu.id] ? styles.navBtnAnswered : ''}`}
                onClick={() => setCurrentIdx(i)}
                aria-current={i === currentIdx ? 'step' : undefined}
                aria-label={`Question ${i + 1}${answers[qu.id] ? ', answered' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p className={styles.navProgress}>
            {answeredCount} of {questions.length} answered
          </p>
        </nav>

        {/* ── Question workspace ── */}
        <main className={styles.workspace} aria-live="polite">
          <div className={styles.questionMeta}>
            <span className={styles.questionNum}>Question {currentIdx + 1} of {questions.length}</span>
            <span className={styles.marksBadge}>{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
          </div>

          <p className={styles.questionText}>{q.question_text}</p>

          <div className={styles.answerArea}>
            {q.question_type === 'mcq' && q.options && (
              <McqInput
                options={q.options}
                value={answer}
                onChange={v => handleAnswerChange(q.id, v)}
              />
            )}
            {q.question_type === 'true_false' && (
              <TrueFalseInput
                value={answer}
                onChange={v => handleAnswerChange(q.id, v)}
              />
            )}
            {q.question_type === 'short_answer' && (
              <div className={styles.textareaWrap}>
                <textarea
                  className={styles.textarea}
                  value={answer}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  maxLength={500}
                  rows={5}
                  placeholder="Type your answer here…"
                  aria-label="Your answer"
                />
                <span className={styles.charCount}>{answer.length}/500</span>
              </div>
            )}
            {q.question_type === 'essay' && (
              <div className={styles.textareaWrap}>
                <textarea
                  className={`${styles.textarea} ${styles.essayTextarea}`}
                  value={answer}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  maxLength={2000}
                  rows={10}
                  placeholder="Write your essay here…"
                  aria-label="Your answer"
                />
                <span className={styles.charCount}>{answer.length}/2000</span>
              </div>
            )}
          </div>

          {/* ── Navigation ── */}
          <div className={styles.navRow}>
            <button
              type="button"
              className={styles.navArrow}
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              aria-label="Previous question"
            >
              <ChevronLeft /> Previous
            </button>

            {isLast ? (
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => setShowConfirm(true)}
              >
                Review &amp; Submit
              </button>
            ) : (
              <button
                type="button"
                className={styles.navArrow}
                onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                aria-label="Next question"
              >
                Next <ChevronRight />
              </button>
            )}
          </div>
        </main>
      </div>

      {showConfirm && (
        <ConfirmModal
          answeredCount={answeredCount}
          totalCount={questions.length}
          onConfirm={doSubmit}
          onCancel={() => setShowConfirm(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
