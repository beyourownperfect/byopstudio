# PROJECT_CONTEXT.md
**BYOPGateCS.studio — Study Operating System for GATE CSE**

A single-user web app that replaces a study planner with a closed-loop habit engine: capture questions → solve under SRS → schedule revisions → measure momentum. This document is the single source of truth for any future AI session continuing this project.

---

## 1. Project philosophy

- **One source of truth.** Every question, attempt, log and revision lives in MongoDB. No scattered notebooks.
- **No planning ceremony.** Open Pulse, do Today's Mission, repeat. The system decides what's due, not the human.
- **Spaced repetition is the substrate.** Mastery is *earned* through correctly answering at progressively longer intervals — not by reading more.
- **Self-feedback over self-deception.** Confidence captured *with* each attempt; the gap between confidence and correctness is signal.
- **Local-first feel, server-backed truth.** Optimistic UI everywhere; server is authoritative.
- **GATE-specific UX.** LaTeX rendering by default. PYQ year is a first-class field. Subjects are GATE's 12 standard subjects, not generic.

---

## 2. Tech stack

| Layer | Choice |
| ----- | ------ |
| Frontend | React 19 (CRA + craco), TailwindCSS, Radix UI primitives, lucide-react icons, KaTeX (`react-katex`), react-router-dom v7 |
| Backend | FastAPI, Motor (async MongoDB), Pydantic v2, Uvicorn (managed by supervisor) |
| Database | MongoDB (single database `os.environ['DB_NAME']`) |
| Build/deploy | Frontend → Vercel (CRA preset, SPA rewrites in `frontend/vercel.json`). Backend → any long-lived host (Render/Railway/Fly/Emergent preview). |
| Process mgmt | Supervisor in container (backend :8001, frontend :3000) |
| Routing | Kubernetes ingress: `/api/*` → backend :8001, everything else → frontend :3000 |
| Auth | None — single user. |

---

## 3. Folder structure

```
/app
├── backend/
│   ├── server.py            # All API routes, models, helpers, seed in one file
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── tests/               # backend_test.py, test_pre_deploy_review.py
│   └── .env                 # MONGO_URL, DB_NAME, CORS_ORIGINS (protected)
├── frontend/
│   ├── package.json, craco.config.js, tailwind.config.js, postcss.config.js
│   ├── vercel.json          # SPA rewrites + CRA build preset
│   ├── public/index.html
│   └── src/
│       ├── App.js           # Router + routes
│       ├── index.js, index.css, App.css
│       ├── components/
│       │   ├── Layout.jsx               # Header, nav, mobile drawer, countdown
│       │   ├── JanCountdown.jsx         # Header widget — Jan 1 countdown
│       │   ├── HelpButton.jsx           # Reusable "?" contextual-help popup
│       │   ├── Modal.jsx                # Base modal (bottom-sheet on mobile)
│       │   ├── QuestionFormModal.jsx    # Create/Edit question
│       │   ├── QuestionDetailsModal.jsx # Read-only details (LaTeX + history)
│       │   ├── TimelineEntryModal.jsx   # Timeline entry + schedule revisions
│       │   ├── CommandPalette.jsx       # Cmd/Ctrl-K
│       │   ├── RevisitMenu.jsx          # Schedule revisit on any item
│       │   ├── Latex.jsx                # Inline + display math rendering
│       │   └── ui/                      # shadcn-style Radix wrappers (full set)
│       ├── pages/
│       │   ├── Pulse.jsx        # Dashboard: mission, momentum, weakness, readiness
│       │   ├── Repository.jsx   # Question bank (CRUD, sort, filter, bulk, CSV)
│       │   ├── Practice.jsx     # SRS-driven solve session
│       │   ├── Bookmarks.jsx, Mistakes.jsx
│       │   ├── Log.jsx          # Stopwatch + journal + session history
│       │   └── Timeline.jsx     # Daily/Weekly/Monthly calendar + revisions
│       ├── lib/
│       │   ├── api.js           # axios client, all endpoint wrappers
│       │   ├── helpContent.js   # Per-module help copy
│       │   ├── dateUtils.js     # ISO date helpers, debounce
│       │   ├── constants.js     # SUBJECTS, ACTIVITIES, TID test-ids
│       │   └── utils.js
│       └── constants/testIds/   # legacy test-id constants
├── memory/PRD.md
├── PROJECT_CONTEXT.md           # ← this file
├── README.md
├── HOW_TO_CODE_THIS_PROJECT.txt
└── .gitignore
```

