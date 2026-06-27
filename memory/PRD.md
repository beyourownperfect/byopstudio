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
