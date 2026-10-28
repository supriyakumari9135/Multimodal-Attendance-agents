# Multimodal Attendance & Engagement Agent

An offline-first, privacy-preserving classroom intelligence platform for educational institutions, colleges, and training environments.

> **Ethical Principle:** Behavioral indicators are proxies, not proof of attention, learning, comprehension, or academic performance. Never infer emotions, intelligence, motivation, or personality from faces, voices, or body movements. Do not automatically grade, punish, or label students.

---

## Key Features

- **Automated & Manual Attendance Tracking**: Record attendance from live camera streams, uploaded recordings, or deterministic simulations. Sustained presence is verified across configurable time windows (e.g., 15s) with occlusion tolerance.
- **Multimodal Activity Indicators**: Non-invasive tracking of participant count over time, motion frequency, head orientation estimates, and acoustic voice activity ratios.
- **Explainable Engagement Score (0–100)**: Transparent weighted composite index (`Participation 35%`, `Movement 25%`, `Head Orientation 20%`, `Audio 20%`) with automatic weight renormalization when modalities are inactive.
- **AI Teaching Assistant**: 100% offline, deterministic rules-based pedagogical recommendation engine (identifies participation drops, continuous instruction over 25 mins without check-ins, quiet individual work vs interactive discussion).
- **Roster & Course Management**: Add courses and students, import/export rosters via CSV with row-level error validation, and inspect individual student attendance histories.
- **Institutional Reporting**: Download RFC-4180 compliant CSV logs, structured JSON debug files, and printable executive PDF summaries formatted with FPDF2.
- **Privacy & Data Sovereignty**: Operates entirely offline without external cloud APIs. Raw video auto-purging, configurable retention windows, and permanent audit logging.
- **Reproducible Demo Mode**: Instant one-click reproducible seeding of 2 sample courses, 14 fictional students, and 4 simulated sessions.

---

## Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide Icons.
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, Uvicorn.
- **Computer Vision**: OpenCV (frame sampling, motion contours, background subtraction, tracking across consecutive frames).
- **Audio Processing**: Local acoustic energy & Web Audio / local VAD indicators.
- **Local Database**: SQLite for self-contained operation (schema ready for PostgreSQL migration).
- **Testing**: Pytest & FastAPI TestClient.

---

## Quick Start Guide

### 1. Prerequisites
- **Python**: 3.11+ (Python 3.12 verified)
- **Node.js**: v18+ (v24 verified) & `npm`

### 2. Backend Setup & Startup

From the project root:

```bash
# 1. Create Python virtual environment
python -m venv backend/venv

# 2. Activate virtual environment
# On Windows PowerShell:
.\backend\venv\Scripts\Activate.ps1
# On Linux / macOS:
source backend/venv/bin/activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Apply database migrations
alembic upgrade head

# 5. Start FastAPI Backend (Port 8000)
uvicorn app.main:app --app-dir backend --reload --port 8000
```

The backend API will be available at:
- **API Base URL**: `http://127.0.0.1:8000/api`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

### 3. Frontend Setup & Startup

In a second terminal window:

```bash
cd frontend

# Install frontend dependencies (if not already installed)
npm install

# Start Next.js Development Server (Port 3000)
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## Running Automated Tests

Run the comprehensive pytest suite covering all endpoints, state machines, and report generators:

```bash
# On Windows:
.\backend\venv\Scripts\pytest backend/tests

# On Linux / macOS:
pytest backend/tests
```

All 8 automated test suites verify:
1. Health and local pipeline capability status
2. Course creation, retrieval, and archiving
3. Student roster validation, duplicate prevention, and CSV imports
4. Session state machine transitions (`ready` -> `running` -> `paused` -> `running` -> `completed`)
5. Attendance tracking and teacher manual corrections with audit logging
6. Engagement metric decomposition and deterministic teaching recommendations
7. Downloadable CSV and formatted binary PDF reports
8. Dashboard analytics calculations and database aggregation

---

## Demonstration Workflow (Step-by-Step)

1. **Open the Dashboard**: Navigate to `http://localhost:3000`. If starting from an empty database, click **"Load Demo Data"** to immediately populate:
   - 2 Academic Courses: `CS-402: Applied Multimodal AI & Interaction Systems` and `DS-210: Data Systems & Analytics`.
   - 14 Sample Students with privacy consents.
   - 4 Pre-recorded and running sessions.
2. **Review Overview**: Observe the 6 real metrics (enrolled count, present count, attendance rate %, session duration, composite engagement score, participation level) and active recommendations.
3. **Inspect Live Session**:
   - Click **"Live Session"** in the sidebar.
   - Inspect the real session timer and active attendee counter.
   - Click **"Start Camera Preview"** to activate local webcam streaming.
   - Toggle **"Show Tracks"** to view real-time bounding overlays.
   - Use the **Start**, **Pause**, **Resume**, and **Stop** controls to observe state machine transitions.
4. **Attendance Register & Correction**:
   - Click **"Attendance"** in the sidebar.
   - Search by name or filter by status.
   - Click **"Correct"** on any record to adjust status (e.g. from `late` to `manually_confirmed`) and add a teacher audit note.