---

## 4. Database schema (MongoDB collections)

All IDs are `str` UUIDs (not ObjectId) so they're JSON-safe.

### `questions`
| field | type | notes |
| ----- | ---- | ----- |
| id | string (uuid) | primary id |
| subject | string | one of 12 SUBJECTS |
| topic | string | freeform |
| question_type | "MCQ" \| "MSQ" \| "NAT" | |
| statement | string | LaTeX supported via `$...$` and `$$...$$` |
| options | string[] | empty for NAT |
| correct_answer | string | MCQ: letter ("A"); MSQ: "A,C"; NAT: numeric string |
| explanation, gateoverflow_url, notes | string | |
| year | int \| null | PYQ year |
| difficulty | "Easy" \| "Medium" \| "Hard" | |
| bookmarked | bool | |
| created_at, updated_at | ISO datetime str | |

### `srs` (one per question)
| field | type | notes |
| ----- | ---- | ----- |
| id, question_id | string | |
| interval_idx | int | index into `[1,3,7,14,30,90]` days |
| next_review_date | "YYYY-MM-DD" | |
| last_reviewed | "YYYY-MM-DD" \| null | |
| total_attempts, correct_attempts, consecutive_correct | int | |

### `attempts`
| question_id, correct, confidence (1–5), user_answer, time_taken_sec, created_at |

### `study_logs`
| activity, subject, topic, duration_min, questions_attempted/correct/wrong, remarks (journal), date ("YYYY-MM-DD"), timeline_entry_id?, auto?: bool |

### `timeline`
| subject, topic, activity, title, duration_min, questions_solved, notes, date, scheduled_revisions: string[], completed_revisions: string[], completion_status |

### `revisits`
| item_type (REVISIT_TYPES), item_id, item_title, item_subject, revisit_date, completed, completed_at, created_at |

### `settings` (singleton, `id="singleton"`)
| exam_date ("YYYY-MM-DD"), daily_question_target, daily_revision_target, daily_study_minutes_target |

**Constants** (`backend/server.py` and `frontend/src/lib/constants.js`)
- `SUBJECTS = ["C","DS","AL","OS","DB","COA","TOC","CD","DL","EM","DM","CN"]`
- `ACTIVITIES = ["Lecture","Practice","Revision","Mock Test","Reading"]`
- `SRS_INTERVALS = [1, 3, 7, 14, 30, 90]` (days)
- `REVISIT_PRESETS = [1, 3, 7, 14, 30]` (days, frontend only)

---

## 5. Core workflows

### Add → Solve → Revise loop (the engine)
1. Add a question in **Repository** (or import CSV).
2. Open **Practice** with a mode (`due` / `new` / `wrong` / `weak` / `bookmarked` / `all`).
3. Set confidence (1–5), submit. SRS updates `interval_idx`, `next_review_date`, mastery.
4. **Pulse** surfaces the count of due revisions tomorrow → completes the loop.

### Plan → Log → Schedule revision (the calendar)
1. **Log** a session with stopwatch + journal note OR open **Timeline** and add an entry (Lecture/Reading/etc.).
2. In the entry modal, schedule +1d / +7d / custom-date revisions.
3. Scheduled revisions appear on their target date in Timeline, in Pulse's `due_revisions`, and in Today's Mission.
4. Complete the revision from the entry modal → auto-logs a Revision study session.

### Detail → Edit → Practice (the inspector)
- Double-click a row in Repository → **Question Details Modal** (rendered LaTeX, attempts history, mastery bar, next-review, GateOverflow link, Edit and Practice buttons).

---

## 6. Navigation

Top nav:

