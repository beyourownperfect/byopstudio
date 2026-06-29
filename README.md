# BYOPGateCS.studio · Study OS for GATE CSE

A single-user study operating system for GATE Computer Science prep. Capture questions, solve under spaced repetition, schedule revisions, and measure momentum — all without a planner.

> **Version:** v1.0 · MIT-style permissive (see LICENSE if added) · Open source.

---

## Overview

GATE CSE rewards depth, not breadth. BYOPGateCS.studio (Be Your Own Perfect — GATE CS) replaces a study planner with a closed-loop habit engine:

1. **Capture** — every PYQ / practice question lives in one Repository with LaTeX, options, explanation, GateOverflow link.
2. **Solve** — the Practice screen serves the right question (due / weak / new / wrong / bookmarked) and records confidence + time.
3. **Revise** — SRS automatically schedules the next review at 1 / 3 / 7 / 14 / 30 / 90 days.
4. **Reflect** — Pulse surfaces Today's Mission, Momentum, Weak Topics, and GATE readiness.

Single user, no auth, no cloud lock-in. One-click deploy to Render, backed by MongoDB Atlas.

---

## Features

- **Repository** — CRUD on questions with LaTeX (KaTeX). Filter (Due / Wrong / Weak / Bookmarked / Never attempted / Mastered), search, column sort, multi-select bulk delete with undo, CSV import / export, remembered filters via localStorage.
- **Question Details modal** — open by double-clicking any row. Rendered LaTeX, attempts history, mastery bar (0-100), next-review date, GateOverflow link.
- **Practice** — SRS-driven sessions (MCQ / MSQ / NAT). Stopwatch, confidence 1-5, explanation, bookmark, schedule-revisit.
- **Pulse dashboard** — Today's Mission (top 4 prioritized actions), Momentum (0-100), Due Today, daily progress vs targets, Weak Topics, Subject Completion, GATE Readiness (PYQ / Revision / Mock), countdown.
- **Log** — large live stopwatch (Space = start/pause, R = reset, N = new log), Subject / Activity / Topic + Journal note, session summary (Total time, Sessions, Questions, Accuracy), daily/weekly/monthly views.
- **Timeline** — daily / weekly / monthly calendar of all study activity + scheduled revisions (+1d / +3d / +7d / +14d / +30d or custom date).
- **Cmd/Ctrl-K** command palette, **Jan-1 countdown** widget, **? help popups** on every module, mobile-responsive throughout (hamburger drawer, bottom-sheet modals).

---

## Tech stack

| Layer | Tech |
| ----- | ---- |
| Frontend | React 19 (CRA + craco), TailwindCSS, Radix UI primitives, lucide-react, react-katex, react-router-dom |
| Backend | FastAPI (Python 3.11+), Motor (async MongoDB driver), Pydantic v2, Uvicorn |
| Database | MongoDB (Atlas or local) |
| Build | Yarn (frontend), pip (backend) |
| Deployment | Render (single web service — frontend + backend on one URL) + MongoDB Atlas |

---

## Local setup

### Prerequisites
- **Node.js 18+** and **Yarn**
- **Python 3.11+**
- **MongoDB 5+** running locally (or a connection string to Atlas)

### Quick start

```bash
git clone https://github.com/<your-username>/byopgatecs.studio.git
cd byopgatecs.studio

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # or: .\.venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env      # edit MONGO_URL if needed
uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Frontend (in another terminal)
cd ../frontend
yarn install
cp .env.example .env      # set REACT_APP_BACKEND_URL=http://127.0.0.1:8000
yarn start                # opens http://localhost:3000
```

For production-style single-service mode (backend serves the built frontend):

```bash
cd frontend && yarn build
cd ../backend && uvicorn server:app --host 0.0.0.0 --port 8000
# Open http://localhost:8000 — the FastAPI server serves the React app at / and /api at /api
```

### Seed demo data

After the backend is up, hit the seed endpoint once:

```bash
curl -X POST http://localhost:8000/api/seed-demo
```

