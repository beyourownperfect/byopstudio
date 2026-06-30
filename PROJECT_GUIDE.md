# BYOPGateCS.studio — Complete Project Guide

A step-by-step guide to understanding and rebuilding this full-stack application from scratch — written for someone who knows basic JavaScript and Python but has never built a complete full-stack app.

---

## Table of Contents

1. [What This App Is](#1-what-this-app-is)
2. [Tech Stack & Why Each Choice](#2-tech-stack--why-each-choice)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema](#4-database-schema)
5. [SRS Algorithm](#5-srs-algorithm)
6. [API Routes Reference](#6-api-routes-reference)
7. [Frontend Structure](#7-frontend-structure)
8. [Build From Scratch: Step-by-Step](#8-build-from-scratch-step-by-step)
9. [Design System](#9-design-system)
10. [Key Design Decisions](#10-key-design-decisions)

---

## 1. What This App Is

BYOPGateCS.studio ("Be Your Own Perfect — GATE CS") is a **single-user study operating system** for the GATE Computer Science exam in India. It replaces paper planners with a closed-loop workflow:

```
Capture questions → Solve under SRS → Schedule revisions → Reflect on Pulse
```

### The problem it solves

GATE CS aspirants study 12 subjects over 6-8 months. Without spaced repetition, they forget most of what they study. BYOP creates a feedback loop: every question you solve schedules its own review. The Pulse dashboard surfaces exactly what to do each day.

### Key principles

- **One source of truth** — every question, attempt, log, and revision lives in MongoDB
- **No planning ceremony** — open Pulse, do the Mission, repeat
- **Spaced repetition is the substrate** — mastery comes from correct recall at increasing intervals
- **Self-feedback** — capture confidence with each attempt; the gap between confidence and correctness reveals blind spots
- **Single-user, no auth** — eliminates an entire class of complexity

---

## 2. Tech Stack & Why Each Choice

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | **React 19** (via CRA + craco) | CRA gives zero-config React. Most beginners know it. craco lets you override CRA config (needed for path aliases like `@/`) |
| Styling | **TailwindCSS 3** | Utility-first CSS. No `.css` files to manage. Responsive prefixes (`sm:`, `md:`, `lg:`) are built-in |
| UI primitives | **Radix UI** (46 components) | Headless, accessible components. You style them yourself with Tailwind — no fighting a component library's CSS |
| Icons | **lucide-react** | Clean, consistent icon set. Tree-shakeable |
| Math rendering | **react-katex** | LaTeX rendering for math/CS notation. `$...$` for inline, `$$...$$` for display |
| Routing | **react-router-dom v7** | Standard React routing. `useNavigate`, `useSearchParams` handle navigation |
| Backend | **FastAPI** (Python 3.11+) | Async by default. Automatic OpenAPI docs. Pydantic validation built in |
| Database driver | **Motor** | Async MongoDB driver for Python. Works with async/await |
| ORM/validation | **Pydantic v2** | Define models once, get validation + serialization + docs |
| Database | **MongoDB Atlas** (free M0 tier) | Document database. No schema migrations. Flexible for a single-user app |
| Deployment | **Render** (single web service) | Free tier. FastAPI serves React build from one URL. No separate frontend/backend hosts |
| Package manager | **Yarn** (frontend), **pip** (backend) | Yarn is faster than npm. pip is standard for Python |

### Why NOT these alternatives?

- **Next.js instead of CRA?** Too much framework overhead for a SPA that FastAPI already serves. No SSR needed.
- **PostgreSQL instead of MongoDB?** Would need migrations, schemas, and an ORM like SQLAlchemy. MongoDB's schema flexibility is perfect for a single-user app that evolves rapidly.
- **Redux/Zustand?** No cross-page shared state needs it. `useState` + URL params + a tiny localStorage key covers everything.
- **Auth?** The app is for one person. Auth would add user models, sessions, tokens, and profile screens with zero benefit.

---

## 3. Architecture Overview

```
┌──────────────────────────────────────┐
│          Render Web Service           │
│                                      │
│  ┌────────────────────────────────┐  │
│  │     FastAPI (Uvicorn, $PORT)    │  │
│  │                                │  │
│  │   /api/*  → FastAPI routes     │  │
│  │   /*      → React SPA (static) │  │
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │
       ┌───────▼────────┐
       │  MongoDB Atlas  │
       │  (M0 free tier) │
       └────────────────┘
```

### How it works in production

1. Render runs `uvicorn server:app --host 0.0.0.0 --port $PORT`
2. FastAPI mounts `frontend/build/` as static files
3. `/api/*` routes are handled by FastAPI route handlers
4. All other paths serve `index.html` (React Router handles the SPA)
5. React fetches from `/api/*` — same origin, no CORS issues

### How it works in local development

1. **Terminal 1**: `cd backend && uvicorn server:app --port 8000`
2. **Terminal 2**: `cd frontend && yarn start`
3. React dev server runs on `localhost:3000`, proxies unknown requests to `localhost:8000`
4. Or: set `REACT_APP_BACKEND_URL=http://localhost:8000` in `frontend/.env`

### Backend: single-file by design

All backend logic lives in `backend/server.py` (~1400 lines). This is intentional:

- You can read the entire backend in one sitting
- No jumping between files to trace a request
- No premature abstraction
- When it passes ~2000 lines, split by domain (questions.py, srs.py, pulse.py)

### Frontend: page-per-file structure

| File | What it renders |
|------|----------------|
| `pages/Pulse.jsx` | Daily dashboard |
| `pages/Repository.jsx` | Question CRUD + table |
| `pages/Practice.jsx` | SRS practice sessions |
| `pages/Bookmarks.jsx` | Starred questions |
| `pages/Mistakes.jsx` | Wrong answers |
| `pages/Log.jsx` | Stopwatch + study logs |
| `pages/Timeline.jsx` | Calendar + revisions |
| `components/Layout.jsx` | Header, nav, mobile drawer |
| `components/Modal.jsx` | Bottom-sheet modal base |
| `components/QuestionFormModal.jsx` | Create/edit question |
| `components/QuestionDetailsModal.jsx` | Read-only details |
| `components/MissionCard.jsx` | User-authored missions |
| `components/MarkdownRenderer.jsx` | Markdown + code blocks |
| `components/Latex.jsx` | KaTeX wrapper |
| `components/RevisitMenu.jsx` | Revisit scheduling dropdown |
| `components/HelpButton.jsx` | Contextual help popup |
| `components/CommandPalette.jsx` | Cmd/Ctrl+K navigation |
| `lib/api.js` | Axios client, all endpoint functions |
| `lib/constants.js` | Subject codes, labels, test IDs |
| `lib/dateUtils.js` | Date formatting helpers |
| `lib/helpContent.js` | Help text per module |
| `lib/utils.js` | General utilities |

---

## 4. Database Schema

### All collections and their fields

#### `questions`
```
id: string (UUID)
subject: string          # "C", "DS", "AL", "OS", "DB", "COA", "TOC", "CD", "DL", "EM", "DM", "CN"
topic: string
question_type: string    # "MCQ" | "MSQ" | "NAT"
statement: string        # Supports LaTeX ($...$ and $$...$$)
options: [string]        # For MCQs
correct_answer: string   # MCQ: "A", MSQ: "A,C", NAT: "42"
explanation: string      # Supports LaTeX
gateoverflow_url: string
exam_source: string      # "GATE" | "ISRO" | "GO DPP" | ...
exam_source_other: string
year: int|null
difficulty: string       # "Easy" | "Medium" | "Hard"
bookmarked: bool
notes: string
created_at: string (ISO)
updated_at: string (ISO)
```

#### `srs`
```
id: string (UUID)
question_id: string      # References questions.id
interval_idx: int        # 0-5 (maps to SRS_INTERVALS)
next_review_date: string # "YYYY-MM-DD"
last_reviewed: string|null
total_attempts: int
correct_attempts: int
consecutive_correct: int
```

#### `attempts`
```
id: string (UUID)
question_id: string
correct: bool
confidence: int          # 1-5
user_answer: string
time_taken_sec: int
created_at: string (ISO)
```

#### `study_logs`
```
id: string (UUID)
activity: string         # "Lecture" | "Practice" | "Revision" | "Mock Test" | "Reading"
subject: string
topic: string
duration_min: int
questions_attempted: int
questions_correct: int
questions_wrong: int
remarks: string          # Journal note
date: string             # "YYYY-MM-DD"
timeline_entry_id: string|null
created_at: string (ISO)
```

#### `timeline`
```
id: string (UUID)
subject: string
topic: string
activity: string
title: string
duration_min: int
questions_solved: int
notes: string
date: string             # "YYYY-MM-DD"
scheduled_revisions: [string]    # ["2026-01-15", "2026-01-22"]
completed_revisions: [string]    # ["2026-01-15"]
completion_status: string # "planned" | "in_progress" | "completed"
created_at: string (ISO)
```

#### `revisits`
```
id: string (UUID)
item_type: string        # "question" | "note" | "journal" | ...
item_id: string
item_title: string
item_subject: string|null
revisit_date: string     # "YYYY-MM-DD"
completed: bool
completed_at: string|null
created_at: string (ISO)
```

#### `settings`
```
id: "singleton"          # Always the same document
exam_date: string        # "2026-02-07"
daily_question_target: int  # default 20
daily_revision_target: int  # default 10
daily_study_minutes_target: int  # default 240
updated_at: string (ISO)
```

#### `user_missions`
```
id: string (UUID)
title: string
notes: string
order: int
completed: bool
completed_at: string|null
created_at: string (ISO)
updated_at: string (ISO)
```

#### `lectures`
```
id: string (UUID)
subject: string
topic: string
lecture_name: string
lecture_number: string   # "12/42"
duration_min: int
completion_percent: int  # 0-100
notes_done: bool
revision_done: bool
created_at: string (ISO)
updated_at: string (ISO)
```

#### `subject_completion`
```
id: string (UUID)
subject: string
topic: string
lectures_completed: bool
notes_created: bool
flashcards_created: bool
pyqs_completed: bool
revision_completed: bool
subject_test_completed: bool
dpp_completed: bool
weekly_quiz_completed: bool
can_explain_without_notes: bool
created_at: string (ISO)
updated_at: string (ISO)
```

### Why UUIDs not ObjectIds

MongoDB's default `_id` is an ObjectId — not JSON-serializable without custom handling. Using `id: str(uuid.uuid4())` everywhere means:
- Zero serialization issues
- All `find()` calls use `{"_id": 0}` projection
- No custom JSON encoders needed

---

## 5. SRS Algorithm

### Overview

A simplified Leitner system with 6 intervals. Each question gets one `srs` record.

### Intervals

```python
SRS_INTERVALS = [1, 3, 7, 14, 30, 90]  # days
```

### On submit (correct)

```python
srs["interval_idx"] = min(srs["interval_idx"] + 1, 5)
srs["consecutive_correct"] += 1
srs["correct_attempts"] += 1
srs["total_attempts"] += 1
srs["next_review_date"] = today + SRS_INTERVALS[new_idx]
```

### On submit (incorrect)

```python
srs["interval_idx"] = 0
srs["consecutive_correct"] = 0
srs["total_attempts"] += 1
srs["next_review_date"] = today + SRS_INTERVALS[0]  # tomorrow
```

### Mastery calculation

```python
def _compute_mastery(srs: dict) -> int:
    """0-100. 60% weight from interval progress, 40% from accuracy."""
    if not srs or srs.get("total_attempts", 0) == 0:
        return 0
    accuracy = srs["correct_attempts"] / srs["total_attempts"]
    interval_pct = (srs.get("interval_idx", 0) / 5) * 100
    return int(min(100, 0.6 * interval_pct + 40 * accuracy))
```

### Completion check

A question is "completed" when the student has proven they can recall it at longer intervals:

```python
def _is_question_completed(srs: dict) -> bool:
    return srs.get("interval_idx", 0) >= 3 and srs.get("correct_attempts", 0) >= 3
```

This requires at least 3 correct answers advancing through intervals 0→1→2→3 (1, 3, 7, 14 days).

### Question Mastery (aggregate)

Average `_compute_mastery()` across all questions that have at least 1 attempt.

### Momentum Score (0-100)

A 7-day rolling score rewarding consistency over heroics:

| Factor | Formula | Cap |
|--------|---------|-----|
| Daily consistency | active_days × 5 | 35 |
| Subject diversity | subjects_touched × 3 | 20 |
| Solve volume | questions_attempted ÷ 5 | 20 |
| Hours invested | study_minutes ÷ 30 | 15 |
| Revision habit | revisions_done × 2 | 10 |

One big day cannot max the score — you need to show up consistently.

### Weakness Engine

Scans last 30 days of attempts. A subject-topic pair is "weak" if:
- At least 3 attempts
- Accuracy < 70%

Top 3 weakest are surfaced on Pulse.

### Preparation Snapshot

Four independent metrics derived from existing data:

| Metric | Source | Formula |
|--------|--------|---------|
| Subject Coverage | `questions` + `srs` | % of questions with `_is_question_completed()` = true |
| Question Mastery | `srs` | Average `_compute_mastery()` across all attempted questions |
| Revision Completion | `study_logs` | `min(100, revision_sessions_last_7_days × 10)` |
| Mock Readiness | `study_logs` + subject coverage | `min(100, avg_sub_coverage × 0.6 + min(40, mock_count × 5))` |

Mock Readiness gracefully hides (opacity-50, "Log a Mock Test to unlock") until at least one mock test is logged.

---

## 6. API Routes Reference

Base URL: `/api`

### Health & Meta

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/` | `{"app":"BYOPGateCS.studio","status":"ok"}` |
| `GET` | `/api/meta` | `{subjects, activities, srs_intervals, exam_sources, question_types, difficulties}` |

### Settings

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/settings` | — | Settings document |
| `PUT` | `/api/settings` | `{exam_date, daily_question_target, ...}` | Updated settings |

### Questions

| Method | Path | Params/Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/questions` | `?search=&subject=&mode=&sort=&order=&offset=&limit=` | `{items: [...], total: N}` |
| `GET` | `/api/questions/{qid}` | — | Question with SRS + attempts |
| `POST` | `/api/questions` | Question fields | Created question |
| `PUT` | `/api/questions/{qid}` | Partial question fields | Updated question |
| `DELETE` | `/api/questions/{qid}` | — | `{"success": true}` |
| `POST` | `/api/questions/bulk-delete` | `{ids: [...]}` | `{"success": true, deleted_count: N}` |
| `POST` | `/api/questions/bulk-create` | `{rows: [{subject, topic, ...}]}` | `{items: [...], total: N}` |

### Practice & SRS

| Method | Path | Params/Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/practice/next` | `?mode=&subject=` | `{question, srs, attempts, ...}` |
| `POST` | `/api/practice/submit` | `{question_id, correct, confidence, answer, time_taken_sec}` | `{attempt, srs, mastery, next_review_date, feedback}` |
| `GET` | `/api/srs/due` | — | `{items: [...], total: N}` |

### Study Logs

| Method | Path | Params/Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/study-logs` | `?start=&end=&subject=&activity=` | `{items: [...], total: N}` |
| `POST` | `/api/study-logs` | `{activity, subject, topic, duration_min, ...}` | Created log |
| `DELETE` | `/api/study-logs/{log_id}` | — | `{"success": true}` |

### Timeline

| Method | Path | Params/Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/timeline` | `?start=&end=` | `{items: [...], total: N}` |
| `GET` | `/api/timeline/{entry_id}` | — | Entry document |
| `POST` | `/api/timeline` | `{subject, activity, title, date, ...}` | Created entry |
| `PUT` | `/api/timeline/{entry_id}` | Partial fields | Updated entry |
| `DELETE` | `/api/timeline/{entry_id}` | — | `{"success": true}` |
| `POST` | `/api/timeline/{entry_id}/schedule-revision` | `{date}` or `{days}` | `{scheduled_revisions: [...]}` |
| `POST` | `/api/timeline/{entry_id}/complete-revision` | `{date}` | `{completed_revisions: [...]}` |

### Revisits

| Method | Path | Params/Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/revisits` | `?completed=&due_only=&item_type=` | `{items: [...], total: N}` |
| `POST` | `/api/revisits` | `{item_type, item_id, item_title, revisit_date}` | Created revisit |
| `POST` | `/api/revisits/{rid}/complete` | — | Updated revisit (marked complete) |
| `DELETE` | `/api/revisits/{rid}` | — | `{"success": true}` |

### Pulse & Calendar

| Method | Path | Params | Response |
|--------|------|--------|----------|
| `GET` | `/api/pulse` | — | `{today, mission, momentum, preparation_snapshot, due_revisions, weak_topics, subject_completion, user_missions, ...}` (5s in-memory cache, invalidated on mutations) |
| `GET` | `/api/pulse/topic-readiness` | — | Lazy-loaded per-topic readiness (batched queries, no per-topic DB calls) |
| `GET` | `/api/calendar` | `?start=&end=` | `{days: [{date, study_minutes, questions_solved, ...}]}` |
| `GET` | `/api/mistakes` | `?mode=` | `{items: [questions with SRS]}` |

### User Missions

| Method | Path | Params/Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/user-missions` | — | `{items: [...], total: N}` |
| `POST` | `/api/user-missions` | `{title, notes, order}` | Created mission |
| `PUT` | `/api/user-missions/{mid}` | Partial fields | Updated mission |
| `DELETE` | `/api/user-missions/{mid}` | — | `{"success": true}` |
| `POST` | `/api/user-missions/reorder` | `{ids: [...]}` | `{"success": true}` |

### Lectures & Subject Completion

| Method | Path | Params/Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/lectures` | `?subject=&topic=` | `{items: [...], total: N}` |
| `POST` | `/api/lectures` | `{subject, topic, lecture_name, ...}` | Created lecture |
| `PUT` | `/api/lectures/{lid}` | Partial fields | Updated lecture |
| `DELETE` | `/api/lectures/{lid}` | — | `{"success": true}` |
| `GET` | `/api/subject-completion` | `?subject=&topic=` | `{items: [...], total: N}` |
| `POST` | `/api/subject-completion` | `{subject, topic, lectures_completed, ...}` | Upserted document |

### Seed

| Method | Path | Response |
|--------|------|----------|
| `POST` | `/api/seed-demo` | `{items: [...], total: N}` (seeds 50 demo questions across 12 subjects) |

---

## 7. Frontend Structure

### Routing

All routes defined in `App.js`:

```jsx
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<Navigate to="/pulse" replace />} />
    <Route path="pulse" element={<Pulse />} />
    <Route path="solve" element={<Navigate to="/solve/repository" replace />} />
    <Route path="solve/repository" element={<Repository />} />
    <Route path="solve/practice" element={<Practice />} />
    <Route path="solve/bookmarks" element={<Bookmarks />} />
    <Route path="solve/mistakes" element={<Mistakes />} />
    <Route path="log" element={<Log />} />
    <Route path="timeline" element={<Timeline />} />
    <Route path="*" element={<Navigate to="/pulse" replace />} />
  </Route>
</Routes>
```

`Layout.jsx` renders the header (logo, nav tabs, countdown) and an `<Outlet/>` for page content. On mobile, nav collapses into a hamburger drawer.

### API client pattern

All API calls go through `lib/api.js`:

```js
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

const c = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

// Example:
export const pulseApi = {
  get: () => c.get("/pulse").then((r) => r.data),
};
```

Every endpoint function returns the unwrapped `.data`. No pages import axios directly — they import `{ pulseApi }` from `@/lib/api`.

### State management

No state library. The app uses:
- `useState` + `useEffect` for page-local data
- URL search params (`useSearchParams`) for filter/sort state (persists across refreshes)
- `localStorage` for user preferences (filter mode, sort column)

### Data-testid convention

Every interactive element gets a `data-testid` attribute. These are defined in `lib/constants.js` under `TID`. Pattern:

```js
repoRow: (id) => `repo-row-${id}`,        // dynamic
practiceSubmit: "practice-submit",         // static
pulseMomentum: "pulse-momentum",           // section
```

---

## 8. Build From Scratch: Step-by-Step

### Phase A: Skeleton (~3 hours)

#### A1. Set up the project folder
```
mkdir byopstudio
cd byopstudio
git init
```

#### A2. Set up the backend
```
mkdir backend
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install fastapi uvicorn motor python-dotenv "pydantic>=2"
```

Create `backend/server.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="BYOPStudio")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/api/")
async def root():
    return {"app": "BYOPStudio", "status": "ok"}
```

Test it:
```
uvicorn server:app --reload --port 8000
curl http://localhost:8000/api/
# → {"app":"BYOPStudio","status":"ok"}
```

#### A3. Set up the frontend
```
cd ..
npx create-react-app frontend
cd frontend
yarn add axios react-router-dom lucide-react react-katex date-fns
```

Configure TailwindCSS (follow [official CRA guide](https://tailwindcss.com/docs/guides/create-react-app)).

Set up path aliases via `craco.config.js`:
```js
const path = require("path");
module.exports = {
  webpack: { alias: { "@": path.resolve(__dirname, "src") } },
};
```

Test: `yarn start` → opens `localhost:3000`.

#### A4. Connect frontend to backend

In `frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

In `frontend/src/App.js`, fetch `/api/` on mount and verify it shows "ok".

### Phase B: Question CRUD (~4 hours)

This is the most important phase — master it and the rest follows the same pattern.

#### B1. Define Pydantic models

In `server.py`:
```python
class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject: str
    topic: str = ""
    question_type: Literal["MCQ", "MSQ", "NAT"] = "MCQ"
    statement: str
    options: List[str] = Field(default_factory=list)
    correct_answer: str = ""
    explanation: str = ""
    year: Optional[int] = None
    difficulty: Literal["Easy", "Medium", "Hard"] = "Medium"
    bookmarked: bool = False
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
```

#### B2. Add MongoDB connection

```python
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "byopstudio")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
```

#### B3. Create CRUD routes

```python
@api_router.post("/questions")
async def create_question(q: QuestionCreate):
    question = Question(**q.model_dump()).model_dump()
    await db.questions.insert_one(question)
    return question

@api_router.get("/questions")
async def list_questions(search: str = "", subject: str = "", ...):
    query = {}
    if subject:
        query["subject"] = subject
    if search:
        query["$or"] = [
            {"statement": {"$regex": search, "$options": "i"}},
            {"explanation": {"$regex": search, "$options": "i"}},
        ]
    items = await db.questions.find(query, {"_id": 0}).to_list(1000)
    return {"items": items, "total": len(items)}

# PUT, DELETE, bulk-delete, bulk-create follow the same pattern
```

#### B4. Build the Repository page

Create `frontend/src/pages/Repository.jsx`:
- Fetch questions with `questionsApi.list(params)`
- Render a table with columns: subject, topic, type, statement (truncated), year, mastery, actions
- "New Question" button opens `QuestionFormModal.jsx`
- Row click opens `QuestionDetailsModal.jsx`
- Filters: subject dropdown, search input, mode selector
- Bulk select checkboxes
- Export/Import CSV buttons

#### B5. Add `api.js` functions

```js
export const questionsApi = {
  list: (params = {}) => c.get("/questions", { params }).then(r => r.data),
  get: (id) => c.get(`/questions/${id}`).then(r => r.data),
  create: (data) => c.post("/questions", data).then(r => r.data),
  update: (id, data) => c.put(`/questions/${id}`, data).then(r => r.data),
  remove: (id) => c.delete(`/questions/${id}`).then(r => r.data),
};
```

### Phase C: Practice + SRS (~6 hours) — THE HEART

#### C1. Add SRS and Attempt models

```python
class Attempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_id: str
    correct: bool
    confidence: int = 3
    user_answer: str = ""
    time_taken_sec: int = 0
    created_at: str = Field(default_factory=now_iso)

class SrsRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_id: str
    interval_idx: int = 0
    next_review_date: str = Field(default_factory=today_iso)
    total_attempts: int = 0
    correct_attempts: int = 0
    consecutive_correct: int = 0
```

#### C2. Practice endpoints

```python
@api_router.get("/practice/next")
async def practice_next(mode: str = "due", subject: str = ""):
    # Mode = "due": find srs records with next_review_date <= today
    # Mode = "new": find questions with no srs record
    # Mode = "weak": find questions with mastery < 40
    # Mode = "wrong": find questions with recent wrong answers
    # ...
    return {"question": q, "srs": srs_record, ...}

@api_router.post("/practice/submit")
async def practice_submit(payload: dict):
    # 1. Record the attempt
    # 2. Update SRS record (correct → advance interval, wrong → reset)
    # 3. Auto-log a study session
    # 4. Return feedback + mastery
    return {"attempt": attempt, "srs": srs, "mastery": mastery, ...}
```

#### C3. Build the Practice page

Create `frontend/src/pages/Practice.jsx`:
- Mode selector (Due, New, Weak, Wrong, Bookmarked, All)
- Subject filter
- "Start" button to fetch next question
- Question card: render statement (with LaTeX), show options, confidence slider, submit button
- Feedback card: correct/incorrect, explanation, mastery bar, next review date
- "Next Question" button
- Stopwatch per question
- Bookmark/revisit controls
- Question navigator sidebar

### Phase D: Pulse Dashboard (~3 hours)

#### D1. Create `/api/pulse` endpoint

This is the most complex endpoint — it aggregates data from 7 collections:

```python
@api_router.get("/pulse")
async def pulse():
    # Due revisions (SRS + timeline)
    # Today's progress (questions, minutes)
    # Weak topics (last 30 days, accuracy < 70%, min 3 attempts)
    # Subject completion (per-subject % with _is_question_completed)
    # Momentum score (7-day rolling 5-factor score)
    # Question mastery (average _compute_mastery across all attempted)
    # Mock readiness
    # Preparation snapshot (4 independent metrics)
    # Today's mission (top 4 prioritized actions)
    return { ... }
```

#### D2. Build the Pulse page

Create `frontend/src/pages/Pulse.jsx`:
- Header: date + countdown to exam
- MissionCard (user-authored tasks — receives pre-fetched `user_missions` from pulse response, no separate API call)
- **Preparation Snapshot**: 4 progress bars (Subject Coverage, Question Mastery, Revision Completion, Mock Readiness)
- 3-column: Momentum | Due Today | Today's Progress
- Weak Topics (collapsible)
- Subject Completion (12-row breakdown)
- **Topic Readiness** lazy-loaded via `/api/pulse/topic-readiness` — renders after initial dashboard paint

### Phase E: Log + Timeline (~5 hours)

#### E1. Study Logs

- `POST /api/study-logs` — manual log creation
- `GET /api/study-logs?start=&end=` — list with date range
- Auto-logs: practice submit creates a log. Timeline complete-revision creates a log.

**Stopwatch in Log page:**
```jsx
const [elapsed, setElapsed] = useState(0);
const [running, setRunning] = useState(false);
const startRef = useRef(null);

useEffect(() => {
  if (!running) return;
  const id = setInterval(() => {
    setElapsed(Date.now() - startRef.current);
  }, 250);
  return () => clearInterval(id);
}, [running]);

const toggle = () => {
  if (!running) startRef.current = Date.now() - elapsed;
  setRunning(!running);
};
```

#### E2. Timeline

- Entry CRUD (subject, activity, title, date, duration, notes)
- Schedule revisions: +1d, +3d, +7d, +14d, +30d presets, or custom date
- Complete revisions: marks revision done, auto-creates a study log
- Calendar view: daily, weekly, monthly
- Virtual revision items on target dates

### Phase F: Polish (~4 hours)

1. **Filters, sort, search** on Repository (multi-select bulk actions, localStorage preferences)
2. **CSV import/export** using PapaParse on frontend, parse on backend
3. **Cmd/Ctrl+K command palette** — modal with input, searches pages/actions
4. **Help popups** — reusable `HelpButton` component, per-module content in `helpContent.js`
5. **Mobile responsiveness** — hamburger drawer, bottom-sheet modals, overflow-x-auto tables
6. **LaTeX rendering** — `react-katex` wrapper that catches parse errors
7. **Markdown rendering** — `MarkdownRenderer` for explanations and notes
8. **OCR import** — paste screenshot, send to backend for text extraction

### Phase G: Deploy

1. Push to GitHub
2. Set up MongoDB Atlas (free M0 cluster, whitelist `0.0.0.0/0`)
3. Create `render.yaml` at project root
4. Connect Render to GitHub repo
5. Set environment variables: `MONGO_URL`, `DB_NAME`
6. Deploy — Render builds frontend + backend, serves both from one URL

See `DEPLOYMENT.md` for detailed Render deployment steps.

---

## 9. Design System

### Color tokens

CSS variables define the entire palette:

```css
:root {
  --bg: 0 0% 100%;              /* White */
  --bg-elev: 0 0% 96%;          /* Light gray surface */
  --bg-elev-2: 0 0% 90%;        /* Darker gray for progress bar bg */
  --fg: 0 0% 10%;               /* Near-black text */
  --fg-muted: 0 0% 45%;         /* Muted text (labels, hints) */
  --fg-subtle: 0 0% 65%;        /* Very muted (captions) */
  --border: 0 0% 85%;           /* Card and input borders */
  --accent: 210 100% 45%;       /* Single accent color (blue) */
  --success: 145 65% 40%;       /* Green */
  --warning: 38 92% 45%;        /* Amber */
  --danger: 0 75% 50%;          /* Red */
  --info: 210 100% 45%;         /* Blue */
}
```

### Typography

- **Sans-serif**: System font stack (`-apple-system, Segoe UI, Roboto, ...`)
- **Mono**: System mono stack (`SF Mono, Fira Code, Consolas, ...`)
- All sizing via Tailwind utilities (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-2xl`)

### Spacing & borders

- **Card**: `.card-2` — `border-2 border-[hsl(var(--border))] rounded bg-[hsl(var(--bg))]`
- **No soft shadows** — structure comes from 2px borders, not drop shadows
- **Section spacing**: `space-y-4` between cards
- **Transitions**: `transition-colors` (150ms) on hover/active states; `active:scale-[0.97]` on buttons

### Class conventions

| Class | Purpose |
|-------|---------|
| `.card-2` | Card container with 2px border, white bg, rounded |
| `.btn` | Base button: px-4 py-2 border-2 rounded font-medium |
| `.btn-primary` | Filled accent button |
| `.btn-ghost` | Borderless, transparent bg |
| `.input` | Text input: border-2 rounded px-3 py-2 |
| `.label-x` | Extra-small uppercase label: text-[10px] uppercase tracking-wider |
| `.chip` | Small badge: px-2 py-0.5 rounded-full text-xs |
| `.chip-danger` | Red chip |
| `.mono` | Monospace font |
| `.skeleton` | Loading placeholder: bg-gray-200 animate-pulse rounded |
| `.row-hover` | hover:bg accent on table rows |

### Responsive breakpoints

- `sm:` (640px) — 2-column grids
- `md:` (768px) — 3-column grids, hamburger → full nav
- `lg:` (1024px) — wider layouts
- Tables: `overflow-x-auto` on mobile
- Modals: `fixed bottom-0` sheet on mobile, centered `max-w-md` on desktop

---

## 10. Key Design Decisions

### Single-file backend

`server.py` is ~1400 lines. Every route, model, helper, and seed function lives in one file. This was intentional:
- A solo developer can read the entire backend in 30 minutes
- No import spaghetti — everything is either a function or a route
- The file only needs splitting when it reaches ~2000 lines
- When split, split by **domain** (questions.py, srs.py, pulse.py), not by layer (routes.py, models.py, services.py)

### UUID strings, not ObjectIds

Every document has `id: str = Field(default_factory=lambda: str(uuid.uuid4()))`. MongoDB's `_id` is stripped with `{"_id": 0}` projection everywhere. This eliminates serialization headaches — no custom JSON encoders, no BSON dependencies in the frontend.

### Optimistic UI with server authority

When you bookmark a question in the table, the UI updates immediately (optimistic). The server validates and persists. If the server fails, a toast shows the error. This makes the app feel local-first even though all data lives in Atlas.

### No auth

The app is designed for a single person. Adding auth would require: user model, registration, login, JWT/sessions, middleware, protected routes, profile page, password reset — all for zero user-facing value. The app is deployed to a private Render URL. If multi-user support is ever needed, it should be the first thing added.

### No state management library

`useState` + URL params + localStorage covers every use case:
- Page data: `useState` + `useEffect` (fetch on mount)
- Filters/sort: URL search params (persist across refresh, shareable)
- User preferences: localStorage (theme, last-used filter mode)
- Cross-page state: none exists (each page is independent)

### Monochrome + one accent

The design uses grayscale + a single HSL accent token. This is from "Refactoring UI" — limit your color palette to one accent and let structure (borders, spacing, typography) do the work. No gradients, no color-coded subject badges, no decorative elements.

### LaTeX by default

GATE CS has heavy math and formal notation. `react-katex` wraps every question statement and explanation. The `Latex.jsx` component handles both `$...$` (inline) and `$$...$$` (display) syntax, with error boundaries for malformed input.

---

## Appendix: Quick Reference Commands

### Local development

```bash
# Backend (Terminal 1)
cd backend
.venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload

# Frontend (Terminal 2)
cd frontend
yarn start
```

### Production build

```bash
cd frontend
yarn build
# Serves from frontend/build/
```

### Seed demo data

```bash
curl -X POST http://127.0.0.1:8000/api/seed-demo
```

### Running tests

```bash
cd backend
.venv\Scripts\python.exe -m pytest tests/ -v
```

---

That's the complete guide. You should now be able to understand every part of BYOPGateCS.studio and rebuild it from scratch.

Now close this file and start coding.
