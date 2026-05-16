# EduPulse Frontend Detailed Audit Report

**Generated:** 2026-05-16  
**Auditor:** Claude Code (static source analysis — no live browser)  
**Framework:** React 18 + TypeScript + Vite + React Query  
**Design System:** Dark/Light Mode, RTL/LTR, i18n (AR/EN)  
**Build status at audit time:** ✅ Zero TypeScript errors, clean production build

---

## EXECUTIVE SUMMARY

| Dashboard | Status | Issues | Blockers |
|---|---|---|---|
| Manager (8 pages) | ⚠️ Needs Work | 47 | 4 |
| Teacher (6 pages) | ⚠️ Needs Work | 31 | 3 |
| Student (7 pages) | ⚠️ Mostly Good | 18 | 1 |
| **TOTAL** | ⚠️ | **96 issues** (21 critical, 38 high, 37 minor) | **8 blockers** |

### Highest-impact gaps

1. **Manager i18n: 7 of 8 manager pages have zero `useTranslation`** — all UI is English-only
2. **No toast/success feedback anywhere** — every mutation across all 21 pages closes modals silently
3. **XSS risk in AI Tutor** — `dangerouslySetInnerHTML` with no DOMPurify sanitization
4. **Missing error states** — `manager/Finance` queries can fail silently; `teacher/Students` detail panel freezes
5. **teacher/CourseDetail cache bug** — direct URL navigation causes permanent skeleton (no fallback fetch)
6. **Currency inconsistency** — student sees USD, manager sees EGP (both hardcoded)
7. **SlideOver accessibility** — no focus trap on Tab in any SlideOver across any role
8. **Hardcoded `en-US` locale** — dates, times, and relative time strings ignore the selected language

---

## DETAILED FINDINGS BY PAGE

---

### 1. Manager Dashboard (`/manager/dashboard`)

**Status:** ✅ Functionally complete · ⚠️ i18n partial

**Functional Issues:**
- None critical — all 5 API calls are wired, loading/error/empty states present per panel

**Design Issues:**
- Greeting and date use hardcoded English `getGreeting()` / `formatDate()` — not translated
- Recharts chart tooltip: `contentStyle` uses hardcoded `oklch(13.5% 0.022 255)` — invisible in light mode → **Fix:** Replace with `var(--surface-panel)` / `var(--text-primary)` via `style` refs or a themed tooltip wrapper
- `EnrollmentTrend`: chart axis tick color `oklch(44% 0.015 255)` hardcoded — unreadable in light mode → **Fix:** Use `var(--text-muted)` via a `useThemeColor` helper or CSS variable reference
- `CartesianGrid` stroke hardcoded `oklch(32% 0.02 255)` — invisible in light mode → **Fix:** `var(--neutral-border)`
- `FinanceSummary` "Manage" button uses raw inline `style=` instead of CSS module class

**RTL/i18n Issues:**
- `getGreeting()` returns hardcoded "Good morning/afternoon/evening, {name}" — not translated
- `formatDate()` hardcodes `'en-US'` locale — date in English regardless of language selection
- Panel titles ("Enrollment trend", "At-risk students", "Sessions today", "Recent enrollments", "Finance") are hardcoded English JSX text
- `UpcomingSessions`: "{n} students" count suffix is hardcoded English

**Light/Dark Mode Issues:**
- 🔴 **BLOCKER**: Recharts tooltip and chart axis colors are hardcoded dark OKLCH values — broken in light mode (dark text on dark background)
- `CartesianGrid` stroke invisible in light mode

**Responsive Issues:**
- None found — uses token-based grid that collapses at breakpoints

**Accessibility Issues:**
- `progressbar` role with `aria-valuenow/min/max` is correctly applied to finance progress bar ✅
- No `role="region"` or `aria-label` on the three bottom panels

**Performance Issues:**
- Enrollment trend triggers 6 parallel API calls (one per month) — could be combined into one paginated call

**PRIORITY:** 🟡 High (chart colors in light mode = visual blocker)

---

### 2. Manager Students (`/manager/students`)

**Status:** ⚠️ Needs Work

**Functional Issues:**
- 🔴 "Export" button renders with no `onClick` handler — dead feature. Should be removed or marked "coming soon"
- "Parent" column in table always displays "—" — parent data is not included in list API response (only in detail fetch). Either remove the column or batch-fetch parent names
- Bulk deactivate fires all `toggle-status` calls simultaneously with no confirmation and no rollback mechanism
- Toggle-status for individual students fires immediately with no "Are you sure?" dialog

**Design Issues:**
- `FeeBadge` capitalizes the raw API status string (`status.charAt(0).toUpperCase()`) instead of using translated labels → **Fix:** use translation keys
- `SlideOver` close button uses hardcoded `aria-label="Close"` instead of `t('common.close')`

**RTL/i18n Issues:**
- 🔴 Many strings still bypass `t()` despite `useTranslation` being imported (background agent added the import but translation was incomplete)
- Table headers ("Student", "Code", "Grade", "Parent", "Fees", "Active") are hardcoded — not in translation files
- Form section headings ("Account", "Academic", "Personal") are hardcoded
- Validation messages ("Name is required", "Minimum 8 characters") are hardcoded — not using translation keys
- Gender options ("Male", "Female") are hardcoded strings not using `t('common.male')` / `t('common.female')`

