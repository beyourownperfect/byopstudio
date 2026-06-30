# BYOPGateCS.studio — Project Context

Single-user GATE CS study operating system. Capture questions → solve under SRS → schedule revisions → measure momentum. **v1.2 production-ready.** Deployed as a single Render web service backed by MongoDB Atlas.

---

## 1. Philosophy

- **One source of truth.** Every question, attempt, log, revision lives in MongoDB.
- **No planning ceremony.** Open Pulse, do Today's Mission, repeat.
- **Spaced repetition is the substrate.** Mastery earned through correct recall at increasing intervals.
- **Self-feedback over self-deception.** Confidence captured with each attempt.
- **Local-first feel, server-backed truth.** Optimistic UI; server is authoritative.
- **GATE-specific UX.** LaTeX rendering, PYQ year as first-class field, 12 standard GATE subjects.

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19 (CRA + craco), TailwindCSS, Radix UI primitives, lucide-react, KaTeX, react-router-dom v7, @tanstack/react-query |
| Backend | FastAPI, Motor (async MongoDB), Pydantic v2, Uvicorn |
| Database | MongoDB (single database `byopstudio`) |
| Build/Deploy | Render single web service + MongoDB Atlas M0 |

---

## 3. Folder Structure

```
/
├── backend/
│   ├── server.py          # All API routes, models, helpers, seed, SPA serving
│   ├── requirements.txt
│   ├── Procfile
│   ├── tests/
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/          # 7 pages: Pulse, Repository, Practice, Bookmarks, Mistakes, Log, Timeline
│   │   ├── components/     # 15 components: Layout, Modal, LectureTable, StudyTimer, MissionCard, etc.
│   │   ├── lib/            # api.js, constants.js, dateUtils.js, helpContent.js
│   │   └── index.css       # Tailwind + custom properties + component classes
│   ├── build/              # Production build (served by FastAPI)
│   └── package.json
├── memory/                 # PRD, notes
└── render.yaml             # Render Blueprint
```

---

## 4. Database Schema (MongoDB Collections)

### questions
`{ id, subject, topic, exam_source, year, difficulty, question_type, statement, options[], correct_answer, explanation, gateoverflow_url, bookmarked, notes, created_at, updated_at }`

### attempts
`{ id, question_id, correct, confidence(1-5), user_answer, time_taken_sec, created_at }`

### srs
`{ id, question_id, interval_idx(0-5), next_review_date, last_reviewed, total_attempts, correct_attempts, created_at }`

### study_logs
`{ id, activity, subject, topic, duration_min, questions_attempted, questions_correct, questions_wrong, remarks, date, timeline_entry_id, created_at }`
- `auto: true` set on practice auto-logs (extra field, not in Pydantic model)

### timeline
`{ id, subject, topic, activity, title, duration_min, questions_solved, notes, date, scheduled_revisions[], completed_revisions[], completion_status, created_at }`

### revisits
`{ id, item_type, item_id, item_title, item_subject, revisit_date, completed, created_at }`

### lectures
`{ id, subject, topic, lecture_name, lecture_number, duration_min, completion_percent(0-100), notes_done, revision_done, created_at, updated_at }`

### settings
`{ id: "singleton", exam_date, daily_question_target, daily_revision_target, daily_study_minutes_target }`
- Default exam_date: `"2027-02-07"` (auto-advances if past)

### subject_completion
`{ id, subject, topic, lectures_completed, notes_created, flashcards_created, pyqs_completed, revision_completed, subject_test_completed, dpp_completed, weekly_quiz_completed, can_explain_without_notes, created_at, updated_at }`

### user_missions
`{ id, title, notes, order, completed, completed_at, created_at, updated_at }`

---

## 5. SRS Algorithm

Intervals: 1, 3, 7, 14, 30, 90 days.
Mastery formula: `0.6 × interval_pct + 0.4 × accuracy` (0-100).
Question is "completed" when `interval_idx >= 3 AND correct_attempts >= 3`.

---

