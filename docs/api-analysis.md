# 🔌 API Analysis — RecruitPRO

> Analyse de l'API FastAPI (`backend/app/`) + des routes LMS (`lms/app/api/`).
> Lecture seule, 2026-06-14.

## 1. Structure

- **Framework** : FastAPI. `app/main.py` monte **16 routers** sous `/api/*`, configure CORS
  et sert `/uploads` (CVs) en statique.
- **Schémas Pydantic définis inline** dans chaque fichier `api/*.py` (pas de dossier
  `schemas/` malgré ce qu'indique `backend/README.md`). 2 à 8 `BaseModel` par fichier.
- **~75 routes** au total. `backend/API.md` documente la version « contractuelle ».

### Montage des routers (`main.py`)
```
/api/auth · /api/candidates · /api/jobs · /api/skills · /api/catalog
/api/applications · /api/companies · /api/recruiters · /api/users
/api/organization · /api/employees · /api/roles · /api/lms
internal_mobility (sans préfixe global) · trainings (sans préfixe global)
```
> Note : `internal_mobility` et `trainings` sont inclus **sans `prefix=`** — leurs préfixes
> sont définis dans le router lui-même (`/api/internal-mobility`, `/api/trainings`).

## 2. Authentification

### Login & JWT (`api/auth.py`)
- `POST /api/auth/register` — crée un `User` (email mis en minuscule, mot de passe bcrypt).
- `POST /api/auth/token` — OAuth2 password flow → JWT HS256.
  **Claims** : `sub` (= `user.id` en string), `email`, `full_name`, `role`, `is_instructor`,
  `company_id`. Expiration 30 min (`ACCESS_TOKEN_EXPIRE_MINUTES`).
  > ⚠️ `company_id` provient de `getattr(user, "company_id", None)` mais `User` n'a pas cette
  > colonne → **toujours `None`**. Le LMS lit pourtant ce claim. Voir `technical-debt.md`.
- `GET /api/auth/me` — profil courant.

### Dépendances d'auth
- `get_current_user` — décode le JWT ; `sub` interprété comme **id** (nouveaux tokens) avec
  **fallback email** (anciens tokens). 401 si invalide.
- `get_current_user_optional` — variante non bloquante (job board public).

## 3. Autorisation — DEUX systèmes parallèles

Le projet mélange deux mécanismes de contrôle d'accès :

### a) Vérifs de rôle **inline** (majoritaire)
Dans la plupart des routes, contrôle manuel du rôle système :
```python
if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
    raise HTTPException(403, ...)
```
> ⚠️ Incohérence : tantôt comparé à des **enums** (`[UserRole.ADMIN]`), tantôt à des
> **chaînes** (`["ADMIN","RECRUITER"]`, ex. `jobs.py:326`). Ça fonctionne car `UserRole`
> hérite de `str`, mais c'est fragile.

### b) RBAC granulaire `has_permission` (`core/permissions.py`)
Dépendance FastAPI `Depends(has_permission("perm:name"))`. Logique :
1. `ADMIN` système → bypass total.
2. `RECRUITER` **sans** profil `Employee` → bypass (propriétaire du tenant).
3. Sinon : doit avoir un `internal_role` contenant la permission, sinon 403.

**Usage réel — seulement ~6 fichiers / 14 points** :
| Permission | Route |
|---|---|
| `jobs:create` | `jobs.py` POST / |
| `employees:view` / `employees:edit` | `employees.py` (GET, POST, PUT, DELETE) |
| `org:edit` | `organization.py` (POST, PUT, DELETE) |
| `settings:edit` | `roles.py` POST / |
| `trainings:assign` | `trainings.py` (appel manuel) |

> ⚠️ `trainings.py:154` appelle `await has_permission("trainings:assign")(db, current_user)`
> — **ordre des arguments inversé** (la signature attend `(current_user, db)`) **et**
> `trainings:assign` **n'existe pas** dans `DEFAULT_PERMISSIONS`. Voir `technical-debt.md`.

## 4. Isolation multi-tenant (par requête)

Pas de filtre global automatique. Chaque route sensible récupère le `Recruiter` de
l'utilisateur et compare `job.company_id != recruiter.company_id` → 403. Exemple type
(`jobs.py` `/matches`, `applications.py` `/job/{id}`) :
```python
recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
if not recruiter or job.company_id != recruiter.company_id:
    raise HTTPException(403, ...)
```
> Conséquence : l'isolation dépend de la rigueur de chaque handler ; un oubli = fuite
> inter-tenant. Les candidats et skills étant globaux, ils ne sont pas filtrés.

## 5. Inventaire des endpoints par domaine

### `/api/auth`
`POST /register` · `POST /token` · `GET /me`

### `/api/candidates`
`POST /me/parse-text` · `GET/PUT /me/` · `PATCH /me/onboarding/` · `POST /me/cv/` ·
`POST /` · `GET /` · `GET/PUT/DELETE /{id}/` · `POST /discover` (recherche proactive de talents)

### `/api/jobs`
`POST /` (perm `jobs:create`) · `GET /` · `GET/PUT/DELETE /{id}` ·
`GET /{id}/matches` (candidats + score) · `GET /{id}/internal-matches` (mobilité)

### `/api/applications`
`POST /invite` · `POST /` (postuler) · `GET /me` · `GET /job/{id}/` (Kanban) ·
`PATCH /{id}/status/` (transition Kanban ; `ACCEPTED` ⇒ crée un `Employee`)

### `/api/skills` · `/api/catalog`
Skills : CRUD + `GET /categories/`. Catalog : `GET /jobs/suggest`, `GET /jobs/suggest-ai`
(suggestion IA), `GET /jobs`, `GET /skills`

### `/api/organization` · `/api/employees` · `/api/roles`
Org : CRUD unités + `GET /tree`. Employees : CRUD + `GET /me` + `GET /orgchart/tree`
(perm `employees:*`). Roles : `GET /`, `GET /permissions`, `POST /` (perm `settings:edit`)

### `/api/companies` · `/api/recruiters` · `/api/users`
CRUD. Users en plus : `GET /me/permissions`, `PATCH /{id}/set-instructor`

### `internal_mobility` · `trainings`
Mobilité : `/positions`, `/positions/{id}`, `/my-applications`, `POST/PATCH/DELETE /applications`.
Trainings : `/catalog`, `/my-enrollments`, `/{id}`, `POST/PATCH /enrollments`

### `/api/lms` — pont RH ↔ LMS (`api/lms.py`)
| Route | Sens | Détail |
|---|---|---|
| `POST /course-completed` | LMS → RH | Remonte un niveau de compétence dans `candidate_skills` (ne le diminue jamais) |
| `GET /courses` | RH → LMS | Proxy httpx vers `LMS_API_URL/api/courses` |
| `GET /enrollments` | RH → LMS | Proxy + `Authorization: Bearer <service-token>` |
| `POST /enroll` | RH → LMS | Assigne un cours (ADMIN/RECRUITER) ; gère 409 déjà inscrit |

## 6. Intégration SSO & service-to-service

```
Login RH (FastAPI) ──JWT──▶ Frontend RH (Zustand persist "recruitpro-auth")
        │
        │ lmsLaunchUrl(token): ouvre LMS avec ?token=…
        ▼
   LMS (Next.js) ── captureSsoToken() lit ?token=, persiste localStorage, nettoie l'URL
        │
        ▼ vérifie le JWT avec jose + MÊME secret (lib/auth.ts)
   requireAuth / requireRole / requireInstructor
```

- **Secret partagé** : `SECRET_KEY` (FastAPI) ≡ `JWT_SECRET` (LMS), défaut
  `dev_secret_key_fixed_for_stability_change_in_prod`.
- **Token de service** (`lms.py::_get_service_token`) : JWT forgé côté RH (`sub:"0"`,
  `role:"ADMIN"`, exp 5 min) pour les appels RH → LMS.
  > ⚠️ Il lit `os.getenv("SECRET_KEY", défaut)` alors que le reste du code utilise
  > `settings.SECRET_KEY` (chargé depuis `.env`). Si `.env` définit un secret mais que la
  > variable d'env système ne l'exporte pas, **les deux secrets divergent**. Voir dette.
- **CORS LMS** (`middleware.ts`) : limité à l'origine RH (`NEXT_PUBLIC_RH_URL`).
- **CORS backend** (`main.py`) : liste **codée en dur** (`:3000`, `127.0.0.1:3000`,
  `192.168.56.1:3000`) — n'utilise **pas** `settings.BACKEND_CORS_ORIGINS` (qui, lui,
  inclut `:3001`). Incohérence.

