# 🧹 Technical Debt — RecruitPRO

> Inventaire des dettes techniques, incohérences et risques relevés par analyse statique
> (lecture seule, 2026-06-14). **Aucune correction appliquée.** Les éléments sont classés par
> sévérité ; les références pointent vers les fichiers exacts.

## Légende sévérité
🔴 Critique (sécurité / correction) · 🟠 Important (fiabilité / maintenance) · 🟡 Mineur (propreté)

---

## 🔴 Critiques

### D1 — Claim JWT `company_id` toujours `null`
`api/auth.py:158` : `"company_id": getattr(user, "company_id", None)`. La table `users`
**n'a pas** de colonne `company_id` → le claim vaut toujours `None`. Or `lms/lib/auth.ts`
expose `LMSUser.company_id` pour un éventuel filtrage multi-tenant.
**Impact** : toute logique d'isolation côté LMS basée sur ce claim est inopérante.
**Piste** : dériver `company_id` via `Recruiter`/`Employee` avant de forger le token.

### D2 — Secret JWT lu de deux façons → divergence possible
Tout le code utilise `settings.SECRET_KEY` (chargé depuis `.env`), **sauf**
`api/lms.py::_get_service_token` (l. 170) qui lit `os.getenv("SECRET_KEY", défaut)`.
Si `.env` définit un secret mais que la variable n'est pas exportée dans l'environnement
système, le token de service est signé avec le **défaut** → rejeté par le LMS (qui lit
`process.env.JWT_SECRET || défaut`) si celui-ci a été personnalisé.
**Impact** : pont RH→LMS cassé silencieusement en production.

### D3 — Secrets commités en dur
`core/config.py` : `SECRET_KEY` (défaut partagé connu) et `DATABASE_URL` avec mot de passe
(`postgresql://postgres:Houssine.007@…`) en clair dans le dépôt.
**Impact** : si le défaut n'est pas surchargé en prod, falsification de JWT triviale.
**Piste** : forcer le chargement via `.env`/secret manager, planter si non défini en prod.

### D4 — SQL mort / non paramétré dans l'assignation de cours
`api/lms.py:142` (`assign_course_to_employee`) :
```python
token = db.execute("SELECT access_token FROM user_tokens WHERE user_id = :id LIMIT 1",)
```
Requête **sans paramètre lié** (`:id` non fourni), **résultat inutilisé**, table `user_tokens`
absente du modèle. Code mort qui peut lever une exception selon la version SQLAlchemy.

### D5 — Isolation multi-tenant non systématique
Aucun filtre global par `company_id` : chaque handler ré-implémente le contrôle
(`recruiter.company_id != job.company_id`). Un seul oubli = fuite de données inter-entreprises.
**Piste** : centraliser dans une dépendance/`Query` filtrée ou un mixin.

---

## 🟠 Importants

### D6 — Deux systèmes d'autorisation concurrents
Vérifs de rôle **inline** (`current_user.role not in [...]`) dans la majorité des routes
**vs** dépendance RBAC `has_permission(...)` utilisée dans seulement ~6 fichiers
(`jobs`, `employees`, `organization`, `roles`, `trainings`). Pas de règle claire sur lequel
employer. Surface d'erreur élevée, audit de sécurité difficile.

### D7 — Bug probable dans `trainings.py`
`api/trainings.py:154` :
```python
perm_check = await has_permission("trainings:assign")(db, current_user)
```
- **Ordre des arguments inversé** : `permission_checker(current_user, db)` attendu.
- **Permission inexistante** : `trainings:assign` n'est pas dans `DEFAULT_PERMISSIONS`
  (`services/permissions.py`) → aucun rôle ne la possède (seul le bypass ADMIN/recruiter passe).

### D8 — Comparaisons de rôles incohérentes (enum vs string)
Tantôt `[UserRole.ADMIN, UserRole.RECRUITER]` (`applications.py:200`), tantôt
`["ADMIN","RECRUITER"]` (`jobs.py:326`). Fonctionne grâce à `UserRole(str, Enum)` mais
fragile et non uniforme.

### D9 — Deux systèmes d'inscription parallèles
`training_enrollments` (PostgreSQL, module `trainings`) **et** `Enrollment` (MongoDB, LMS),
avec des statuts divergents (`'assigned'` côté Mongo ; `PENDING/APPROVED/COMPLETED/CANCELLED`
côté Postgres). Le pont `/api/lms/enroll` écrit dans Mongo. Risque de désynchronisation et
de confusion conceptuelle (formation interne vs cours LMS).

### D10 — CORS backend en dur ≠ configuration
`main.py` code en dur la liste d'origines et **n'utilise pas** `settings.BACKEND_CORS_ORIGINS`
(qui inclut pourtant `:3001`). Toute modification de config CORS est silencieusement ignorée.

### D11 — `ApplicationStatus.APPLIED` redondant avec `PENDING`
`models/application.py:8` (commentaire « ← ajoute cette ligne »). La roadmap
(`doc_technique.md`) note déjà la suppression de `has_applied`/`APPLIED` au profit du statut.
Deux statuts pour le même concept → logique Kanban ambiguë.