Inserts 8 sample questions across subjects. Idempotent — no-op if questions already exist.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `MONGO_URL` | yes | MongoDB connection string. Local: `mongodb://localhost:27017`. Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/`. |
| `DB_NAME` | yes | Database name (any non-empty identifier, e.g. `byopstudio`). |
| `CORS_ORIGINS` | no | Comma-separated list of allowed origins. Defaults to `*`. In production, set to your Render URL. |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `REACT_APP_BACKEND_URL` | no | Backend API base URL (no trailing slash). Set for local dev with separate frontend/backend (`http://127.0.0.1:8000`). Leave empty for single-service Render deployment — the app uses `/api` on the same origin. |

`.env.example` files are committed in both `backend/` and `frontend/`.

---

## MongoDB setup

### Local
```bash
# macOS (Homebrew)
brew install mongodb-community && brew services start mongodb-community

# Ubuntu / Debian
sudo apt install mongodb && sudo systemctl start mongod

# Docker (fastest)
docker run -d --name byop-mongo -p 27017:27017 mongo:7
```

Set `MONGO_URL=mongodb://localhost:27017` and `DB_NAME=byopstudio`.

### Production — MongoDB Atlas
1. Create a free M0 cluster at <https://cloud.mongodb.com>.
2. Database Access → add user with password.
3. Network Access → add `0.0.0.0/0` (or Render's IP range for stricter security).
4. Copy the connection string and set `MONGO_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/?retryWrites=true&w=majority`.

Schema is auto-created on first write. No migrations needed.

---

## Deployment — Render (single service)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the complete step-by-step guide.

The project deploys as **one Render web service** that serves both the React frontend and the FastAPI backend from a single URL.

**Quick summary:**
- Commit `frontend/build/` is not required — Render builds it via `yarn build`
- `render.yaml` is included with the correct build + start commands
- Set env vars: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`
- That's it — one URL, all CRUD persists in MongoDB Atlas

---

## Folder structure

```
.
├── PROJECT_CONTEXT.md          # Architecture & design context
├── README.md                   # This file
├── DEPLOYMENT.md               # Render deployment guide
├── HOW_TO_CODE_THIS_PROJECT.txt
├── render.yaml                 # Render Blueprint spec
├── .gitignore
├── backend/
│   ├── server.py               # All routes, models, helpers, seed + StaticFiles for frontend
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── Procfile
│   ├── tests/                  # backend pytest suite
│   ├── .env.example
│   └── .env                    # gitignored
└── frontend/
    ├── package.json, craco.config.js, tailwind.config.js, postcss.config.js
    ├── .env.example
    ├── public/
    └── src/
        ├── App.js, index.js, index.css, App.css
        ├── components/         # Layout, Modal, HelpButton, JanCountdown,
        │   │                   # QuestionFormModal, QuestionDetailsModal,
        │   │                   # TimelineEntryModal, RevisitMenu, Latex, CommandPalette
        │   └── ui/             # Radix-based shadcn primitives
        ├── pages/              # Pulse, Repository, Practice, Bookmarks,
        │                       # Mistakes, Log, Timeline
        ├── lib/                # api.js (axios), constants.js, helpContent.js, dateUtils.js
        └── hooks/              # use-toast.js
```

---

## Future roadmap

### v1.x — polish
- Repository keyboard navigation (arrows + Enter to open details).
- Practice session navigator: queue of upcoming questions with back/forward.
- Confidence-vs-correct reflection card after each session.
- Weekly summary card in Log (this-week vs last-week diff).
- Server-side pagination on Repository.

### v2.0 — capabilities
- Pomodoro mode in Log stopwatch.
- Mock test runner with per-question split timer.
- Subject-completion drill-down on Pulse.
- AI study mentor: explain wrong answers, auto-create a +1d revision.
- Shareable Pulse snapshot (PNG export).

### v3.0 — platform
- Optional auth (multi-device sync via JWT).
- Daily-digest email (SendGrid).
- iOS / Android wrappers (Capacitor).

---

## Contributing

1. Open an issue describing the bug or feature.
2. Branch from `main`. Use small, focused PRs.
3. Run `yarn build` (frontend) and `pytest` (backend) before pushing.
4. Keep the single-file `server.py` style and the existing folder layout.

See `PROJECT_CONTEXT.md` for the full architecture, schema, and algorithm spec.

---

## Acknowledgements

- The SRS interval scheme is a simplified Leitner / SM-0 system.
- LaTeX rendering via [KaTeX](https://katex.org/).
- Inspired by GateOverflow, Anki, and a stubborn refusal to use spreadsheets.
