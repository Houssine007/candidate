# 🗺️ Cartographie — RecruitPRO

> Synthèse en lecture seule de l'architecture du dépôt. Généré le 2026-06-14.
> Référence détaillée : `doc_technique.md` (racine), `backend/API.md`, `docs/ARCHITECTURE.md`.

## 1. Vue d'ensemble

Monorepo contenant **3 applications** qui partagent **une seule identité JWT** :

```
recruitment_platform/
├── backend/    FastAPI + SQLAlchemy + PostgreSQL   :8000   (cœur ATS + RH + matching)
├── frontend/   Next.js 15 (App Router) + Zustand   :3000   (UI RH — seul point de login)
└── lms/        Next.js 16 (App Router) + Mongoose   :3001   (Learning Management, MongoDB)
```

Langue dominante du code et de l'UI : **français**.

---

## 2. Backend (`backend/`) — ~3 684 lignes d'API, ~651 de modèles

### Architecture en couches
```
app/
├── main.py            Montage des 16 routers sous /api/*, CORS, /uploads (StaticFiles)
├── core/              Infrastructure transverse
│   ├── config.py        Settings Pydantic (DB, JWT, ROME, SMTP, LMS_API_URL)
│   ├── database.py      Session SQLAlchemy + get_db()
│   ├── security.py      Bcrypt + JWT
│   └── permissions.py   has_permission("perm:name") → dépendance RBAC interne
├── models/            13 fichiers → ~22 tables (voir §2.2)
├── services/          Logique métier (voir §2.3)
└── api/               16 routers (schémas Pydantic inline, pas de dossier schemas/)
```

> ⚠️ Le `backend/README.md` mentionne `app/schemas/` et `scripts/seed_data.py` qui
> **n'existent pas**. Les schémas Pydantic sont définis **inline** dans chaque fichier
> `api/*.py` (2 à 8 `BaseModel` par fichier).

### 2.2 Modèle de données (groupes)

| Couche | Fichier | Tables / classes |
|---|---|---|
| **Auth / Entreprise** | `user.py`, `company.py`, `recruiter.py` | users, companies, recruiters |
| **Recrutement externe** | `candidate.py`, `job.py`, `application.py`, `skill.py` | candidates, candidate_skills, jobs, job_requirements, applications, skills |
| **Référentiel emplois** | `job_standard.py` | job_standards, job_standard_requirements (catalogue ROME) |
| **Org & RBAC** | `organization.py`, `permissions.py` | org_units (auto-référence → hiérarchie), internal_roles, permissions, role_permissions |
| **RH interne / LMS / Éval** | `employee.py`, `internal_hr.py` (170 l.) | employees, employee_skills, internal_positions(+requirements), internal_applications, trainings(+skills), training_enrollments, evaluations |

Relations clés : `Employee.manager` (auto-référence → subordinates), `OrgUnit.parent` (arbre),
`Evaluation` à double FK (employee + evaluator), cascades `delete-orphan` sur skills/applications.

### 2.3 Services métier

| Service | Lignes | Rôle |
|---|---|---|
| `matching.py` | 280 | **Cœur** : fit score (skills 60 % / exp 25 % / édu 15 %, pénalité −30 %/skill obligatoire manquant) + potential score (adjacence ROME : exact 1.0 / domaine 0.6 / sinon 0.3 + bonus certif). `find_matching_candidates`, `discover_top_talents` |
| `cv_service.py` | 134 | Traitement/parsing CV texte |
| `rome_api.py` + `france_travail_api.py` | 207 | Intégration référentiel ROME France Travail (fallback statique si pas de credentials) |
| `scoring.py` | 63 | Scoring complémentaire |
| `completeness.py` | 39 | Score de complétude du profil candidat |
| `permissions.py` | 85 | Logique de permissions (doublon partiel avec `core/permissions.py`) |

### 2.4 Inventaire des endpoints (16 routers, ~75 routes)

