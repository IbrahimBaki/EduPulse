import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './ExamPreview.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExamStatus = 'draft' | 'published' | 'scheduled' | 'active' | 'completed' | 'archived'
type QType      = 'mcq' | 'true_false' | 'short_answer' | 'essay'
type Difficulty = 'easy' | 'medium' | 'hard'

interface Question {
  id: number
  question_text: string
  question_type: QType
  options: string[] | null
  correct_answer: string | null
  marks: number
  explanation: string | null
  order: number
  difficulty: Difficulty
  topic: string | null
}

interface Exam {
  id: number
  title: string
  status: ExamStatus
  total_marks: number
  duration_minutes: number
  language: string
  is_ai_generated: boolean
  passing_percentage: number
  scheduled_at: string | null
  starts_at: string | null
  ends_at: string | null
  course: { id: number; name: string }
  questions: Question[]
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-rtl-flip=""><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
}

function ChevronDownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
}

function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}

function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}

function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}

function XIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}

function AlertIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ExamStatus, string> = {
  draft: 'Draft', published: 'Published', scheduled: 'Scheduled',
  active: 'Active', completed: 'Completed', archived: 'Archived',
}

function statusClass(s: ExamStatus): string {
  const map: Record<ExamStatus, string> = {
    draft: styles.badgeDraft, published: styles.badgePublished,
    scheduled: styles.badgeScheduled, active: styles.badgeActive,
    completed: styles.badgeCompleted, archived: styles.badgeArchived,
  }
  return map[s] ?? styles.badgeDraft
}

