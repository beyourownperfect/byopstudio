# BYOPGateCS.studio · Study OS for GATE CSE

A single-user study operating system for GATE Computer Science prep. Capture questions, solve under spaced repetition, schedule revisions, and measure momentum — all without a planner.

> **Version:** v1.1 · Open source.

---

## Overview

GATE CSE rewards depth, not breadth. BYOPGateCS.studio replaces a study planner with a closed-loop habit engine:

1. **Capture** — every PYQ / practice question lives in one Repository with LaTeX, options, explanation, GateOverflow link.
2. **Solve** — the Practice screen serves the right question (due / weak / new / wrong / bookmarked) and records confidence + time.
3. **Revise** — SRS automatically schedules the next review at 1 / 3 / 7 / 14 / 30 / 90 days.
4. **Reflect** — Pulse surfaces an execution queue, Today's Mission, Momentum, Weak Topics, and GATE readiness.

Single user, no auth, no cloud lock-in. One-click deploy to Render, backed by MongoDB Atlas.

---

## Features

- **Pulse dashboard** — Execution Queue ("What should I do next?") prioritized into Overdue/Today/This Week/Upcoming with deep-links. Today's Mission (user checklist), Momentum (0-100 with sparkline), daily progress vs targets, Weak Topics, Subject Completion, GATE readiness, countdown to exam. Settings modal with exam date + daily targets. Onboarding card for zero-data users. Warm accent theme with card depth shadows and section dividers.
- **Execution Queue** — aggregating SRS revisions, timeline scheduled revisions, revisit items, and user missions into one prioritized list. Click any item to jump to its owning module.
- **Study Timer** — Stopwatch (teal) and Countdown (warm orange) modes in the Pulse header. Topic input, keyboard shortcuts (Space/R), Focus Mode modal with large display and presets (5m, 15m, 25m, 45m, 60m). Auto-saves completed sessions to study logs AND timeline. Manual Save button on inline bar. SessionStorage persistence cross-tab.
- **Repository** — inline grid table with subject labels, search, filter by subject/mode, sort by column headers, multi-select bulk delete with undo, CSV import/export, OCR prompt modal. Double-click rows for full details modal with LaTeX, attempts history, and mastery.
- **Practice** — SRS-driven sessions (MCQ / MSQ / NAT). Keyboard shortcuts (A-D pick options, 1-5 confidence with labels, Space/Enter submit, ←→ navigate). Session summary on completion or end-early (× button). Per-question stopwatch, feedback with explanation, bookmark, revisit scheduling, queue navigation.
- **Bookmarks** — starred questions with labeled subject badges, mastery scores, quick practice/revisit actions.
- **Mistakes Bank** — wrong answers by 5 modes. Practice-all button. Labeled subject chips.
- **Log** — live timer status from Pulse (sessionStorage bridge). Session summary cards. Daily/weekly/monthly collapsible views. **LectureTable** and **Subject Completion** checklist. Keyboard shortcut: N = new log entry.
- **Timeline** — daily/weekly/monthly calendar of entries, scheduled SRS revisions, and revisits. Supports `?view=` URL param for deep-linking from Pulse.
- **Timeline auto-bridging** — study timer saves, practice solving, log entries, and revisit completions all auto-create timeline entries. No data falls through the cracks.
- **Quick guides** — ? help button on every page with concise contextual documentation.
- **Cmd/Ctrl-K** command palette with one-time discovery toast. Mobile-responsive (hamburger drawer).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 (CRA + craco), TailwindCSS, Radix UI primitives, lucide-react, KaTeX, react-router-dom v7 |
| Backend | FastAPI, Motor (async MongoDB), Pydantic v2, Uvicorn |
| Database | MongoDB (Atlas or local, falls back to in-memory mongomock) |
| Build | Yarn (frontend), pip (backend) |
| Deployment | Render (single web service) + MongoDB Atlas |

---

## Local Setup

### Prerequisites
- **Node.js 18+** and **Yarn**
- **Python 3.11+**
- **MongoDB 5+** running locally (or Atlas connection string)

### Quick start

```bash
git clone https://github.com/<your-username>/byopgatecs.studio.git
cd byopgatecs.studio

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .\.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # edit MONGO_URL if needed
uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Frontend (another terminal)
cd ../frontend
yarn install
cp .env.example .env      # set REACT_APP_BACKEND_URL=http://127.0.0.1:8000
yarn start                # opens http://localhost:3000
```

Production-style single-service mode:
```bash
cd frontend && yarn build
cd ../backend && uvicorn server:app --host 0.0.0.0 --port 8000
# Open http://localhost:8000
```

### Seed demo data

```bash
curl -X POST http://localhost:8000/api/seed-demo
```

Inserts 12 sample questions — one per GATE subject. Idempotent if questions exist.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URL` | For Atlas | Falls back to in-memory | MongoDB connection string |
| `DB_NAME` | No | `byopstudio` | Database name |
| `CORS_ORIGINS` | No | `*` | Comma-separated allowed origins |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_BACKEND_URL` | No | `""` | Backend URL for local dev. Leave empty for same-origin (Render). |

---

## Database

MongoDB with these collections: `questions`, `attempts`, `srs`, `study_logs`, `timeline`, `revisits`, `lectures`, `settings`, `subject_completion`, `user_missions`. Schema auto-created on first write — no migrations needed. Falls back to in-memory `mongomock_motor` when no `MONGO_URL` is set.

### Local MongoDB
```bash
# macOS
brew install mongodb-community && brew services start mongodb-community

# Docker (fastest)
docker run -d --name byop-mongo -p 27017:27017 mongo:7
```

Set `MONGO_URL=mongodb://localhost:27017` and `DB_NAME=byopstudio`.

---

## Deployment — Render

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step guide.

**Quick summary:**
1. Push repo to GitHub
2. Set up MongoDB Atlas M0 cluster + database user + `0.0.0.0/0` network access
3. Render auto-detects `render.yaml` → single web service
4. Set `MONGO_URL` and `DB_NAME` env vars
5. After deploy: `curl -X POST https://your-app.onrender.com/api/seed-demo`

---

## Folder Structure

```
├── backend/
│   ├── server.py               # All routes, models, helpers, seed, SPA serving
│   ├── requirements.txt
│   ├── Procfile
│   └── tests/
├── frontend/
│   └── src/
│       ├── pages/              # Pulse, Repository, Practice, Bookmarks, Mistakes, Log, Timeline
│       ├── components/         # Layout, LectureTable, StudyTimer, MissionCard, MarkdownRenderer,
│       │                       # QuestionFormModal, QuestionDetailsModal, TimelineEntryModal,
│       │                       # RevisitMenu, HelpButton, CommandPalette, Modal
│       ├── lib/                # api.js, constants.js, dateUtils.js, helpContent.js
│       └── index.css           # Tailwind + custom properties + component classes
├── memory/                     # PRD, notes
├── render.yaml
├── README.md
├── DEPLOYMENT.md
├── PROJECT_CONTEXT.md
└── PROJECT_GUIDE.md
```

---

## Documentation

- **`README.md`** — Project overview, setup, features (this file)
- **`DEPLOYMENT.md`** — Render + MongoDB Atlas deployment guide
- **`PROJECT_CONTEXT.md`** — Full architecture, schema, API routes, design system, key decisions
- **`PROJECT_GUIDE.md`** — Build-from-scratch educational guide

---

*Last updated: 2026-06-30 · v1.1*
