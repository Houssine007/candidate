# 🗺️ Project Map — RecruitPRO

> Point d'entrée de l'analyse du dépôt. Document généré le 2026-06-14 (lecture seule).
> Documents liés : [`database-analysis.md`](./database-analysis.md) ·
> [`api-analysis.md`](./api-analysis.md) · [`frontend-analysis.md`](./frontend-analysis.md) ·
> [`technical-debt.md`](./technical-debt.md). Voir aussi `doc_technique.md` (racine).

## 1. Nature du projet

**RecruitPRO** = suite RH tout-en-un couvrant le recrutement externe (ATS), la gestion RH
interne (employés, organigramme, mobilité), l'apprentissage (LMS) et les évaluations.
C'est un **monorepo de 3 applications** liées par **une identité JWT partagée**.

| Application | Dossier | Stack | Port | Persistance | Rôle |
|---|---|---|---|---|---|
| Backend API | `backend/` | FastAPI · SQLAlchemy · Alembic · Pydantic v2 | 8000 | PostgreSQL | Cœur métier (ATS, RH, matching, RBAC) |
| Frontend RH | `frontend/` | Next.js 15 (App Router) · TS · Tailwind 3 · Zustand | 3000 | — | UI RH, **seul point de login** |
| LMS | `lms/` | Next.js 16 (App Router) · TS · Tailwind 4 · Mongoose | 3001 | MongoDB | Plateforme de formation |

Langue dominante du code, des commentaires et de l'UI : **français**.

## 2. Schéma d'ensemble

```
                         ┌────────────────────────────┐
                         │      Frontend RH :3000      │
                         │  Next.js · Zustand          │
                         │  (login unique des 3 apps)  │
                         └─────┬──────────────────┬────┘
              REST (Bearer)    │                  │  lmsLaunchUrl(?token=)
                               ▼                  ▼
                  ┌────────────────────┐   ┌──────────────────┐
                  │  Backend API :8000 │   │     LMS :3001     │
                  │  FastAPI           │◀─▶│  Next.js routes   │
                  │  PostgreSQL        │   │  MongoDB          │
                  └────────────────────┘   └──────────────────┘
                       ▲   pont /api/lms (httpx + service-token)
                       └─── sync compétences (course-completed)
```

JWT HS256 signé avec un **secret unique** partagé : `SECRET_KEY` (FastAPI) = `JWT_SECRET` (LMS).
Détails du flux dans [`api-analysis.md` §SSO](./api-analysis.md).

## 3. Arborescence macro

```
recruitment_platform/
├── backend/
│   ├── app/
│   │   ├── main.py              16 routers montés sous /api/*
│   │   ├── core/               config, database, security, permissions (RBAC dep)
│   │   ├── models/             13 fichiers → ~24 tables SQLAlchemy
│   │   ├── services/           matching, scoring, cv, rome/france_travail, permissions, completeness
│   │   └── api/                16 routers (schémas Pydantic inline)
│   ├── alembic/                21 migrations (+ merge heads) + alembic_versions_backup/
│   ├── tests/                  unit / integration / security / performance
│   ├── seed*.py, create_admin.py, cleanup_db.py, fix_role.py, normalize_skills.py
│   └── uploads/                CVs servis en statique (/uploads)
├── frontend/
│   └── src/
│       ├── app/                App Router : login, signup, landing, dashboard/{candidate,employee,recruiter}
│       ├── components/         theme-provider, theme-toggle
│       └── lib/                api.ts (713 l., client + types), auth-store.ts (Zustand persist)
├── lms/
│   ├── app/                    api/ (22 routes) + pages instructor/apprenant + components
│   ├── lib/                    auth.ts (JWT jose), sso-client.ts, mongodb.ts
│   ├── models/                 9 modèles Mongoose
│   └── middleware.ts           CORS vers l'origine RH
└── docs/                       16 .md + ce set d'analyse
```

## 4. Modules fonctionnels

| Module | Où | État |
|---|---|---|
| **ATS** (offres, candidatures, Kanban) | backend `jobs`/`applications`, frontend `recruiter` | Opérationnel |
| **Matching IA** (fit + potential ROME) | backend `services/matching.py` | Opérationnel, cœur du produit |
| **Onboarding candidat** (4 étapes) | backend `candidates`, frontend `candidate/onboarding` | Opérationnel |
| **Org & organigramme** (hiérarchie infinie) | backend `organization`/`employees`, frontend `recruiter/organization` | Opérationnel |
| **RBAC interne** (rôles + permissions) | backend `core/permissions.py`, `services/permissions.py` | Partiel (cf. dette) |
| **Mobilité interne** | backend `internal_mobility`, frontend `employee/mobilite` | Récent, non commité |
| **Formations (Postgres)** | backend `trainings` | Récent, non commité |
| **LMS (MongoDB)** | app `lms/` complète | Opérationnel, séparé |
| **Évaluations 360°** | modèle `Evaluation` | Modèle prêt, pas d'API |

## 5. Rôles utilisateurs

| Rôle système (`users.role`) | Accès |
|---|---|
| `ADMIN` | Tout, bypass RBAC |
| `RECRUITER` | Propriétaire du tenant : dashboard RH, offres, candidatures, org |
| `CANDIDATE` | Job board, profil, candidatures |
| `EMPLOYEE` | Espace collaborateur (formations, mobilité) |

Deuxième niveau : **rôles internes** par entreprise (Administrateur, RH/Recruteur, Manager,
Collaborateur) portant des **permissions atomiques**. Détail dans
[`api-analysis.md` §RBAC](./api-analysis.md) et [`database-analysis.md`](./database-analysis.md).

## 6. Démarrage (dev)

```bash
# Backend (backend/)
python run.py                 # :8000, reload ; alembic upgrade head ; python seed.py
# Frontend RH (frontend/)
npm run dev                   # :3000
# LMS (lms/) — override port obligatoire (next dev = 3000 par défaut)
npm run dev -- -p 3001
```

Comptes seed : `recruiter@techcorp.com` / `password123` · `houssine@candidate.com` / `password123`.

## 7. Où regarder en premier

| Pour comprendre… | Lire |
|---|---|
| Le modèle de données et les relations | [`database-analysis.md`](./database-analysis.md) |
| Les endpoints, l'auth, le SSO, le matching | [`api-analysis.md`](./api-analysis.md) |
| Les pages, le client API, l'état | [`frontend-analysis.md`](./frontend-analysis.md) |
| Les risques, incohérences, code mort | [`technical-debt.md`](./technical-debt.md) |
