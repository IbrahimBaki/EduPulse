import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/axios'
import styles from './AiTutor.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  id: number
  topic: string
  lesson_name?: string
  created_at: string
  messages?: Message[]
}

interface WeakTopic {
  topic: string
  score: number
}

interface QuizQuestion {
  question: string
  options: string[]
  correct_index?: number
  explanation?: string
}

interface QuizResult {
  question: string
  your_answer: string
  correct: string
  is_correct: boolean
  explanation?: string
  score?: number
}

interface Course {
  id: number
  name: string
  subject?: { name: string }
  teacher?: { name: string }
}

interface SelectableLesson {
  id: number
  title: string
  is_published: boolean
  pdf_processed?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = (data as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  return []
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 86_400_000
  if (diff < 1) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Basic markdown renderer ──────────────────────────────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<)(.+)$/gm, (m, p1) => p1 ? `<p>${p1}</p>` : m)
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className={styles.typingBubble} aria-label="AI is thinking">
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

function SparklesIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
      <path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z"/>
      <path d="M5 18l.5 1.5L7 20l-1.5.5L5 22l-.5-1.5L3 20l1.5-.5z"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

// ─── Course selection step ────────────────────────────────────────────────────

function CourseStep({ courses, loading, onSelect }: { courses: Course[]; loading: boolean; onSelect: (c: Course) => void }) {
  const { t } = useTranslation()
  return (
    <div className={styles.selectionPane}>
      <div className={styles.selectionInner}>
        <div className={styles.selectionHeader}>
          <div className={styles.selectionIcon}><SparklesIcon size={24} /></div>
          <h2 className={styles.selectionTitle}>{t('student.aiTutor.whichCourse')}</h2>
          <p className={styles.selectionSub}>{t('student.aiTutor.selectCourseHint')}</p>
        </div>
        {loading ? (
          <div className={styles.selectionLoading}>
            <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
          </div>
        ) : courses.length === 0 ? (
          <p className={styles.selectionEmpty}>{t('student.aiTutor.notEnrolled')}</p>
        ) : (
          <div className={styles.courseGrid}>
            {courses.map(c => (
              <button
                key={c.id}
                type="button"
                className={styles.courseCard}
                onClick={() => onSelect(c)}
              >
                <span className={styles.courseCardName}>{c.name}</span>
                <div className={styles.courseCardMeta}>
                  {c.subject && <span className={styles.courseCardBadge}>{c.subject.name}</span>}
                  {c.teacher && <span className={styles.courseCardTeacher}>{c.teacher.name}</span>}
                </div>
                <span className={styles.courseCardArrow}><ChevronRightIcon /></span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Lesson selection step ────────────────────────────────────────────────────

function LessonStep({
  course, lessons, loading, onBack, onSelect,
}: { course: Course; lessons: SelectableLesson[]; loading: boolean; onBack: () => void; onSelect: (l: SelectableLesson) => void }) {
  const { t } = useTranslation()
  return (
    <div className={styles.selectionPane}>
      <div className={styles.selectionInner}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          {t('student.aiTutor.backToCourses')}
        </button>
        <div className={styles.selectionHeader}>
          <div className={styles.selectionIcon}><SparklesIcon size={24} /></div>
          <h2 className={styles.selectionTitle}>{t('student.aiTutor.whichLesson')}</h2>
          <p className={styles.selectionSub}>
            <span className={styles.courseNameInline}>{course.name}</span> — {t('student.aiTutor.chooseLessonHint')}
          </p>
        </div>
        {loading ? (
          <div className={styles.selectionLoading}>
            <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
          </div>
        ) : lessons.length === 0 ? (
          <p className={styles.selectionEmpty}>{t('student.aiTutor.noPublishedLessons')}</p>
        ) : (
          <div className={styles.lessonList}>
            {lessons.map((l, idx) => (
              <button
                key={l.id}
                type="button"
                className={styles.lessonItem}
                onClick={() => onSelect(l)}
              >
                <span className={styles.lessonIndex}>{idx + 1}</span>
                <span className={styles.lessonTitle}>{l.title}</span>
                <div className={styles.lessonMeta}>
                  {l.pdf_processed && <span className={styles.lessonPdfBadge}>PDF</span>}
                </div>
                <span className={styles.lessonArrow}><ChevronRightIcon /></span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Quiz mode ────────────────────────────────────────────────────────────────

interface QuizProps {
  topic: string
  lessonId?: number
  onClose: () => void
  onComplete: (score: number) => void
}

function QuizMode({ topic, lessonId, onClose, onComplete }: QuizProps) {
  const { t } = useTranslation()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [level, setLevel] = useState(1)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'loading' | 'question' | 'results' | 'error'>('loading')
  const [results, setResults] = useState<{ score: number; passed: boolean; breakdown: QuizResult[] } | null>(null)
  const [countUp, setCountUp] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const genMutation = useMutation({
    mutationFn: (lvl: number) => api.post('/ai/quiz/generate', { topic, lesson_id: lessonId, level: lvl }),
    onSuccess: r => {
      const data = r.data.data ?? r.data
      const qs = Array.isArray(data.questions) ? data.questions : (Array.isArray(data) ? data : [])
      if (qs.length === 0) { setPhase('error'); return }
      setQuestions(qs)
      setLevel(prev => data.level ?? prev)
      setCurrent(0)
      setAnswers([])
      setSelected(null)
      setPhase('question')
    },
    onError: () => setPhase('error'),
  })

  const submitMutation = useMutation({
    mutationFn: (ans: number[]) => api.post('/ai/quiz/submit', {
      topic,
      lesson_id: lessonId,
      level,
      questions,
      student_answers: ans.map(i => String.fromCharCode(65 + i)),
    }),
    onSuccess: r => {
      const data = r.data.data ?? r.data
      const score = typeof data.score === 'number' ? data.score : 0
      const passed = !!data.passed
      const breakdown: QuizResult[] = Array.isArray(data.results) ? data.results : []
      setResults({ score, passed, breakdown })
      setPhase('results')
      if (intervalRef.current) clearInterval(intervalRef.current)
      let n = 0
      intervalRef.current = setInterval(() => {
        n += Math.ceil(score / 20)
        if (n >= score) {
          setCountUp(score)
          if (intervalRef.current) clearInterval(intervalRef.current)
        } else {
          setCountUp(n)
        }
      }, 50)
    },
    onError: () => setPhase('error'),
  })

  useEffect(() => { genMutation.mutate(level) }, [])

  const handleSelect = (idx: number) => {
    if (selected !== null) return
    setSelected(idx)
  }

  const handleNext = () => {
    if (selected === null) return
    const newAnswers = [...answers, selected]
    setAnswers(newAnswers)
    setSelected(null)
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1)
    } else {
      submitMutation.mutate(newAnswers)
    }
  }

  const handleNextLevel = () => {
    setLevel(l => l + 1)
    setPhase('loading')
    genMutation.mutate(level + 1)
  }

  const q = questions[current]
  const pct = questions.length > 0 ? ((current + (selected !== null ? 1 : 0)) / questions.length) * 100 : 0

  return (
    <motion.div
      className={styles.quizOverlay}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.quizPanel}>
        <div className={styles.quizHeader}>
          <div className={styles.quizMeta}>
            <span className={styles.quizTopic}>{topic}</span>
            <span className={styles.quizLevel}>{t('student.aiTutor.level')} {level}</span>
          </div>
          <button type="button" className={styles.quizClose} onClick={onClose} aria-label={t('student.aiTutor.closeQuiz')}>
            <CloseIcon />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'loading' && (
            <motion.div
              key="loading"
              className={styles.quizLoading}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className={styles.quizLoadingDots}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
              <p>{t('student.aiTutor.generatingQuiz')}</p>
            </motion.div>
          )}

          {phase === 'question' && q && (
            <motion.div
              key={`q-${current}`}
              className={styles.quizBody}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.progressBar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className={styles.progressFill} style={{ width: `${pct}%` }} />
              </div>
              <p className={styles.questionCount}>{current + 1} {t('student.aiTutor.of')} {questions.length}</p>
              <p className={styles.questionText}>{q.question}</p>
              <div className={styles.options}>
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.optionBtn} ${selected === i ? styles.optionSelected : ''}`}
                    onClick={() => handleSelect(i)}
                    aria-pressed={selected === i}
                  >
                    <span className={styles.optionLabel}>{String.fromCharCode(65 + i)}</span>
                    <span className={styles.optionText}>{opt.replace(/^[A-Da-d][.)]\s*/, '')}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.nextBtn}
                disabled={selected === null || submitMutation.isPending}
                onClick={handleNext}
              >
                {current + 1 === questions.length
                  ? (submitMutation.isPending ? t('student.aiTutor.submitting') : t('student.aiTutor.submit'))
                  : t('student.aiTutor.next')}
                {current + 1 < questions.length && <ChevronRightIcon />}
              </button>
            </motion.div>
          )}

          {phase === 'error' && (
            <motion.div
              key="error"
              className={styles.quizLoading}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <p style={{ color: 'var(--color-red)', fontWeight: 600 }}>{t('student.aiTutor.quizLoadFailed')}</p>
              <button
                type="button"
                className={styles.nextBtn}
                onClick={() => { setPhase('loading'); genMutation.mutate(level) }}
              >
                {t('common.retry')}
              </button>
            </motion.div>
          )}

          {phase === 'results' && results && (
            <motion.div
              key="results"
              className={styles.quizResults}
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.scoreCircle} style={{ borderColor: results.passed ? 'oklch(65% 0.2 145)' : 'var(--color-red)' }}>
                <span className={styles.scoreNum} style={{ color: results.passed ? 'oklch(65% 0.2 145)' : 'var(--color-red)' }}>
                  {countUp}%
                </span>
                <span className={styles.scoreEmoji}>{results.passed ? '🎉' : '📚'}</span>
              </div>
              <p className={styles.resultLabel} style={{ color: results.passed ? 'oklch(65% 0.2 145)' : 'var(--color-red)' }}>
                {results.passed ? t('student.aiTutor.passed') : t('student.aiTutor.keepStudying')}
              </p>

              {results.breakdown.length > 0 && (
                <div className={styles.breakdown}>
                  {results.breakdown.map((r, i) => (
                    <div key={i} className={`${styles.breakdownRow} ${r.is_correct ? styles.breakdownCorrect : styles.breakdownWrong}`}>
                      <span className={styles.breakdownIcon}>{r.is_correct ? '✓' : '✗'}</span>
                      <div className={styles.breakdownContent}>
                        <p className={styles.breakdownQ}>{r.question}</p>
                        {!r.is_correct && r.explanation && <p className={styles.breakdownExp}>{r.explanation}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.resultActions}>
                {results.passed && level < 3 && (
                  <button type="button" className={styles.nextLevelBtn} onClick={handleNextLevel}>
                    {t('student.aiTutor.tryLevel')} {level + 1} <SparklesIcon size={13} />
                  </button>
                )}
                <button type="button" className={styles.backToChatBtn} onClick={() => { onComplete(results.score); onClose() }}>
                  {t('student.aiTutor.backToChat')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Main AI Tutor page ───────────────────────────────────────────────────────

export default function StudentAiTutor() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const initLessonId = searchParams.get('lesson_id') ? Number(searchParams.get('lesson_id')) : undefined
  const initLesson   = searchParams.get('lesson') ?? undefined

  const [selectionPhase, setSelectionPhase] = useState<'course' | 'lesson' | 'chat'>(initLessonId ? 'chat' : 'course')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [currentTopic, setCurrentTopic] = useState(initLesson ?? '')
  const [lessonId, setLessonId] = useState<number | undefined>(initLessonId)
  const [sessionId, setSessionId] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: history = [], refetch: refetchHistory } = useQuery<ChatSession[]>({
    queryKey: ['student-chat-history'],
    queryFn: () => api.get('/ai/chat-history').then(r => normalizeArray<ChatSession>(r.data.data?.data ?? r.data.data ?? r.data)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: weakTopics = [] } = useQuery<WeakTopic[]>({
    queryKey: ['student-weak-topics'],
    queryFn: () => api.get('/ai/weak-topics').then(r => normalizeArray<WeakTopic>(r.data.data ?? r.data)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: enrolledCourses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['student-enrolled-courses'],
    queryFn: () => api.get('/student/courses').then(r => normalizeArray<Course>(r.data.data?.data ?? r.data.data ?? r.data)),
    enabled: selectionPhase === 'course',
    staleTime: 5 * 60 * 1000,
  })

  const { data: courseLessons = [], isLoading: lessonsLoading } = useQuery<SelectableLesson[]>({
    queryKey: ['course-lessons', selectedCourse?.id],
    queryFn: () => api.get(`/student/courses/${selectedCourse!.id}/lessons`).then(r => normalizeArray<SelectableLesson>(r.data.data ?? r.data)),
    enabled: selectionPhase === 'lesson' && !!selectedCourse,
    staleTime: 5 * 60 * 1000,
  })

  const explainMutation = useMutation({
    mutationFn: ({ message, lesson_id, session_id, topic }: { message: string; lesson_id?: number; session_id?: number; topic?: string }) =>
      api.post('/ai/explain', { message, lesson_id, session_id, topic }),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const startNewSession = () => {
    setMessages([])
    setCurrentTopic('')
    setLessonId(undefined)
    setSessionId(undefined)
    setSelectedCourse(null)
    setSelectionPhase('course')
    setInput('')
    setSidebarOpen(false)
  }

  const loadSession = (session: ChatSession) => {
    setCurrentTopic(session.topic)
    setSessionId(session.id)
    const msgs: Message[] = Array.isArray(session.messages)
      ? session.messages.map(m => ({ ...m, id: String(m.id ?? uid()) }))
      : []
    setMessages(msgs)
    setSelectionPhase('chat')
    setSidebarOpen(false)
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: uid(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    const topic = currentTopic || text.slice(0, 60)
    if (!currentTopic) setCurrentTopic(topic)

    try {
      const res = await explainMutation.mutateAsync({
        message: text,
        lesson_id: lessonId,
        session_id: sessionId,
        topic: sessionId ? undefined : topic,
      })
      const data = res.data.data ?? res.data
      const newSessionId = data?.session_id
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId)
        refetchHistory()
      }
      const reply = (data?.reply ?? res.data.reply ?? res.data.message ?? '').trim()
      const aiMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: reply || 'I could not generate a response. Please try again.',
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      const errMsg: Message = { id: uid(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, lessonId, currentTopic, sessionId, refetchHistory, explainMutation])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startTopicChat = (topic: string) => {
    setMessages([{
      id: uid(),
      role: 'assistant',
      content: `Let's work on **${topic}**. What would you like to understand better?`
    }])
    setCurrentTopic(topic)
    setSessionId(undefined)
    setInput('')
    setSelectionPhase('chat')
    setSidebarOpen(false)
  }

  const weakScore = (score: number) =>
    score < 40 ? 'var(--color-red)' : score < 60 ? 'var(--color-amber)' : 'oklch(65% 0.2 145)'

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`} aria-label={t('student.aiTutor.chatHistoryAndTopics')}>
        <button type="button" className={styles.newTopicBtn} onClick={startNewSession}>
          <PlusIcon /> {t('student.aiTutor.startNewTopic')}
        </button>

        {history.length > 0 && (
          <section className={styles.historySection}>
            <h3 className={styles.sidebarLabel}>{t('student.aiTutor.recentSessions')}</h3>
            <div className={styles.historyList}>
              {history.slice(0, 12).map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={styles.historyItem}
                  onClick={() => loadSession(s)}
                >
                  <span className={styles.historyTopic}>{s.topic}</span>
                  {s.lesson_name && <span className={styles.historyLesson}>{s.lesson_name}</span>}
                  <span className={styles.historyDate}>{formatDate(s.created_at)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {weakTopics.length > 0 && (
          <section className={styles.weakSection}>
            <h3 className={styles.sidebarLabel}>{t('student.aiTutor.weakTopics')}</h3>
            <div className={styles.weakList}>
              {weakTopics.map(t => (
                <button
                  key={t.topic}
                  type="button"
                  className={styles.weakPill}
                  onClick={() => startTopicChat(t.topic)}
                  style={{ borderColor: `${weakScore(t.score)}30`, color: weakScore(t.score) }}
                >
                  <span className={styles.weakName}>{t.topic}</span>
                  <span className={styles.weakScore}>{t.score}%</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </aside>

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── Main chat area ── */}
      <div className={styles.main}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(s => !s)}
            aria-label={t('student.aiTutor.toggleSidebar')}
          >
            <SparklesIcon size={15} />
          </button>
          <div className={styles.topBarCenter}>
            {currentTopic ? (
              <span className={styles.topicChip}>{currentTopic}</span>
            ) : (
              <span className={styles.topBarTitle}>{t('student.aiTutor.title')}</span>
            )}
            {lessonId && initLesson && (
              <span className={styles.lessonChip}>{initLesson}</span>
            )}
          </div>
          <button
            type="button"
            className={styles.quizBtn}
            disabled={selectionPhase !== 'chat' || messages.length === 0}
            onClick={() => setShowQuiz(true)}
          >
            {t('student.aiTutor.takeQuiz')}
          </button>
        </div>

        {/* Course / Lesson selection */}
        {selectionPhase === 'course' && (
          <CourseStep
            courses={enrolledCourses}
            loading={coursesLoading}
            onSelect={course => { setSelectedCourse(course); setSelectionPhase('lesson') }}
          />
        )}
        {selectionPhase === 'lesson' && selectedCourse && (
          <LessonStep
            course={selectedCourse}
            lessons={courseLessons}
            loading={lessonsLoading}
            onBack={() => setSelectionPhase('course')}
            onSelect={lesson => { setLessonId(lesson.id); setCurrentTopic(lesson.title); setSelectionPhase('chat') }}
          />
        )}

        {/* Messages */}
        {selectionPhase === 'chat' && <div className={styles.messages} role="log" aria-live="polite" aria-label={t('student.aiTutor.chatMessages')}>
          {messages.length === 0 ? (
            <div className={styles.welcomeState}>
              <div className={styles.welcomeIcon}>
                <SparklesIcon size={28} />
              </div>
              <h2 className={styles.welcomeTitle}>{t('student.aiTutor.askMeAnything')}</h2>
              <p className={styles.welcomeText}>
                {t('student.aiTutor.welcomeText')}
              </p>
              {weakTopics.length > 0 && (
                <div className={styles.welcomeTopics}>
                  <p className={styles.welcomeTopicsLabel}>{t('student.aiTutor.yourWeakTopics')}</p>
                  <div className={styles.welcomeTopicPills}>
                    {weakTopics.slice(0, 4).map(t => (
                      <button
                        key={t.topic}
                        type="button"
                        className={styles.welcomeTopicBtn}
                        onClick={() => startTopicChat(t.topic)}
                      >
                        {t.topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {messages.map(m => (
                  <motion.div
                    key={m.id}
                    className={`${styles.messageWrap} ${m.role === 'user' ? styles.messageUser : styles.messageAssistant}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                  >
                    {m.role === 'assistant' && (
                      <div className={styles.aiAvatar} aria-hidden="true">
                        <SparklesIcon size={12} />
                      </div>
                    )}
                    {m.role === 'user' ? (
                      <div className={styles.userBubble}>{m.content}</div>
                    ) : (
                      <div
                        className={styles.aiBubble}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div
                  className={`${styles.messageWrap} ${styles.messageAssistant}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={styles.aiAvatar} aria-hidden="true"><SparklesIcon size={12} /></div>
                  <TypingIndicator />
                </motion.div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>}

        {/* Input area */}
        {selectionPhase === 'chat' && <div className={styles.inputArea}>
          <div className={styles.inputRow}>
            <textarea
              ref={inputRef}
              className={styles.textInput}
              placeholder={currentTopic ? `${t('student.aiTutor.askAbout')} ${currentTopic}...` : t('student.aiTutor.inputPlaceholder')}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              aria-label={t('student.aiTutor.messageInput')}
            />
            <button
              type="button"
              className={styles.sendBtn}
              disabled={!input.trim() || isLoading}
              onClick={handleSend}
              aria-label={t('student.aiTutor.sendMessage')}
            >
              <SendIcon />
            </button>
          </div>
          <div className={styles.inputHint}>
            {t('student.aiTutor.inputHint')}
          </div>
        </div>}
      </div>

      {/* Quiz overlay */}
      <AnimatePresence>
        {showQuiz && (
          <QuizMode
            topic={currentTopic || 'General Knowledge'}
            lessonId={lessonId}
            onClose={() => setShowQuiz(false)}
            onComplete={score => {
              const msg: Message = {
                id: uid(),
                role: 'assistant',
                content: `Quiz completed! You scored **${score}%**. ${score >= 70 ? 'Great job!' : 'Keep practicing and I can help you review any weak areas.'}`
              }
              setMessages(prev => [...prev, msg])
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
