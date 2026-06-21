# Project Rules - RecruitPRO

## Development Environment
- **Backend**: `http://localhost:8000` (FastAPI)
- **Frontend**: `http://localhost:3000` (Next.js)
- **LMS**: `http://localhost:3001` (Next.js)

## Core Commands

### Backend
- Run Dev: `python run.py`
- Migrations: `alembic upgrade head`
- Tests: `pytest`
- Seeds: `python seed.py`, `python seed_rome.py`

### Frontend / LMS
- Install: `npm install`
- Run Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Coding Standards

### Backend (Python)
- **Case Sensitivity**: ALWAYS use lowercase for emails during registration and login to ensure consistent authentication.
- **REST Patterns**: Use Pydantic schemas for request/response validation.
- **Error Handling**: Use structured exceptions; avoid raw `Exception` catches.

### Frontend (React/TS)
- **API Access**: Use the centralized client in `src/lib/api.ts` for all backend calls.
- **State Management**: Use `useAuthStore` for user session and `zustand` for local component state.
- **UI/UX**: Strictly follow the established Navy + Mint design system. Use `glassmorphism` and `framer-motion` for premium feel.

## Authorization (RBAC)
Roles defined in the system:
1. `ADMIN`: Full system control.
2. `RECRUITER`: Job management, candidate sourcing, training management.
3. `EMPLOYEE`: Internal mobility, profile, training.
4. `CANDIDATE`: Job application, onboarding.