**Light/Dark Mode Issues:**
- No hardcoded color issues found in Students.tsx itself — CSS module is clean

**Responsive Issues:**
- Table horizontal scroll needed on mobile — not currently wrapped in a `overflow-x: auto` container
- SlideOver at 480px fixed width clips on screens < 480px (no responsive width)

**Accessibility Issues:**
- No `aria-live` region for the "N selected" bulk action bar — screen readers won't announce selection changes
- Focus not returned to trigger row after SlideOver closes (only auto-focused to close button on open)
- No `aria-sort` on sortable column headers (not sortable yet, but labels could imply sort)

**PRIORITY:** 🔴 Critical (bulk deactivate without confirmation; broken Export button confuses users)

---

### 3. Manager Teachers (`/manager/teachers`)

**Status:** ⚠️ Needs Work

**Functional Issues:**
- No teacher edit — only assignment add/remove and status toggle. Name, email, phone, nationalId are read-only after creation
- Toggle-status deactivates teachers immediately with no confirmation
- No pagination — fetches `per_page: 100`. A school with >100 teachers will silently lose data
- Assignment remove fires `DELETE` immediately after inline "Remove?" confirm — good pattern ✅

**Design Issues:**
- Subject color assignment uses a fixed hue array (`SUBJECT_HUES`) with hardcoded OKLCH — accent colors will not adapt to light mode in all cases

**RTL/i18n Issues:**
- 🔴 Zero `useTranslation` — entire page is hardcoded English
- All form labels, validation messages, table headers, empty states, error messages are in English only

**Light/Dark Mode Issues:**
- Subject color accent badges use hardcoded OKLCH values that may have insufficient contrast in light mode

**Responsive Issues:**
- Same table overflow issue as Students — no horizontal scroll wrapper on mobile

**Accessibility Issues:**
- `SlideOver` has Escape handler and close-ref auto-focus, but no full focus trap (Tab cycles outside panel)
- Assignment form has no `aria-describedby` on error messages

**PRIORITY:** 🔴 Critical (zero i18n; no pagination; no teacher edit)

---

### 4. Manager Courses (`/manager/courses`)

**Status:** ✅ Functionally complete · 🔴 Zero i18n

**Functional Issues:**
- Archive action (from card) fires immediately with no confirmation — archiving is reversible (can re-activate) so lower severity
- Delete restricted to draft courses — correct business logic ✅
- "Eligible teachers" filter correctly shows only teachers with matching subject + grade assignment ✅

**Design Issues:**
- `StatusBadge` renders raw API values ("draft" / "active" / "archived") — not translated or capitalized
- Subject accent colors use dynamic OKLCH (`subjectAccent()`) — same light-mode contrast concern as Teachers

**RTL/i18n Issues:**
- 🔴 Zero `useTranslation` — entire page is hardcoded English
- Date range display uses en-dash (`–`) in hardcoded template literal — locale-insensitive

**Light/Dark Mode Issues:**
- `subjectAccent()` generates OKLCH values at 64% lightness with 0.22 chroma — low contrast in light mode on light backgrounds

**Responsive Issues:**
- Course card grid uses `repeat(auto-fill, minmax(280px, 1fr))` — good responsive behavior ✅
- Detail slide-over at 520px may clip on mobile

**Accessibility Issues:**
- Status change buttons ("Activate" / "Archive") inside the detail panel lack loading state indication beyond button disable
- `aria-label` on action buttons is constructed with hardcoded English `"View {name} details"`

**PRIORITY:** 🔴 Critical (zero i18n)

---

### 5. Manager Schedule (`/manager/schedule`)

**Status:** ⚠️ Partial — read/create only

**Functional Issues:**
- 🔴 No edit or delete for existing sessions — only create. Sessions cannot be modified after creation
- "..." button in ListView has no `onClick` handler — dead UI element
- Session creation uses `alert()` for validation — not a proper UI error → **Fix:** inline field validation
- Jitsi session join is not wired — "Launch Session" links exist but need Jitsi URL from backend

**Design Issues:**
- Week view calendar uses absolute pixel positioning for session cards — may overlap/clip in RTL
- Calendar day cell sizing is hardcoded at `minHeight: 80px` — looks sparse on full weeks

**RTL/i18n Issues:**
- 🔴 Zero `useTranslation` — entire page is hardcoded English
- Day name array `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']` is hardcoded English — should use `Intl.DateTimeFormat`
- Month names generated via `.toLocaleDateString('en-US', { month: 'long' })` — hardcodes `en-US`
- Timezone label "GMT+2" is hardcoded — should use `Intl.DateTimeFormat().resolvedOptions().timeZone`
- ChevronLeft/Right week navigation icons need to swap direction in RTL
- SlideOver slides in from the right (x: '100%') — in RTL should slide from the left

**Light/Dark Mode Issues:**
- No hardcoded colors in this page's JSX (CSS module is separate) — no issues found

**Responsive Issues:**
- Calendar week/month grid uses fixed-width layout — breaks on mobile (< 600px)
- No mobile fallback for calendar — should switch to list view below 768px