### D12 — Effet de bord métier implicite et non transactionnel
`applications.py` PATCH status : passer à `ACCEPTED` **crée un `Employee`**. Comportement
fort, peu visible dans le contrat d'API, avec rechargement post-commit fragile. Pas de
garde d'idempotence claire si l'appel est rejoué.

### D13 — URL d'API frontend non configurable
`frontend/src/lib/api.ts:3` : `API_BASE = "http://localhost:8000"` en dur (contrairement à
`LMS_BASE` qui lit `NEXT_PUBLIC_LMS_URL`). Empêche tout déploiement hors localhost sans patch.

### D14 — Migrations Alembic désordonnées
21 migrations avec **merge heads** (`05f893907368_merge_heads.py`, doublons
`add_applied_status` `1bc03fb69c77` + `539efbbcfc87`) et un dossier `alembic_versions_backup/`.
Vérifier `alembic heads` impératif avant toute nouvelle migration ; historique difficile à suivre.

### D15 — Stockage du JWT en `localStorage` + transit en URL
Frontend RH (Zustand persist) et LMS stockent le JWT en `localStorage` (exposition XSS) ;
le SSO le passe en `?token=` dans l'URL (atténué par nettoyage immédiat mais loggable par
les intermédiaires). Préférer cookies httpOnly / échange court.

---

## 🟡 Mineurs / propreté

### D16 — Documentation backend obsolète
`backend/README.md` référence `app/schemas/` et `scripts/seed_data.py` **inexistants**
(les schémas sont inline ; le seed est `seed.py`).

### D17 — Typage incohérent des booléens
Couche RH interne : `is_active`, `certified`, `is_mandatory`, `is_system_role` typés
**Integer (0/1)** ; ailleurs **Boolean**. Uniformiser.

### D18 — Triple source pour l'entreprise d'une offre
`jobs.company` (texte dénormalisé) + `jobs.company_id` (FK nullable « directe ») +
`recruiter.company_id`. Source de vérité ambiguë.

### D19 — Code mort
- Classe `JobApplication` entièrement commentée (`models/job.py:48-63`).
- Commentaire orphelin en fin de `models/candidate.py:57`.

### D20 — `print()` de debug en production
`auth.py` (register), `applications.py` (erreurs de matching) utilisent `print()` au lieu d'un
logger configuré.

### D21 — Champs candidat à format hétérogène
`formations`, `certifications`, `experience_detail` en **Text libre** (« JSON or structured
text ») alors que `links`/`projects` sont du **JSON** typé.

### D22 — Doublons / fichiers parasites frontend
- `recruiter/jobs/create/` **et** `recruiter/jobs/new/` (deux pages de création).
- `recruiter/candidates/1/page.tsx.tmp` (fichier `.tmp` commité).
- `recruiter/candidates/1/` figé à côté de la route dynamique `[id]`.

### D23 — Divergence d'outillage entre les deux frontends
Next 15 + Tailwind 3 (RH) vs Next 16 + Tailwind 4 (LMS) → conventions et configs différentes
à maintenir en parallèle.

### D24 — Artefacts à la racine
`changes.patch` (103 Ko, patch non appliqué), `doc_technique.md`/`MVP_urgent.md`/`donnée.md`
+ 16 fichiers `docs/` partiellement redondants → documentation dispersée et potentiellement
divergente du code.

---

## Tableau de synthèse

| # | Sévérité | Thème | Fichier principal |
|---|---|---|---|
| D1 | 🔴 | JWT `company_id` null | `api/auth.py:158` |
| D2 | 🔴 | Secret lu différemment | `api/lms.py:170` |
| D3 | 🔴 | Secrets commités | `core/config.py` |
| D4 | 🔴 | SQL mort non paramétré | `api/lms.py:142` |
| D5 | 🔴 | Isolation tenant manuelle | tous les handlers |
| D6 | 🟠 | Double système d'autorisation | `core/permissions.py` + routes |
| D7 | 🟠 | Bug permission trainings | `api/trainings.py:154` |
| D8 | 🟠 | Rôles enum vs string | `jobs.py` / `applications.py` |
| D9 | 🟠 | Double système d'inscription | `trainings` vs LMS `Enrollment` |
| D10 | 🟠 | CORS en dur | `app/main.py` |
| D11 | 🟠 | Statut `APPLIED` redondant | `models/application.py` |
| D12 | 🟠 | Effet de bord ACCEPTED→Employee | `api/applications.py` |
| D13 | 🟠 | API_BASE en dur | `frontend/src/lib/api.ts:3` |
| D14 | 🟠 | Merge heads Alembic | `alembic/versions/` |
| D15 | 🟠 | JWT localStorage + URL | front RH + LMS |
| D16-D24 | 🟡 | Propreté / doc / doublons | divers |

## Recommandations de priorisation

1. **Sécurité d'abord** : D3 (secrets), D2 (cohérence secret), D1 (claim), D5 (isolation).
2. **Fiabilité** : D7 (bug), D4 (code mort), D10/D13 (config déploiement), D14 (migrations).
3. **Dette structurelle** : D6 (unifier l'autorisation), D9 (clarifier inscriptions).
4. **Propreté** : D16-D24 au fil de l'eau.
