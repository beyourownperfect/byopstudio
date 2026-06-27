# BYOPGateCS.studio — Study OS

## Problem Statement
Single-user GATE CSE preparation operating system, cloned from `beyourownperfect/blum`.

## Tech Stack
- Backend: FastAPI + Motor (MongoDB)
- Frontend: React 19 (CRA + craco) + TailwindCSS + Radix UI
- Auth: none (single-user)

## Modules
- **Pulse** — today's mission, momentum, weak topics, GATE readiness, subject completion
- **Solve** — Repository / Practice (SRS) / Bookmarks / Mistakes
- **Log** — manual + auto-logged study sessions
- **Timeline** — daily/weekly/monthly calendar + scheduled revisions

## Implementation history

### 2026-06-27 — v1.0 freeze (final engineering pass)
- **Code cleanup**: removed dead files (`/app/yarn.lock`, `/app/tests/`, `frontend/src/constants/testIds/`), unused imports (`Query`), `import random` moved to top.
- **Backend lint**: zero issues — removed all multi-statement lines (E701), renamed ambiguous `l` → `log_entry`, fixed potential ObjectId-leak in `_get_settings()`.
- **Frontend lint**: zero issues in app code — removed unused `eslint-disable` directives across pages, escaped HTML entities in user-facing strings.
- **Comments added** for non-obvious algorithm logic: `_compute_mastery`, `_momentum_score`, SRS update rule in `/practice/submit`, weakness engine in `/pulse`, scheduled-revision projection in `/timeline`.
- **`.gitignore` hardened**: added `.env`, `.env.*` (except `.env.example`), `__pycache__/`, `.pytest_cache/`, `test_reports/`.
- **`.env.example`** added in both `backend/` and `frontend/` with full inline documentation.
- **`README.md`** rewritten — overview, features, tech stack, local setup, env vars, MongoDB setup, run instructions, full Vercel + Render deployment guide, folder structure, roadmap.
- **`HOW_TO_CODE_THIS_PROJECT.txt`** added at repo root — phase-by-phase build path, prerequisites, common pitfalls, recommended resources, maintenance philosophy.
- **`PROJECT_CONTEXT.md`** updated to v1.0 frozen state.
- Backend tests: **29/29 pass**; frontend production build: **clean (no warnings)**; zero console errors across all 5 pages.

### 2026-06-27 — Product audit, Help system & PROJECT_CONTEXT (v1.1.1)
- **Question Details Modal** (`QuestionDetailsModal.jsx`) on dbl-click in Repository: LaTeX statement/options/explanation, mastery progress bar, attempts/correct/streak/next-review stat cards, attempts history, GateOverflow link, Edit & Practice buttons.
- **Repository sorting** — clickable column headers for Subj/Type/Statement/Mastery/Next-Rev/Next-Revisit (asc/desc toggle).
- **Remembered filters & sort** — persisted in `localStorage` (`byop.repo.filters.v1`), restored on reload.
- **Log stopwatch** — large live display with Start/Pause/Reset, Space/R/N keyboard shortcuts, Subject/Activity/Topic + Journal note → Save to log.
- **Session summary** — 4-card grid (Total time, Sessions, Questions, Accuracy).
- **Contextual help (?)** buttons on Repository, Practice, Pulse, Log, Timeline. Content in `lib/helpContent.js` (~20–30s read each).
- **`/app/PROJECT_CONTEXT.md`** — full project context (philosophy, stack, schema, workflows, algorithms, conventions, design, pending) sufficient for any future AI session.

### 2026-06-27 — Initial preview
- Cloned repo into `/app`, installed deps, seeded 8 sample questions.

### 2026-06-27 — Pre-deployment hardening (this iteration)
- **Timeline revision scheduling end-to-end**
  - `GET /api/timeline?start=&end=` now also returns revisions whose date falls in the range even when the parent entry's date is outside it.
  - `GET /api/pulse` now sums SRS-due + timeline-scheduled revisions into `due_revisions`, and exposes `due_srs` and `due_timeline_revisions` separately. Today's Mission counts the combined total.
- **Header countdown widget** (`/app/frontend/src/components/JanCountdown.jsx`)
  - Shows today's date and a live countdown to **Jan 1** in the format `Nd : NNh : NNm`, refreshing every 30s.
- **Solve repository double-click** opens the existing Question form modal (single-click behavior unchanged).
- **Mobile responsiveness audit**
  - Layout: hamburger menu (≤ md), shorter horizontal padding, sub-nav scroll on overflow.
  - Modal: bottom-sheet behavior on small screens.
  - Pulse: Subject Completion row uses `shrink-0` + `min-w-0` + `w-16 sm:w-24`, no overflow at 390px.
  - Timeline: weekly view horizontal-scrolls inside its container.
  - Log/TimelineEntryModal/Repository table: responsive grid + horizontal scroll wrappers.
- **Vercel deployment** — added `/app/frontend/vercel.json` (CRA preset, SPA rewrites). `yarn build` produces a clean prod bundle.

## Testing
- Backend: 100% on new feature tests, full regression preserved.
- Frontend: 100% after Pulse mobile fix (iteration_4).

## Deployment notes (Vercel)
- Frontend: import `/app/frontend` as a Vercel project; build command `yarn build`, output `build`. Set `REACT_APP_BACKEND_URL` to the public backend URL.
- Backend (FastAPI) must be hosted separately (Vercel serverless is incompatible with the long-running Motor/Mongo client) — e.g. Railway, Render, Fly.io, or the Emergent preview itself. Ensure `MONGO_URL`, `DB_NAME`, and `CORS_ORIGINS` are set in that environment.

## Backlog (not in scope this iteration)
- (Perf) Replace N+1 patterns in `list_questions`, `/practice/next`, and `/pulse` with batch fetches + `distinct()` / aggregation pipelines.
- (Test ergonomics) Add `data-testid="mission-item-<id>"` on Pulse mission rows.
- Auto-seed demo on first run when DB is empty.
