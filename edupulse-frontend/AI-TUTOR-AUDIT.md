# AI Tutor Page — Audit Report

**File audited:** `src/pages/student/AiTutor.tsx` + `AiTutor.module.css`  
**Date:** 2026-06-01  
**Design system:** Precision Cockpit (index.css tokens confirmed)

---

## 1. Audit Results

### UX Gaps

| # | Checklist Item | Status | Finding |
|---|----------------|--------|---------|
| U1 | Segmented control mode switcher (Chat / Quiz) | ✅ | Fixed — `ModeSwitch` segmented control (`role="tablist/tab"`) with `💬 Chat` / `📝 Quiz` labels. Quiz runs inline via `QuizSetupPanel` → `QuizMode`; no overlay. Topic pre-populated from chat context on mode switch. |
| U2 | Chat textarea auto-grow | ✅ | Fixed — `handleInputChange` adjusts `scrollHeight` on every keystroke; height resets to `auto` after send. `field-sizing: content` remains as CSS-native progressive enhancement. |
| U3 | Typing indicator while waiting | ✅ | `TypingIndicator` component uses animated `.dot` bounce, shown while `isLoading` is true. Accessible with `aria-label`. |
| U4 | Quiz: one question at a time + progress indicator | ✅ | `current` index drives single-question display. Progress bar + "Q N of M" counter present. |
| U5 | Quiz results with per-question breakdown | ✅ | `phase === 'results'` shows score circle + per-question `breakdown` list with correct/wrong + explanations. |
| U6 | `next_level` CTA after passing | ✅ | Fixed — `submitMutation.onSuccess` captures `data.next_level` and stores it as `results.nextLevel`. CTA condition is `results.nextLevel !== null` (server-authoritative). Button shows `results.nextLevel` directly. Confirmed: backend returns `null` when failed or `level >= 3`. |
| U7 | Weak topics with visual score bars | ✅ | Fixed — each pill now renders `weakPillRow` (name + score) + `weakBar`/`weakBarFill` driven by `weakScoreColor()`. Colors: red <40%, amber 40–59%, green ≥60%. |
| U8 | Resume past session from chat history | ⚠️ | Unchanged — `loadSession()` correctly sets `sessionId` so follow-ups work. Whether messages show depends on API (see OQ1). |
| U9 | Empty state for first-time users | ✅ | Fixed — `isFirstTime` flag (`!historyLoading && !weakTopicsLoading && history.length === 0 && weakTopics.length === 0`) renders distinct heading and body copy for new users. |
| U10 | Lesson context selector: searchable dropdown | ⚠️ | Partial — "Change lesson" button in the input context row re-enters the course selection flow. Full combobox deferred (see OQ2). |

### Code Quality

| # | Checklist Item | Status | Finding |
|---|----------------|--------|---------|
| C1 | TanStack Query (useQuery / useMutation) | ✅ | All data fetches use `useQuery`, all mutations use `useMutation`. No raw `useEffect` + axios patterns. |
| C2 | `session_id` state managed correctly | ✅ | `sessionId` is set on first AI response (`data.session_id`) and passed on all subsequent calls. `refetchHistory()` is triggered after a new session is created. |
| C3 | Quiz state: local state vs reducer | ⚠️ | `QuizMode` uses 8 separate `useState` calls. The state machine (loading → question → results → error) would be safer as a `useReducer` to prevent impossible combinations (e.g. `phase === 'results'` while `results` is null). Not a blocker but a reliability risk. |
| C4 | Skeleton loaders for initial fetches | ✅ | Fixed — `SkeletonLine`, `SidebarHistorySkeleton`, `SidebarTopicsSkeleton` components added. Course/lesson steps use skeleton card grids. Both sidebar queries destructure `isLoading` and show skeletons while fetching. |
| C5 | Component split | ⚠️ | The file is 891 lines. `CourseStep`, `LessonStep`, `QuizMode` are extracted, but the sidebar and input area are inline in `StudentAiTutor`. A four-file split (`AiTutor`, `ChatPanel`, `QuizPanel`, `AiTutorSidebar`) would improve maintainability. |
| C6 | CSS Modules | ✅ | All styles use `styles.xxx` from `AiTutor.module.css`. No inline styles beyond dynamic color bindings (acceptable). |
| C7 | RTL handling | ✅ | Fixed — `[dir="rtl"]` rules correct bubble corners, mobile sidebar slide direction, and arrow hover transforms. All three cases covered in CSS. |

