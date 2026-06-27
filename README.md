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

Single user, no auth, no cloud lock-in. Self-host the backend, deploy the frontend on Vercel.

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
| Database | MongoDB 5+ |
| Build | Yarn (frontend), pip (backend) |
| Deployment | Vercel (frontend) + Render/Railway/Fly.io (backend) + MongoDB Atlas |

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
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # edit values
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Frontend (in another terminal)
cd ../frontend
yarn install
cp .env.example .env       # set REACT_APP_BACKEND_URL=http://localhost:8001
yarn start                 # opens http://localhost:3000
```

### Optional: seed demo data

After the backend is up, hit the seed endpoint once:

```bash
curl -X POST http://localhost:8001/api/seed-demo
```

It inserts 8 sample questions across subjects and is idempotent (no-op if the DB already has questions).

---

## Environment variables

### Backend (`backend/.env`)
| Variable | Required | Description |
| -------- | -------- | ----------- |
| `MONGO_URL` | yes | MongoDB connection string. Local: `mongodb://localhost:27017`. Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/`. |
| `DB_NAME` | yes | Database name (any non-empty identifier, e.g. `byop_studio`). |
| `CORS_ORIGINS` | yes (prod) | Comma-separated list of allowed frontend origins. Use `*` only locally. In production: `https://your-frontend.vercel.app`. |

### Frontend (`frontend/.env`)
| Variable | Required | Description |
| -------- | -------- | ----------- |
| `REACT_APP_BACKEND_URL` | yes | Public base URL of the backend (no trailing slash). The client appends `/api/...`. |
| `WDS_SOCKET_PORT` | no | Set to `443` when running inside HTTPS-proxied containers to silence dev-server warnings. |

`.env.example` files are committed in both folders.

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

Set `MONGO_URL=mongodb://localhost:27017` and `DB_NAME=byop_studio`.

### Production — MongoDB Atlas (recommended)
1. Create a free M0 cluster at <https://cloud.mongodb.com>.
2. Database Access → add user with password.
3. Network Access → add the public IP of your backend host (or `0.0.0.0/0` for early prototypes).
4. Get the connection string and set `MONGO_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/?retryWrites=true&w=majority`.

The schema is auto-created on first write. No migrations needed.

---

## Running frontend / backend

| Task | Command |
| ---- | ------- |
| Backend dev (hot reload) | `uvicorn server:app --reload --port 8001` |
| Backend tests | `cd backend && pytest` |
| Frontend dev | `cd frontend && yarn start` |
| Frontend prod build | `cd frontend && yarn build` |
| Frontend lint | `cd frontend && yarn lint` (if configured) or via ESLint CLI |

Backend healthcheck:
```bash
curl http://localhost:8001/api/
# {"app":"BYOPGateCS.studio","status":"ok"}
```

---

## Deployment instructions (Vercel)

### Frontend → Vercel
1. Push the repo to GitHub.
2. <https://vercel.com/new> → Import the repo.
3. **Root directory** = `frontend`.
4. Framework preset = **Create React App** (auto-detected from `frontend/vercel.json`).
5. Build command: `yarn build`, output directory: `build` (already configured).
6. **Environment variables** → add `REACT_APP_BACKEND_URL=https://your-backend.example.com`.
7. Deploy. SPA rewrites in `vercel.json` handle React Router.

### Backend → Render / Railway / Fly.io
> **Why not Vercel for the backend?** Vercel's serverless functions are short-lived and cannot keep an `AsyncIOMotorClient` connection pool warm. Use any long-running host instead.

#### Render (fastest)
1. New → Web Service → connect repo.
2. Root directory = `backend`.
3. Build command: `pip install -r requirements.txt`.
4. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`.
5. Env vars: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS=https://your-frontend.vercel.app`.
6. Deploy. Render gives you a public HTTPS URL — paste it into the frontend's `REACT_APP_BACKEND_URL` and redeploy the frontend.

#### Railway / Fly.io
Same drill: install requirements, run `uvicorn server:app --host 0.0.0.0 --port $PORT`, set env vars.

### Database → MongoDB Atlas
See `MongoDB setup → Production` above.

---

## Folder structure

```
.
├── PROJECT_CONTEXT.md          # Architecture & design context (read this if you're an AI)
├── README.md
├── HOW_TO_CODE_THIS_PROJECT.txt  # Self-learning path for solo devs
├── .gitignore
├── backend/
│   ├── server.py               # All routes, models, helpers, seed — single file by design
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── tests/                  # backend pytest suite
│   ├── .env.example
│   └── .env                    # gitignored
└── frontend/
    ├── package.json, craco.config.js, tailwind.config.js, postcss.config.js
    ├── vercel.json             # SPA rewrites + CRA preset
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
- Replace N+1 patterns in `list_questions` and `/pulse` with `$in` batch fetches.

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
