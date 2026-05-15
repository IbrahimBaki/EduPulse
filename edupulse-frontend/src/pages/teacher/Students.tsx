import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../lib/axios'
import { SlideOver } from '../../components/SlideOver'
import styles from './Students.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: number
  name: string
  status: 'draft' | 'active' | 'archived'
}

interface Student {
  id: number
  name: string
  code: string
  grade_level?: string
  attendance_rate: number
  avg_quiz_score: number | null
  weak_topics_count: number
  last_activity_at?: string
}

interface StudentDetail {
  id: number
  name: string
  code: string
  grade_level?: string
  attendance_rate: number
  avg_quiz_score: number | null
  weak_topics_count: number
  last_activity_at?: string
  weak_topics?: { topic: string; score: number }[]
  recent_quiz_attempts?: { topic: string; score: number; level: string; attempted_at: string }[]
  attendance_breakdown?: { present: number; absent: number; late: number; excused: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = (data as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  return []
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function scoreClass(score: number | null): string {
  if (score === null) return styles.scoreMuted
  if (score >= 70) return styles.scoreGreen
  if (score >= 50) return styles.scoreAmber
  return styles.scoreRed
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function UsersIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
    </svg>
  )
}

// ─── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      <td>
        <div className={styles.studentCell}>
          <span className={styles.skeleton} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
          <div>
            <span className={styles.skeleton} style={{ display: 'block', height: 14, width: 120, marginBlockEnd: 4 }} />
            <span className={styles.skeleton} style={{ display: 'block', height: 11, width: 72 }} />
          </div>
        </div>
      </td>
      <td><span className={styles.skeleton} style={{ display: 'block', height: 14, width: 100 }} /></td>
      <td><span className={styles.skeleton} style={{ display: 'block', height: 14, width: 40 }} /></td>
      <td><span className={styles.skeleton} style={{ display: 'block', height: 18, width: 28 }} /></td>
      <td><span className={styles.skeleton} style={{ display: 'block', height: 14, width: 72 }} /></td>
    </tr>
  )
}

// ─── Student detail slide-over ────────────────────────────────────────────────