### Accessibility

| # | Checklist Item | Status | Finding |
|---|----------------|--------|---------|
| A1 | Chat message list: `role="log"` + `aria-live="polite"` | ✅ | Line 770: `role="log" aria-live="polite"` correctly applied. |
| A2 | Send button `aria-label` | ✅ | Line 861: `aria-label={t('student.aiTutor.sendMessage')}` present. |
| A3 | Quiz answer options: keyboard-navigable radio inputs | ✅ | Fixed — `<fieldset class="options">` + `<legend class="srOnly">` + `<label><input type="radio" class="srOnly" /><span class="optionKey">…</span></label>`. Screen readers now announce "radio button 1 of 4". `optionLabel` renamed to `optionKey` to avoid collision. |
| A4 | Focus moves to first question after generation | ✅ | Fixed — `firstQuestionRef` on the question `motion.div` with `tabIndex={-1}`. `useEffect([phase, current])` calls `focus()` after a 280ms delay (enough for framer-motion entrance). |
| A5 | Focus rings on interactive elements | ✅ | Fixed — `:focus-visible` 2px solid `var(--color-blue)` rings added to every interactive element (17 selectors across the CSS module). |
| A6 | `prefers-reduced-motion` | ✅ | Fixed — CSS `@media (prefers-reduced-motion: reduce)` disables `dotBounce`, shimmer, `progressFill` transition, and `weakBarFill` transition. framer-motion: `useReducedMotion()` imported and used inside `QuizMode`; all four `transition` props replaced with `tx()` helper that returns `{ duration: 0 }` when motion is reduced; `initial` offsets (`x`, `scale`) also zeroed. |

---

## 2. Summary of Fails / Partial Fixes

**0 failing items** — all ❌ items resolved.

**2 remaining partial items:** U8 (session message resume — depends on API shape, see OQ1), U10 (lesson picker — full combobox deferred, see OQ2).

---

## 3. Proposed Sub-Component File Structure

```
src/pages/student/
├── AiTutor.tsx                  ← shell, mode state, sidebar, top bar
├── AiTutor.module.css
├── ai-tutor/
│   ├── ChatPanel.tsx            ← course/lesson selection + messages + input
│   ├── ChatPanel.module.css
│   ├── QuizPanel.tsx            ← setup + question flow + results
│   ├── QuizPanel.module.css
│   ├── AiTutorSidebar.tsx       ← history list + weak topics + score bars
│   └── AiTutorSidebar.module.css
```

The current single-file approach is acceptable short-term. This split is recommended when the file exceeds ~1000 lines or when QuizPanel needs independent feature work.

---

## 4. Fixes Applied

All fixes below are implemented in the rewritten `AiTutor.tsx` and `AiTutor.module.css`.

### Fix U1 — Mode switcher (segmented control)

Replaces the disabled `quizBtn` with a `ModeSwitch` component (tablist/tab roles). Quiz mode renders `QuizSetupPanel` inline — no overlay. Pre-populates quiz topic from `currentTopic` when switching from chat.

```diff
- <button type="button" className={styles.quizBtn} disabled={...}>
-   {t('student.aiTutor.takeQuiz')}
- </button>
+ <ModeSwitch mode={mode} onChange={m => {
+   setMode(m)
+   if (m === 'chat') setQuizActive(false)
+   if (m === 'quiz' && currentTopic && !quizTopic) setQuizTopic(currentTopic)
+ }} />
```

New `QuizSetupPanel` component (form + topic input with `<datalist>` + level radio group + weak-topic shortcuts):

```tsx
function QuizSetupPanel({ weakTopics, onStart }) {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<QuizLevel>(1)
  // ...renders a centered form with topic <input list="..."> + level radios
}
```

### Fix U2 — Textarea auto-grow JS fallback

