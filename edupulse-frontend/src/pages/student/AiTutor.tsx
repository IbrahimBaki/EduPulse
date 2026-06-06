import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import mermaid from 'mermaid'
import api from '../../lib/axios'
import styles from './AiTutor.module.css'

mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' })

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  id: number
  topic: string | null
  lesson_id?: number
  lesson_name?: string
  course_name?: string
  created_at: string
  messages?: Message[]
}

interface WeakTopic {
  topic: string
  score: number
  max_score?: number
  attempts?: number
  source?: string
  last_attempted_at?: string
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

interface QuizAttemptSummary {
  id: number
  topic: string
  score: number
  passed: boolean
  level: number
  source: string
  lesson?: { id: number; title: string }
  created_at: string
}

interface QuizAttemptDetail extends QuizAttemptSummary {
  payload: QuizResult[]
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

type QuizLevel = 1 | 2 | 3

type QuizStartConfig =
  | { source: 'topic';   topic: string }
  | { source: 'session'; sessionId: number; topic: string }
  | { source: 'lesson';  lessonIds: number[]; topic: string }

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

// ─── Markdown renderer ────────────────────────────────────────────────────────

marked.setOptions({ breaks: true, gfm: true })

function renderMarkdown(text: string): string {
  const withMermaid = text.replace(
    /```mermaid\n?([\s\S]*?)```/g,
    (_match, code) => `<div class="mermaid">${code.trim()}</div>`,
  )
  const html = marked.parse(withMermaid) as string
  return DOMPurify.sanitize(html, { ADD_TAGS: ['div'], ADD_ATTR: ['class'] })
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className={styles.typingBubble} aria-label="AI is thinking" role="status">
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  )
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function SkeletonLine({ width = '100%', height = 14 }: { width?: string; height?: number }) {
  return (
    <div
      className={styles.skeleton}
      style={{ width, height: `${height}px` }}
      aria-hidden="true"
    />
  )
}

function SidebarHistorySkeleton() {
  return (
    <div className={styles.historyList} aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.skeletonItem}>
          <SkeletonLine width="68%" />
          <SkeletonLine width="42%" height={10} />
        </div>
      ))}
    </div>
  )
}

function SidebarTopicsSkeleton() {
  return (
    <div className={styles.weakList} aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={styles.skeletonItem}>
          <SkeletonLine width="72%" />
          <SkeletonLine height={6} />
        </div>
      ))}
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

// ─── Mode switcher (segmented control) ───────────────────────────────────────

function ModeSwitch({ mode, onChange }: { mode: 'chat' | 'quiz'; onChange: (m: 'chat' | 'quiz') => void }) {
  const { t } = useTranslation()
  return (
    <div className={styles.modeSwitch} role="tablist" aria-label={t('student.aiTutor.modeSwitch')}>
      {(['chat', 'quiz'] as const).map(m => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          className={`${styles.modeTab} ${mode === m ? styles.modeTabActive : ''}`}
          onClick={() => onChange(m)}
        >
          {m === 'chat' ? `💬 ${t('student.aiTutor.chatMode')}` : `📝 ${t('student.aiTutor.quizMode')}`}
        </button>
      ))}
    </div>
  )
}

// ─── Quiz review panel ────────────────────────────────────────────────────────