| Tab | Path | Purpose |
| --- | ---- | ------- |
| **SOLVE** | `/solve/repository` | Repository → Practice → Bookmarks → Mistakes (sub-nav) |
| **PULSE** | `/pulse` | Dashboard, default landing |
| **LOG** | `/log` | Stopwatch + manual entries + journal |
| **TIMELINE** | `/timeline` | Calendar + revision scheduling |

Header also shows:
- App brand
- **Jan-1 countdown** widget (`Nd : NNh : NNm`, updates every 30s)
- Cmd/Ctrl-K command palette trigger
- Mobile hamburger drawer (≤ md breakpoint)

Sub-nav (Solve): Repository / Practice / Bookmarks / Mistakes.

Default route: `/` → `/pulse`. Unknown route → `/pulse`.

---

## 7. Feature list

### Repository (`/solve/repository`)
- CRUD with LaTeX-aware fields, year, difficulty, options, GateOverflow link, notes, bookmark.
- Search (debounced 220ms), Subject filter, 8 filter modes (Due today, Revisit today, Bookmarked, Wrong, Weak, Never attempted, Mastered, All).
- **Column sorting** (subject / type / statement / mastery / next-rev / next-revisit) — click header to toggle asc/desc.
- **Remembered filters/sort** via `localStorage` key `byop.repo.filters.v1`. URL also reflects subject + filter.
- Multi-select with bulk delete + undo toast (5s window).
- CSV Import / Export.
- Per-row: bookmark toggle, practice, revisit menu (custom date or preset), edit, delete, GateOverflow open.
- **Double-click row → Question Details Modal** (single-click does nothing — keeps row clean).

### Question Details Modal
- Rendered LaTeX statement, options (correct highlighted), explanation.
- Mastery 0–100 with color-coded progress bar.
- Stats: total attempts, correct, streak, next-review (relative).
- Attempts history (last 50) with answer, confidence, time, date.
- Notes, last-reviewed timestamp.
- GateOverflow link, Bookmark toggle, Revisit menu, Edit, Practice.

### Practice (`/solve/practice`)
- Modes: `due`, `new`, `wrong`, `weak`, `bookmarked`, `all`; subject filter.
- Stopwatch (per question), Confidence 1–5 selector, Submit.
- Feedback card: correct/wrong, mastery, next-review, explanation, GateOverflow, Bookmark, Revisit, Next.
- LaTeX in statement, options, explanation. NAT handled with float tolerance < 0.01.
- Auto-logs each attempt into today's Practice `study_log` (aggregated per subject).

### Pulse (`/pulse`)
- Today's Mission (top 4 prioritized actions, clickable → deep-link).
- Momentum 0–100 (7-day rolling).
- Due Today: SRS revisions + Timeline-scheduled revisions + Revisits.
- Today's progress: Questions / Minutes vs daily targets (settings).
- Weak Topics (Weakness Engine output).
- GATE Readiness: PYQ %, Revision readiness, Mock readiness.
- Subject Completion: per-subject mastery >= 60 percentage.
- GATE-in countdown + Settings (editable exam date + daily targets).

### Log (`/log`)
- **Large live stopwatch** (Space = start/pause, R = reset, N = open log modal).
- Subject / Activity / Topic + **Journal note** field — saved as a `study_log` on Save.
- View toggles: daily / weekly / monthly.
- **Summary**: total time, sessions, questions, accuracy, active subjects.
- Per-session row: activity, subject, topic, duration, ratio, delete.
- Modal form: full session details for backfill / manual logs.

### Timeline (`/timeline`)
- Daily / Weekly (7-day card row with scroll) / Monthly (heatmap-style grid + sidebar day detail).
- Each cell shows: activity count, study minutes, color-coded bars (study / scheduled rev / revisit).
- Entry modal:
  - All fields (date, subject, activity, title, topic, duration, qs solved, notes, completion_status).
  - **Schedule revisions**: preset +1d/+3d/+7d/+14d/+30d or custom date.
  - **Complete revisions**: per scheduled date, with auto-log.
  - Revisit menu (schedule this timeline_entry for future review).

### Bookmarks (`/solve/bookmarks`) and Mistakes (`/solve/mistakes`)
- Filtered views with quick Practice / Revisit / GateOverflow.