## 7. Routes LMS (Next.js, `lms/app/api/` — 22 routes)

- **Public/apprenant** : `auth/me`, `courses`, `enrollments` (+ `[id]`, `[id]/progress`, `me`).
- **Instructeur** (`instructor/*`) : `courses` (+ `[id]`, `[id]/modules`, `[id]/final-exam`),
  `modules` (+ `[id]/quiz`, `[id]/sections`), `sections/[id]`, `quizzes/[id]/questions`,
  `questions/[id]` (+ `/answers`), `answers/[id]`, `categories` (+ `[id]`), `statistics`, `upload`.
- **Gardes** : `requireRole(['ADMIN','RECRUITER'])` pour l'assignation, `requireInstructor`
  (flag `is_instructor` ou rôle `ADMIN`) pour la zone instructeur. Erreurs mappées en
  401/403/500.
- **Statuts d'inscription Mongo** : `'assigned'` (≠ enum Postgres) → modèles d'enrollment
  distincts entre les deux bases.

## 8. Moteur de matching (`services/matching.py`) — cœur métier

Appelé par `/jobs/{id}/matches`, `/internal-matches`, `/candidates/discover`.

**Fit score** (« colle au besoin déclaré ? ») :
- Skills **60 %** : ratio niveau candidat / niveau requis (cap 1.2), poids ×2 si obligatoire,
  **pénalité ×0.7 par compétence obligatoire manquante**.
