# Deployment Checklist

## Overview

This repository contains a React frontend in `frontend/` and a FastAPI backend in `backend/`.

## Local deployment

### 1. Prerequisites

- Node.js 18+ and Yarn installed
- Python 3.11+ installed
- MongoDB running locally on `mongodb://localhost:27017` or a valid remote `MONGO_URL`

### 2. Backend local deployment

1. Open a terminal in `backend/`
2. Activate or use the repo Python environment:
   - Windows: `.venv\Scripts\python.exe`
3. Install dependencies if needed:
   - `.venv\Scripts\python.exe -m pip install -r requirements.txt`
4. Ensure `backend/.env` has:
   - `MONGO_URL=mongodb://localhost:27017`
   - `DB_NAME=byopstudio`
5. Start backend:
   - `.venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8000`
6. Verify working backend:
   - Open `http://127.0.0.1:8000/api/`
   - Expected response: `{"app":"BYOPGateCS.studio","status":"ok"}`

### 3. Frontend local deployment

1. Open another terminal in `frontend/`
2. Install packages if needed:
   - `yarn install`
3. Start frontend:
   - `yarn start`
4. Open local app in browser:
   - `http://localhost:3000`

### 4. Notes

- The frontend uses `REACT_APP_BACKEND_URL` if configured, otherwise it defaults to `http://127.0.0.1:8000`.
- Backend CORS is already configured to allow all origins locally.
- If MongoDB is unavailable, the backend falls back to an in-memory `mongomock-motor` database only if `MONGO_URL` is unset.

## Optional seed data

- After backend is running, seed sample questions:
  - `curl -X POST http://127.0.0.1:8000/api/seed-demo`

## Production deployment notes

### Backend deployment

- Use a long-running host such as Render, Railway, Fly.io, or a VPS.
- Root directory: `backend`
- Build/install command: `pip install -r requirements.txt`
- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Environment variables:
  - `MONGO_URL`
  - `DB_NAME`
  - `CORS_ORIGINS` (frontend origin in production)

### Frontend deployment

- Deploy from `frontend/`
- `package.json` already includes `start`, `build`, and CRA support
- If using Vercel, set the root to `frontend` and `REACT_APP_BACKEND_URL` to the deployed backend URL

## Verified local commands

These exact commands worked in this repo when the backend and frontend were started successfully.

- Backend: `cd backend && .venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8000`
- Frontend: `cd frontend && yarn start`

## Quick commands

- Backend: `cd backend && .venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8000`
- Frontend: `cd frontend && yarn start`
