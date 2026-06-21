# 🗄️ Database Analysis — RecruitPRO (PostgreSQL)

> Analyse du modèle de données SQLAlchemy (`backend/app/models/`). Lecture seule, 2026-06-14.
> ⚠️ Le LMS utilise une base **MongoDB séparée** (voir [§9](#9-base-mongodb-lms-séparée)).

## 1. Vue d'ensemble

- **ORM** : SQLAlchemy, base déclarative `app/core/database.Base`.
- **Migrations** : Alembic (`alembic/versions/`, 21 fichiers + merge heads).
- **~24 tables** réparties en 6 couches.
- **Multi-tenant** : stratégie *shared DB / shared schema* via `company_id` sur les tables sensibles.
- Tous les modèles sont importés/agrégés dans `app/models/__init__.py`.

## 2. Cartographie des tables par couche

| Couche | Tables |
|---|---|
| **Auth / Entreprise** | `users`, `companies`, `recruiters` |
| **Recrutement externe** | `candidates`, `candidate_skills`, `jobs`, `job_requirements`, `applications` |
| **Référentiel** | `skills`, `job_standards`, `job_standard_requirements` |
| **Organisation & RBAC** | `org_units`, `internal_roles`, `permissions`, `role_permissions` |
| **RH interne** | `employees`, `employee_skills` |
| **Mobilité / Formation / Éval** | `internal_positions`, `internal_position_requirements`, `internal_applications`, `trainings`, `training_skills`, `training_enrollments`, `evaluations` |

## 3. Détail des entités principales

### `users` (`user.py`)
PK `id`. `email` (unique, index), `password` (bcrypt), `full_name`, `role` (enum
`UserRole`: CANDIDATE/RECRUITER/ADMIN/EMPLOYEE), `is_active`, `is_instructor`, timestamps.
Relations 1-1 : `recruiter`, `candidate`, `employee`.
> ⚠️ **Pas de colonne `company_id`** sur `users` — pourtant le JWT tente de l'inclure
> (`getattr(user,"company_id",None)` → toujours `None`). Voir `technical-debt.md`.

### `companies` (`company.py`)
PK `id`. `name`, `description`, `industry`, `size`, `website`, `location`, `is_active`.
Cascade delete-orphan vers `recruiters` et `employees`.

### `recruiters` (`recruiter.py`)
Lie un `user` à une `company`. `position`, `hiring_authority` (bool). **C'est ce profil
qui porte le `company_id` servant à l'isolation multi-tenant** (le recruteur = propriétaire
de l'instance entreprise). Cascade vers `jobs`.

### `candidates` (`candidate.py`) — entité riche
PK `id`, FK `user_id`. Identité (`first_name`, `last_name`, `email` unique, `phone`,
`location`, `photo_url`). Profil matching : `years_of_experience` (Float), `education_level`
(Int = Bac+X), `bio`, `cv_text`, `cv_url`, `formations`, `certifications`,
`experience_detail`. Onboarding : `onboarding_step` (1-4), `onboarding_completed_at`,
`profile_completeness_score`. Visibilité : `is_active`, `is_visible` (pour le matching
public), `remote_ok`. Champs JSON : `links`, `projects`.
> **Pas de `company_id`** : les candidats forment un **pool global partagé** entre entreprises.

### `candidate_skills` (`candidate.py`)
PK composite (`candidate_id`, `skill_id`). `level` (1-4), `years_experience`. Cascade delete-orphan.

### `jobs` (`job.py`)
PK `id`, FK `recruiter_id`, `company_id` (nullable, « pour isolation directe »),
`org_unit_id`. Champs : `title`, `description`, `company` (nom dénormalisé pour le job board),
`location`, `salary_min/max`, `min_years_experience`, `min_education_level`, `contract_type`,
`start_date`, `benefits` (JSON). Relations : `requirements`, `applications`, `org_unit`.
> ⚠️ Une classe `JobApplication` est **commentée/morte** en bas du fichier.

### `job_requirements` (`job.py`)
PK composite (`job_id`, `skill_id`). `required_level` (1-4), `is_mandatory` (bool, défaut True).
Consommé par l'algo de matching (poids ×2 si obligatoire).

### `applications` (`application.py`)
PK `id`, FK `candidate_id`, `job_id`. `status` (enum `ApplicationStatus`), `cover_letter`,
`is_active`, timestamps.
- **`ApplicationStatus`** : `APPLIED`, `PENDING`, `REVIEWING`, `SHORTLISTED`, `REJECTED`, `ACCEPTED`.
  > ⚠️ `APPLIED` et `PENDING` font doublon (commentaire « ← ajoute cette ligne » dans le code).
- **Effet de bord métier** : passer une candidature à `ACCEPTED` **crée automatiquement un
  `Employee`** (voir `applications.py` PATCH status). Transition recrutement → RH interne.

### `skills` (`skill.py`) — référentiel global
PK `id`. `name` (unique), `category`, `rome_code` (lien France Travail), `description`,
`level1..4_description`. **Aucun `company_id`** : référentiel partagé. Cascades vers
`candidate_skills`, `job_requirements`, `employee_skills`.

### `job_standards` / `job_standard_requirements` (`job_standard.py`)
Fiches métier type (ROME 4.0). `rome_code` unique, `category`. Sert de gabarit d'offres
et de benchmark candidat. Lien M-N vers skills via `min_level` + `is_mandatory`.

## 4. Couche RH interne

### `employees` (`employee.py`)
PK `id`, FK `user_id` (nullable, unique), `company_id` (**non nullable** → tenant),
`org_unit_id`, `internal_role_id`, `manager_id` (auto-référence). Identité + pro
(`job_title`, `department` déprécié au profit d'`org_unit_id`, `hire_date`,
`years_of_experience`, `education_level`). `is_active` typé **Integer** (0/1).
Auto-relation `manager` → `subordinates` (backref). Relations vers skills, internal_applications,
training_enrollments, evaluations (double FK).

### `employee_skills` (`employee.py`)
PK `id`. `level` (1-4), `years_experience`, `certified` (Int 0/1), `last_used`. Cascade delete-orphan.

### `org_units` (`organization.py`)
PK `id`, FK `company_id`, `parent_id` (auto-référence → **hiérarchie infinie**),
`manager_id`. `name`, `unit_type` (« Direction », « Squad », « Pôle »…). Backref `children`.
Relations vers `employees` et `jobs`.

## 5. RBAC (`permissions.py`)

- **`permissions`** : action atomique. `name` (unique, ex. `jobs:create`), `category`
  (`recruitment` / `org` / `hr` / `admin`). **Global** (pas de `company_id`).
- **`internal_roles`** : rôle par entreprise. `company_id`, `name`, `is_system_role` (Int 0/1).
- **`role_permissions`** : table de jointure M-N (`role_id`, `permission_id`).

**12 permissions par défaut** (`services/permissions.py::DEFAULT_PERMISSIONS`) :
`jobs:create/view/edit/delete`, `applications:view/review`, `org:view/edit`,
`employees:view/edit/view_salary`, `settings:edit`.

**4 rôles système créés par entreprise** (`init_company_roles`) :

| Rôle | Permissions |
|---|---|
| Administrateur | Toutes |
| RH / Recruteur | catégories `recruitment` + `hr` + `org` |
| Manager | `jobs:view/create`, `applications:view/review`, `org:view`, `employees:view` |
| Collaborateur | `org:view`, `employees:view` |

## 6. Mobilité, formation, évaluation (`internal_hr.py`)

| Table | Clés / champs notables | Enum |
|---|---|---|
| `internal_positions` | `company_id`, `posted_by`, `status` | `InternalPositionStatus`: OPEN/CLOSED/FILLED |
| `internal_position_requirements` | `position_id`, `skill_id`, `required_level`, `is_mandatory` (Int) | — |
| `internal_applications` | `employee_id`, `position_id`, `motivation_letter`, `status` | `InternalApplicationStatus`: PENDING/REVIEWING/INTERVIEW/ACCEPTED/REJECTED |
| `trainings` | `company_id`, `category`, `duration_hours`, `provider`, `cost`, `max_participants` | `TrainingCategory`: TECHNICAL/SOFT_SKILLS/MANAGEMENT/COMPLIANCE/LANGUAGE |
| `training_skills` | `training_id`, `skill_id`, `level_gained` | — |
| `training_enrollments` | `employee_id`, `training_id`, `score`, `feedback`, `completed_at` | `EnrollmentStatus`: PENDING/APPROVED/COMPLETED/CANCELLED |
| `evaluations` | `employee_id`, `evaluator_id` (double FK), `period_start/end`, `overall_rating`, `strengths`, `areas_for_improvement`, `objectives` | — |

## 7. Multi-tenancy — synthèse

| Porte `company_id` | N'en porte PAS (global) |
|---|---|
| `recruiters`, `employees`, `jobs`*, `org_units`, `internal_roles`, `internal_positions`, `trainings` | `users`, `candidates`, `skills`, `job_standards`, `permissions` |

\* `jobs.company_id` est nullable et redondant avec `recruiter.company_id` (isolation « directe »
ajoutée après coup). L'isolation effective se fait **par requête** via le `Recruiter.company_id`
de l'utilisateur connecté (pas de filtre global automatique). Voir `api-analysis.md`.

## 8. Diagramme relationnel (textuel)

```
User 1─1 Recruiter ──< Job >── JobRequirement >── Skill
  │  1─1 Candidate ──< CandidateSkill >─────────────┘
  │  1─1 Employee ──< EmployeeSkill >───────────────┘
  │           │
Company 1──< Recruiter / Employee / Job / OrgUnit / InternalRole / InternalPosition / Training
OrgUnit ─┐ parent_id (arbre) ; manager_id → Employee
         └─< Employee / Job
Employee ─ manager_id (arbre) ; ──< InternalApplication >── InternalPosition
         ──< TrainingEnrollment >── Training ──< TrainingSkill >── Skill
         ──< Evaluation (employee_id, evaluator_id)
Candidate ──< Application >── Job        (ACCEPTED ⇒ création Employee)
InternalRole >──< Permission             (role_permissions)
JobStandard ──< JobStandardRequirement >── Skill
```

## 9. Base MongoDB (LMS, séparée)

Le LMS ne partage **aucune table** avec PostgreSQL. Modèles Mongoose (`lms/models/`) :
`Course`, `Module`, `Section`, `Quiz`, `Question`, `Answer`, `Category`, `Enrollment`,
`Progress`. Le lien avec le RH se fait **par valeur** : `Enrollment.employeeId` (entier =
`users.id` côté RH), pas par clé étrangère.
> ⚠️ **Deux systèmes d'inscription coexistent** : `training_enrollments` (PostgreSQL,
> module Trainings) et `Enrollment` (MongoDB, LMS), avec des statuts différents
> (`'assigned'` côté Mongo vs `PENDING/APPROVED/...` côté Postgres). Voir `technical-debt.md`.

## 10. Observations modèle (lecture seule)

1. `is_active` / `certified` / `is_mandatory` / `is_system_role` typés **Integer** dans la
   couche RH interne, mais **Boolean** ailleurs → incohérence de typage.
2. `jobs.company` (texte) + `jobs.company_id` (FK) + `recruiter.company_id` → triple source
   pour l'entreprise d'une offre.
3. `candidate.formations` / `certifications` / `experience_detail` sont du **Text libre**
   (parfois « JSON or structured text » d'après les commentaires) alors que `links`/`projects`
   sont du **JSON** typé → format hétérogène.
4. Modèle mort commenté (`JobApplication`) dans `job.py`.
5. `ApplicationStatus.APPLIED` redondant avec `PENDING`.
