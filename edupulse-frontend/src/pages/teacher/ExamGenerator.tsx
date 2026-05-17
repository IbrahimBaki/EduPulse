import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../lib/axios'
import styles from './ExamGenerator.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course { id: number; name: string; subject?: string | { name?: string } }
interface Lesson  { id: number; title: string; pdf_path?: string | null }

interface WizardState {
  courseId: number | null
  courseName: string
  lessonIds: number[]
  title: string
  mcq: number
  trueFalse: number
  shortAnswer: number
  essay: number
  easy: number
  medium: number
  hard: number
  duration: number
  language: 'en' | 'ar'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}

function AlertIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}

function SparkIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z"/></svg>
}

function ArrowLeftIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-rtl-flip=""><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
}

function PdfIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
}

// ─── Generating animation messages ────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Reading lesson content…',
  'Analyzing key concepts…',
  'Generating questions…',
  'Applying difficulty distribution…',
  'Almost done…',
]

function GeneratingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 2800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.generatingOverlay} role="status" aria-live="polite">
      <div className={styles.generatingRing}>
        <div className={styles.generatingOrbit} />
        <SparkIcon />
      </div>
      <p className={styles.generatingMessage}>{LOADING_MESSAGES[msgIdx]}</p>
      <p className={styles.generatingHint}>This usually takes 30–60 seconds</p>
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Select Lessons', 'Configure', 'Generate']
  return (
    <div className={styles.stepBar} aria-label="Wizard steps" role="list">
      {steps.map((label, i) => {
        const n = i + 1 as 1 | 2 | 3
        const done    = n < step
        const current = n === step
        return (
          <div key={n} className={`${styles.stepItem} ${current ? styles.stepCurrent : done ? styles.stepDone : ''}`} role="listitem" aria-current={current ? 'step' : undefined}>
            <span className={styles.stepNum} aria-hidden="true">
              {done ? <CheckIcon /> : n}
            </span>
            <span className={styles.stepLabel}>{label}</span>
            {i < steps.length - 1 && <span className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} aria-hidden="true" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Difficulty slider row ────────────────────────────────────────────────────

function DiffSlider({
  label, value, color, onChange, disabled
}: { label: string; value: number; color: string; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className={styles.diffRow}>
      <span className={styles.diffLabel}>{label}</span>
      <input
        type="range"
        min={0} max={100} step={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className={styles.diffSlider}
        style={{ '--track-color': color } as React.CSSProperties}
        aria-label={`${label} difficulty percentage`}
      />
      <span className={styles.diffValue} style={{ color }}>{value}%</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExamGenerator() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [error, setError] = useState<string | null>(null)

  const [state, setState] = useState<WizardState>({
    courseId: null, courseName: '', lessonIds: [],
    title: '', mcq: 5, trueFalse: 3, shortAnswer: 2, essay: 0,
    easy: 30, medium: 50, hard: 20,
    duration: 60, language: 'en',
  })

  const patch = (update: Partial<WizardState>) => setState(s => ({ ...s, ...update }))

  // Courses list
  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['teacher-courses-list'],
    queryFn: () => api.get('/teacher/courses').then(r => {
      const d = r.data.data
      return (Array.isArray(d) ? d : (d?.data ?? [])) as Course[]
    }),
    staleTime: 5 * 60 * 1000,
  })

  // Lessons for selected course
  const { data: lessons, isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ['teacher-course-lessons', state.courseId],
    queryFn: () =>
      api.get(`/teacher/courses/${state.courseId}/lessons`)
        .then(r => {
          const d = r.data.data
          return (Array.isArray(d) ? d : (d?.data ?? [])) as Lesson[]
        }),
    enabled: !!state.courseId,
    staleTime: 2 * 60 * 1000,
  })

  // Generate mutation
  const { mutate: generate, isPending } = useMutation({
    mutationFn: () => api.post('/teacher/exams/generate', {
      course_id:      state.courseId,
      lesson_ids:     state.lessonIds,
      title:          state.title,
      question_types: { mcq: state.mcq, true_false: state.trueFalse, short_answer: state.shortAnswer, essay: state.essay },
      difficulty_mix: { easy: state.easy, medium: state.medium, hard: state.hard },
      duration_minutes: state.duration,
      language:       state.language,
    }),
    onSuccess: (res) => {
      const id = res.data?.data?.id ?? res.data?.data?.exam?.id
      navigate(`/teacher/exams/${id}`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Generation failed. Please try again.'
      setError(msg)
    },
  })

  // Difficulty total validation
  const diffTotal = state.easy + state.medium + state.hard
  const totalQ    = state.mcq + state.trueFalse + state.shortAnswer + state.essay

  const handleDiff = (key: 'easy' | 'medium' | 'hard', val: number) => {
    const others = Object.entries({ easy: state.easy, medium: state.medium, hard: state.hard })
      .filter(([k]) => k !== key)
    const remaining = 100 - val
    const otherSum  = others.reduce((s, [, v]) => s + v, 0)
    if (otherSum === 0) {
      const half = Math.floor(remaining / 2)
      const [a, b] = others.map(([k]) => k)
      patch({ [key]: val, [a]: half, [b]: remaining - half } as Partial<WizardState>)
    } else {
      const factor = remaining / otherSum
      const updates = Object.fromEntries(others.map(([k, v]) => [k, Math.round(v * factor)])) as Partial<WizardState>
      patch({ [key]: val, ...updates })
    }
  }

  // Step 1 validation
  const step1Valid = !!state.courseId && state.lessonIds.length > 0
  // Step 2 validation
  const step2Valid = !!state.title.trim() && totalQ > 0 && diffTotal === 100

  // Course select handler
  const selectCourse = (id: number) => {
    const c = (courses ?? []).find(c => c.id === id)
    const name = c?.name ?? ''
    patch({ courseId: id, courseName: name, lessonIds: [], title: `Exam — ${name}` })
  }

  // Lesson toggle
  const toggleLesson = (id: number) => {
    const ids = state.lessonIds.includes(id)
      ? state.lessonIds.filter(l => l !== id)
      : [...state.lessonIds, id]
    patch({ lessonIds: ids })
  }

  const toggleAll = () => {
    const all = (lessons ?? []).map(l => l.id)
    patch({ lessonIds: state.lessonIds.length === all.length ? [] : all })
  }

  return (
    <div className={styles.page}>

      {/* Back */}
      <button type="button" className={styles.backBtn} onClick={() => navigate('/teacher/exams')}>
        <ArrowLeftIcon /> Back to Exams
      </button>

      <div className={styles.wizard}>
        <div className={styles.wizardHead}>
          <h1 className={styles.wizardTitle}>Generate AI Exam</h1>
          <p className={styles.wizardSub}>AI reads your lesson content and generates a complete exam</p>
          <StepBar step={step} />
        </div>

        {/* ── STEP 1: Select Course & Lessons ── */}
        {step === 1 && (
          <div className={styles.stepBody} key="step1">
            <h2 className={styles.stepTitle}>Select Course &amp; Lessons</h2>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-select">Course</label>
              {coursesLoading ? (
                <span className={styles.skeleton} style={{ height: 36, borderRadius: 8, display: 'block' }} />
              ) : (
                <select
                  id="course-select"
                  className={styles.select}
                  value={state.courseId ?? ''}
                  onChange={e => selectCourse(Number(e.target.value))}
                  aria-required="true"
                >
                  <option value="">— Select a course —</option>
                  {(courses ?? []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {state.courseId && (
              <div className={styles.field}>
                <div className={styles.lessonHeader}>
                  <label className={styles.fieldLabel}>Lessons</label>
                  {!lessonsLoading && (lessons ?? []).length > 0 && (
                    <button
                      type="button"
                      className={styles.selectAllBtn}
                      onClick={toggleAll}
                    >
                      {state.lessonIds.length === (lessons ?? []).length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>

                {lessonsLoading ? (
                  <div className={styles.lessonList}>
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className={styles.skeletonLesson} aria-hidden="true">
                        <span className={styles.skeleton} style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }} />
                        <span className={styles.skeleton} style={{ flex: 1, height: 14, borderRadius: 4 }} />
                      </div>
                    ))}
                  </div>
                ) : (lessons ?? []).length === 0 ? (
                  <p className={styles.noLessons}>No lessons found for this course.</p>
                ) : (
                  <div className={styles.lessonList} role="group" aria-label="Lesson selection">
                    {(lessons ?? []).map(l => (
                      <label key={l.id} className={`${styles.lessonRow} ${state.lessonIds.includes(l.id) ? styles.lessonRowSelected : ''}`}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={state.lessonIds.includes(l.id)}
                          onChange={() => toggleLesson(l.id)}
                          aria-label={l.title}
                        />
                        <span className={styles.lessonTitle}>{l.title}</span>
                        <span className={`${styles.pdfBadge} ${l.pdf_path ? styles.pdfBadgeGreen : styles.pdfBadgeGray}`}>
                          <PdfIcon />
                          {l.pdf_path ? 'PDF' : 'No PDF'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {state.lessonIds.length === 0 && (lessons ?? []).length > 0 && (
                  <p className={styles.hint}>Select at least one lesson to continue</p>
                )}
              </div>
            )}

            <div className={styles.stepActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => setStep(2)}
                disabled={!step1Valid}
              >
                Next: Configure Exam
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Configure ── */}
        {step === 2 && (
          <div className={styles.stepBody} key="step2">
            <h2 className={styles.stepTitle}>Configure Exam</h2>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="exam-title">Exam Title</label>
              <input
                id="exam-title"
                type="text"
                className={styles.input}
                value={state.title}
                onChange={e => patch({ title: e.target.value })}
                placeholder="e.g. Midterm Exam — Biology"
                aria-required="true"
              />
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.fieldLabel}>Question Types</legend>
              <div className={styles.qtGrid}>
                {([
                  ['mcq',         'MCQ',          'mcq'],
                  ['trueFalse',   'True / False', 'trueFalse'],
                  ['shortAnswer', 'Short Answer', 'shortAnswer'],
                  ['essay',       'Essay',        'essay'],
                ] as [keyof WizardState, string, string][]).map(([key, label]) => (
                  <div key={key} className={styles.qtField}>
                    <label className={styles.qtLabel} htmlFor={`qt-${key}`}>{label}</label>
                    <input
                      id={`qt-${key}`}
                      type="number"
                      min={0} max={50}
                      className={styles.numInput}
                      value={state[key] as number}
                      onChange={e => patch({ [key]: Math.max(0, Number(e.target.value)) } as Partial<WizardState>)}
                    />
                  </div>
                ))}
              </div>
              <p className={styles.totalQ}>
                Total: <strong>{totalQ} question{totalQ !== 1 ? 's' : ''}</strong>
                {totalQ === 0 && <span className={styles.hintError}> — add at least 1</span>}
              </p>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend className={styles.fieldLabel}>Difficulty Mix</legend>
              <DiffSlider label="Easy"   value={state.easy}   color="var(--color-green)" onChange={v => handleDiff('easy',   v)} />
              <DiffSlider label="Medium" value={state.medium} color="var(--color-amber)" onChange={v => handleDiff('medium', v)} />
              <DiffSlider label="Hard"   value={state.hard}   color="var(--color-red)"   onChange={v => handleDiff('hard',   v)} />
              {diffTotal !== 100 && (
                <p className={styles.hintError}>Difficulty percentages must total 100% (currently {diffTotal}%)</p>
              )}
            </fieldset>

            <div className={styles.configRow}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.fieldLabel} htmlFor="duration">Duration (minutes)</label>
                <input
                  id="duration"
                  type="number"
                  min={10} max={300}
                  className={styles.numInput}
                  style={{ width: 100 }}
                  value={state.duration}
                  onChange={e => patch({ duration: Math.max(10, Math.min(300, Number(e.target.value))) })}
                />
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel} id="lang-label">Language</span>
                <div className={styles.langToggle} role="group" aria-labelledby="lang-label">
                  <button
                    type="button"
                    className={`${styles.langBtn} ${state.language === 'en' ? styles.langBtnActive : ''}`}
                    onClick={() => patch({ language: 'en' })}
                    aria-pressed={state.language === 'en'}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    className={`${styles.langBtn} ${state.language === 'ar' ? styles.langBtnActive : ''}`}
                    onClick={() => patch({ language: 'ar' })}
                    aria-pressed={state.language === 'ar'}
                  >
                    Arabic
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.stepActions}>
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)}>
                <ArrowLeftIcon /> Back
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => setStep(3)}
                disabled={!step2Valid}
              >
                Review &amp; Generate
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Generate ── */}
        {step === 3 && (
          <div className={styles.stepBody} key="step3">
            <h2 className={styles.stepTitle}>Review &amp; Generate</h2>

            {isPending ? (
              <GeneratingOverlay />
            ) : (
              <>
                {error && (
                  <div className={styles.errorBanner} role="alert">
                    <AlertIcon />
                    <span>{error}</span>
                  </div>
                )}

                <div className={styles.summary}>
                  <div className={styles.summaryRow}><span>Course</span><strong>{state.courseName}</strong></div>
                  <div className={styles.summaryRow}><span>Lessons selected</span><strong>{state.lessonIds.length}</strong></div>
                  <div className={styles.summaryRow}><span>Exam title</span><strong>{state.title || '—'}</strong></div>
                  <div className={styles.summaryRow}>
                    <span>Question types</span>
                    <strong>
                      {[
                        state.mcq         && `${state.mcq} MCQ`,
                        state.trueFalse   && `${state.trueFalse} T/F`,
                        state.shortAnswer && `${state.shortAnswer} Short`,
                        state.essay       && `${state.essay} Essay`,
                      ].filter(Boolean).join(', ') || '—'}
                    </strong>
                  </div>
                  <div className={styles.summaryRow}><span>Total questions</span><strong>{totalQ}</strong></div>
                  <div className={styles.summaryRow}><span>Difficulty</span><strong>{state.easy}% easy / {state.medium}% medium / {state.hard}% hard</strong></div>
                  <div className={styles.summaryRow}><span>Duration</span><strong>{state.duration} min</strong></div>
                  <div className={styles.summaryRow}><span>Language</span><strong>{state.language === 'en' ? 'English' : 'Arabic'}</strong></div>
                </div>

                <div className={styles.stepActions}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setError(null); setStep(2) }}>
                    <ArrowLeftIcon /> Back
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGenerate}`}
                    onClick={() => { setError(null); generate() }}
                  >
                    <SparkIcon />
                    {error ? 'Retry Generation' : 'Generate with AI'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