### Cross-cutting
- **Help (?) button** on every major module — `HelpButton` component, content in `lib/helpContent.js`.
- Toast: undo bulk delete.
- Cmd/Ctrl-K command palette.
- LaTeX everywhere via `<Latex>` (KaTeX).
- Empty states + skeletons on every page.
- Responsive: hamburger drawer, bottom-sheet modals, horizontal-scroll tables on small screens.

---

## 8. Algorithms

### 8.1 SRS (Spaced Repetition)
`backend/server.py — submit_practice + _ensure_srs`

- Intervals (days): `[1, 3, 7, 14, 30, 90]`
- On a **correct** attempt: `interval_idx = min(idx+1, 5)`, `consecutive_correct += 1`
- On a **wrong** attempt: `interval_idx = 0`, `consecutive_correct = 0`
- `next_review_date = today + intervals[interval_idx]`
- Counters: `total_attempts`, `correct_attempts`.

### 8.2 Mastery score
`_compute_mastery(srs) ∈ [0, 100]`

```
acc          = correct / total                        # 0..1
interval_pct = (interval_idx / 5) * 100               # 0..100
mastery      = min(100, 0.6 * interval_pct + 40 * acc)
```

Bands used in UI: `< 40` weak (red), `40–79` developing (amber), `>= 80` mastered (green).

### 8.3 Momentum (0–100, 7-day rolling)
`_momentum_score`

```
active_days       = distinct dates in study_logs over last 7 days
subjects_touched  = distinct subjects logged
qs                = sum(questions_attempted)
mins              = sum(duration_min)
revisions_done    = sessions with activity == "Revision"

score  = min(35, active_days * 5)        # consistency
       + min(20, subjects_touched * 3)    # diversity
       + min(20, qs // 5)                 # solve volume
       + min(15, mins // 30)              # hours
       + min(10, revisions_done * 2)      # revision habit
score  = min(100, score)
```

### 8.4 Weakness Engine
`pulse` endpoint, last-30-days window.

- Group attempts by `(subject, topic)`.
- Require `total >= 3` attempts in that bucket.
- Mark as weak if `accuracy < 0.7`.
- Return top 3, sorted ascending by accuracy.

### 8.5 GATE Readiness (composite)
- **PYQ %** = attempts of questions where `year != null` ÷ total such questions.
- **Revision readiness** = `min(100, revisionsCompletedLast7d * 10)`.
- **Mock readiness** = `min(100, avgSubjectCompletion * 0.6 + min(40, mockCount * 5))`.

### 8.6 Due-revisions total (mission counter)
`due_revisions = due_srs + due_timeline_revisions`

- `due_srs`: count of `srs` docs with `next_review_date <= today`.
- `due_timeline_revisions`: across all timeline entries, count `(rd <= today AND rd not in completed_revisions)`.

---

## 9. Coding conventions

- **Backend**
  - Single-file `server.py`. All routes prefixed with `/api`. Mount via `app.include_router(api_router)`.
  - Always store dates as `"YYYY-MM-DD"` strings; timestamps as ISO strings with `datetime.now(timezone.utc).isoformat()`.
  - Use `{"_id": 0}` projection on every find; never return raw `_id`.
  - Pydantic v2 (`model_dump()`, `model_fields`).
  - `Dict[str, Any]` payloads for flexible write endpoints; strict models for response shapes.
  - Mongo client = singleton `AsyncIOMotorClient`. Close on shutdown.

- **Frontend**
  - Functional components with hooks only. Keep components < ~200 lines.
  - Tailwind utility classes; design tokens via `hsl(var(--token))` (theme in `index.css`).
  - Reusable primitives: `Modal`, `Latex`, `RevisitMenu`, `HelpButton`.
  - Every interactive/critical element gets a `data-testid` (kebab-case, descriptive).
  - API access only through `src/lib/api.js` (axios instance with `REACT_APP_BACKEND_URL`). Never hardcode URLs.
  - Optimistic UI for bookmark/toggle; fall back to reload on failure.
  - URL-state (subject, filter, mode) reflected via `useSearchParams` where it makes sense; persisted via `localStorage` for power-user preferences.