## 6. API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/` | Health check |
| GET/POST/PUT/DELETE | `/api/questions[/{id}]` | CRUD + `?subject=&search=&filter_mode=` |
| POST | `/api/questions/bulk-create` | CSV import |
| POST | `/api/questions/bulk-delete` | Multi-select delete |
| POST | `/api/practice/submit` | Submit answer → updates SRS + auto-creates study_log |
| GET | `/api/practice/next` | Fetch next question for given mode/subject |
| GET | `/api/pulse` | Full dashboard data |
| GET/POST/PUT/DELETE | `/api/study-logs[/{id}]` | Manual log CRUD |
| GET/POST/PUT/DELETE | `/api/timeline[/{id}]` | Timeline entries |
| POST | `/api/timeline/{id}/complete-revision` | Complete a scheduled revision |
| GET/POST/DELETE | `/api/revisits[/{id}]` | Revisit items |
| POST | `/api/revisits/{id}/complete` | Mark revisit complete |
| GET | `/api/calendar` | Aggregated daily study data |
| GET | `/api/mistakes` | Wrong answers by mode |
| GET/POST/PUT/DELETE | `/api/lectures[/{id}]` | Lecture CRUD |
| GET/POST/PUT | `/api/subject-completion` | Subject completion checklist |
| GET/POST/PUT/DELETE | `/api/user-missions[/{id}]` | User-authored mission tasks |
| POST | `/api/user-missions/reorder` | Drag-to-reorder missions |
| GET/PUT | `/api/settings` | Singleton settings |
| GET | `/api/queue` | Aggregated execution queue (SRS + timeline revs + revisits + missions) |
| POST | `/api/seed-demo` | Seed 12 sample questions (one per subject) |
| GET | `/api/meta` | Counts and metadata |

---

## 7. Frontend Pages