- Expérience **25 %** : `min(exp_candidat / exp_min, 1)`.
- Éducation **15 %** : `min(edu_candidat / edu_min, 1)`.

**Potential score** (« peut y arriver via formation ? ») — signaux positifs seuls :
- Adjacence ROME : même sous-domaine `1.0`, même grand domaine `0.6`, sinon `0.3`.
- Bonus certifications `+12`. Score `= ratio×80 + bonus`, plafonné à 100. `None` si aucun gap.

**Recommandation** : `STRONG_FIT` (fit ≥ 70) / `POTENTIAL` (potential ≥ 60) / `WEAK_FIT`.
La réponse `/matches` enrichit chaque candidat avec `has_applied` (jugé redondant avec le
statut `PENDING` dans la roadmap).

## 9. Intégrations externes

| Service | Fichier | État |
|---|---|---|
| ROME / France Travail (référentiel métiers) | `services/rome_api.py`, `france_travail_api.py` | Actif si `ROME_CLIENT_ID/SECRET` fournis, sinon fallback statique |
| Suggestion IA d'offres | `catalog.py` `/jobs/suggest-ai` (Google/Groq keys) | Optionnel |
| Parsing CV | `services/cv_service.py`, `candidates.py` `/me/parse-text`, `/me/cv` | Partiel |
| SMTP email | `config.py` | Déclaré, non utilisé |

## 10. Observations API (lecture seule)

1. Deux systèmes d'autorisation (inline rôle + `has_permission`) coexistent sans frontière claire.
2. `company_id` du JWT toujours `None` → l'isolation côté LMS ne peut pas s'appuyer dessus.
3. `_get_service_token` et le reste du code ne lisent pas le secret de la même façon.
4. CORS backend en dur ≠ `settings.BACKEND_CORS_ORIGINS`.
5. `print()` de debug dans des handlers (`auth.register`, matching dans `applications`).
6. Effet de bord fort et implicite : `ACCEPTED` crée un `Employee` (peu visible dans le contrat).
7. Bug probable `trainings.py` (ordre d'args + permission inexistante).