const QTYPE_LABEL: Record<QType, string>  = { mcq: 'MCQ', true_false: 'T/F', short_answer: 'Short', essay: 'Essay' }
const QTYPE_CLASS: Record<QType, string>  = {
  mcq: styles.qtBlue, true_false: styles.qtPurple, short_answer: styles.qtGreen, essay: styles.qtAmber,
}
const DIFF_CLASS: Record<Difficulty, string> = {
  easy: styles.diffEasy, medium: styles.diffMedium, hard: styles.diffHard,
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <span className={styles.skeleton} style={{ width: 80, height: 14, display: 'block', marginBlockEnd: 24, borderRadius: 4 }} />
      <div className={styles.examHeader} aria-hidden="true">
        <span className={styles.skeleton} style={{ width: 260, height: 22, display: 'block', borderRadius: 6 }} />
        <div style={{ display: 'flex', gap: 8, marginBlockStart: 10 }}>
          {[60, 80, 64, 72].map((w, i) => <span key={i} className={styles.skeleton} style={{ width: w, height: 22, display: 'block', borderRadius: 4 }} />)}
        </div>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={styles.questionCard} style={{ opacity: 1 - i * 0.25 }} aria-hidden="true">
          <span className={styles.skeleton} style={{ width: '60%', height: 16, display: 'block', borderRadius: 4, marginBlockEnd: 12 }} />
          <span className={styles.skeleton} style={{ width: '40%', height: 12, display: 'block', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

function toLocalDatetimeInput(utcStr: string): string {
  const d = new Date(utcStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toLocalTimeInput(utcStr: string): string {
  const d = new Date(utcStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ScheduleModal({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const qc = useQueryClient()

  // Field 1: publish date + time (datetime-local → local timezone)
  const [scheduledAt, setScheduledAt] = useState(
    exam.scheduled_at ? toLocalDatetimeInput(exam.scheduled_at) : ''
  )
  // Field 2: start time only — date is auto-taken from scheduledAt
  const [startTime, setStartTime] = useState(
    exam.starts_at ? toLocalTimeInput(exam.starts_at) : ''
  )
  const [err, setErr] = useState<string | null>(null)

  // Combine publish date's date part + chosen start time → local Date
  const computedStartsAt = useMemo(() => {
    if (!scheduledAt || !startTime) return null
    const datePart = scheduledAt.split('T')[0]
    return new Date(`${datePart}T${startTime}`)
  }, [scheduledAt, startTime])

  // Auto end = start + exam duration
  const computedEndsAt = useMemo(() => {
    if (!computedStartsAt) return null
    return new Date(computedStartsAt.getTime() + exam.duration_minutes * 60_000)
  }, [computedStartsAt, exam.duration_minutes])

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post(`/teacher/exams/${exam.id}/schedule`, {
      scheduled_at: new Date(scheduledAt).toISOString(),
      starts_at:    computedStartsAt!.toISOString(),
      ends_at:      computedEndsAt!.toISOString(),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-exam', exam.id] }); onClose() },
    onError: (e: unknown) => setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Schedule failed'),
  })

  const endsAtDisplay = computedEndsAt
    ? computedEndsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Schedule exam">
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <h2 className={styles.modalTitle}>Schedule Exam</h2>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close"><XIcon /></button>
        </div>
        <div className={styles.modalBody}>
          {err && <div className={styles.errorBanner}><AlertIcon />{err}</div>}

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Publish Date &amp; Time</label>
            <input
              type="datetime-local"
              className={styles.input}
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Start Time</label>
            <input
              type="time"
              className={styles.input}
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              disabled={!scheduledAt}
            />
            {!scheduledAt && <span className={styles.fieldHint}>Select publish date first</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>End Time <span className={styles.fieldHintInline}>(auto · {exam.duration_minutes} min)</span></label>
            <div className={`${styles.input} ${styles.inputReadonly}`}>{endsAtDisplay}</div>
          </div>
        </div>
        <div className={styles.modalFoot}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => { setErr(null); mutate() }}
            disabled={isPending || !scheduledAt || !startTime || !computedEndsAt}
          >
            {isPending ? 'Scheduling…' : 'Confirm Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Question card ────────────────────────────────────────────────────────────

function QuestionCard({ q, index, examId }: { q: Question; index: number; examId: number }) {
  const qc = useQueryClient()
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const [editText, setEditText]         = useState(q.question_text)
  const [editCorrect, setEditCorrect]   = useState(q.correct_answer ?? '')
  const [editMarks, setEditMarks]       = useState(q.marks)
  const [editExplanation, setEditExp]   = useState(q.explanation ?? '')
  const [editDifficulty, setEditDiff]   = useState<Difficulty>(q.difficulty)

  const { mutate: saveEdit, isPending: saving } = useMutation({
    mutationFn: () => api.put(`/teacher/exams/${examId}/questions/${q.id}`, {
      question_text: editText, correct_answer: editCorrect,
      marks: editMarks, explanation: editExplanation, difficulty: editDifficulty,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-exam', examId] }); setEditing(false) },
  })

  const { mutate: deleteQ, isPending: deleting } = useMutation({
    mutationFn: () => api.delete(`/teacher/exams/${examId}/questions/${q.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-exam', examId] }),
  })

  return (
    <article className={`${styles.questionCard} ${editing ? styles.questionCardEditing : ''}`}>
      <div className={styles.qCardHead}>
        <div className={styles.qMeta}>
          <span className={styles.qNum}>Q{index + 1}</span>
          <span className={`${styles.qBadge} ${QTYPE_CLASS[q.question_type]}`}>{QTYPE_LABEL[q.question_type]}</span>
          <span className={`${styles.qBadge} ${DIFF_CLASS[q.difficulty]}`}>{q.difficulty}</span>
          {q.topic && <span className={styles.qTopic}>{q.topic}</span>}
          <span className={styles.qMarks}>{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
        </div>
        <div className={styles.qActions}>
          <button
            type="button"
            className={styles.qActionBtn}
            onClick={() => setEditing(e => !e)}
            aria-label={editing ? 'Cancel edit' : 'Edit question'}
            title={editing ? 'Cancel' : 'Edit'}
          >
            {editing ? <XIcon /> : <EditIcon />}
          </button>
          <button
            type="button"
            className={`${styles.qActionBtn} ${styles.qActionDanger}`}
            onClick={() => setConfirm(true)}
            aria-label="Delete question"
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {editing ? (
        <div className={styles.editForm}>
          <textarea
            className={styles.editTextarea}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={3}
            aria-label="Question text"
          />
          <div className={styles.editRow}>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Correct Answer</label>
              <input className={styles.editInput} value={editCorrect} onChange={e => setEditCorrect(e.target.value)} />
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Marks</label>
              <input type="number" min={1} max={10} className={styles.editInput} style={{ width: 64 }} value={editMarks} onChange={e => setEditMarks(Number(e.target.value))} />
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Difficulty</label>
              <select className={styles.editInput} value={editDifficulty} onChange={e => setEditDiff(e.target.value as Difficulty)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div className={styles.editField} style={{ marginBlockStart: 8 }}>
            <label className={styles.editLabel}>Explanation</label>
            <textarea className={styles.editTextarea} value={editExplanation} onChange={e => setEditExp(e.target.value)} rows={2} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBlockStart: 10, justifyContent: 'flex-end' }}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => saveEdit()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.qText}>{q.question_text}</p>

          {q.question_type === 'mcq' && q.options && (
            <div className={styles.options}>
              {q.options.map((opt, oi) => (
                <div
                  key={oi}
                  className={`${styles.option} ${q.correct_answer && opt.startsWith(q.correct_answer) ? styles.optionCorrect : ''}`}
                >
                  {q.correct_answer && opt.startsWith(q.correct_answer) && <span className={styles.optionTick}><CheckIcon /></span>}
                  {opt}
                </div>
              ))}
            </div>
          )}

          {q.question_type === 'true_false' && (
            <div className={styles.options}>
              {['True', 'False'].map(tf => (
                <div
                  key={tf}
                  className={`${styles.option} ${q.correct_answer?.toLowerCase() === tf.toLowerCase() ? styles.optionCorrect : ''}`}
                >
                  {q.correct_answer?.toLowerCase() === tf.toLowerCase() && <span className={styles.optionTick}><CheckIcon /></span>}
                  {tf}
                </div>
              ))}
            </div>
          )}

          {q.explanation && (
            <button
              type="button"
              className={styles.explanationToggle}
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
            >
              <span>Explanation</span>
              <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}><ChevronDownIcon /></span>
            </button>
          )}
          {open && q.explanation && (
            <p className={styles.explanationText}>{q.explanation}</p>
          )}
        </>
      )}

      {confirm && (
        <div className={styles.confirmInline} role="alert">
          <span>Delete this question?</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} style={{ height: 28 }} onClick={() => setConfirm(false)}>Keep</button>
            <button type="button" className={`${styles.btn} ${styles.btnDanger}`} style={{ height: 28 }} onClick={() => deleteQ()} disabled={deleting}>
              {deleting ? '…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamPreview() {
  const { examId } = useParams<{ examId: string }>()
  const navigate   = useNavigate()
  const qc         = useQueryClient()

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [publishConfirm, setPublishConfirm] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery<{ exam: Exam; questions: Question[] }>({
    queryKey: ['teacher-exam', Number(examId)],
    queryFn: () =>
      api.get(`/teacher/exams/${examId}`)
        .then(r => ({ exam: r.data.data?.exam ?? r.data.data, questions: r.data.data?.questions ?? [] })),
    staleTime: 30 * 1000,
  })

  const { mutate: publish, isPending: publishing } = useMutation({
    mutationFn: () => api.post(`/teacher/exams/${examId}/publish`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-exam', Number(examId)] }); setPublishConfirm(false) },
  })

  if (isLoading) return <PageSkeleton />

  if (isError || !data?.exam) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertIcon />
          <p>Failed to load exam.</p>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    )
  }

  const { exam, questions } = data

  return (
    <div className={styles.page}>

      <button type="button" className={styles.backBtn} onClick={() => navigate('/teacher/exams')}>
        <ArrowLeftIcon /> Back to Exams
      </button>

      {/* Exam header */}
      <div className={styles.examHeader}>
        <div className={styles.examHeaderMain}>
          <h1 className={styles.examTitle}>{exam.title}</h1>
          <div className={styles.examMeta}>
            <span className={styles.courseBadge}>{exam.course?.name}</span>
            <span className={`${styles.badge} ${statusClass(exam.status)}`}>{STATUS_LABELS[exam.status]}</span>
            {exam.is_ai_generated && <span className={styles.aiBadge}>AI Generated</span>}
          </div>
          <div className={styles.examStats}>
            <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
            <span className={styles.dot} aria-hidden="true">·</span>
            <span>{exam.total_marks} marks</span>
            <span className={styles.dot} aria-hidden="true">·</span>
            <span>{exam.duration_minutes} min</span>
            <span className={styles.dot} aria-hidden="true">·</span>
            <span>Pass {exam.passing_percentage}%</span>
          </div>
        </div>

        {/* Action bar */}
        <div className={styles.actionBar}>
          {exam.status === 'draft' && (
            <>
              <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => navigate(`/teacher/exams/${exam.id}/results`)}>
                Results
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => setPublishConfirm(true)}
                disabled={questions.length === 0}
              >
                Publish Exam
              </button>
            </>
          )}
          {exam.status === 'published' && (
            <>
              <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => navigate(`/teacher/exams/${exam.id}/results`)}>
                Results
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setScheduleOpen(true)}>
                Schedule
              </button>
            </>
          )}
          {exam.status === 'scheduled' && (
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => navigate(`/teacher/exams/${exam.id}/results`)}>
              Results
            </button>
          )}
          {(exam.status === 'active' || exam.status === 'completed') && (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate(`/teacher/exams/${exam.id}/results`)}>
              View Results
            </button>
          )}
        </div>
      </div>

      {/* Publish confirm */}
      {publishConfirm && (
        <div className={styles.confirmBanner} role="alert">
          <span>Publish this exam? Students will be able to see it.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setPublishConfirm(false)}>Cancel</button>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => publish()} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Confirm Publish'}
            </button>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className={styles.questionsSection}>
        <h2 className={styles.sectionTitle}>Questions <span className={styles.sectionCount}>{questions.length}</span></h2>
        {questions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No questions yet. This should not happen — regenerate if needed.</p>
          </div>
        ) : (
          <div className={styles.questionsList}>
            {questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} examId={exam.id} />
            ))}
          </div>
        )}
      </div>

      {scheduleOpen && <ScheduleModal exam={exam} onClose={() => setScheduleOpen(false)} />}
    </div>
  )
}
