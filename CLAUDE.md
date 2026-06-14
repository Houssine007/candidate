# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**RecruitPRO** — an all-in-one HR SaaS spanning external recruitment (ATS), internal HR
(employees, org chart, internal mobility), and learning (LMS). It is **three separate
applications** that share one JWT identity:

| App | Path | Stack | Port | Storage |
|---|---|---|---|---|
| Backend API | `backend/` | FastAPI + SQLAlchemy + Alembic, Pydantic v2 | 8000 | PostgreSQL |
| RH frontend | `frontend/` | Next.js 15 (App Router), TS, Tailwind v3, Zustand | 3000 | — |
| LMS | `lms/` | Next.js 16 (App Router), TS, Tailwind v4, Mongoose | 3001 | MongoDB |

Most code comments, docstrings, and UI copy are in **French** — match that when editing.
The fullest architecture reference is `doc_technique.md` (French); `backend/API.md` documents endpoints.

## Running things

```bash
# Backend (from backend/)
venv\Scripts\activate          # Windows
python run.py                  # uvicorn app.main:app, port 8000, reload on
alembic upgrade head           # apply migrations
python seed.py                 # seed TechCorp + recruiters + jobs + candidates
# Swagger at http://localhost:8000/docs

# RH frontend (from frontend/)
npm run dev                    # port 3000

# LMS (from lms/) — MUST override port, `next dev` defaults to 3000
npm run dev -- -p 3001
```

### Tests (backend only)

```bash
python run_tests.py                       # all tests with coverage
pytest tests/unit/                        # unit only
pytest tests/integration/                 # integration only
pytest tests/unit/test_matching_service.py::test_name   # single test
```

`pytest.ini` injects test env vars and expects a `recruitment_test` Postgres database.
Markers available: `unit`, `integration`, `api`, `auth`, `db`.

## Cross-service authentication (the core integration)

All three apps trust the **same HS256 JWT secret** (`SECRET_KEY` in backend config /
`JWT_SECRET` env in LMS, both defaulting to `dev_secret_key_fixed_for_stability_change_in_prod`).
Changing it in one place breaks SSO unless changed everywhere.

- The **RH frontend is the only login**. The LMS has no login page.
- SSO handoff: RH opens the LMS with `?token=<jwt>` (see `frontend/src/lib/api.ts` `lmsLaunchUrl`);
  the LMS captures, persists, and strips it from the URL (`lms/lib/sso-client.ts`).
- LMS API routes verify the token with `jose` against the shared secret (`lms/lib/auth.ts`).
- Backend → LMS calls (`backend/app/api/lms.py`) mint a short-lived **service-account token**
  (`_get_service_token`, role ADMIN) and proxy to `LMS_API_URL` (default `http://localhost:3001`).
- LMS → backend skill sync: when a course completes, the LMS posts to
  `POST /api/lms/course-completed`, which raises the matching `CandidateSkill.level`
  (never lowers it).

## Backend architecture

Monolithic layered FastAPI app. Routers in `backend/app/api/` are mounted in
`app/main.py` under `/api/*`. Models in `app/models/`, business logic in `app/services/`,
shared infra in `app/core/` (`config.py`, `database.py`, `security.py`, `permissions.py`).

### Multi-tenancy
Shared-database / shared-schema. Tenant-scoped tables carry `company_id`
(`jobs`, `employees`, `org_units`, `internal_roles`, `internal_positions`, `trainings`).
APIs filter by the logged-in user's `Recruiter.company_id`. **Candidates and skills are
global** (shared talent pool + skill referential), so they have no `company_id`.

### Two-level RBAC
1. **System role** on `users.role`: `ADMIN | RECRUITER | CANDIDATE | EMPLOYEE` — checked
   directly in routes.
2. **Internal role + permissions** per company — enforced via the `has_permission("perm:name")`
   FastAPI dependency in `app/core/permissions.py`. Bypass rules: global `ADMIN` gets everything;
   a `RECRUITER` without an `Employee` profile (the tenant owner) gets everything; otherwise the
   permission must be in the employee's internal role.

### Matching engine (`app/services/matching.py`)
Two independent axes per candidate/job:
- **Fit score** = skills 60% + experience 25% + education 15%. Skills weight mandatory
  requirements 2×, and apply a `-30% per missing mandatory skill` penalty (`0.7 ** n`).
- **Potential score** = trainability via ROME-code adjacency (exact subdomain 1.0 / same
  domain 0.6 / unrelated 0.3) + certification bonus. `None` when there are no gaps.
- `recommendation` ∈ `STRONG_FIT | POTENTIAL | WEAK_FIT` is derived from both.

ROME data comes from the France Travail API (`services/rome_api.py`, `france_travail_api.py`),
with a static fallback when `ROME_CLIENT_ID`/`SECRET` are unset.

### Config & secrets
`app/core/config.py` hardcodes dev defaults (DB URL with password, JWT secret) overridable
via `.env`. These are committed dev values — do not treat them as production secrets, and
do not add real secrets to this file.

## Frontend (RH) architecture

App Router under `frontend/src/app/`, organized by role dashboard:
`dashboard/{recruiter,candidate,employee}/`. Auth state lives in the Zustand store
`src/lib/auth-store.ts`; all API calls and shared types are in `src/lib/api.ts`
(`API_BASE` → backend :8000, `LMS_BASE` → LMS :3001). Theme via `next-themes` +
`components/theme-provider.tsx`.

## LMS architecture

Next.js app where the API routes (`lms/app/api/`) are the backend. Mongoose models in
`lms/models/` (Course, Module, Section, Quiz, Question, Answer, Enrollment, Progress,
Category) connect to MongoDB via `lms/lib/mongodb.ts`. `lms/middleware.ts` adds CORS for the
RH origin. Instructor-gated routes use `requireInstructor` (instructor flag or system ADMIN).

## Conventions & gotchas

- Migrations: Alembic in `backend/alembic/versions/`. The history has merge heads — check
  `alembic heads` before adding migrations. Some untracked migrations exist in the working tree.
- Skill levels are integers 1–4 throughout (candidate/employee/requirement).
- `MatchResult.has_applied` is considered redundant with `PENDING` status and slated for removal
  (see `doc_technique.md` roadmap) — prefer status checks.
- One-off DB scripts live at `backend/` root: `create_admin.py`, `cleanup_db.py`,
  `fix_role.py`, `normalize_skills.py`, `seed*.py`.