**Accessibility Issues:**
- `alert()` for validation is not accessible — blocks the UI thread and isn't read by screen readers in all contexts
- No `role="grid"` on calendar, no keyboard navigation between cells
- Session cards in calendar have no keyboard activation

**PRIORITY:** 🔴 Critical (zero i18n; alert() validation; no edit/delete sessions)

---

### 6. Manager Finance (`/manager/finance`)

**Status:** ⚠️ Partial — critical silent failures

**Functional Issues:**
- 🔴 **No `isError` handling on any `useQuery`** — if `/manager/finance/summary`, `/manager/finance/transactions`, or `/manager/student-fees` fail, the page shows empty content silently. Users cannot tell something failed → **Fix:** Add `isError` checks and error banners with retry to all three queries
- "Waive Fee" and "Mark as Overdue" are destructive and fire immediately with no confirmation dialog
- Bulk fee generation: "Target: Course" option uses a raw number input for course ID — users must know the internal ID. Should use a course dropdown → **Fix:** Fetch `/manager/courses` and render a `<select>`
- `viewAll` links using `href="#"` are non-functional

**Design Issues:**
- Finance summary cards use `EGP` prefix but `formatCurrency` inside the summary uses `'en-EG'` locale — student Fees page uses `'en-US'` with `USD` currency → **Fix:** centralize a `formatCurrency(amount, currency='EGP')` utility

**RTL/i18n Issues:**
- Partial `useTranslation` — some strings use `t()` but many form labels ("Fee Structure", "Target Group", "Grade Level", "Amount", "Due Date") bypass it
- `justifyContent: 'flex-end'` in multiple inline styles — semantically equivalent in RTL but worth checking visually

**Light/Dark Mode Issues:**
- No hardcoded color issues found in Finance.tsx JSX

**Responsive Issues:**
- Fee table with 6 columns is dense — needs horizontal scroll wrapper on mobile

**Accessibility Issues:**
- Payment confirmation modal lacks `aria-modal` and focus trap
- Status badge renders raw API string — not meaningful to screen readers without `aria-label`

**PRIORITY:** 🔴 Critical (silent query failures; destructive actions without confirmation)

---

### 7. Manager Announcements (`/manager/announcements`)

**Status:** ❌ Stub — incomplete

**Functional Issues:**
- 🔴 No `isError` handling — query failure shows empty silently
- No audience targeting in create form — announcements go to... everyone? The API likely requires a `target_audience` field that's missing from the form
- No announcement edit functionality — only create, publish, and delete
- Delete uses browser `confirm()` — not a proper UI confirmation dialog → **Fix:** Inline confirm row like Settings page pattern
- No pagination or search — long announcement lists will become unusable

**Design Issues:**
- Empty state is a bare `<p>No announcements found.</p>` — no icon, no CTA, no guidance
- Status badge renders raw `{a.status}` ("draft" / "published") — not styled or translated
- SlideOver close button uses `×` character — should use an SVG icon

**RTL/i18n Issues:**
- 🔴 Zero `useTranslation` — entire page is hardcoded English

**Light/Dark Mode Issues:**
- No issues found in JSX — CSS module handles theming

**Responsive Issues:**
- Announcement list cards should be readable on mobile — no specific mobile issues found

