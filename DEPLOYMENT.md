# DEPLOYMENT.md — Render Deployment Guide

This guide covers deploying BYOPGateCS.studio as a **single Render web service** that serves both the React frontend and the FastAPI backend from one URL, backed by MongoDB Atlas.

---

## Architecture

```
                      ┌──────────────────┐
                      │  MongoDB Atlas    │
                      │  (free M0 tier)   │
                      └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
https://your-app      │  Render Web Svc   │
    .onrender.com ───▶│  FastAPI + React  │
                      │  (1 service, 1 URL)│
                      └──────────────────┘
```

- FastAPI handles `/api/*` routes
- FastAPI serves the React production build at all other paths
- React Router refreshes work correctly (all paths fall back to `index.html`)
- All data persists to MongoDB Atlas — no data is stored on the Render filesystem

---

## Step 1: MongoDB Atlas

1. Go to <https://cloud.mongodb.com> and create a free account.
2. Create a **free M0 cluster** (choose AWS, any region closest to you).
3. Under **Database Access**, create a user with username and password. Save the credentials.
4. Under **Network Access**, add `0.0.0.0/0` to allow connections from Render (for production, restrict this to Render's IP ranges).
5. Click **Connect** → **Drivers** → copy the connection string.
   - Replace `<username>` and `<password>` with your database user credentials.
   - It should look like: `mongodb+srv://myuser:mypass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

---

## Step 2: Push to GitHub

Push the repository to GitHub. Render deploys from a GitHub repo.

```bash
git add .
git commit -m "Render deployment ready: single-service, N+1 fix, CORS fix"
git push origin main
```

---

## Step 3: Deploy on Render

### Option A: Blueprint deploy (recommended)

The `render.yaml` at the repo root defines everything Render needs.

1. Go to <https://dashboard.render.com> and sign in (GitHub login is easiest).
2. Click **New** → **Blueprint**.
3. Connect your GitHub repo.
4. Render auto-detects `render.yaml` and creates the `byopstudio` web service.
5. Before deploying, set the environment variables (see Step 4).
6. Click **Create** — Render builds and deploys.

### Option B: Manual web service

1. Click **New** → **Web Service**.
2. Connect your GitHub repo.
3. Configure:
   - **Name:** `byopstudio` (or anything)
   - **Region:** Any (Oregon is fine)
   - **Build Command:** `pip install -r backend/requirements.txt && cd frontend && yarn install --frozen-lockfile && yarn build`
   - **Start Command:** `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
4. Set environment variables (see Step 4).
5. Click **Create Web Service**.

---

## Step 4: Environment Variables

Set these in Render dashboard → your service → **Environment**:

| Variable | Value |
| -------- | ----- |
| `PYTHON_VERSION` | `3.11.8` |
| `MONGO_URL` | Your MongoDB Atlas connection string (from Step 1) |
| `DB_NAME` | `byopstudio` (or any name) |
| `CORS_ORIGINS` | Leave empty for same-origin, or set to `*` for local dev. In production with custom domain, set to your domain URL. |

The `render.yaml` already includes these keys — you only need to fill in the values.

**Important:** `MONGO_URL` contains your database password. Render encrypts environment variables at rest. Never commit them to the repo.

---

## Step 5: Seed Demo Data

After the first deploy, your database is empty. Seed 8 sample GATE questions:

```bash
curl -X POST https://byopstudio.onrender.com/api/seed-demo
```

The endpoint is idempotent — running it again does nothing if questions already exist.

You can now open `https://byopstudio.onrender.com` and see the app with sample data.

---

## Step 6: Verify

1. Open your Render URL in a browser.
2. Verify the app loads with the Pulse dashboard.
3. Navigate to `/solve/repository` — sample questions should appear.
4. Navigate to `/solve/practice?mode=due` — Practice page loads.
5. Navigate to `/log`, `/timeline` — all pages work.
6. **Refresh** on any route — the page reloads correctly (no 404).
7. Create a question, edit it, delete it — all CRUD works.
8. Close the tab, reopen — your data is still there (persisted in MongoDB).

---

## Custom Domain (Optional)

1. In Render dashboard → your service → **Settings** → **Custom Domain**.
2. Add your domain (e.g., `study.mydomain.com`).
3. Follow Render's DNS instructions (add a CNAME record).
4. Update `CORS_ORIGINS` env var to `https://study.mydomain.com`.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
| ------- | ------------ | --- |
| App loads but all pages show empty/skeleton | Backend unreachable at `/api` | Check Render logs for Python errors. Verify `MONGO_URL` is correct. |
| 404 on page refresh | React build not found | Check the Render build log — did `yarn build` succeed? Ensure `buildCommand` includes `yarn build`. |
| CORS errors in console | `CORS_ORIGINS` not set | Set `CORS_ORIGINS` to your Render URL, or leave empty for same-origin (no CORS needed). |
| MongoDB connection error | Atlas network access | Check Atlas Network Access — is `0.0.0.0/0` added? Is the DB user password correct? |
| Cold start ~30 seconds | Render free tier sleeps after inactivity | Upgrade to a paid plan, or use a cron job to ping the health endpoint every 10 minutes. |

---

## Local Development After Deployment

The same codebase works locally with or without the build directory:

**Two-terminal dev mode (fastest feedback):**
```bash
# Terminal 1
cd backend && uvicorn server:app --reload --port 8000

# Terminal 2
cd frontend && yarn start    # opens http://localhost:3000
```
Set `REACT_APP_BACKEND_URL=http://127.0.0.1:8000` in `frontend/.env`.

**Single-service mode (tests production setup locally):**
```bash
cd frontend && yarn build
cd ../backend && uvicorn server:app --port 8000
# Open http://localhost:8000
```
Leave `REACT_APP_BACKEND_URL` empty — the app uses `/api` on the same origin.