| Préfixe | Domaine | Routes notables |
|---|---|---|
| `/api/auth` | Auth | `POST /register`, `POST /token` (JWT avec `role`, `is_instructor`, `company_id`), `GET /me` |
| `/api/candidates` | Candidats | CRUD, `PATCH /me/onboarding`, `POST /me/cv`, `POST /me/parse-text`, `POST /discover` |
| `/api/jobs` | Offres | CRUD, `GET /{id}/matches`, `GET /{id}/internal-matches` |
| `/api/applications` | Candidatures | `POST /`, `POST /invite`, `GET /me`, `GET /job/{id}`, `PATCH /{id}/status` (Kanban) |
| `/api/skills` · `/api/catalog` | Compétences / référentiel | CRUD skills, `GET /catalog/jobs/suggest`, `suggest-ai` |
| `/api/organization` | Organigramme | CRUD unités, `GET /tree` |
| `/api/employees` | Employés | CRUD, `GET /me`, `GET /orgchart/tree` |
| `/api/roles` | RBAC | `GET /`, `GET /permissions`, `POST /` |
| `/api/companies` · `/api/recruiters` · `/api/users` | Comptes | CRUD + `PATCH /users/{id}/set-instructor`, `GET /users/me/permissions` |
| `/api/lms` | **Pont RH↔LMS** | `POST /course-completed` (sync skill), `GET /courses`, `GET /enrollments`, `POST /enroll` (proxy httpx) |
| `internal_mobility` | Mobilité interne | `/positions`, `/my-applications`, `/applications` |
| `trainings` | Formations | `/catalog`, `/my-enrollments`, `/enrollments` |

### 2.5 Scripts & migrations
- **Scripts racine** : `seed.py`, `seed_rome.py`, `seed_simulation.py`, `create_admin.py`,
  `cleanup_db.py`, `fix_role.py`, `normalize_skills.py`, `scripts/import_rome.py`
- **Alembic** : 21 migrations dans `alembic/versions/` (+ `alembic_versions_backup/`).
  Historique avec **merge heads** (`05f893907368_merge_heads.py`) → vérifier `alembic heads`
  avant d'en ajouter.
- **Tests** (`tests/`) : `unit/`, `integration/`, `security/`, `performance/` +
  `test_matching.py`, `test_scoring.py`. Lancés via `python run_tests.py`
  (pytest + coverage, DB `recruitment_test`).

---

## 3. Frontend RH (`frontend/src/`)

Next.js App Router, organisé **par rôle**. State auth = Zustand (`lib/auth-store.ts`),
tous les appels API + types = `lib/api.ts` (`API_BASE` :8000, `LMS_BASE` :3001,
helper `lmsLaunchUrl` pour le SSO).

```
app/
├── page.tsx              Landing
├── login/ · signup/      Auth (login = seul point d'entrée des 3 apps)
└── dashboard/
    ├── candidate/        page + onboarding/         (profil, matches, suivi candidatures)
    ├── employee/         page + formations/ + mobilite/   (espace collaborateur)
    └── recruiter/        page + applications/[jobId] (Kanban) + candidates/[id]
                          + employees/ + organization/ + formations/
                          + jobs/create/ + jobs/new/
components/   theme-provider.tsx, theme-toggle.tsx   (dark/light via next-themes)
```

> Observations : `recruiter/jobs/create/` **et** `recruiter/jobs/new/` coexistent (doublon
> probable) ; `recruiter/candidates/1/page.tsx.tmp` (fichier temporaire) ; route dynamique
> `[id]` à côté du dossier figé `1/`.

---

## 4. LMS (`lms/`)

Next.js où **les routes API sont le backend** (MongoDB via Mongoose). **Aucune page de login propre.**

```
lib/
├── auth.ts          Vérif JWT (jose) avec le MÊME secret que FastAPI → getAuthUser, requireAuth, requireRole, requireInstructor
├── sso-client.ts    captureSsoToken() : lit ?token=, persiste, nettoie l'URL
└── mongodb.ts       Connexion Mongoose
models/   Course, Module, Section, Quiz, Question, Answer, Category, Enrollment, Progress
app/
├── api/
│   ├── auth/me · courses · enrollments(+/[id]/progress, /me)
│   └── instructor/   courses, modules, sections, quizzes, questions, answers,
│                     categories, statistics, upload, courses/[id]/final-exam
├── components/       SsoTokenCapture.tsx, InstructorLayout.tsx, ConfirmDialog.tsx
├── courses/ · dashboard/ · instructor/(courses, categories, profile, settings…)
└── middleware.ts     CORS limité à l'origine RH
```