### Pulse (`/pulse`)
Dashboard with **Today** section (MissionCard, Execution Queue, Momentum, Today's Progress), **Readiness** section (PreparationSnapshot, WeakTopics, SubjectCompletion), and **Lectures** section (LectureTable). StudyTimer in header. GATE countdown and settings modal (exam date + daily targets). Onboarding card for zero-data users. Card-2 headers with box-shadow depth and section dividers.

### Repository (`/solve/repository`)
Question bank with inline-editable grid table. 8 columns: checkbox, subject, type, statement (plain-text truncated for uniform row height), mastery bar, next revision, revisit, actions. Filter by subject/mode, search, sort, CSV import/export, bulk delete with undo, OCR prompt modal.

### Practice (`/solve/practice`)
Setup screen (mode + subject picker) → Active solving with MCQ/MSQ/NAT. Confidence 1-5 with labels (Guess → Certain), keyboard shortcuts (A-D pick, 1-5 confidence, Space/Enter submit, ←→ navigate), stopwatch, feedback with explanation, bookmark, revisit scheduling. Queue navigation with prev/next. Session summary on finish (or end-early via × button). Auto-creates study_logs via `POST /api/practice/submit` that batches one log per subject per day.

### Bookmarks (`/solve/bookmarks`)
Starred questions in a list. Subject badge, mastery, statement, next review. Quick actions: unstar, practice, revisit, GateOverflow link.

### Mistakes (`/solve/mistakes`)
Wrong answers by 5 modes: All wrong, Wrong today, Frequently wrong (2+), Forgotten, Bookmarked mistakes. Filter, practice-all button.

### Log (`/log`)
Live timer status bridged from PULSE (sessionStorage polling). Session summary cards. Daily/weekly/monthly views with collapsible date groups. **LectureTable** (shared component) and **SubjectCompletion** checklist below. Keyboard shortcut: N = new log. Subject codes shown with full names in dropdowns and chips.

### Timeline (`/timeline`)
Daily/weekly/monthly calendar of entries, scheduled revisions, and revisits. New entry modal with revision scheduling presets (+1d/+3d/+7d/+14d/+30d).

---

## 8. Shared Components

| Component | Used In | Description |
|-----------|---------|-------------|
| `LectureTable` | Pulse, Log | Inline-editable table with 7 columns, collapsible subject groups, sort/filter, sticky header, auto-save |
| `StudyTimer` | Pulse | Stopwatch/countdown with focus modal, topic input, keyboard shortcuts (Space/R), auto-log on countdown complete, manual save button, sessionStorage persistence |
| `MissionCard` | Pulse | User-authored checklist with add/complete/edit/reorder/delete |
| `QueueCard` | Pulse | System-generated execution queue aggregating SRS, timeline revisions, revisits, missions. Prioritized into Overdue/Today/This Week/Upcoming. Deep-links to owning modules |
| `SubjectSelect` | All pages | Dropdown showing subject codes with full names (e.g. "COA — Computer Org."), optional "All subjects" |
| `MarkdownRenderer` | Practice, Details | ReactMarkdown with LaTeX via rehype-katex |
| `QuestionFormModal` | Repository | Create/edit question form |
| `QuestionDetailsModal` | Repository | Full question view with attempts history |
| `TimelineEntryModal` | Timeline | Create/edit timeline entry with SRS revision scheduling |
| `RevisitMenu` | Repository, Practice, etc. | "manual reminder" scheduling tooltip |
| `HelpButton` | All pages | ? icon → modal with contextual quick guide |
| `CommandPalette` | Layout | Cmd/Ctrl-K global command search |
| `Layout` | All pages | Header nav + Cmd-K discovery toast + responsive hamburger drawer |

---

## 9. Design System

### Dark theme (default)
```css
--bg: 0 0% 7%
--bg-elev: 0 0% 9%
--bg-elev-2: 0 0% 11%
--accent: 24 95% 58%    /* warm orange */
```

### Light theme
```css
--bg: 30 15% 96%         /* warm cream */
--bg-elev: 30 20% 99%
--bg-elev-2: 28 15% 93%
--accent: 24 95% 54%     /* slightly darker orange */
```

### Card variants
- `card-2` — 2px border + box-shadow depth + hover accent ring
- `card-2-accent` — card-2 with orange left border
- `card-2-pulse` — card-2 with green left border
- `card-2-time` — card-2 with info left border

### Section separation
All pages use `space-y-6` (24px) between sections with headers inside `card-2` containers. Pulse adds labeled section dividers with horizontal rules.

### Spacing
- `space-y-6` (24px) — between major sections
- `space-y-4` (16px) — within section groups
- `p-5` (20px) — standard card padding

---

## 10. Key Design Decisions

- **No auth** — single-user app eliminates entire auth complexity
- **Optimistic UI** — bookmarks, deletes, edits reflect instantly; server is fallback
- **SPA served by FastAPI** — single Render service, no CORS issues in production
- **StudyTimer auto-logging** — countdown completion automatically creates a study_log entry + timeline entry; manual Save button on the inline bar
- **Practice auto-logs batch** — one log per subject per day, not one per question; also upserts daily practice timeline entries
- **Timeline bridging** — creating a timeline entry auto-creates a linked study_log; completing a revisit creates both a study_log and a timeline entry
- **Reverse bridge** — orphan study logs (from timer, manual log, revisit complete) auto-create matching timeline entries so everything appears on the calendar
- **Revision logs** — completing a timeline revision creates a "Revision" study_log
- **Execution queue** — aggregated SRS + timeline revisions + revisits + missions into a single prioritized queue on Pulse
- **Calendar is read-side aggregate** — no materialized view; sums study_logs on read
- **Exam date auto-advance** — if persisted date is in the past, `_get_settings()` resets to default
- **Seed covers all 12 subjects** — one question per GATE subject

---

## 11. Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| `MONGO_URL` | For Atlas | Falls back to `mongomock_motor` (in-memory) |
| `DB_NAME` | No | `byopstudio` |
| `CORS_ORIGINS` | No (production same-origin) | `*` |
| `REACT_APP_BACKEND_URL` | No (production same-origin) | `""` |

---

## 12. Deployment Flow

1. Push to GitHub
2. Set up MongoDB Atlas M0 cluster + database user + `0.0.0.0/0` network access
3. Render auto-detects `render.yaml` → single web service
4. Set `MONGO_URL` and `DB_NAME` env vars in Render
5. After deploy: `curl -X POST https://your-app.onrender.com/api/seed-demo`
6. Verify all pages: `/pulse`, `/solve/repository`, `/solve/practice`, `/log`, `/timeline`

---

*Last updated: 2026-06-30 · v1.1*