```diff
- onChange={e => setInput(e.target.value)}
+ onChange={handleInputChange}

+ const handleInputChange = (e) => {
+   setInput(e.target.value)
+   const ta = e.currentTarget
+   ta.style.height = 'auto'
+   ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
+ }
```

Height also reset to `'auto'` after send.

### Fix U6 — next_level from API

Backend confirmed: `GeminiService::correctAnswers()` returns `results[]` with keys `question`, `your_answer`, `correct`, `is_correct`, `explanation`, `score`. Controller returns `next_level: ($passed && level < 3) ? level + 1 : null`.

```diff
- const breakdown: QuizResult[] = Array.isArray(data.results) ? data.results : []
- setResults({ score, passed, breakdown })
+ const breakdown: QuizResult[] = Array.isArray(data.results) ? data.results
+   : Array.isArray(data.per_question_results) ? data.per_question_results : []
+ const nextLevel = typeof data.next_level === 'number' ? data.next_level : null
+ setResults({ score, passed, breakdown, nextLevel })

- const canAdvanceLevel = results?.passed && level < 3
+ const canAdvanceLevel = results?.passed && results.nextLevel !== null

- {canAdvanceLevel && <button>Level {level + 1}</button>}
+ {canAdvanceLevel && <button>Level {results.nextLevel}</button>}
```

### Fix U7 — Weak topic score bars

```diff
- <button className={styles.weakPill} ...>
-   <span className={styles.weakName}>{wt.topic}</span>
-   <span className={styles.weakScore}>{wt.score}%</span>
- </button>
+ <button className={styles.weakPill} aria-label={`${wt.topic}: ${wt.score}%`} ...>
+   <div className={styles.weakPillRow}>
+     <span className={styles.weakName}>{wt.topic}</span>
+     <span className={styles.weakScore} style={{ color: weakScoreColor(wt.score) }}>{wt.score}%</span>
+   </div>
+   <div className={styles.weakBar} aria-hidden="true">
+     <div className={styles.weakBarFill}
+       style={{ width: `${wt.score}%`, background: weakScoreColor(wt.score) }} />
+   </div>
+ </button>
```

New CSS:
```css
.weakPillRow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.weakBar { height: 3px; background: var(--surface-elevated); border-radius: 999px; overflow: hidden; margin-block-start: 5px; }
.weakBarFill { height: 100%; border-radius: 999px; transition: width 0.4s var(--ease-out-expo); }
```

### Fix U10 — Lesson context change button (partial)

Adds a context row above the input with the current lesson chip and a "Change lesson" button. Full combobox requires a new dep (see Open Questions).

```tsx
{lessonId && currentLesson && (
  <div className={styles.contextRow}>
    <span className={styles.lessonChip}>{currentLesson}</span>
    <button type="button" className={styles.changeLessonBtn}
      onClick={() => { setLessonId(undefined); setCurrentLesson(''); setSelectionPhase('course') }}>
      {t('student.aiTutor.changeLesson')}
    </button>
  </div>
)}
```

### Fix C4 — Skeleton loaders

Three new skeleton components:

```tsx
function SkeletonLine({ width = '100%', height = 14 }) { ... }
function SidebarHistorySkeleton() { /* 4 skeleton items */ }
function SidebarTopicsSkeleton() { /* 3 skeleton items */ }
```

Course/lesson loading states replaced with skeleton card grids (`.courseSkeletonGrid`, `.lessonSkeletonItem`).

Sidebar queries now destructure `isLoading`:
```diff
- const { data: history = [] } = useQuery(...)
+ const { data: history = [], isLoading: historyLoading } = useQuery(...)
- const { data: weakTopics = [] } = useQuery(...)
+ const { data: weakTopics = [], isLoading: weakTopicsLoading } = useQuery(...)
```

### Fix A3 — Quiz radio semantics