Périmètre : **apprenant** (catalogue, inscriptions, progression) + **instructeur** (CRUD
cours/modules/quiz/questions, stats, upload). Gate instructeur = flag `is_instructor` ou
rôle système `ADMIN`.

---

## 5. Intégration inter-services (point d'architecture central)

```
        ┌─────────────┐  login → JWT (HS256, secret partagé)
        │  Frontend RH │  role, is_instructor, company_id dans le token
        │    :3000     │
        └──────┬───────┘
   ?token=…    │  lmsLaunchUrl()
   ┌───────────┴───────────┐
   ▼                       ▼
┌─────────┐  POST /api/lms/course-completed   ┌─────────┐
│  LMS    │  ───────────────────────────────▶ │ Backend │
│ :3001   │  (MAJ niveau CandidateSkill)       │  :8000  │
│ MongoDB │  ◀─────────────────────────────── │ Postgres│
└─────────┘   proxy httpx + service-token      └─────────┘
              (_get_service_token, role ADMIN, 5 min)
```

- **Secret JWT unique** : `SECRET_KEY` (FastAPI) = `JWT_SECRET` (LMS), défaut
  `dev_secret_key_fixed_for_stability_change_in_prod`. Le changer d'un seul côté casse le SSO.
- **Sens RH → LMS** : `backend/app/api/lms.py` génère un token de service et appelle
  `LMS_API_URL` (proxy `/courses`, `/enrollments`, `/enroll`).
- **Sens LMS → RH** : à la complétion d'un cours, `POST /api/lms/course-completed` remonte
  le niveau de compétence (ne le **diminue jamais**).

> ⚠️ Observation : dans `lms.py::assign_course_to_employee` (l. 142), un
> `db.execute("SELECT access_token FROM user_tokens …")` est **sans paramètre lié et son
> résultat inutilisé** — code mort/bug.

---

## 6. Configuration & déploiement

| Élément | Valeur (dev) |
|---|---|
| DB | `postgresql://postgres:…@localhost:5432/recruitment_db` (mot de passe en dur dans `config.py`) |
| CORS backend | `:3000`, `127.0.0.1:3000`, `192.168.56.1:3000`, `:3001` |
| Intégrations optionnelles | ROME / France Travail, Google/Groq API keys, SMTP Gmail (déclarés, souvent vides) |
| Lancement | back `python run.py` · front `npm run dev` · **lms `npm run dev -- -p 3001`** (sinon collision sur 3000) |

---

## 7. Documentation présente (`docs/` + racine)

`ARCHITECTURE.md` / `ARCHITECTURE+.md`, `ACCESS_CONTROL_STRATEGY.md`,
`DECISION_CANDIDATE_MODEL.md`, `DEPLOYMENT.md`, `SECURITY.md`, `SETUP.md`, `TESTS.md`,
`PLANNING.md`, `FINAL_VISION.md`, `VISION_IDEE.md`, `FAQ.md`, `CONTRIBUTING.md`, `API.md`,
`ANTIGRAVITY_START_HERE.md` + racine : `doc_technique.md`, `MVP_urgent.md` (27 Ko),
`PROGRESS.md`, `donnée.md`, `changes.patch` (103 Ko, patch non appliqué).

---

## 8. Points d'attention relevés (lecture seule)

1. **Code mort/bug** : requête SQL non paramétrée et inutilisée dans `lms.py` (enroll).
2. **Doublons frontend** : `jobs/create` vs `jobs/new` ; `candidates/1/page.tsx.tmp` + dossier `1/` figé à côté de `[id]/`.
3. **Doublon backend** : `core/permissions.py` et `services/permissions.py`.
4. **README backend obsolète** : référence `app/schemas/` et `scripts/seed_data.py` inexistants.
5. **Migrations** : merge heads présents → prudence avant nouvelle migration.
6. **Secrets de dev commités** (`config.py`) — à ne pas confondre avec des secrets de prod.
7. **`git status` initial** : modèle EMPLOYEE et modules `internal_mobility`/`trainings` + dashboard employé sont des ajouts récents non commités.