function StudentDetailPanel({ student, courseId, onClose }: { student: Student; courseId: string; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery<StudentDetail>({
    queryKey: ['student-detail', student.id, courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}/students/${student.id}`).then(r => r.data.data ?? r.data),
    staleTime: 2 * 60 * 1000,
  })

  const examMutation = useMutation({
    mutationFn: (weakTopics: string[]) =>
      api.post('/teacher/ai/exam/generate', { student_id: student.id, course_id: Number(courseId), weak_topics: weakTopics }),
    onSuccess: () => {
      alert('AI exam generated successfully!')
    },
  })

  const handleGenerateExam = useCallback(() => {
    const topics = detail?.weak_topics?.map(t => t.topic) ?? []
    examMutation.mutate(topics)
  }, [detail, examMutation])

  const breakdown = detail?.attendance_breakdown ?? { present: 0, absent: 0, late: 0, excused: 0 }

  return (
    <SlideOver
      open
      onClose={onClose}
      title={student.name}
      description={student.code}
      width="520px"
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 6 }, (_, i) => <span key={i} className={styles.skeleton} style={{ height: 24 }} />)}
        </div>
      ) : (
        <>
          {/* Personal info */}
          <div className={styles.detailSection}>
            <div className={styles.detailLabel}>Personal Info</div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <div className={styles.infoKey}>Name</div>
                <div className={styles.infoValue}>{student.name}</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.infoKey}>Student Code</div>
                <div className={styles.infoValue}>{student.code}</div>
              </div>
              {student.grade_level && (
                <div className={styles.infoItem}>
                  <div className={styles.infoKey}>Grade</div>
                  <div className={styles.infoValue}>{student.grade_level}</div>
                </div>
              )}
              <div className={styles.infoItem}>
                <div className={styles.infoKey}>Last Active</div>
                <div className={styles.infoValue}>{formatDate(student.last_activity_at)}</div>
              </div>
            </div>
          </div>

          {/* Weak topics */}
          <div className={styles.detailSection}>
            <div className={styles.detailLabel}>Weak Topics</div>
            {(detail?.weak_topics ?? []).length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No weak topics identified.</p>
            ) : (
              <div className={styles.pillRow}>
                {(detail?.weak_topics ?? []).map((t, i) => (
                  <span key={i} className={styles.topicPill}>
                    {t.topic}
                    <span className={styles.topicScore}>{t.score}%</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recent quiz attempts */}
          <div className={styles.detailSection}>
            <div className={styles.detailLabel}>Recent Quiz Attempts</div>
            {(detail?.recent_quiz_attempts ?? []).length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No quiz attempts yet.</p>
            ) : (
              <table className={styles.quizTable} aria-label="Recent quiz attempts">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Score</th>
                    <th>Level</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail?.recent_quiz_attempts ?? []).map((q, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{q.topic}</td>
                      <td className={scoreClass(q.score)}>{q.score}%</td>
                      <td style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{q.level}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>{formatDateShort(q.attempted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Attendance breakdown */}
          <div className={styles.detailSection}>
            <div className={styles.detailLabel}>Attendance</div>
            <div className={styles.attendanceBreakdown} role="list" aria-label="Attendance breakdown">
              {([
                { key: 'present', label: 'Present', cls: styles.attPresent },
                { key: 'absent',  label: 'Absent',  cls: styles.attAbsent },
                { key: 'late',    label: 'Late',     cls: styles.attLate },
                { key: 'excused', label: 'Excused',  cls: styles.attExcused },
              ] as const).map(({ key, label, cls }) => (
                <div key={key} className={styles.attStat} role="listitem">
                  <div className={`${styles.attNum} ${cls}`}>{breakdown[key]}</div>
                  <div className={styles.attLabel}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate AI Exam */}
          <div className={styles.detailSection}>
            <button
              type="button"
              className={styles.aiExamBtn}
              onClick={handleGenerateExam}
              disabled={examMutation.isPending}
              aria-label={`Generate AI exam for ${student.name}`}
            >
              <SparkleIcon />
              {examMutation.isPending ? 'Generating...' : 'Generate AI Exam'}
            </button>
            {(detail?.weak_topics ?? []).length > 0 && (
              <p style={{ marginBlockStart: 6, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Pre-filled with {detail!.weak_topics!.length} weak topic{detail!.weak_topics!.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </>
      )}
    </SlideOver>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeacherStudents() {
  const [courseId, setCourseId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['teacher-courses-active'],
    queryFn: () => api.get('/teacher/courses').then(r => {
      const all = normalizeArray<Course>(r.data.data ?? r.data)
      return all.filter(c => c.status === 'active')
    }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: students = [], isLoading, isError, refetch } = useQuery<Student[]>({
    queryKey: ['teacher-students', courseId],
    queryFn: () => api.get(`/teacher/courses/${courseId}/students`).then(r => normalizeArray<Student>(r.data.data ?? r.data)),
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  })

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Students</h1>
          <p className={styles.pageSubtitle}>
            {!courseId
              ? 'Select a course to view students'
              : isLoading
                ? 'Loading...'
                : `${students.length} student${students.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <select
          className={styles.courseSelect}
          value={courseId}
          onChange={e => setCourseId(e.target.value)}
          aria-label="Select course"
        >
          <option value="">Select a course...</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!courseId ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'oklch(44% 0.018 255)' }}><UsersIcon /></div>
          <p className={styles.emptyTitle}>Select a course</p>
          <p className={styles.emptyText}>Choose a course above to view its enrolled students.</p>
        </div>
      ) : isError ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'var(--color-amber)' }}><AlertIcon /></div>
          <p className={styles.emptyTitle}>Failed to load students</p>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => refetch()}>Retry</button>
        </div>
      ) : !isLoading && students.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ color: 'oklch(44% 0.018 255)' }}><UsersIcon /></div>
          <p className={styles.emptyTitle}>No students enrolled</p>
          <p className={styles.emptyText}>No students are enrolled in this course yet.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Students">
            <thead>
              <tr>
                <th>Student</th>
                <th>Attendance</th>
                <th>Avg Score</th>
                <th>Weak Topics</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 7 }, (_, i) => <SkeletonRow key={i} />)
                : students.map(s => {
                  const atRisk = s.avg_quiz_score !== null && s.avg_quiz_score < 60
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedStudent(s) }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ${s.name} details`}
                    >
                      <td>
                        <div className={styles.studentCell}>
                          <div className={styles.studentAvatar} aria-hidden="true">{initials(s.name)}</div>
                          <div>
                            <div className={styles.studentName}>{s.name}</div>
                            <div className={styles.studentCode}>{s.code}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.inlineProgress}>
                          <div className={styles.miniProgress} role="progressbar" aria-valuenow={s.attendance_rate} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.attendance_rate}% attendance`}>
                            <div className={styles.miniProgressBar} style={{ width: `${s.attendance_rate}%` }} />
                          </div>
                          <span className={styles.progressPct}>{s.attendance_rate}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={scoreClass(s.avg_quiz_score)}>
                          {s.avg_quiz_score !== null ? `${s.avg_quiz_score}%` : '—'}
                        </span>
                        {atRisk && (
                          <span className={styles.atRiskBadge} style={{ marginInlineStart: 8 }} aria-label="At risk">
                            <AlertIcon /> At Risk
                          </span>
                        )}
                      </td>
                      <td>
                        {s.weak_topics_count > 0 ? (
                          <span className={styles.weakCount}>
                            <AlertIcon /> {s.weak_topics_count}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.lastActivity}>{formatDate(s.last_activity_at)}</span>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      )}

      {selectedStudent && courseId && (
        <StudentDetailPanel
          student={selectedStudent}
          courseId={courseId}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  )
}