5. **Engagement Analytics**:
   - Click **"Engagement Analytics"** to inspect the Recharts area chart and multi-signal decomposition line chart.
   - Switch between **"Last 15m"**, **"Last 30m"**, and **"Full Session"** intervals.
6. **AI Teaching Assistant**:
   - Click **"AI Teaching Assistant"** to view evidence-backed suggestions.
   - Click **"Accept Suggestion"** or **"Mark Completed"**.
7. **Export Reports**:
   - Click **"Reports"** in the sidebar.
   - Click **"Download Session CSV"** or **"Download PDF Report"** to inspect institutional summaries.
8. **Privacy Controls**:
   - Click **"Privacy & Settings"** to inspect raw video auto-purging, local device processing guarantees, and database wipe utilities.

---

## Project Structure

```text
multimodal-attendance-agent/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI modular API routers
│   │   │   ├── analytics.py # Overview & student history
│   │   │   ├── courses.py   # Course management
│   │   │   ├── health.py    # Health & capabilities inspection
│   │   │   ├── privacy.py   # Retention & demo data management
│   │   │   ├── processing.py# Video upload & corrections
│   │   │   ├── reports.py   # CSV & PDF generation
│   │   │   ├── sessions.py  # Session state machine
│   │   │   └── students.py  # Student directory & CSV imports
│   │   ├── audio/           # Local acoustic energy & VAD processor
│   │   ├── core/            # Config, database engine, sessionmaker
│   │   ├── models/          # SQLAlchemy 2.0 ORM models
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── services/        # Recommendation engine, simulation, reporting
│   │   ├── vision/          # OpenCV frame decoder & presence tracker
│   │   └── main.py          # Application entrypoint & CORS middleware
│   ├── migrations/          # Alembic database migrations
│   ├── tests/               # Pytest automated test suite
│   └── requirements.txt     # Pinned backend dependencies
├── frontend/
│   ├── app/
│   │   ├── globals.css      # Light-first modern classroom styling
│   │   ├── layout.tsx       # Root layout & descriptive SEO metadata
│   │   └── page.tsx         # Dashboard coordinator & tab router
│   ├── components/          # Reusable UI views & modals
│   ├── lib/                 # Typed API client
│   ├── types/               # TypeScript data definitions
│   └── package.json         # Frontend packages (Next.js, Recharts, Lucide)
├── data/
│   ├── uploads/             # Transient uploaded recordings (auto-purged)
│   └── reports/             # Exported report files
├── docs/                    # Architecture, database ERD, and privacy guides
├── Makefile                 # Convenient build and test commands
└── README.md                # Root documentation
```

---

## REST API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/health/capabilities` | Local model & hardware capability status |
| `GET` | `/api/courses` | List courses with enrolled counts |
| `POST` | `/api/courses` | Create new course |
| `GET` | `/api/students` | List students with course enrollments |
| `POST` | `/api/students` | Enroll student |
| `POST` | `/api/students/import` | Bulk import student roster from CSV |
| `GET` | `/api/students/export` | Download roster CSV |
| `GET` | `/api/sessions` | List classroom sessions with filters |
| `POST` | `/api/sessions` | Create new classroom session |
| `POST` | `/api/sessions/{id}/start` | Start session |
| `POST` | `/api/sessions/{id}/pause` | Pause session |
| `POST` | `/api/sessions/{id}/resume` | Resume session |
| `POST` | `/api/sessions/{id}/stop` | Stop & finalize session |
| `POST` | `/api/sessions/{id}/upload` | Upload lecture video for background processing |
| `GET` | `/api/sessions/{id}/attendance`| Retrieve session attendance records |
| `PATCH`| `/api/sessions/{id}/attendance/{rid}` | Manually correct attendance with audit trail |
| `GET` | `/api/sessions/{id}/metrics` | Retrieve interval engagement metrics |
| `GET` | `/api/sessions/{id}/recommendations` | Retrieve teaching recommendations |
| `GET` | `/api/analytics/overview` | Dashboard summary metrics |
| `GET` | `/api/analytics/sessions/{id}` | Session engagement timeline breakdown |
| `GET` | `/api/reports/sessions/{id}/csv` | Download official session CSV report |
| `GET` | `/api/reports/sessions/{id}/pdf` | Download formatted session PDF report |
| `GET` | `/api/privacy/settings` | Retrieve retention and privacy rules |
| `PATCH`| `/api/privacy/settings` | Update auto-delete and retention settings |
| `POST` | `/api/privacy/seed-demo` | Seed reproducible demo dataset |
| `POST` | `/api/privacy/reset-demo` | Clean reset of all database records |

---

## Troubleshooting

- **Port Conflict on 8000**: If port 8000 is occupied, run uvicorn with `--port 8001` and update `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to `http://127.0.0.1:8001/api`.
- **Camera Permission Blocked in Browser**: Ensure your browser allows camera access for `localhost`. If camera is unavailable or denied, you can use the **Simulated Session** mode or upload a video file.
- **Database Schema Reset**: Run `alembic upgrade head` to ensure all SQLite tables are created. If you wish to wipe and re-seed, click **"Reload Demo Data"** directly from the top navigation bar or Privacy Settings view.
#   M u l t i m o d a l - A t t e n d a n c e - a g e n t s  
 