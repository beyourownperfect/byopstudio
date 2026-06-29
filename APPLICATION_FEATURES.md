# BYOPGateCS.studio — Application Features & Behavior

## Overview

BYOPGateCS.studio is a single-user study operating system for GATE Computer Science prep. It is built to replace planning ceremony with a closed-loop workflow:

1. Capture questions into a single Repository.
2. Solve questions through a spaced repetition Practice engine.
3. Schedule and complete revisions using Timeline and Revisits.
4. Reflect and measure progress on the Pulse dashboard.

The app is designed for local deployment with a React frontend and a FastAPI backend backed by MongoDB.

## Main goals

- Keep every question, attempt, log, and revision in one place.
- Support GATE-specific subjects, question types, and PYQ workflows.
- Use SRS and daily mission prioritization to surface the next best study action.
- Provide fast CRUD, search, filters, and analytics across study data.

## Navigation and pages

### Top-level sections

- **Pulse** (`/pulse`) — daily dashboard and mission control.
- **Solve** (`/solve/*`) — repository, practice, bookmarks, mistakes.
- **Log** (`/log`) — study log, stopwatch, journal, session history.
- **Timeline** (`/timeline`) — calendar view of study activity and scheduled revisions.

### Routes

- `/` redirects to `/pulse`
- `/solve` redirects to `/solve/repository`
- `/solve/repository` — question repository view
- `/solve/practice` — practice session view
- `/solve/bookmarks` — bookmarked questions view
- `/solve/mistakes` — mistaken questions view
- `/log` — study log view
- `/timeline` — timeline/calendar view
- unknown routes redirect to `/pulse`

## Key features

### Repository

- Full CRUD for questions.
- Question data includes subject, topic, question type, statement, options, correct answer, explanation, year, difficulty, bookmark status, notes, and SRS state.
- Search by text, subject filter, and multiple specialized filter modes:
  - Due
  - Bookmarked
  - Wrong
  - Weak
  - Never attempted
  - Mastered
- Column sorting and remembered list options through localStorage.
- Bulk delete and bulk import from CSV.
- Export repository to CSV for backup.
- Double-click any row to open a Question Details modal.
- Bookmark and revisit actions directly from repository rows.

### Question details modal

- Shows rendered LaTeX for the statement and explanation.
- Displays options and answers with correct/incorrect highlighting.
- Shows mastery, next review date, and revision status.
- Includes full attempt history for that question.
- Lets the user bookmark, edit, schedule revisit, or jump to practice.

### Practice

- Provides SRS-driven question sessions.
- Supports practice modes:
  - due
  - new
  - wrong
  - weak
  - bookmarked
  - all
- Questions are served by the backend with current SRS status.
- User selects confidence from 1 to 5 and submits an answer.
- Feedback shows correctness, explanation, mastery, and next review.
- Supports MCQ, MSQ, and NAT question types.
- Stopwatch tracks time spent per question.
- Attempts are logged and used to update SRS and study logs.
- Bookmark and revisit controls are available in practice.

### Pulse dashboard

- Summarizes today’s mission, momentum, and readiness.
- Shows due revisions, due revisits, and weak topics.
- Displays subject completion and GATE readiness metrics.
- Includes a countdown to exam date.
- Highlights top actions to take today.
- Provides quick links back to practice and repository.

### Log

- Live stopwatch with keyboard shortcuts:
  - Space to start/pause
  - R to reset
  - N to open a new log entry
- Manual log creation with activity, subject, topic, journal remarks, duration, and question counts.
- Auto-logs from practice sessions and timeline event completions.
- Daily, weekly, and monthly views of logged sessions.
- Session summaries show total time, questions, and accuracy.
- Journal notes persist for later review.

### Timeline

- Calendar-style display of study events and revisions.
- Supports daily, weekly, and monthly views.
- Create timeline entries for lectures, practice, revision, reading, and mock tests.
- Each entry can schedule revisions using presets or custom dates.
- Scheduled revisions appear on the target date with virtual revision items.
- Completing a scheduled revision creates an auto-logged revision session.
- Deleting timeline entries cascades to cleanup auto-logged entries.

### Revisits

- Schedule revisit reminders for questions and other items.
- Revisit items contain type, title, subject, revisit date, and completion status.
- Mark revisits complete from the UI.
- Due revisits are surfaced in Pulse and timeline contexts.

### Mistakes and bookmarks

- Mistakes page lists questions answered incorrectly.
- Bookmarks page lists starred questions for quick review.
- Practice can be filtered to focus on mistakes or bookmarked items.

### Help and UX

- Contextual help popup on each page.
- Command palette accessible by Cmd/Ctrl+K.
- Mobile-responsive layout with drawer navigation and bottom-sheet modals.
- Loading states, empty states, and toast notifications for feedback.
- Accessibility-focused UI primitives from Radix.

## Data model and persistence

### Backend entities