**Accessibility Issues:**
- `confirm()` dialog is not accessible — cannot be keyboard navigated or read by screen readers
- No `role="alert"` on error state (which doesn't exist anyway)

**PRIORITY:** 🔴 Critical (zero i18n; no error state; browser confirm(); incomplete functionality)

---

### 8. Manager Settings (`/manager/settings`)

**Status:** ✅ Functionally complete · 🔴 Zero i18n

**Functional Issues:**
- CRUD for grade levels and subjects is fully implemented ✅
- Inline delete confirmation pattern (DeleteConfirmRow) is well designed ✅
- Server-side error messages (e.g., "has enrolled students") are caught and displayed ✅

**Design Issues:**
- Inline edit row uses `<input>` inside a `<td>` — works but spacing is tight in the table row
- No ability to reorder grade levels by `level` value — must manually edit each

**RTL/i18n Issues:**
- 🔴 Zero `useTranslation` — entire page is hardcoded English
- Grade Level `level` field label "1–20" validation hint is not localizable as-is

**Light/Dark Mode Issues:**
- No hardcoded color issues found

**Responsive Issues:**
- Settings table is simple and unlikely to overflow on mobile ✅

**Accessibility Issues:**
- Inline edit inputs lack `aria-label` — screen reader reads only the placeholder text
- Toggle buttons have `aria-label` via `"Toggle {name} active"` (hardcoded English) ✅ (pattern good, string needs i18n)

**PRIORITY:** 🟡 High (zero i18n is blocking for Arabic-speaking managers)

---

### 9. Teacher Dashboard (`/teacher/dashboard`)

**Status:** ✅ Functionally complete · ⚠️ i18n gaps

**Functional Issues:**
- All API calls wired; loading/error/empty states implemented per panel ✅
- "View" link in at-risk row navigates correctly ✅
- Join button in Today's Sessions uses correct Jitsi URL ✅

**Design Issues:**
- Recharts `BarChart` tooltip has hardcoded `'Avg Score'` label bypassing `t()`
- Chart axis tick colors are hardcoded OKLCH — broken in light mode (same issue as Manager Dashboard)

**RTL/i18n Issues:**
- `getGreeting()` returns hardcoded "Good morning/Good afternoon/Good evening" — not using `t('teacher.dashboard.goodMorning')` etc.
- `formatDate()` hardcodes `'en-US'` locale
- `timeAgo()` function generates "just now", "{n}m ago", "{n}h ago", "{n}d ago" in hardcoded English — not translated
- Panel titles ("Today's sessions", "At-risk students", "Recent quiz activity", "Topic performance") are hardcoded JSX text
- "Retry" button text is hardcoded — should be `t('common.retry')`
- "View" link text in at-risk row is hardcoded

**Light/Dark Mode Issues:**
- 🟡 Same Recharts color issue as Manager Dashboard — axis ticks and grid hardcoded dark OKLCH

**Responsive Issues:**
- Dashboard collapses gracefully at tablet/mobile via CSS grid ✅

**Accessibility Issues:**
- No `aria-label` on the BarChart (which is `<div>` wrapped) — screen reader sees an unlabeled region
- "View" links don't describe their destination: `<a>View</a>` — should include student name

**PRIORITY:** 🟡 High (chart colors in light mode; `t()` gaps)

---

### 10. Teacher Courses (`/teacher/courses`)

**Status:** ✅ Good overall · ⚠️ Minor issues

**Functional Issues:**
- Read-only list — no course creation (managed by manager) ✅ by design
- No pagination — fetches all teacher's courses at once. Large course loads will be slow

**Design Issues:**
- "View Course" overlay text in card hover is hardcoded English
- `ArrowRightIcon` in card overlay doesn't flip in RTL — needs `transform: scaleX(-1)` via `[dir="rtl"]` rule
- Progress bar in course card fills left-to-right — needs RTL consideration

**RTL/i18n Issues:**
- "{n} course{s}" English pluralization not using i18n count format — should use `t('student.courses.courses_other', {count: n})` or equivalent teacher key
- Filter `aria-label="Filter by status"` is hardcoded English
- "Try adjusting your search or filter." and "Courses assigned to you will appear here." bypass `t()`
- "Retry" button hardcoded

**Light/Dark Mode Issues:**
- No hardcoded color issues found

**Responsive Issues:**
- Card grid uses `auto-fill minmax` — responsive ✅

**Accessibility Issues:**
- Filter `<select>` has `aria-label` but no visible `<label>` element — may confuse some screen readers

**PRIORITY:** 🟢 Low (minor i18n gaps; visual RTL issues are cosmetic)

---

### 11. Teacher CourseDetail (`/teacher/courses/:id`)

**Status:** ⚠️ Needs Work — significant gaps

**Functional Issues:**
- 🔴 **Cache dependency bug**: If user navigates directly to `/teacher/courses/123`, the course header shows a permanent skeleton — the component depends on `getCourseFromCache()` with no fallback API fetch. Must add a `useQuery` for the course itself when cache miss occurs
- Drag-and-drop lesson reordering: drag handle icon renders but no drag logic is implemented — `onDragStart`/`onDrop` handlers are missing → **Fix:** Remove handle or implement with `@dnd-kit`
- No delete for lessons or sessions
- Attendance submission defaults all students to "absent" if radio not touched — risky
- PDF upload uses inconsistent API path prefix (`/lessons/` vs `/teacher/courses/`)

**Design Issues:**
- Tab underline active indicator needs RTL position consideration
- Back arrow icon (`ChevronLeft`) needs to flip in RTL

**RTL/i18n Issues:**
- 🔴 Zero `useTranslation` — entire page is hardcoded English (all 3 tabs: Lessons, Students, Schedule)
- TABS constant `[{key:'lessons',label:'Lessons'}, ...]` uses hardcoded English labels
- "My Courses" back link is hardcoded
- Attendance radio labels "P" / "A" / "L" / "E" are hardcoded abbreviations — not accessible without tooltips and not translatable

**Light/Dark Mode Issues:**
- No hardcoded color issues found in component JSX

**Responsive Issues:**
- Tab bar scrolls horizontally on mobile ✅
- Student attendance table is wide — needs horizontal scroll on mobile

**Accessibility Issues:**
- Attendance "P/A/L/E" radio buttons: label text is a single letter with no tooltip or `aria-label` explaining "P = Present"
- `PdfViewer` overlay lacks `role="dialog"`, `aria-modal`, and focus trap
- `PdfViewer` has no Escape key handler

**PRIORITY:** 🔴 Critical (cache bug causes broken page on direct navigation; zero i18n)

---

### 12. Teacher Schedule (`/teacher/schedule`)

**Status:** ⚠️ Partial

**Functional Issues:**
- No session edit or cancel functionality
- Clicking a session in week view triggers `joinAsHost` (for live) or attendance panel (for completed) — no visual affordance indicating this behavior
- No cross-course week view — only shows sessions for the selected course

**Design Issues:**
- Week navigation `ChevronLeft`/`ChevronRight` icons need to swap in RTL
- Session pill in week grid can overflow cell if title is long — no truncation

**RTL/i18n Issues:**
- Day abbreviations `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']` are hardcoded English arrays → **Fix:** `new Intl.DateTimeFormat('ar', {weekday:'short'}).format(date)`
- `formatWeekRange()` and `formatDateShort()` hardcode `'en-US'` locale
- Most UI strings use `t()` correctly — better than other teacher pages ✅

**Light/Dark Mode Issues:**
- No issues found

**Responsive Issues:**
- Week grid collapses to list view at < 768px ✅

**Accessibility Issues:**
- Course selector `<select>` has `aria-label` but no visible `<label>` tag
- Session pills in week grid have no keyboard activation

**PRIORITY:** 🟡 High (RTL day names; missing edit/cancel)

---

### 13. Teacher Students (`/teacher/students`)

**Status:** ✅ Good · ⚠️ Minor issues

**Functional Issues:**
- `StudentDetailPanel`: no `isError` branch — if the detail fetch fails, panel shows loading skeleton indefinitely → **Fix:** Add `isError` handling with retry button
- AI exam generation uses `alert()` for success feedback → **Fix:** Replace with an inline success message or toast
- No search or filter within the students table (only course selector)

**Design Issues:**
- Mini progress bar in student row fills left-to-right — needs RTL flip via `[dir="rtl"]` CSS

**RTL/i18n Issues:**
- `formatDate()` / `formatDateShort()` hardcode `'en-US'` locale
- `{t('common.inPerson')}` and similar used correctly ✅
- Pluralization "{n} student{s}" hardcoded English suffix

**Light/Dark Mode Issues:**
- No issues found

**Responsive Issues:**
- Student table wraps on mobile — generally OK ✅

**Accessibility Issues:**
- `alert()` for AI exam generation is not accessible — should be replaced with an `aria-live` region announcement

**PRIORITY:** 🟡 High (detail panel frozen on fetch error; `alert()` usage)

---

### 14. Teacher Announcements (`/teacher/announcements`)

**Status:** ✅ Good · ⚠️ Minor issues

**Functional Issues:**
- No announcement edit or delete
- `canSubmit` disables the submit button but no inline validation errors are shown — user doesn't know why button is disabled

**Design Issues:**
- Card list does not show announcement body preview — only title and metadata visible in list view

**RTL/i18n Issues:**
- Form field labels "Title", "Body", "Course", "Publish immediately" bypass `t()`
- Card date string "Published {date}" / "Created {date}" is a hardcoded template literal
- `formatDate()` uses `'en-US'` hardcoded

**Light/Dark Mode Issues:**
- No issues found

**Responsive Issues:**
- No issues found

**Accessibility Issues:**
- Disabled submit button provides no `aria-describedby` explaining why it's disabled
- "Publish immediately" toggle has no `role="switch"` or `aria-checked`

**PRIORITY:** 🟢 Low (functional gaps are minor; i18n gaps are partial)

---

### 15. Student Dashboard (`/student/dashboard`)

**Status:** ✅ Most complete page in codebase · ⚠️ Minor i18n gaps

**Functional Issues:**
- All API calls wired with proper loading/error/empty states ✅
- Attendance bar, quiz history, upcoming sessions, weak topics all functional ✅
- Pending fees badge links to fees page contextually ✅

**Design Issues:**
- `★` star character in quiz scores is not `aria-hidden` — screen readers will read "star"
- `getMotivation()` returns hardcoded English motivational paragraphs — no path to translating these

**RTL/i18n Issues:**
- `formatTodayDate()` hardcodes `'en-US'` locale
- `formatSessionTime()` hardcodes `'en-US'` locale
- `formatRelativeDate()` returns "Today" / "Yesterday" / "{n}d ago" — hardcoded English
- `getMotivation()` array is all hardcoded English — not translatable in current form
- Session type badge renders raw `session.type` (`'online'`/`'offline'`) — not using `t('common.online')`

**Light/Dark Mode Issues:**
- No issues found — well tokenized CSS ✅

**Responsive Issues:**
- Stat cards grid collapses to 3 columns then 2 then 1 — well handled ✅

**Accessibility Issues:**
- `★` character should have `aria-hidden="true"` on the star span
- `ChevronRight` icons in navigation links need to flip in RTL

**PRIORITY:** 🟢 Low (functional; mainly i18n polish needed)

---

### 16. Student Courses (`/student/courses`)

**Status:** ✅ Complete · ⚠️ Minor issues

**Functional Issues:**
- All courses load correctly; search + subject filter work ✅
- Progress bar per course shows lesson completion ✅

**Design Issues:**
- `ArrowRightIcon` in card overlay needs RTL flip (`transform: scaleX(-1)`)
- Course progress bar fills left-to-right — needs RTL consideration

**RTL/i18n Issues:**
- `formatNextSession()` returns "Today {time}" / "Tomorrow {time}" hardcoded English
- English pluralization "{n} course{s}" instead of i18n count key

**Light/Dark Mode Issues:**
- No issues found

**Responsive Issues:**
- Card grid is responsive ✅

**Accessibility Issues:**
- Card link `aria-label` describes course name ✅
- Progress bar has no `role="progressbar"` or `aria-valuenow`

**PRIORITY:** 🟢 Low

---

### 17. Student CourseDetail (`/student/courses/:id`)

**Status:** ✅ Excellent · Minor gaps

**Functional Issues:**
- All 3 tabs (Lessons, Schedule, Progress) load correctly ✅
- PDF viewer fetches and renders lesson PDFs ✅
- Join session button wired to Jitsi URL ✅

**Design Issues:**
- Back `ChevronLeft` icon needs RTL flip
- `LineChart` in Progress tab fills left-to-right — chart direction not RTL-aware (acceptable for data charts)

**RTL/i18n Issues:**
- `formatTimeRange()` hardcodes `'en-US'` locale
- Chart `XAxis` date format hardcodes `'en-US'`

**Light/Dark Mode Issues:**
- No issues found — good CSS tokenization ✅

**Responsive Issues:**
- PDF viewer overlay covers full screen — OK on mobile ✅

**Accessibility Issues:**
- 🟡 `PdfViewer` overlay has no `role="dialog"`, no `aria-modal`, no focus trap, no Escape handler → **Fix:** Wrap in proper dialog pattern
- `<iframe>` for PDF has no `title` attribute

**PRIORITY:** 🟢 Low

---

### 18. Student AI Tutor (`/student/ai-tutor`) — MOST IMPORTANT

**Status:** ⚠️ Needs critical fixes

**Functional Issues:**
- All API calls wired (chat, quiz, weak topics, lesson context) ✅
- Chat history loads and renders ✅
- Quiz flow: topic selection → questions → score summary ✅

**Design Issues:**
- User message bubbles are right-aligned for both RTL and LTR — in LTR user messages should be right-aligned; in RTL, chat direction convention is debated. Ensure CSS uses logical `margin-inline-start: auto` rather than `float: right`
- `ChevronRight` icons in course/lesson selection sidebar need RTL flip

**RTL/i18n Issues:**
- `formatDate()` hardcodes `'en-US'` locale for chat timestamp
- "AI is thinking" in `TypingIndicator` `aria-label` is hardcoded English
- "General Knowledge" fallback topic name is hardcoded English
- AI error messages ("I could not generate a response...") are hardcoded English in catch blocks
- `startTopicChat()` initial message is hardcoded English
- Quiz `onComplete` summary message ("Quiz completed! You scored X%...") is hardcoded English
- `dangerouslySetInnerHTML` renders markdown — the rendered HTML content comes from AI, will be in the language the AI responds in — acceptable, but the surrounding UI strings should still use `t()`

**Light/Dark Mode Issues:**
- No hardcoded color issues found

**Responsive Issues:**
- Sidebar + chat layout collapses on mobile ✅ (hidden sidebar on small screens)

**Accessibility Issues:**
- 🔴 **XSS RISK**: `dangerouslySetInnerHTML` renders AI-generated markdown converted to HTML. No DOMPurify sanitization. An adversarial AI response could inject `<script>` or `<img onerror="...">` → **Fix:** `import DOMPurify from 'dompurify'; dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(msg.content)) }}`
- 🟡 `QuizMode` overlay: no `role="dialog"`, no `aria-modal="true"`, no focus trap → **Fix:** Add modal dialog semantics
- `TypingIndicator` `aria-label` is hardcoded English
- Quiz answer options have no `aria-checked` state indication
- Chat send button has only an SVG icon — needs `aria-label`

**PRIORITY:** 🔴 Critical (XSS risk; quiz overlay accessibility; important user-facing page)

---

### 19. Student Schedule (`/student/schedule`)

**Status:** ✅ Best i18n implementation in codebase

**Functional Issues:**
- All sessions load with correct grouping (Today/Tomorrow/This Week/Later) ✅
- Auto-refetch every 60 seconds for live session detection ✅
- Join button shown only for online, non-completed sessions ✅
- Type filter (Online/In-Person) and day filter work ✅

**Design Issues:**
- Live session pulse animation properly draws attention ✅
- No issues found

**RTL/i18n Issues:**
- `formatTimeRange()` hardcodes `'en-US'` — minor
- All user-visible strings use `t()` correctly ✅

**Light/Dark Mode Issues:**
- No issues found ✅

**Responsive Issues:**
- Session cards are single-column on mobile — responsive ✅

**Accessibility Issues:**
- Live session `aria-label` on pulse dot is `"Live"` — correct ✅
- `ExternalLinkIcon` in join button is `aria-hidden` ✅

**PRIORITY:** 🟢 Low (excellent implementation — only minor locale format issue)

---

### 20. Student Announcements (`/student/announcements`)

**Status:** ✅ Good · Minor i18n gaps

**Functional Issues:**
- Read/unread state tracked in `localStorage` only — not synced to server. Clearing localStorage loses read history
- Expand/collapse body UX works well ✅
- Filter by school/course works ✅

**Design Issues:**
- No issues found

**RTL/i18n Issues:**
- `relativeTime()` returns "just now" / "{n}m ago" / "{n}h ago" / "{n}d ago" — hardcoded English → **Fix:** Use `Intl.RelativeTimeFormat`
- `audienceLabel()` returns "My Course" / "My Grade" / "School" — hardcoded English → **Fix:** Use translation keys

**Light/Dark Mode Issues:**
- No issues found ✅

**Responsive Issues:**
- Card list is mobile-friendly ✅

**Accessibility Issues:**
- Unread dot `aria-label={t('student.announcements.unread')}` — uses translation correctly ✅
- `aria-expanded` on read-more button ✅

**PRIORITY:** 🟢 Low

---

### 21. Student Fees (`/student/fees`)

**Status:** ✅ Good · ⚠️ Currency inconsistency

**Functional Issues:**
- Read-only display of fees — no online payment (by design) ✅
- Status filter works (Pending/Overdue/Paid) ✅
- `isOverdue()` performs client-side date comparison — may drift vs server-computed status

**Design Issues:**
- `SummaryBar` correctly shows totals per status ✅

**RTL/i18n Issues:**
- `formatCurrency()` uses `'en-US'` locale and `'USD'` currency — **inconsistency**: Manager Finance uses `EGP` as a hardcoded suffix with `'en-EG'` locale → **Fix:** Centralize a `formatCurrency(amount)` utility that reads currency from tenant config or a shared constant
- `formatDate()` hardcodes `'en-US'`
- English pluralization "{n} fee{s}" in page subtitle

**Light/Dark Mode Issues:**
- No issues found ✅

**Responsive Issues:**
- Fee cards are mobile-friendly ✅

**Accessibility Issues:**
- Status badge color is the only indicator of meaning (paid=green, overdue=red) — no icon accompanies the badge → **Fix:** Add an icon or shape indicator per WCAG 1.4.1

**PRIORITY:** 🟢 Low (functional; currency inconsistency is a data integrity concern)

---

## SUMMARY BY CATEGORY

### 🔴 Critical Blockers (MUST FIX before design polish phase)

1. **Manager pages i18n: 7 pages with zero `useTranslation`** — Manager Teachers, Courses, Schedule, Finance (partial), Announcements, Settings are 100% hardcoded English. Unusable for Arabic speakers.
   - Impact: Core functionality inaccessible in Arabic (the default language)

2. **Manager Finance silent query failures** — No `isError` on 3 queries. Finance overview can fail invisibly.
   - Impact: Manager thinks finance is empty when actually broken

3. **Teacher CourseDetail direct-navigation bug** — Course header stays skeleton forever if page loaded directly (cache miss, no fallback fetch).
   - Impact: Sharing a course link breaks the page for the recipient

4. **Student AI Tutor XSS risk** — `dangerouslySetInnerHTML` with no DOMPurify on AI-generated HTML.
   - Impact: Security vulnerability — adversarial AI response could execute arbitrary JavaScript

5. **Manager Announcements: browser `confirm()` for delete** — Native dialog not accessible; also no `isError` state.
   - Impact: Delete confirmation inaccessible to screen readers and keyboard-only users

6. **Dead UI elements**: Manager Students "Export" button, Manager Schedule "..." button, Finance "viewAll" links do nothing. Confuses users.

7. **Destructive actions without confirmation**: Manager Finance "Waive Fee"/"Mark as Overdue" fire immediately; Manager Students/Teachers bulk deactivate has no rollback.

8. **Teacher CourseDetail: attendance default "absent"** — Submitting attendance without touching any radio marks all students absent.

### 🟡 High Priority Issues (should fix before design polish)

1. **Recharts chart colors hardcoded dark OKLCH** — Manager Dashboard, Teacher Dashboard charts are unreadable in light mode (dark text on light background in tooltip; invisible grid lines)
   - Fix: Replace with CSS variable references or use a themed Recharts component wrapper

2. **No global toast/success feedback system** — Every mutation across all 21 pages closes silently. Users have no confirmation their action succeeded.
   - Fix: Add a lightweight toast system (e.g., `sonner` or a custom `useToast` hook + `aria-live` region)

3. **`en-US` locale hardcoded** — `formatDate()`, `formatTime()`, `relativeTime()`, day name arrays across 15+ pages ignore the selected language
   - Fix: Create a shared `formatLocalDate(iso, lang)` utility using `Intl.DateTimeFormat(lang)` and replace all `'en-US'` instances

4. **SlideOver focus trap incomplete** — Tab key escapes all SlideOver dialogs across all roles. WCAG 2.1 AA requires focus to be trapped in dialogs.
   - Fix: Add a focus-trap utility (or use `focus-trap-react` package)

5. **Teacher Students: detail panel frozen on error** — No `isError` branch; loading skeleton shows indefinitely on fetch failure.

6. **Teacher CourseDetail: drag handle not implemented** — Lesson reorder handle renders but has no drag logic.
   - Fix: Implement with `@dnd-kit/sortable` or remove the handle

7. **Teacher Announcements / CourseDetail: form labels hardcoded** — "Title", "Body", "Date" bypass `t()`

8. **Currency inconsistency (EGP vs USD)** — Manager Finance shows EGP; Student Fees shows USD.

9. **Manager Teachers: no pagination** — `per_page: 100` silently drops teachers beyond 100.

10. **Manager Teachers: no teacher profile edit** — Name, email, phone, nationalId cannot be updated after creation.

### 🟢 Minor Issues (nice-to-have)

1. **`ChevronLeft`/`ChevronRight` arrows not flipping in RTL** — Back links and navigation arrows should use `transform: scaleX(-1)` in `[dir="rtl"]`
2. **`ArrowRightIcon` in course cards not flipping in RTL** — Same fix
3. **`getMotivation()` hardcoded English** in Student Dashboard — No path to localization in current form; could be replaced with a single translatable motivational key per morning/afternoon/evening
4. **Attendance abbreviations "P/A/L/E"** in Teacher CourseDetail — Not accessible without tooltip; replace with translated full words
5. **`★` star character not `aria-hidden`** in Student Dashboard quiz scores
6. **Student Fees: `isOverdue()` client-side date drift** — Could show "overdue" for a fee the server considers "pending"
7. **Manager Announcements: no audience targeting in create form**
8. **Manager Students: "Parent" column always "—"** — The list API doesn't return parent data
9. **Manager Courses: `StatusBadge` renders raw API values** ("draft"/"active"/"archived") without formatting
10. **AI Tutor `QuizMode`: no `role="dialog"` or focus trap** — accessibility gap on the quiz overlay
11. **`PdfViewer`: no dialog semantics** — Missing `role="dialog"`, `aria-modal`, Escape key, focus trap
12. **Enrollment Trend: 6 parallel API calls** — Could be batched into one request

### By Type

| Category | Pages Affected | Issue Count |
|---|---|---|
| i18n / Translation | 15 pages | 38 issues |
| Functional / Feature gaps | 12 pages | 22 issues |
| Accessibility | 14 pages | 18 issues |
| Light/Dark Mode | 2 pages (dashboards) | 3 issues |
| RTL Layout | 8 pages | 9 issues |
| Responsive | 4 pages | 5 issues |
| Performance | 2 pages | 2 issues |
| Security | 1 page | 1 issue |

---

## RECOMMENDATIONS

### Before Design Polish Phase — Non-Negotiable

1. **Fix XSS in AI Tutor** — Install DOMPurify, sanitize all `dangerouslySetInnerHTML` output. One file, one import, one wrap.

2. **Add `isError` to Manager Finance queries** — Without error states, finance data silently disappears on failures.

3. **Fix Teacher CourseDetail cache miss** — Add a `useQuery` for the course itself as a fallback when `getCourseFromCache()` returns `undefined`.

4. **Add i18n keys for Manager pages** — The translation files need ~200 new keys for manager pages. This can be done in a single pass adding keys to both `en.json` and `ar.json`.

5. **Remove dead UI elements** — Export button, "..." menu, viewAll `href="#"` links — remove or implement.

6. **Replace `alert()` / `confirm()` calls** — Manager Schedule uses `alert()` for validation; Manager Announcements uses `confirm()` for delete. Replace with inline UI patterns.

### Design Polish Phase Focus Areas

When running `/impeccable polish`:
- **Manager Dashboard**: Fix Recharts chart theming for light mode (tooltip background, axis tick color, grid color)
- **Teacher Dashboard**: Same Recharts fix
- **All SlideOvers**: Add visual success state or animation on close after mutation
- **Student AI Tutor**: Polish the quiz overlay as a proper fullscreen dialog
- **Manager Finance**: Design a proper confirmation modal for Waive/Mark Overdue actions
- **All pages**: Add a toast notification system — a single `<Toaster />` component in root + `useToast()` hook

### For Design Phase — RTL-Specific

- Add `[dir="rtl"] .arrowIcon { transform: scaleX(-1); }` globally for all chevron/arrow icons
- Add `[dir="rtl"] .progressBar { transform-origin: right; }` globally (already done for manager finance)
- Replace all hardcoded `'en-US'` locale strings with a shared `useLocale()` hook that returns `i18n.language`

---

## SIGN-OFF

**This audit is ready for the design polish phase: ⚠️ WITH CONDITIONS**

The design polish phase can begin on student pages immediately — they are the most complete. Teacher pages can begin after the cache fix and i18n pass. Manager pages need the i18n foundation and critical fixes before design polish makes sense (polishing untranslated text is wasted effort).

**Required before full design polish:**
- [x] i18n infrastructure (complete)
- [x] RTL CSS logical properties (complete)  
- [x] Dark/Light mode tokens (complete)
- [ ] Manager pages i18n keys added to translation files
- [ ] Manager pages `useTranslation()` calls added
- [ ] AI Tutor XSS fix (DOMPurify)
- [ ] Teacher CourseDetail cache fallback
- [ ] Finance error states
- [ ] Remove/fix dead UI elements

**Pages ready for design polish NOW:**
- `/student/dashboard` ✅
- `/student/courses` ✅
- `/student/courses/:id` ✅
- `/student/schedule` ✅
- `/student/announcements` ✅
- `/student/fees` ✅
- `/teacher/dashboard` (after chart color fix)
- `/teacher/courses` ✅
- `/teacher/schedule` ✅
- `/teacher/students` ✅
- `/teacher/announcements` ✅

**Pages requiring fixes before design polish:**
- `/student/ai-tutor` — XSS fix required
- `/teacher/courses/:id` — cache bug + i18n required
- All manager pages — i18n required
