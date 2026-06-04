# 📄 Documentation Technique Complète — RecruitPRO

> **Mise à jour :** 20 Mai 2026 | Exploration complète fichier par fichier

---

## Table des matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Architecture générale](#2-architecture-générale)
3. [Stack technique détaillé](#3-stack-technique-détaillé)
4. [Modèle de données (Base de données)](#4-modèle-de-données)
5. [Modules fonctionnels](#5-modules-fonctionnels)
6. [API — Endpoints principaux](#6-api--endpoints-principaux)
7. [Authentification & Sécurité](#7-authentification--sécurité)
8. [Architecture multi-tenant](#8-architecture-multi-tenant)
9. [Intégration externe](#9-intégration-externe)
10. [Dashboard & Analytique](#10-dashboard--analytique)
11. [Infrastructure & Déploiement](#11-infrastructure--déploiement)
12. [Roadmap technique](#12-roadmap-technique)

---

## 1. Vue d'ensemble du projet

**RecruitPRO** est une plateforme SaaS RH all-in-one, conçue pour automatiser le cycle de vie complet des ressources humaines : du recrutement externe jusqu'à la gestion des talents internes (mobilité, formation, évaluation).

### Vision produit
- **ATS** (Applicant Tracking System) avec matching IA
- **Core HR** : gestion des employés, organigramme, rôles internes
- **LMS** (Learning Management System) : formations et inscriptions
- **Mobilité interne** : postes internes et candidatures d'employés
- **Évaluations annuelles** : système 360°

### Utilisateurs cibles
| Rôle | Accès |
|---|---|
| `ADMIN` (global) | Accès total au système |
| `RECRUITER` | Dashboard recruteur, offres, candidatures, org |
| `CANDIDATE` | Profil, candidatures depuis le job board |
| `EMPLOYEE` | Accès futur : modules internes |

---

## 2. Architecture générale

Architecture **Monolithe Modulaire** (Layered Architecture) :

```
[Browser] → [Next.js Frontend :3000]
                    ↕ REST API (JSON)
           [FastAPI Backend :8000]
                    ↕ SQLAlchemy ORM
              [PostgreSQL Database]
```

- **Isolation Multi-tenant** : Chaque table critique contient `company_id` → filtrage systématique par entreprise dans les API.
- **RBAC à deux niveaux** : Rôle système (`UserRole`) + Rôle interne (`InternalRole` + `Permission`).

---

## 3. Stack technique détaillé

### Backend
| Composant | Technologie |
|---|---|
| Framework API | FastAPI (Python) |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Auth | JWT (HS256) + Bcrypt |
| Tests CI | Pytest + GitHub Actions |

### Frontend
| Composant | Technologie |
|---|---|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript |
| CSS | Tailwind CSS (Glassmorphism) |
| Icônes | Lucide Icons |
| État global | Zustand (`auth-store`) |
| Thème | Dark/Light (ThemeProvider) |

### Configuration clé (`config.py`)
- `SECRET_KEY` : clé JWT (fixe en dev, à changer en prod)
- `ACCESS_TOKEN_EXPIRE_MINUTES` : 30 min
- `DATABASE_URL` : `postgresql://user:password@localhost:5432/recruitment_db`
- `BACKEND_CORS_ORIGINS` : localhost:3000 + 192.168.56.1:3000

---

## 4. Modèle de données

### Entités principales (22 tables)

#### Couche Authentification & Entreprise
- **`users`** : `id`, `email`, `password` (bcrypt), `full_name`, `role (ADMIN|RECRUITER|CANDIDATE|EMPLOYEE)`, `is_active`
- **`companies`** : `id`, `name`, `industry`, `size`, `website`, `location`
- **`recruiters`** : `user_id`, `company_id`, `position`, `hiring_authority`

#### Couche Recrutement
- **`skills`** : `id`, `name`, `category`, `level1-4_description`
- **`jobs`** : `id`, `title`, `company_id`, `recruiter_id`, `org_unit_id`, `min_years_experience`, `min_education_level`, `salary_min/max`, `location`
- **`job_requirements`** : `job_id`, `skill_id`, `required_level (1-4)`, `is_mandatory`
- **`candidates`** : `id`, `user_id`, `first_name`, `last_name`, `email`, `years_of_experience`, `education_level`, `bio`, `cv_text`, `formations`, `certifications`, `experience_detail`, `is_visible`
- **`candidate_skills`** : `candidate_id`, `skill_id`, `level (1-4)`, `years_experience`
- **`applications`** : `id`, `candidate_id`, `job_id`, `status (PENDING|REVIEWING|SHORTLISTED|ACCEPTED|REJECTED)`

#### Couche RH Interne
- **`employees`** : `id`, `user_id`, `company_id`, `org_unit_id`, `internal_role_id`, `manager_id`, `job_title`, `hire_date`, `years_of_experience`
- **`employee_skills`** : `employee_id`, `skill_id`, `level`, `certified`, `last_used`
- **`org_units`** : `id`, `company_id`, `parent_id` (auto-référence → hiérarchie infinie), `name`, `unit_type`
- **`internal_roles`** : `id`, `company_id`, `name`, `is_system_role`
- **`permissions`** : `id`, `name`, `description`, `category (recruitment|hr|org|admin)`
- **`role_permissions`** : Table de jointure Many-to-Many

#### Couche LMS & Mobilité
- **`internal_positions`** : Postes internes ouverts à la mobilité (status: `OPEN|CLOSED|FILLED`)
- **`internal_applications`** : Candidatures d'employés aux postes internes (status: `PENDING|REVIEWING|INTERVIEW|ACCEPTED|REJECTED`)
- **`trainings`** : Catalogue de formations (category: `TECHNICAL|SOFT_SKILLS|MANAGEMENT|COMPLIANCE|LANGUAGE`)
- **`training_skills`** : Compétences enseignées par une formation
- **`training_enrollments`** : Inscriptions employé → formation (status: `PENDING|APPROVED|COMPLETED|CANCELLED`)
- **`evaluations`** : Évaluations annuelles avec manager (overall_rating, strengths, areas_for_improvement, objectives)

---

## 5. Modules fonctionnels

### 5.1 ATS — Recrutement externe
- Publication d'offres par l'équipe RH
- **Matching Intelligent** : calcul automatique de score de compatibilité
  - Skills : **60%** (pénalité -30% par skill obligatoire manquant)
  - Expérience : **25%** (prorata vs. minimum requis)
  - Éducation : **15%** (prorata Bac+X vs. minimum requis)
- **Pipeline Kanban** : 5 colonnes (À Examiner → En Revue → Finalistes → Recrutés → Refusés)
- **Talent Discovery** : recherche proactive dans le pool sans offre (`POST /candidates/discover`)
- **Onboarding Candidat** : formulaire 4 étapes (Identité, Expérience, Skills, CV texte)

### 5.2 Org Management
- Organigramme hiérarchique infini (Direction → Squad → Cellule...)
- Assignation d'employés aux unités + rôles internes
- Vue arborescente récursive (`OrgUnitRow` composant frontend)

### 5.3 RBAC interne
12 permissions atomiques en 4 catégories :
- `recruitment` : jobs:create/view/edit/delete, applications:view/review
- `org` : org:view/edit
- `hr` : employees:view/edit/view_salary
- `admin` : settings:edit

4 rôles par défaut créés à chaque nouvelle entreprise :
| Rôle | Permissions |
|---|---|
| Administrateur | Tout |
| RH / Recruteur | recruitment + hr + org |
| Manager | jobs:view/create, applications:view/review, org:view, employees:view |
| Collaborateur | org:view, employees:view |

### 5.4 LMS & Évaluations (modèles ready, API à implémenter)
- Catalogue de formations avec compétences enseignées
- Inscriptions avec suivi (score, feedback, completion_date)
- Évaluations annuelles 360° (employee + evaluator)

---

## 6. API — Endpoints principaux

### Authentification (`/api/auth`)
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/register` | Créer un compte |
| POST | `/token` | Login → JWT token |
| GET | `/me` | Profil courant |

### Offres (`/api/jobs`)
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/` | Liste des offres (public) |
| POST | `/` | Créer une offre (RECRUITER) |
| GET | `/{id}/matches` | Candidats matchés avec score |
| GET | `/latest` | Dernières offres (landing page) |

### Candidatures (`/api/applications`)
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/` | Postuler à une offre |
| GET | `/job/{job_id}` | Candidatures d'un poste (Kanban) |
| PUT | `/{id}/status` | Changer statut (REVIEWING, ACCEPTED...) |
| GET | `/me` | Mes candidatures (candidat) |

### Candidats (`/api/candidates`)
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/me` | Mon profil candidat |
| PUT | `/me` | Mettre à jour profil + skills |
| GET | `/` | Liste (ADMIN/RECRUITER) |
| GET | `/{id}` | Profil par ID |
| POST | `/discover` | Recherche proactive dans le pool |

### Organisation (`/api/organization`, `/api/employees`, `/api/roles`)
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/organization/tree` | Arbre hiérarchique complet |
| POST | `/organization/` | Créer une unité |
| GET | `/employees/` | Liste des employés |
| PUT | `/employees/{id}` | Assigner à une unité / rôle |
| GET | `/roles/` | Rôles internes de l'entreprise |
| POST | `/roles/` | Créer un rôle (perm: settings:edit) |
| GET | `/roles/permissions` | Liste des permissions disponibles |

---

## 7. Authentification & Sécurité

- **JWT (HS256)** : token Bearer dans le header `Authorization`
- **Bcrypt** : hachage des mots de passe
- **RBAC système** : vérification `current_user.role` dans chaque route
- **RBAC interne** : `has_permission("permission:name")` — Dependency FastAPI
  - Admin système → bypass total
  - Recruiter sans profil employé → bypass (propriétaire du tenant)
  - Employé avec rôle interne → vérification de la liste de permissions
- **CORS** : configuré pour localhost:3000 et 192.168.56.1:3000

---

## 8. Architecture multi-tenant

Stratégie **Shared Database, Shared Schema** :

- Chaque table sensible a `company_id` : `jobs`, `employees`, `org_units`, `internal_roles`, `internal_positions`, `trainings`
- Filtrage systématique dans les API via le `Recruiter.company_id` de l'utilisateur connecté
- Le candidat n'a pas de `company_id` (pool global partagé)
- Les `skills` sont globaux (référentiel partagé)
- Les` permissions` sont globales mais les `internal_roles` sont par `company_id`

---

## 9. Intégration externe

### Actuellement implémenté
- **Email SMTP** : configuration prête (`SMTP_HOST`, `SMTP_USER`) mais non utilisée activement
- **GitHub Actions CI** : `.github/workflows/tests.yml` pour exécuter Pytest automatiquement

### Prévu (Roadmap)
- Multidiffusion d'offres (LinkedIn, Indeed)
- Parsing CV PDF via LLM
- Notifications Slack/Teams
- Base Supabase (Postgres managé) en production

---

## 10. Dashboard & Analytique

### Dashboard Recruteur (`/dashboard/recruiter`)
- Vue des offres actives avec compteurs de candidatures
- Accès rapide aux pipelines par poste
- Navigation vers l'organigramme

### Pipeline Kanban (`/dashboard/recruiter/applications/[jobId]`)
- 5 colonnes Kanban (PENDING → ACCEPTED)
- Affichage du score de matching par candidat
- Modal "Match Deep Dive" : score détaillé + gaps identifiés
- Drag-conceptual (changement de statut par bouton)

### Organigramme (`/dashboard/recruiter/organization`)
- Vue arborescente récursive (composant `OrgUnitRow`)
- Panel latéral : employés non assignés + rôles de sécurité
- Modals : créer unité, assigner employé + rôle

### Dashboard Candidat (`/dashboard/candidate`)
- Profil avec score de complétion
- Liste des offres disponibles avec score de matching
- Suivi des candidatures en cours

---

## 11. Infrastructure & Déploiement

### Environnement Dev
- Backend : `uvicorn app.main:app --reload` (port 8000)
- Frontend : `npm run dev` (port 3000)
- DB : PostgreSQL local
- Seeding : `python seed.py` (crée TechCorp + 4 recruteurs + 5 jobs + 4 candidats)

### Environnement Prod (planifié)
- **Frontend** : Vercel (déploiement automatique depuis `main`)
- **Backend** : Heroku / AWS (conteneur Docker)
- **Database** : Supabase ou AWS RDS (PostgreSQL managé)
- **CI/CD** : GitHub Actions (`tests.yml`)

### Données de test (seed)
| Credential | Login |
|---|---|
| Recruteur | `recruiter@techcorp.com` / `password123` |
| Candidat | `houssine@candidate.com` / `password123` |

---

## 12. Roadmap technique

### Court terme (priorité haute)
1. **Fix Pipeline Kanban** : Afficher tous les candidats ayant postulé (pas seulement les matchés)
2. **Accès profil candidat** : Lien cliquable depuis le Kanban vers le profil complet
3. **Suppression `has_applied`** : Redondant avec le statut `PENDING`

### Moyen terme
4. **API LMS** : Exposer les endpoints pour formations, inscriptions, évaluations
5. **Mobilité interne** : UI pour `InternalPosition` et `InternalApplication`
6. **Parsing CV** : Extraction automatique via LLM (OpenAI ou local)

### Long terme
7. **Microservices** : Découplage Auth, Matching, LMS si nécessaire au scale
8. **Analytics** : Taux de transformation pipeline, prédiction turnover
9. **Multidiffusion** : Publication synchronisée sur LinkedIn/Indeed
10. **Application Mobile** : React Native pour candidats

---

*Documentation générée par exploration complète du codebase — RecruitPRO v1.0.0*