- `Question`: stores all question fields plus metadata and SRS-related fields.
- `Attempt`: stores each practice attempt with correctness, confidence, answer, time, and timestamp.
- `SrsRecord`: stores review interval, next review date, attempt counts, and streaks.
- `StudyLog`: stores study activity, duration, questions stats, remarks, and date.
- `TimelineEntry`: stores scheduled study activity, revisions, and completion state.
- `RevisitItem`: stores revisit reminders and completion state.
- `Settings`: singleton store for exam date and daily targets.

### Database collection behavior

- All data is stored in MongoDB collections.
- IDs are UUID strings.
- SRS intervals use `[1,3,7,14,30,90]` days.
- `next_review_date` is stored in `YYYY-MM-DD` format.
- Settings are stored in a singleton document with ID `singleton`.

## Backend API endpoints

### General

- `GET /api/` — health check
- `GET /api/meta` — subjects, activities, SRS intervals
- `GET /api/settings` — current settings
- `PUT /api/settings` — update settings

### Questions

- `POST /api/questions` — create question
- `GET /api/questions` — list questions with filters and search
- `GET /api/questions/{qid}` — fetch a single question
- `PUT /api/questions/{qid}` — update a question
- `DELETE /api/questions/{qid}` — delete a question
- `POST /api/questions/bulk-delete` — bulk delete ids
- `POST /api/questions/bulk-create` — create from CSV-style rows

### Practice and SRS

- `GET /api/practice/next` — fetch next practice question
- `POST /api/practice/submit` — submit practice answer and update SRS
- `GET /api/srs/due` — list due SRS items

### Study logs

- `POST /api/study-logs` — create a log entry
- `GET /api/study-logs` — list study logs with date range
- `DELETE /api/study-logs/{log_id}` — delete log

### Timeline

- `POST /api/timeline` — create timeline entry
- `GET /api/timeline` — list timeline entries + revisions
- `GET /api/timeline/{entry_id}` — fetch entry details
- `PUT /api/timeline/{entry_id}` — update timeline entry
- `DELETE /api/timeline/{entry_id}` — delete entry
- `POST /api/timeline/{entry_id}/schedule-revision` — schedule a revision
- `POST /api/timeline/{entry_id}/complete-revision` — complete a scheduled revision

### Revisits

- `POST /api/revisits` — create revisit item
- `GET /api/revisits` — list revisit items
- `POST /api/revisits/{rid}/complete` — complete a revisit
- `DELETE /api/revisits/{rid}` — delete a revisit

### Calendar and Pulse

- `GET /api/calendar` — fetch calendar aggregates for a date range
- `GET /api/pulse` — compute dashboard data including due revisions, mission, momentum, and readiness
- `GET /api/mistakes` — list mistakes by mode
- `GET /api/user-missions` — get custom mission tasks
- `POST /api/user-missions` — create custom mission
- `PUT /api/user-missions/{mid}` — update mission tasks
- `DELETE /api/user-missions/{mid}` — delete mission tasks
- `POST /api/user-missions/reorder` — reorder mission tasks
- `POST /api/seed-demo` — seed demo questions if repository is empty

## How the application flows

### First launch

- Frontend fetches meta, settings, and initial repository / pulse state.
- If the backend is empty, `POST /api/seed-demo` can populate sample questions.
- The user should set an exam date and daily targets in Pulse settings.

### Adding study material

- Add questions in Repository.
- For each question, provide subject, topic, year, type, options, answer, explanation, and optionally a GateOverflow URL.
- Bookmarked questions can be flagged for future review.

### Practice workflow

- Open Practice and choose a mode.
- The backend selects the next question based on SRS and filter criteria.
- Answer the question and choose a confidence rating.
- The backend records the attempt, updates the SRS record, and returns feedback.
- If correct, the interval advances. If incorrect, the interval resets.

### Revision and timeline workflow

- Add Timeline entries for real study events.
- Schedule revisions from those entries to appear later in the day’s mission.
- Completing revisions marks them done and updates Pulse counts.
- Timeline events may be outside a requested date range, but scheduled revisions inside the range still show up.

### Progress and reflection

- Pulse surfaces the most important things to do today.
- Log captures session duration, activity, and journal notes.
- Momentum, weak topics, and readiness metrics update as questions and revisions accumulate.

## Special behavior

### SRS intervals

- Uses 1, 3, 7, 14, 30, 90 day spacing.
- Correct answers advance the interval; incorrect answers reset it.
- Next review date is calculated from the current date.

### Practice accuracy and mastery

- The question mastery score is derived from attempt history and correctness.
- Mistakes and weak questions are surfaced separately so the user can target them.

### Data persistence

- All CRUD actions persist immediately to the backend.
- The backend writes to MongoDB and returns updated entities.
- Frontend state is refreshed after each save or action.

## UI and experience notes

- The frontend is built with React + Tailwind + Radix UI primitives.
- Inline and display math uses KaTeX.
- The command palette offers quick navigation.
- Help popups explain each module.
- The app is mobile responsive and supports drawer-based navigation on small screens.

## Deployment-ready notes

- Frontend is configured for CRA build and Vercel deployment.
- Backend is intended for long-running deployment on Render/Railway/Fly.io.
- Local dev uses `yarn start` in `frontend` and `uvicorn server:app` in `backend`.

## File created

- `APPLICATION_FEATURES.md`
