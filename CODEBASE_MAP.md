# Codebase Map - RecruitPRO

## Project Overview
RecruitPRO is an HR SaaS platform integrating recruitment (ATS), internal mobility (GPEC), and learning management (LMS). It uses a shared identity system across three distinct application layers.

## Tech Stack
- **Backend**: Python 3.12, FastAPI, SQLAlchemy (PostgreSQL), Alembic (Migrations), JWT.
- **Frontend**: Next.js 15, React 19, Tailwind CSS, Zustand, Lucide Icons, Framer Motion.
- **LMS**: Next.js 16, React 19, MongoDB (Mongoose), Jose/JWT.
- **AI/CV Parsing**: Groq API (LLM-based parsing).

## Repository Structure

### [/](file:///d:/HoussineStudies/projet_ic_perso/recruitment_platform/)
Core project root containing cross-service documentation and shared configurations.

### [backend/](file:///d:/HoussineStudies/projet_ic_perso/recruitment_platform/backend/)
FastAPI application providing the core REST API.
- `app/api/`: Route handlers for auth, candidates, jobs, etc.
- `app/models/`: SQLAlchemy database models.
- `app/services/`: Business logic for matching, CV parsing, and completeness scoring.
- `alembic/`: Database migration scripts.

### [frontend/](file:///d:/HoussineStudies/projet_ic_perso/recruitment_platform/frontend/)
Main recruitment and HR dashboard (Next.js App Router).
- `src/app/dashboard/`: Roles-based dashboards (Candidate, Recruiter, Employee).
- `src/app/dashboard/candidate/onboarding/`: 9-step onboarding flow.
- `src/lib/api.ts`: Centralized HTTP client for all backend interactions.
- `src/lib/auth-store.ts`: Persisted Zustand store for auth state.

### [lms/](file:///d:/HoussineStudies/projet_ic_perso/recruitment_platform/lms/)
Learning Management System specialized component.
- `app/api/`: LMS-specific endpoints (courses, enrollments).
- `lib/sso-client.ts`: Shared authentication client for SSO between modules.
- `models/`: Mongoose schemas for LMS data.

## Key Data Flows
1. **Authentication**: Converged JWT-based SSO. Users login via `frontend` or `lms`, sharing the same identity token.
2. **Matching Engine**: Calculates fit scores between `JobRequirement` and `CandidateSkill`/`EmployeeSkill`.
3. **Internal Mobility**: Employees apply for internal positions; recruiters track progress via a Kanban pipeline.
4. **Onboarding**: Multi-step candidate profiling with real-time completeness score and AI-assisted skill extraction.