function QuizReviewPanel({
  attemptId,
  onClose,
  onRetake,
}: {
  attemptId: number
  onClose:   () => void
  onRetake:  (topic: string, level: QuizLevel) => void
}) {
  const { t }   = useTranslation()
  const prefersReducedMotion = useReducedMotion()

  const { data: attempt, isLoading } = useQuery<QuizAttemptDetail>({
    queryKey: ['quiz-attempt', attemptId],
    queryFn:  () => api.get(`/ai/quiz/history/${attemptId}`).then(r => r.data.data ?? r.data),
  })

  const scoreColor = attempt
    ? attempt.passed ? 'oklch(65% 0.2 145)' : 'var(--color-red)'
    : 'var(--text-muted)'

  return (
    <motion.div
      className={styles.reviewOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className={styles.reviewPanel}
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className={styles.reviewHeader}>
          <div className={styles.reviewHeaderInfo}>
            <span className={styles.reviewTitleLabel}>{t('student.aiTutor.quizReviewTitle')}</span>
            {attempt && (
              <>
                <h2 className={styles.reviewTopic}>{attempt.topic}</h2>
                <div className={styles.reviewMeta}>
                  <span
                    className={styles.reviewScoreBadge}
                    style={{ color: scoreColor, borderColor: scoreColor }}
                  >
                    {attempt.score}%
                  </span>
                  <span className={`${styles.historyBadge} ${attempt.passed ? styles.historyBadgeLesson : styles.historyBadgeCourse}`}>
                    {attempt.passed ? t('student.aiTutor.passed') : t('student.aiTutor.keepStudying')}
                  </span>
                  <span className={styles.quizHistoryDate}>{attempt.lesson?.title}</span>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className={styles.reviewCloseBtn}
            onClick={onClose}
            aria-label={t('student.aiTutor.closeQuiz')}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className={styles.reviewBody}>
          {isLoading && (
            <div className={styles.reviewLoading}>
              <div className={styles.quizLoadingDots}>
                <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
              </div>
            </div>
          )}

          {attempt && attempt.payload.map((r, i) => (
            <div
              key={i}
              className={`${styles.reviewQuestion} ${r.is_correct ? styles.reviewQuestionCorrect : styles.reviewQuestionWrong}`}
            >
              <div className={styles.reviewQuestionHeader}>
                <span className={styles.reviewQuestionNum} aria-hidden="true">
                  {r.is_correct ? '✓' : '✗'}
                </span>
                <p className={styles.reviewQuestionText} dir="auto">{r.question}</p>
              </div>

              <div className={styles.reviewAnswerRow}>
                <span className={styles.reviewAnswerLabel}>{t('student.aiTutor.yourAnswer')}:</span>
                <span className={`${styles.reviewAnswerVal} ${r.is_correct ? styles.reviewAnswerCorrect : styles.reviewAnswerWrong}`}>
                  {r.your_answer}
                </span>
              </div>

              {!r.is_correct && (
                <div className={styles.reviewAnswerRow}>
                  <span className={styles.reviewAnswerLabel}>{t('student.aiTutor.correctAnswer')}:</span>
                  <span className={`${styles.reviewAnswerVal} ${styles.reviewAnswerCorrect}`}>
                    {r.correct}
                  </span>
                </div>
              )}

              {r.explanation && (
                <p className={styles.reviewExplanation} dir="auto">{r.explanation}</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        {attempt && (
          <div className={styles.reviewFooter}>
            <button
              type="button"
              className={styles.nextLevelBtn}
              onClick={() => { onClose(); onRetake(attempt.topic, attempt.level as QuizLevel) }}
            >
              {t('student.aiTutor.retakeQuiz')} <SparklesIcon size={13} />
            </button>
            <button type="button" className={styles.backToChatBtn} onClick={onClose}>
              {t('student.aiTutor.backToChat')}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Quiz setup panel ─────────────────────────────────────────────────────────

function QuizSetupPanel({
  weakTopics,
  chatHistory,
  courses,
  coursesLoading,
  isGenerating,
  onStart,
}: {
  weakTopics:     WeakTopic[]
  chatHistory:    ChatSession[]
  courses:        Course[]
  coursesLoading: boolean
  isGenerating?:  boolean
  onStart:        (config: QuizStartConfig, level: QuizLevel) => void
}) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()

  type QuizSource = 'topic' | 'session' | 'lesson'
  const [source, setSource]               = useState<QuizSource>('topic')
  const [level, setLevel]                 = useState<QuizLevel>(1)
  const [topic, setTopic]                 = useState('')
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [quizCourse, setQuizCourse]       = useState<Course | null>(null)
  const [quizLessonPhase, setQuizLessonPhase] = useState<'course' | 'lesson'>('course')
  const [quizLessonIds, setQuizLessonIds] = useState<number[]>([])
  const [quizLessonLabel, setQuizLessonLabel] = useState('')

  const { data: quizLessons = [], isLoading: quizLessonsLoading } = useQuery<SelectableLesson[]>({
    queryKey: ['quiz-course-lessons', quizCourse?.id],
    queryFn: () =>
      api.get(`/student/courses/${quizCourse!.id}/lessons`).then(r =>
        normalizeArray<SelectableLesson>(r.data.data ?? r.data)
      ),
    enabled: !!quizCourse && source === 'lesson',
    staleTime: 5 * 60 * 1000,
  })

  const weakScoreColor = (score: number) =>
    score < 40 ? 'var(--color-red)' : score < 60 ? 'var(--color-amber)' : 'oklch(65% 0.2 145)'

  const canStart =
    (source === 'topic'   && topic.trim().length > 0) ||
    (source === 'session' && selectedSession !== null) ||
    (source === 'lesson'  && quizLessonIds.length > 0)

  const handleSubmit = () => {
    if (!canStart) return
    if (source === 'topic')
      onStart({ source: 'topic', topic: topic.trim() }, level)
    else if (source === 'session' && selectedSession)
      onStart({ source: 'session', sessionId: selectedSession.id, topic: selectedSession.topic ?? '' }, level)
    else if (source === 'lesson' && quizLessonIds.length > 0)
      onStart({ source: 'lesson', lessonIds: quizLessonIds, topic: quizLessonLabel }, level)
  }

  const sourceCards: { key: QuizSource; icon: string; label: string }[] = [
    { key: 'topic',   icon: '⚠️', label: t('student.aiTutor.quizSourceTopic')  },
    { key: 'session', icon: '💬', label: t('student.aiTutor.quizSourceChat')   },
    { key: 'lesson',  icon: '📚', label: t('student.aiTutor.quizSourceLesson') },
  ]

  const handleLessonToggle = (id: number, title: string, courseName: string) => {
    setQuizLessonIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      if (next.length === 1) setQuizLessonLabel(title)
      else if (next.length > 1) setQuizLessonLabel(t('student.aiTutor.selectedCount', { count: next.length }))
      else setQuizLessonLabel('')
      return next
    })
    if (quizLessonIds.length === 0) setQuizLessonLabel(`${courseName} – ${title}`)
  }

  return (
    <div className={styles.quizSetup}>
      <div className={styles.quizSetupInner}>
        <div className={styles.selectionHeader}>
          <div className={styles.selectionIcon}><SparklesIcon size={22} /></div>
          <h2 className={styles.selectionTitle}>{t('student.aiTutor.quizSetupTitle')}</h2>
          <p className={styles.selectionSub}>{t('student.aiTutor.quizSourceLabel')}</p>
        </div>

        {/* ── Helper card ─────────────────────────────────── */}
        <div className={styles.quizHelperCard}>
          <p className={styles.quizHelperHeading}>
            <span aria-hidden="true">💡</span> {t('student.aiTutor.quizHelperTitle')}
          </p>
          <ul className={styles.quizHelperList}>
            <li>
              <span className={styles.quizHelperIcon} aria-hidden="true">🎯</span>
              <span>
                <strong>{t('student.aiTutor.quizHelperWhyTitle')}</strong>{' '}
                {t('student.aiTutor.quizHelperWhyDesc')}
              </span>
            </li>
            <li>
              <span className={styles.quizHelperIcon} aria-hidden="true">🧠</span>
              <span>
                <strong>{t('student.aiTutor.quizHelperHowTitle')}</strong>{' '}
                {t('student.aiTutor.quizHelperHowDesc')}
              </span>
            </li>
            <li>
              <span className={styles.quizHelperIcon} aria-hidden="true">📈</span>
              <span>
                <strong>{t('student.aiTutor.quizHelperBenefitTitle')}</strong>{' '}
                {t('student.aiTutor.quizHelperBenefitDesc')}
              </span>
            </li>
          </ul>
          <p className={styles.quizHelperInstructions}>
            {t('student.aiTutor.quizHelperInstructions')}
          </p>
        </div>

        {/* ── Source selector ─────────────────────────────── */}
        <div className={styles.quizSourceGrid} role="radiogroup" aria-label={t('student.aiTutor.quizSourceLabel')}>
          {sourceCards.map(card => (
            <button
              key={card.key}
              type="button"
              role="radio"
              aria-checked={source === card.key}
              className={`${styles.quizSourceCard} ${source === card.key ? styles.quizSourceCardActive : ''}`}
              onClick={() => {
                setSource(card.key)
                setSelectedSession(null)
                setQuizLessonIds([])
                setQuizLessonLabel('')
                setQuizCourse(null)
                setQuizLessonPhase('course')
              }}
            >
              <span className={styles.quizSourceCardIcon} aria-hidden="true">{card.icon}</span>
              <span className={styles.quizSourceCardLabel}>{card.label}</span>
            </button>
          ))}
        </div>

        {/* ── Source content ──────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={source}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
            transition={{ duration: 0.18 }}
          >

            {/* Weak topic source */}
            {source === 'topic' && (
              <div className={styles.quizTopicContent}>
                {weakTopics.length === 0 ? (
                  <p className={styles.quizEmptyHint}>{t('student.aiTutor.selectTopic')}</p>
                ) : (
                  <div className={styles.quizTopicGrid}>
                    {weakTopics.map(wt => (
                      <button
                        key={wt.topic}
                        type="button"
                        className={`${styles.weakSuggestionPill} ${topic === wt.topic ? styles.weakSuggestionPillActive : ''}`}
                        onClick={() => setTopic(wt.topic)}
                      >
                        <span>{wt.topic}</span>
                        <span
                          className={styles.weakSuggestionScore}
                          style={{ color: weakScoreColor(wt.score) }}
                        >
                          {wt.score}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {weakTopics.length === 0 && (
                  <input
                    className={styles.quizSetupInput}
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder={t('student.aiTutor.topicPlaceholder')}
                    autoComplete="off"
                  />
                )}
              </div>
            )}

            {/* Chat session source */}
            {source === 'session' && (
              <div className={styles.quizSessionList}>
                {chatHistory.length === 0 ? (
                  <p className={styles.quizEmptyHint}>{t('student.aiTutor.noRecentChats')}</p>
                ) : (
                  chatHistory.slice(0, 8).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className={`${styles.quizSessionItem} ${selectedSession?.id === s.id ? styles.quizSessionItemActive : ''}`}
                      onClick={() => setSelectedSession(s)}
                    >
                      <span className={styles.quizSessionTopic}>
                        {s.topic ?? s.messages?.find(m => m.role === 'user')?.content?.slice(0, 40) ?? '…'}
                      </span>
                      <div className={styles.quizSessionMeta}>
                        {s.lesson_name && (
                          <span className={`${styles.historyBadge} ${styles.historyBadgeLesson}`}>
                            {s.lesson_name}
                          </span>
                        )}
                        {s.course_name && (
                          <span className={`${styles.historyBadge} ${styles.historyBadgeCourse}`}>
                            {s.course_name}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Course & lesson source */}
            {source === 'lesson' && (
              <div className={styles.quizLessonPicker}>
                {quizLessonPhase === 'course' && (
                  <>
                    {coursesLoading ? (
                      <div className={styles.quizPickerSkeleton}>
                        {[1, 2, 3].map(i => <div key={i} className={styles.skeletonBlock} />)}
                      </div>
                    ) : courses.length === 0 ? (
                      <p className={styles.quizEmptyHint}>{t('student.aiTutor.notEnrolled')}</p>
                    ) : (
                      <div className={styles.quizCourseGrid}>
                        {courses.map((c, idx) => {
                          const color = COURSE_COLORS[idx % COURSE_COLORS.length]
                          const initials = c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className={styles.quizCourseCard}
                              onClick={() => { setQuizCourse(c); setQuizLessonPhase('lesson') }}
                            >
                              <span className={styles.quizCourseAvatar} style={{ background: color.bg, color: color.fg }}>
                                {initials}
                              </span>
                              <span className={styles.quizCourseName}>{c.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {quizLessonPhase === 'lesson' && quizCourse && (
                  <>
                    <button
                      type="button"
                      className={styles.quizBackBtn}
                      onClick={() => { setQuizLessonPhase('course'); setQuizLessonIds([]); setQuizLessonLabel('') }}
                    >
                      <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><ChevronRightIcon /></span>
                      {quizCourse.name}
                    </button>
                    {quizLessonsLoading ? (
                      <div className={styles.quizPickerSkeleton}>
                        {[1, 2, 3].map(i => <div key={i} className={styles.skeletonBlock} />)}
                      </div>
                    ) : quizLessons.length === 0 ? (
                      <p className={styles.quizEmptyHint}>{t('student.aiTutor.noPublishedLessons')}</p>
                    ) : (
                      <div className={styles.quizLessonList}>
                        {quizLessons.filter(l => l.is_published).map((l, idx) => (
                          <label key={l.id} className={`${styles.quizLessonItem} ${quizLessonIds.includes(l.id) ? styles.quizLessonItemActive : ''}`}>
                            <input
                              type="checkbox"
                              className={styles.srOnly}
                              checked={quizLessonIds.includes(l.id)}
                              onChange={() => handleLessonToggle(l.id, l.title, quizCourse.name)}
                            />
                            <span className={styles.quizLessonIdx}>{idx + 1}</span>
                            <span className={styles.quizLessonTitle}>{l.title}</span>
                            {l.pdf_processed && <span className={styles.lessonPdfBadge}>PDF</span>}
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* ── Difficulty level ─────────────────────────────── */}
        <fieldset className={styles.levelFieldset}>
          <legend className={styles.quizSetupLabel}>{t('student.aiTutor.levelLabel')}</legend>
          <div className={styles.levelOptions}>
            {([1, 2, 3] as const).map(l => (
              <label
                key={l}
                className={`${styles.levelOption} ${level === l ? styles.levelOptionActive : ''}`}
              >
                <input
                  type="radio"
                  name="quiz-level"
                  value={l}
                  checked={level === l}
                  onChange={() => setLevel(l)}
                  className={styles.srOnly}
                />
                {t('student.aiTutor.level')} {l}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          className={`${styles.quizStartBtn} ${isGenerating ? styles.quizStartBtnLoading : ''}`}
          disabled={!canStart || !!isGenerating}
          onClick={handleSubmit}
        >
          {isGenerating ? (
            <>
              <span className={styles.quizBtnSpinner} aria-hidden="true" />
              {t('student.aiTutor.quizGenerating')}
            </>
          ) : (
            <>{t('student.aiTutor.generateQuiz')} <SparklesIcon size={13} /></>
          )}
        </button>
        {isGenerating && (
          <p className={styles.quizGeneratingHint} role="status" aria-live="polite">
            {t('student.aiTutor.quizGeneratingHint')}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Course selection step ────────────────────────────────────────────────────

const COURSE_COLORS = [
  { bg: 'oklch(62% 0.26 255 / 0.14)', fg: 'oklch(74% 0.22 255)' },
  { bg: 'oklch(75% 0.18 75 / 0.14)',  fg: 'oklch(63% 0.16 70)'  },
  { bg: 'oklch(65% 0.2 145 / 0.14)',  fg: 'oklch(50% 0.19 145)' },
  { bg: 'oklch(65% 0.18 300 / 0.14)', fg: 'oklch(56% 0.17 300)' },
  { bg: 'oklch(65% 0.15 185 / 0.14)', fg: 'oklch(49% 0.14 185)' },
]

function courseInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function CourseStep({ courses, loading, onSelect }: { courses: Course[]; loading: boolean; onSelect: (c: Course) => void }) {
  const { t } = useTranslation()
  return (
    <div className={styles.selectionPane}>
      <div className={styles.selectionInner}>
        <div className={styles.selectionHeader}>
          <div className={styles.selectionIcon}><SparklesIcon size={28} /></div>
          <h2 className={styles.selectionTitle}>{t('student.aiTutor.title')}</h2>
          <p className={styles.tutorDesc}>{t('student.aiTutor.tutorDesc')}</p>
          <div className={styles.tutorFeatures}>
            <span className={styles.tutorFeature}>{t('student.aiTutor.featureExplain')}</span>
            <span className={styles.tutorFeature}>{t('student.aiTutor.featureQuiz')}</span>
            <span className={styles.tutorFeature}>{t('student.aiTutor.featureTrack')}</span>
          </div>
          <p className={styles.courseSectionHint}>{t('student.aiTutor.whichCourse')}</p>
        </div>
        {loading ? (
          <div className={styles.courseSkeletonGrid} aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.courseSkeletonCard}>
                <div className={`${styles.skeleton} ${styles.courseAvatarSkeleton}`} />
                <div className={styles.courseSkeletonBody}>
                  <SkeletonLine width="70%" height={15} />
                  <SkeletonLine width="44%" height={11} />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className={styles.selectionEmpty}>{t('student.aiTutor.notEnrolled')}</p>
        ) : (
          <div className={styles.courseGrid}>
            {courses.map((c, idx) => {
              const clr = COURSE_COLORS[idx % COURSE_COLORS.length]
              return (
                <button
                  key={c.id}
                  type="button"
                  className={styles.courseCard}
                  onClick={() => onSelect(c)}
                >
                  <span
                    className={styles.courseAvatar}
                    style={{ background: clr.bg, color: clr.fg }}
                    aria-hidden="true"
                  >
                    {courseInitials(c.name)}
                  </span>
                  <span className={styles.courseCardBody}>
                    <span className={styles.courseCardName}>{c.name}</span>
                    <span className={styles.courseCardMeta}>
                      {c.subject && (
                        <span className={styles.courseCardBadge} style={{ background: clr.bg, color: clr.fg }}>
                          {c.subject.name}
                        </span>
                      )}
                      {c.teacher && <span className={styles.courseCardTeacher}>{c.teacher.name}</span>}
                    </span>
                  </span>
                  <span className={styles.courseCardArrow}><ChevronRightIcon /></span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Lesson selection step (multi-select) ────────────────────────────────────

function LessonStep({
  course, lessons, loading, onBack, onSelect,
}: {
  course: Course
  lessons: SelectableLesson[]
  loading: boolean
  onBack: () => void
  onSelect: (lessonIds: number[], label: string) => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const allSelected = lessons.length > 0 && selected.size === lessons.length

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(lessons.map(l => l.id)))
  }

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    const label = selected.size === lessons.length
      ? t('student.aiTutor.allLessonsContext', { courseName: course.name })
      : selected.size === 1
        ? lessons.find(l => l.id === ids[0])?.title ?? ''
        : t('student.aiTutor.lessonContextLabel', { count: selected.size })
    onSelect(ids, label)
  }

  return (
    <div className={styles.selectionPane}>
      <div className={styles.selectionInner}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {t('student.aiTutor.backToCourses')}
        </button>

        <div className={styles.selectionHeader}>
          <div className={styles.selectionIcon}><SparklesIcon size={24} /></div>
          <h2 className={styles.selectionTitle}>{t('student.aiTutor.selectLessons')}</h2>
          <p className={styles.selectionSub}>
            <span className={styles.courseNameInline}>{course.name}</span>
          </p>
        </div>

        {loading ? (
          <div className={styles.lessonList} aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.lessonSkeletonItem}>
                <SkeletonLine width="28px" height={28} />
                <SkeletonLine width="65%" height={15} />
              </div>
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <p className={styles.selectionEmpty}>{t('student.aiTutor.noPublishedLessons')}</p>
        ) : (
          <>
            {/* Select All row */}
            <label className={`${styles.lessonItem} ${styles.lessonSelectAll} ${allSelected ? styles.lessonItemChecked : ''}`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className={styles.srOnly}
              />
              <span className={`${styles.lessonCheckbox} ${allSelected ? styles.lessonCheckboxChecked : ''}`} aria-hidden="true">
                {allSelected && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <polyline points="1.5 5 4 7.5 8.5 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className={styles.lessonTitle}>{t('student.aiTutor.allLessons')}</span>
              <span className={styles.lessonAllBadge}>{lessons.length}</span>
            </label>

            <div className={styles.lessonDivider} role="separator" />

            {/* Individual lessons */}
            <div className={styles.lessonList}>
              {lessons.map((l, idx) => {
                const checked = selected.has(l.id)
                return (
                  <label
                    key={l.id}
                    className={`${styles.lessonItem} ${checked ? styles.lessonItemChecked : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(l.id)}
                      className={styles.srOnly}
                    />
                    <span className={`${styles.lessonCheckbox} ${checked ? styles.lessonCheckboxChecked : ''}`} aria-hidden="true">
                      {checked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <polyline points="1.5 5 4 7.5 8.5 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className={styles.lessonIndex}>{idx + 1}</span>
                    <span className={styles.lessonTitle}>{l.title}</span>
                    <div className={styles.lessonMeta}>
                      {l.pdf_processed && <span className={styles.lessonPdfBadge}>PDF</span>}
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Confirm button */}
            <div className={styles.lessonConfirmRow}>
              {selected.size > 0 && (
                <span className={styles.lessonSelectedCount}>
                  {allSelected
                    ? t('student.aiTutor.allLessons')
                    : t('student.aiTutor.selectedCount', { count: selected.size })}
                </span>
              )}
              <button
                type="button"
                className={styles.lessonConfirmBtn}
                disabled={selected.size === 0}
                onClick={handleConfirm}
              >
                {selected.size === 0
                  ? t('student.aiTutor.selectAtLeastOne')
                  : allSelected
                    ? t('student.aiTutor.startChatAll')
                    : t('student.aiTutor.startChatWith', { count: selected.size })}
                {selected.size > 0 && <ChevronRightIcon />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Quiz mode ────────────────────────────────────────────────────────────────

interface QuizProps {
  topic: string
  lessonIds?: number[]
  initialLevel?: QuizLevel
  initialQuestions?: QuizQuestion[]
  onClose: () => void
  onComplete: (score: number) => void
  onAttemptSaved?: () => void
}

function QuizMode({ topic, lessonIds: quizLessonIds, initialLevel = 1, initialQuestions, onClose, onComplete, onAttemptSaved }: QuizProps) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const tx = (t: Record<string, unknown>) => prefersReducedMotion ? { duration: 0 } : t

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [level, setLevel] = useState<QuizLevel>(initialLevel)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'loading' | 'question' | 'results' | 'error'>('loading')
  const [results, setResults] = useState<{
    score: number
    passed: boolean
    breakdown: QuizResult[]
    nextLevel: number | null
  } | null>(null)
  const [countUp, setCountUp] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const firstQuestionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Move focus into the quiz body after generation so keyboard users don't stay on the close button
  useEffect(() => {
    if (phase === 'question') {
      const id = setTimeout(() => firstQuestionRef.current?.focus(), 280)
      return () => clearTimeout(id)
    }
  }, [phase, current])

  const genMutation = useMutation({
    mutationFn: (lvl: QuizLevel) => {
      const lessonPayload = quizLessonIds && quizLessonIds.length === 1
        ? { lesson_id: quizLessonIds[0] }
        : quizLessonIds && quizLessonIds.length > 1
          ? { lesson_ids: quizLessonIds }
          : {}
      return api.post('/ai/quiz/generate', { topic, ...lessonPayload, level: lvl })
    },
    onSuccess: r => {
      const data = r.data.data ?? r.data
      const qs = Array.isArray(data.questions)
        ? data.questions
        : Array.isArray(data) ? data : []
      if (qs.length === 0) { setPhase('error'); return }
      setQuestions(qs)
      if (data.level) setLevel(data.level as QuizLevel)
      setCurrent(0)
      setAnswers([])
      setSelected(null)
      setPhase('question')
    },
    onError: () => setPhase('error'),
  })

  const submitMutation = useMutation({
    mutationFn: (ans: number[]) => {
      const lessonPayload = quizLessonIds && quizLessonIds.length === 1
        ? { lesson_id: quizLessonIds[0] }
        : quizLessonIds && quizLessonIds.length > 1
          ? { lesson_ids: quizLessonIds }
          : {}
      return api.post('/ai/quiz/submit', {
        topic,
        ...lessonPayload,
        level,
        questions,
        student_answers: ans.map(i => String.fromCharCode(65 + i)),
      })
    },
    onSuccess: r => {
      const data = r.data.data ?? r.data
      const score = typeof data.score === 'number' ? data.score : 0
      const passed = !!data.passed
      const breakdown: QuizResult[] = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.per_question_results) ? data.per_question_results : []
      const nextLevel = typeof data.next_level === 'number' ? data.next_level : null
      setResults({ score, passed, breakdown, nextLevel })
      setPhase('results')
      onAttemptSaved?.()
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

  // Kick off generation on mount (skip if questions were pre-loaded)
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions)
      setPhase('question')
    } else {
      genMutation.mutate(initialLevel)
    }
  }, [])

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
      setPhase('loading')
      submitMutation.mutate(newAnswers)
    }
  }

  const handleNextLevel = () => {
    const nextLvl = ((results?.nextLevel ?? level + 1) as QuizLevel)
    setLevel(nextLvl)
    setResults(null)
    setCountUp(0)
    setPhase('loading')
    genMutation.mutate(nextLvl)
  }

  const q = questions[current]
  const pct = questions.length > 0
    ? Math.round(((current + (selected !== null ? 1 : 0)) / questions.length) * 100)
    : 0

  const canAdvanceLevel = results?.passed && results.nextLevel !== null

  return (
    <div className={styles.quizPanel}>
      <div className={styles.quizHeader}>
        <div className={styles.quizMeta}>
          <span className={styles.quizTopic}>{topic}</span>
          <span className={styles.quizLevel}>{t('student.aiTutor.level')} {level}</span>
        </div>
        <button
          type="button"
          className={styles.quizClose}
          onClick={onClose}
          aria-label={t('student.aiTutor.closeQuiz')}
        >
          <CloseIcon />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div
            key="loading"
            className={styles.quizLoading}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={tx({ duration: 0.15 })}
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
            ref={firstQuestionRef}
            tabIndex={-1}
            className={styles.quizBody}
            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -20 }}
            transition={tx({ duration: 0.22, ease: [0.16, 1, 0.3, 1] })}
          >
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${t('student.aiTutor.progress')}: ${pct}%`}
            >
              <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            </div>

            <p className={styles.questionCount}>
              {t('student.aiTutor.question')} {current + 1} {t('student.aiTutor.of')} {questions.length}
            </p>
            <p className={styles.questionText}>{q.question}</p>

            <fieldset className={styles.options}>
              <legend className={styles.srOnly}>{t('student.aiTutor.chooseAnswer')}</legend>
              {q.options.map((opt, i) => (
                <label
                  key={i}
                  className={`${styles.optionItem} ${selected === i ? styles.optionSelected : ''} ${selected !== null && selected !== i ? styles.optionDimmed : ''}`}
                >
                  <input
                    type="radio"
                    name={`quiz-q${current}`}
                    value={i}
                    checked={selected === i}
                    onChange={() => handleSelect(i)}
                    disabled={selected !== null && selected !== i}
                    className={styles.srOnly}
                  />
                  <span className={styles.optionKey}>{String.fromCharCode(65 + i)}</span>
                  <span className={styles.optionText}>{opt.replace(/^[A-Da-d][.)]\s*/, '')}</span>
                </label>
              ))}
            </fieldset>

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={tx({ duration: 0.15 })}
          >
            <p className={styles.quizErrorText}>{t('student.aiTutor.quizLoadFailed')}</p>
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
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={tx({ duration: 0.3, ease: [0.16, 1, 0.3, 1] })}
          >
            <div
              className={styles.scoreCircle}
              style={{ borderColor: results.passed ? 'oklch(65% 0.2 145)' : 'var(--color-red)' }}
              aria-label={`${t('student.aiTutor.score')}: ${countUp}%`}
            >
              <span
                className={styles.scoreNum}
                style={{ color: results.passed ? 'oklch(65% 0.2 145)' : 'var(--color-red)' }}
              >
                {countUp}%
              </span>
              <span className={styles.scoreEmoji} aria-hidden="true">
                {results.passed ? '🎉' : '📚'}
              </span>
            </div>
            <p
              className={styles.resultLabel}
              style={{ color: results.passed ? 'oklch(65% 0.2 145)' : 'var(--color-red)' }}
            >
              {results.passed ? t('student.aiTutor.passed') : t('student.aiTutor.keepStudying')}
            </p>

            {results.breakdown.length > 0 && (
              <div className={styles.breakdown} role="list" aria-label={t('student.aiTutor.breakdown')}>
                {results.breakdown.map((r, i) => (
                  <div
                    key={i}
                    role="listitem"
                    className={`${styles.breakdownRow} ${r.is_correct ? styles.breakdownCorrect : styles.breakdownWrong}`}
                  >
                    <span className={styles.breakdownIcon} aria-hidden="true">
                      {r.is_correct ? '✓' : '✗'}
                    </span>
                    <div className={styles.breakdownContent}>
                      <p className={styles.breakdownQ}>{r.question}</p>
                      {!r.is_correct && r.explanation && (
                        <p className={styles.breakdownExp}>{r.explanation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.resultActions}>
              {canAdvanceLevel && (
                <button type="button" className={styles.nextLevelBtn} onClick={handleNextLevel}>
                  {t('student.aiTutor.tryLevel')} {results.nextLevel} <SparklesIcon size={13} />
                </button>
              )}
              <button
                type="button"
                className={styles.backToChatBtn}
                onClick={() => { onComplete(results.score); onClose() }}
              >
                {t('student.aiTutor.backToChat')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main AI Tutor page ───────────────────────────────────────────────────────

export default function StudentAiTutor() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const initLessonId = searchParams.get('lesson_id') ? Number(searchParams.get('lesson_id')) : undefined
  const initLesson   = searchParams.get('lesson') ?? undefined

  // Top-level mode: chat vs quiz
  const [mode, setMode] = useState<'chat' | 'quiz'>('chat')
  const [quizActive, setQuizActive] = useState(false)
  const [quizTopic, setQuizTopic] = useState('')
  const [quizLevel, setQuizLevel] = useState<QuizLevel>(1)
  const [quickQuizQuestions, setQuickQuizQuestions] = useState<QuizQuestion[] | undefined>(undefined)
  const [quizSourceLessonIds, setQuizSourceLessonIds] = useState<number[]>([])
  const [reviewAttemptId, setReviewAttemptId]         = useState<number | null>(null)
  const queryClient = useQueryClient()

  // Chat-mode state
  const [selectionPhase, setSelectionPhase] = useState<'course' | 'lesson' | 'chat'>(
    initLessonId ? 'chat' : 'course',
  )
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [currentTopic, setCurrentTopic] = useState(initLesson ?? '')
  const [currentLesson, setCurrentLesson] = useState(initLesson ?? '')
  const [lessonIds, setLessonIds] = useState<number[]>(initLessonId ? [initLessonId] : [])
  const [sessionId, setSessionId] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chats' | 'weak' | 'quizzes'>('chats')
  const [visibleChats, setVisibleChats] = useState(5)
  const [visibleWeak, setVisibleWeak] = useState(5)
  const [visibleQuizzes, setVisibleQuizzes] = useState(5)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    data: history = [],
    refetch: refetchHistory,
    isLoading: historyLoading,
  } = useQuery<ChatSession[]>({
    queryKey: ['student-chat-history'],
    queryFn: () =>
      api.get('/ai/chat-history').then(r =>
        normalizeArray<ChatSession>(r.data.data?.data ?? r.data.data ?? r.data),
      ),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: weakTopics = [],
    isLoading: weakTopicsLoading,
  } = useQuery<WeakTopic[]>({
    queryKey: ['student-weak-topics'],
    queryFn: () =>
      api.get('/ai/weak-topics').then(r =>
        normalizeArray<WeakTopic>(r.data.data ?? r.data),
      ),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: quizHistory = [],
    isLoading: quizHistoryLoading,
  } = useQuery<QuizAttemptSummary[]>({
    queryKey: ['student-quiz-history'],
    queryFn: () =>
      api.get('/ai/quiz/history').then(r =>
        normalizeArray<QuizAttemptSummary>(r.data.data?.data ?? r.data.data ?? r.data),
      ),
    staleTime: 5 * 60 * 1000,
  })

  const { data: enrolledCourses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['student-enrolled-courses'],
    queryFn: () =>
      api.get('/student/courses').then(r =>
        normalizeArray<Course>(r.data.data?.data ?? r.data.data ?? r.data),
      ),
    enabled: (selectionPhase === 'course' && mode === 'chat') || mode === 'quiz',
    staleTime: 5 * 60 * 1000,
  })

  const { data: courseLessons = [], isLoading: lessonsLoading } = useQuery<SelectableLesson[]>({
    queryKey: ['course-lessons', selectedCourse?.id],
    queryFn: () =>
      api.get(`/student/courses/${selectedCourse!.id}/lessons`).then(r =>
        normalizeArray<SelectableLesson>(r.data.data ?? r.data),
      ),
    enabled: selectionPhase === 'lesson' && !!selectedCourse,
    staleTime: 5 * 60 * 1000,
  })

  const explainMutation = useMutation({
    mutationFn: ({ message, lesson_ids, session_id, topic }: {
      message: string
      lesson_ids?: number[]
      session_id?: number
      topic?: string
    }) => {
      const lessonPayload = lesson_ids && lesson_ids.length === 1
        ? { lesson_id: lesson_ids[0] }
        : lesson_ids && lesson_ids.length > 1
          ? { lesson_ids }
          : {}
      return api.post('/ai/explain', { message, ...lessonPayload, session_id, topic })
    },
  })

  const quickQuizMutation = useMutation({
    mutationFn: ({ session_id, level }: { session_id: number; level: number }) =>
      api.post('/ai/quiz/quick', { session_id, level }),
    onSuccess: r => {
      const data = r.data.data ?? r.data
      const qs: QuizQuestion[] = Array.isArray(data.questions) ? data.questions : []
      if (qs.length === 0) return
      setQuickQuizQuestions(qs)
      setQuizTopic(data.topic ?? currentTopic)
      setMode('quiz')
      setQuizActive(true)
    },
  })

  const handleQuizStart = useCallback((config: QuizStartConfig, level: QuizLevel) => {
    setQuizLevel(level)
    if (config.source === 'topic') {
      setQuizTopic(config.topic)
      setQuizSourceLessonIds([])
      setQuizActive(true)
    } else if (config.source === 'session') {
      setQuizTopic(config.topic)
      setQuizSourceLessonIds([])
      quickQuizMutation.mutate({ session_id: config.sessionId, level })
    } else if (config.source === 'lesson') {
      setQuizTopic(config.topic)
      setQuizSourceLessonIds(config.lessonIds)
      setQuizActive(true)
    }
  }, [quickQuizMutation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    const diagrams = document.querySelectorAll('.mermaid:not([data-processed])')
    if (diagrams.length === 0) return
    mermaid.run({ nodes: diagrams as NodeListOf<HTMLElement> })
      .then(() => {
        diagrams.forEach(el => {
          const svg = el.querySelector('svg')
          if (!svg) return
          if (el.nextElementSibling?.classList.contains(styles.mermaidDl)) return
          const btn = document.createElement('button')
          btn.className = styles.mermaidDl
          btn.textContent = '⬇ تحميل الخريطة'
          btn.addEventListener('click', () => {
            const svgData = new XMLSerializer().serializeToString(svg)
            const blob = new Blob([svgData], { type: 'image/svg+xml' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'diagram.svg'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          })
          el.insertAdjacentElement('afterend', btn)
        })
      })
      .catch(() => {})
  }, [messages])

  const startNewSession = () => {
    setMessages([])
    setCurrentTopic('')
    setCurrentLesson('')
    setLessonIds([])
    setSessionId(undefined)
    setSelectedCourse(null)
    setSelectionPhase('course')
    setInput('')
    setSidebarOpen(false)
    setMode('chat')
    setActiveTab('chats')
    setVisibleChats(5)
  }

  const loadSession = (session: ChatSession) => {
    setActiveTab('chats')
    setCurrentTopic(session.topic ?? '')
    setSessionId(session.id)
    setLessonIds(session.lesson_id ? [session.lesson_id] : [])
    setCurrentLesson(session.lesson_name || '')
    const msgs: Message[] = Array.isArray(session.messages)
      ? session.messages.map(m => ({ ...m, id: String(m.id ?? uid()) }))
      : []
    setMessages(msgs)
    setSelectionPhase('chat')
    setSidebarOpen(false)
    setMode('chat')
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: uid(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    setIsLoading(true)

    const topic = currentTopic || text.slice(0, 60)
    if (!currentTopic) setCurrentTopic(topic)

    try {
      const res = await explainMutation.mutateAsync({
        message: text,
        lesson_ids: lessonIds.length > 0 ? lessonIds : undefined,
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
        content: reply || t('student.aiTutor.noResponse'),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      const errMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: t('student.aiTutor.errorMessage'),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, lessonIds, currentTopic, sessionId, refetchHistory, explainMutation, t])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // JS fallback for browsers without field-sizing: content support
    const ta = e.currentTarget
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }

  const startTopicChat = (topic: string) => {
    setMessages([])
    setCurrentTopic(topic)
    setCurrentLesson('')
    setLessonIds([])
    setSessionId(undefined)
    setInput('')
    setSelectionPhase('chat')
    setSidebarOpen(false)
    setMode('chat')
  }

  const weakScoreColor = (score: number) =>
    score < 40 ? 'var(--color-red)' : score < 60 ? 'var(--color-amber)' : 'oklch(65% 0.2 145)'

  const isFirstTime =
    !historyLoading && !weakTopicsLoading &&
    history.length === 0 && weakTopics.length === 0

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
        aria-label={t('student.aiTutor.chatHistoryAndTopics')}
      >
        <button type="button" className={styles.newTopicBtn} onClick={startNewSession}>
          <PlusIcon /> {t('student.aiTutor.startNewTopic')}
        </button>

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <div className={styles.sidebarTabs} role="tablist">
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'chats'}
            className={`${styles.sidebarTab} ${activeTab === 'chats' ? styles.sidebarTabActive : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            {t('student.aiTutor.chatsTab')}
            {history.length > 0 && <span className={styles.tabCount}>{history.length}</span>}
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'weak'}
            className={`${styles.sidebarTab} ${activeTab === 'weak' ? styles.sidebarTabActive : ''}`}
            onClick={() => setActiveTab('weak')}
          >
            {t('student.aiTutor.weakTopicsTab')}
            {weakTopics.length > 0 && <span className={styles.tabCount}>{weakTopics.length}</span>}
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'quizzes'}
            className={`${styles.sidebarTab} ${activeTab === 'quizzes' ? styles.sidebarTabActive : ''}`}
            onClick={() => setActiveTab('quizzes')}
          >
            {t('student.aiTutor.quizzesTab')}
            {quizHistory.length > 0 && <span className={styles.tabCount}>{quizHistory.length}</span>}
          </button>
        </div>

        {/* ── Chats tab ────────────────────────────────────────────────────── */}
        {activeTab === 'chats' && (
          <section className={styles.historySection} role="tabpanel">
            {historyLoading ? (
              <SidebarHistorySkeleton />
            ) : history.length === 0 ? (
              <p className={styles.sidebarEmpty}>{t('student.aiTutor.noSessions')}</p>
            ) : (
              <>
                <div className={styles.historyList}>
                  {history.slice(0, visibleChats).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className={`${styles.historyItem} ${s.id === sessionId ? styles.historyItemActive : ''}`}
                      onClick={() => loadSession(s)}
                    >
                      <span className={styles.historyTopic}>
                        {(() => {
                          const raw = s.messages?.find(m => m.role === 'user')?.content ?? s.topic ?? ''
                          return raw.length > 28 ? raw.slice(0, 28) + '…' : raw || '…'
                        })()}
                      </span>
                      {(s.course_name || s.lesson_name) && (
                        <div className={styles.historyBadges}>
                          {s.course_name && (
                            <span className={`${styles.historyBadge} ${styles.historyBadgeCourse}`}>
                              {s.course_name}
                            </span>
                          )}
                          {s.lesson_name && (
                            <span className={`${styles.historyBadge} ${styles.historyBadgeLesson}`}>
                              {s.lesson_name}
                            </span>
                          )}
                        </div>
                      )}
                      <span className={styles.historyDate}>{formatDate(s.created_at)}</span>
                    </button>
                  ))}
                </div>
                {history.length > visibleChats && (
                  <button
                    type="button"
                    className={styles.loadMoreBtn}
                    onClick={() => setVisibleChats(v => v + 5)}
                  >
                    {t('student.aiTutor.loadMore')}
                  </button>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Weak Topics tab ──────────────────────────────────────────────── */}
        {activeTab === 'weak' && (
          <section className={styles.weakSection} role="tabpanel">
            {weakTopicsLoading ? (
              <SidebarTopicsSkeleton />
            ) : weakTopics.length === 0 ? (
              <p className={styles.sidebarEmpty}>{t('student.aiTutor.noWeakTopics')}</p>
            ) : (
              <>
                <div className={styles.weakList}>
                  {weakTopics.slice(0, visibleWeak).map(wt => (
                    <button
                      key={wt.topic}
                      type="button"
                      className={styles.weakPill}
                      onClick={() => startTopicChat(wt.topic)}
                      aria-label={`${wt.topic}: ${wt.score}%`}
                    >
                      <div className={styles.weakPillRow}>
                        <span className={styles.weakName}>{wt.topic}</span>
                        <span
                          className={styles.weakScore}
                          style={{ color: weakScoreColor(wt.score) }}
                        >
                          {wt.score}%
                        </span>
                      </div>
                      <div className={styles.weakBar} aria-hidden="true">
                        <div
                          className={styles.weakBarFill}
                          style={{
                            width: `${wt.score}%`,
                            background: weakScoreColor(wt.score),
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
                {weakTopics.length > visibleWeak && (
                  <button
                    type="button"
                    className={styles.loadMoreBtn}
                    onClick={() => setVisibleWeak(v => v + 5)}
                  >
                    {t('student.aiTutor.loadMore')}
                  </button>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Quizzes tab ──────────────────────────────────────────────────── */}
        {activeTab === 'quizzes' && (
          <section className={styles.quizHistorySection} role="tabpanel">
            {quizHistoryLoading ? (
              <SidebarHistorySkeleton />
            ) : quizHistory.length === 0 ? (
              <p className={styles.sidebarEmpty}>{t('student.aiTutor.noQuizHistory')}</p>
            ) : (
              <>
                <div className={styles.quizHistoryList}>
                  {quizHistory.slice(0, visibleQuizzes).map(a => (
                    <button
                      key={a.id}
                      type="button"
                      className={styles.quizHistoryItem}
                      onClick={() => setReviewAttemptId(a.id)}
                    >
                      <span className={styles.quizHistoryTopic}>
                        {a.topic.length > 30 ? a.topic.slice(0, 30) + '…' : a.topic}
                      </span>
                      <div className={styles.quizHistoryMeta}>
                        <span className={`${styles.quizScoreBadge} ${a.passed ? styles.quizScorePass : styles.quizScoreFail}`}>
                          {a.score}%
                        </span>
                        <span className={styles.quizHistoryDate}>{formatDate(a.created_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {quizHistory.length > visibleQuizzes && (
                  <button
                    type="button"
                    className={styles.loadMoreBtn}
                    onClick={() => setVisibleQuizzes(v => v + 5)}
                  >
                    {t('student.aiTutor.loadMore')}
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main panel ──────────────────────────────────────────────────────── */}
      <div className={styles.main}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(s => !s)}
            aria-label={t('student.aiTutor.toggleSidebar')}
            aria-expanded={sidebarOpen}
          >
            <SparklesIcon size={15} />
          </button>
          <div className={styles.topBarCenter}>
            {mode === 'chat' && currentTopic ? (
              <span className={styles.topicChip}>{currentTopic}</span>
            ) : (
              <span className={styles.topBarTitle}>
                {mode === 'chat' ? t('student.aiTutor.title') : t('student.aiTutor.quizModeTitle')}
              </span>
            )}
            {mode === 'chat' && lessonIds.length > 0 && currentLesson && (
              <span className={styles.lessonChip}>{currentLesson}</span>
            )}
          </div>
          <ModeSwitch
            mode={mode}
            onChange={m => {
              setMode(m)
              if (m === 'chat') setQuizActive(false)
              // Pre-populate quiz topic from the active chat context
              if (m === 'quiz' && currentTopic && !quizTopic) setQuizTopic(currentTopic)
            }}
          />
        </div>

        {/* ── Chat mode ─────────────────────────────────────────────────── */}
        {mode === 'chat' && (
          <>
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
                onSelect={(ids, label) => {
                  setLessonIds(ids)
                  setCurrentTopic(label)
                  setCurrentLesson(label)
                  setSelectionPhase('chat')
                }}
              />
            )}

            {selectionPhase === 'chat' && (
              <>
                <div
                  className={styles.messages}
                  role="log"
                  aria-live="polite"
                  aria-label={t('student.aiTutor.chatMessages')}
                >
                  {messages.length === 0 ? (
                    <div className={`${styles.welcomeState} ${isFirstTime ? styles.welcomeFirstTime : ''}`}>
                      <div className={styles.welcomeIcon}><SparklesIcon size={28} /></div>
                      <h2 className={styles.welcomeTitle}>
                        {isFirstTime
                          ? t('student.aiTutor.welcomeFirstTime')
                          : t('student.aiTutor.askMeAnything')}
                      </h2>
                      <p className={styles.welcomeText}>
                        {isFirstTime
                          ? t('student.aiTutor.welcomeFirstTimeText')
                          : t('student.aiTutor.welcomeText')}
                      </p>
                      {weakTopics.length > 0 && (
                        <div className={styles.welcomeTopics}>
                          <p className={styles.welcomeTopicsLabel}>{t('student.aiTutor.yourWeakTopics')}</p>
                          <div className={styles.welcomeTopicPills}>
                            {weakTopics.slice(0, 4).map(wt => (
                              <button
                                key={wt.topic}
                                type="button"
                                className={styles.welcomeTopicBtn}
                                onClick={() => startTopicChat(wt.topic)}
                              >
                                {wt.topic}
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
                              <div className={styles.userBubble} dir="auto">{m.content}</div>
                            ) : (
                              <div
                                className={styles.aiBubble}
                                dir="auto"
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
                          <div className={styles.aiAvatar} aria-hidden="true">
                            <SparklesIcon size={12} />
                          </div>
                          <TypingIndicator />
                        </motion.div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className={styles.inputArea}>
                  {lessonIds.length > 0 && currentLesson && (
                    <div className={styles.contextRow}>
                      <span className={styles.lessonChip}>{currentLesson}</span>
                      <button
                        type="button"
                        className={styles.changeLessonBtn}
                        onClick={() => {
                          setLessonIds([])
                          setCurrentLesson('')
                          setSelectionPhase('course')
                        }}
                      >
                        {t('student.aiTutor.changeLesson')}
                      </button>
                      {messages.length > 0 && sessionId && (
                        <button
                          type="button"
                          className={styles.quickQuizBtn}
                          disabled={quickQuizMutation.isPending}
                          onClick={() => quickQuizMutation.mutate({ session_id: sessionId, level: 1 })}
                        >
                          {quickQuizMutation.isPending ? '...' : `⚡ ${t('student.aiTutor.quickQuiz')}`}
                        </button>
                      )}
                    </div>
                  )}
                  <div className={styles.inputRow}>
                    <textarea
                      ref={inputRef}
                      className={styles.textInput}
                      placeholder={
                        currentTopic
                          ? `${t('student.aiTutor.askAbout')} ${currentTopic}...`
                          : t('student.aiTutor.inputPlaceholder')
                      }
                      value={input}
                      onChange={handleInputChange}
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
                  <div className={styles.inputHint} aria-hidden="true">
                    {t('student.aiTutor.inputHint')}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Quiz mode ─────────────────────────────────────────────────── */}
        {mode === 'quiz' && (
          <div className={styles.quizContainer}>
            {!quizActive ? (
              <QuizSetupPanel
                weakTopics={weakTopics}
                chatHistory={history}
                courses={enrolledCourses}
                coursesLoading={coursesLoading}
                isGenerating={quickQuizMutation.isPending}
                onStart={handleQuizStart}
              />
            ) : (
              <div className={styles.quizPanelWrapper}>
                <QuizMode
                  topic={quizTopic}
                  lessonIds={
                    quizSourceLessonIds.length > 0
                      ? quizSourceLessonIds
                      : lessonIds.length > 0 ? lessonIds : undefined
                  }
                  initialLevel={quizLevel}
                  initialQuestions={quickQuizQuestions}
                  onClose={() => { setQuizActive(false); setQuickQuizQuestions(undefined); setQuizSourceLessonIds([]) }}
                  onComplete={() => { setQuizActive(false); setQuickQuizQuestions(undefined); setQuizSourceLessonIds([]) }}
                  onAttemptSaved={() => queryClient.invalidateQueries({ queryKey: ['student-quiz-history'] })}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quiz review overlay */}
      <AnimatePresence>
        {reviewAttemptId !== null && (
          <QuizReviewPanel
            key={reviewAttemptId}
            attemptId={reviewAttemptId}
            onClose={() => setReviewAttemptId(null)}
            onRetake={(topic, level) => {
              setReviewAttemptId(null)
              setQuizTopic(topic)
              setQuizLevel(level)
              setMode('quiz')
              setQuizActive(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