- **Testing**
  - Pytest for backend (`backend/tests/`), Playwright via the platform's test agent for end-to-end.
  - Iteration reports live in `/app/test_reports/iteration_N.json`.

---

## 10. Design principles

- **Monochrome surface, single accent.** Background neutrals + one accent (HSL token `--accent`). Status colors: success (green), warning (amber), danger (red), info (blue).
- **2px borders** as the primary structural device (cards, dividers). Avoids the soft-shadow "AI slop" look.
- **Typography**: UI sans + a monospace (`mono` class) for numbers and IDs. Numbers are always tabular.
- **Information density** comes first on Repository/Log; whitespace dominates on Pulse/Practice.
- **Motion**: 150ms transitions on color/background only; `active:scale-[0.97]` micro-feedback on buttons. Modals slide up on mobile.
- **Accessibility**: focus outlines preserved (`:focus-visible` 2px accent), all icons paired with text or `aria-label`, color is never the only signal (icons accompany state).

---

## 11. Current version

- Tag: **v1.0** (frozen). Header still displays "v1.1" (build tag — leave as-is unless re-released).
- Backend `/api/` returns `{"app": "BYOPGateCS.studio", "status": "ok"}`.
- Vercel-ready frontend (`frontend/vercel.json`); backend needs a separate long-running host.

### v1.0 — frozen state (open-source baseline)
- Question Details Modal (LaTeX, attempts, mastery, revision status, GateOverflow).
- Repository column sorting + remembered filters/sort.
- Double-click row → Details Modal.
- Log stopwatch (Space/R/N shortcuts) + journal field + session summary.
- Jan-1 countdown widget in header.
- Timeline-scheduled revisions correctly counted in Pulse + Mission.
- Contextual `?` help on Repository, Practice, Pulse, Log, Timeline.
- Full mobile responsiveness (hamburger, bottom-sheet modals, no horizontal overflow).
- Final cleanup pass: zero lint warnings, dead files removed, `.env.example` for both services, comprehensive `.gitignore`, full `README.md`, `HOW_TO_CODE_THIS_PROJECT.txt`.

---

## 12. Pending improvements (P0 → P3)

### P0 — production hardening
- Replace N+1 patterns in `list_questions`, `/practice/next?mode=wrong/new`, `/pulse` with batch `$in` fetches and `db.attempts.distinct("question_id")`.
- Server-side pagination on Repository (currently `limit=1000`).

### P1 — UX polish
- Full keyboard navigation in Repository (arrows + Enter to open details).
- Practice "session navigator": queue of upcoming questions with back/forward.
- Confidence-vs-correct reflection card after each Practice session.
- Weekly summary card in Log (Sun: this-week vs last-week diff).
- Per-mission `data-testid="mission-item-<id>"` on Pulse.

### P2 — Features
- Pomodoro mode in Log stopwatch (25/5).
- Mock test runner with timer + per-question split.
- Subject-completion drill-down on Pulse.
- Shareable Pulse snapshot (one-tap PNG export of today's stats).

### P3 — Infra
- Move auto-seed behind first-run check.
- Optional auth (single-user → multi-device sync via JWT).
- Background job for daily digest email (SendGrid).

---

## 13. Deployment notes

### Vercel (frontend)
```
Project root:    /app/frontend
Framework:       Create React App (auto-detected from vercel.json)
Build command:   yarn build
Output dir:      build
Env vars:        REACT_APP_BACKEND_URL=<your-backend-https-url>
```
`vercel.json` already includes SPA rewrites (`/(.*)` → `/index.html`).

### Backend hosting
- Vercel serverless is incompatible with the long-lived Motor/Mongo client.
- Recommended: Render, Railway, Fly.io, or the Emergent preview itself.
- Required env: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS=<vercel-domain>` (comma-separated for multiple).

### Healthcheck
- `GET /api/` returns 200 `{"app":"BYOPGateCS.studio","status":"ok"}`.

---

- `.env.example` files are committed in both `backend/` and `frontend/`.
- Backend env: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`.
- Frontend env: `REACT_APP_BACKEND_URL` (and optionally `WDS_SOCKET_PORT`).

*Last updated: 2026-06-27 (v1.0 — frozen open-source baseline).*