```diff
- <div className={styles.options}>
-   {q.options.map((opt, i) => (
-     <button aria-pressed={selected === i} onClick={...}>
-       <span className={styles.optionLabel}>{letter}</span>
-       <span className={styles.optionText}>{opt}</span>
-     </button>
-   ))}
- </div>
+ <fieldset className={styles.options}>
+   <legend className={styles.srOnly}>{t('student.aiTutor.chooseAnswer')}</legend>
+   {q.options.map((opt, i) => (
+     <label className={`${styles.optionItem} ${selected === i ? styles.optionSelected : ''} ...`}>
+       <input type="radio" name={`quiz-q${current}`} value={i}
+              checked={selected === i} onChange={() => handleSelect(i)}
+              disabled={selected !== null && selected !== i}
+              className={styles.srOnly} />
+       <span className={styles.optionKey}>{letter}</span>
+       <span className={styles.optionText}>{opt}</span>
+     </label>
+   ))}
+ </fieldset>
```

CSS class `optionLabel` renamed to `optionKey` to avoid name collision with `<label>` element.

### Fix A4 — Focus management after quiz generation

```tsx
const firstQuestionRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (phase === 'question') {
    const id = setTimeout(() => firstQuestionRef.current?.focus(), 280)
    return () => clearTimeout(id)
  }
}, [phase, current])

// On the motion.div:
<motion.div ref={firstQuestionRef} tabIndex={-1} className={styles.quizBody} ...>
```

The 280ms delay lets framer-motion finish its entrance animation before moving focus.

### Fix A6 — prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  .dot { animation: none; opacity: 0.7; }
  .skeleton { animation: none; }
  .progressFill { transition: none; }
  .weakBarFill { transition: none; }
}
```

`useReducedMotion()` imported from framer-motion and used inside `QuizMode`:

```tsx
const prefersReducedMotion = useReducedMotion()
const tx = (t: Record<string, unknown>) => prefersReducedMotion ? { duration: 0 } : t
// Applied to all 4 motion transition props; initial x/scale offsets zeroed when reduced
```

### Fix C7 — RTL corrections

```css
/* Bubble corners */
[dir="rtl"] .userBubble  { border-radius: 18px 18px 18px 4px; }
[dir="rtl"] .aiBubble    { border-radius: 18px 4px 18px 18px; }

/* Mobile sidebar slide direction */
@media (max-width: 768px) {
  [dir="rtl"] .sidebar    { transform: translateX(100%); }
  [dir="rtl"] .sidebarOpen { transform: translateX(0); }
}

/* Arrow hover direction */
[dir="rtl"] .courseCard:hover .courseCardArrow { transform: translateX(-2px); }
[dir="rtl"] .lessonItem:hover .lessonArrow     { transform: translateX(-2px); }
```

---

## 5. Open Questions / Assumptions

| # | Question |
|---|----------|
| OQ1 | Does `GET /ai/chat-history` return `messages[]` per session? If not, clicking a history item will show an empty chat with the correct `session_id` (follow-ups work, but history is invisible). The fix requires either eager loading or a per-session fetch on click. |
| OQ2 | The in-chat lesson selector (U10) is partially fixed with a "Change lesson" button that re-enters the selection flow. A proper searchable combobox would require either a new lightweight dep (e.g., `cmdk`) or a significant custom implementation. Deferred. |
| OQ3 | ~~Resolved~~ — Backend confirmed: `QuizController` returns key `results` (not `per_question_results`). Frontend already reads `data.results` with a `data.per_question_results` fallback for safety. |
| OQ4 | CSS variable names in `AiTutor.module.css` (`--surface-panel`, `--color-blue`, etc.) are confirmed to match `index.css` — no reconciliation needed. |
| OQ5 | The quiz now runs inline (not as an overlay) when accessed via mode switcher. The old overlay path from chat mode (via `showQuiz` state) is removed. If product wants both entry points, the overlay can be re-added independently. |

---

## 6. Fixes Applied — 2026-06-01

| Fix | Status |
|-----|--------|
| A3 — Radio semantics | ✅ Applied |
| A6 — Reduced motion | ✅ Applied |
| C7 — RTL corrections | ✅ Applied |
| U6 — next_level from API | ✅ Applied |
| C4 — Skeleton loaders | ✅ Applied |
| U7 — Score bars | ✅ Applied |
| A4 — Focus management | ✅ Applied |
| U1 — Mode switcher | ✅ Applied |
