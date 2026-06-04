# Documentation des Modèles de Données (Backend)

Ce document liste et décrit l'ensemble des modèles de données et schémas trouvés dans le projet (`backend/app/models/`).

## 1. Utilisateurs et Rôles (`user.py`, `permissions.py`)

### `User`
*   **Description**: Modèle principal représentant un utilisateur du système.
*   **Attributs clés**: `id`, `email`, `password`, `full_name`, `role`, `created_at`, `updated_at`, `is_active`
*   **Relations**: `recruiter`, `candidate`, `employee`
*   **Enum `UserRole`**: `CANDIDATE`, `RECRUITER`, `ADMIN`, `EMPLOYEE`

### `Permission`
*   **Description**: Représente une action atomique autorisée (ex: 'jobs:create', 'employees:view_salary').
*   **Attributs clés**: `id`, `name`, `description`, `category`

### `InternalRole`
*   **Description**: Rôle défini au sein d'une entreprise (ex: 'DRH', 'Chef d'équipe', 'Stagiaire').
*   **Attributs clés**: `id`, `company_id`, `name`, `description`, `is_system_role`
*   **Relations**: `company`, `permissions`, `employees`

### `role_permissions` (Table de jointure)
*   Lie les rôles internes aux permissions spécifiques.

## 2. Candidats (`candidate.py`)

### `Candidate`
*   **Description**: Profil d'un candidat externe.
*   **Attributs clés**: `id`, `first_name`, `last_name`, `email`, `phone`, `user_id`, `years_of_experience`, `education_level`, `bio`, `cv_text`, `formations`, `certifications`, `experience_detail`, `is_active`, `is_visible`
*   **Relations**: `user`, `skills`, `applications`

### `CandidateSkill`
*   **Description**: Compétences associées à un candidat, avec le niveau et l'expérience.
*   **Attributs clés**: `candidate_id`, `skill_id`, `level`, `years_experience`

## 3. Entreprises et Unités Organisationnelles (`company.py`, `organization.py`)

### `Company`
*   **Description**: Représente une entreprise.
*   **Attributs clés**: `id`, `name`, `description`, `industry`, `size`, `website`, `location`, `is_active`
*   **Relations**: `recruiters`, `employees`

### `OrgUnit`
*   **Description**: Représente une Unité Organisationnelle flexible (Département, Squad, Direction, etc.) avec support de structure hiérarchique.
*   **Attributs clés**: `id`, `company_id`, `parent_id`, `manager_id`, `name`, `unit_type`, `description`
*   **Relations**: `company`, `parent` (référence circulaire), `manager`, `employees`, `jobs`

## 4. Employés et RH Interne (`employee.py`, `internal_hr.py`)

### `Employee`
*   **Description**: Profil d'un employé au sein d'une entreprise.
*   **Attributs clés**: `id`, `user_id`, `company_id`, `first_name`, `last_name`, `email`, `job_title`, `org_unit_id`, `internal_role_id`, `manager_id`, `hire_date`, `years_of_experience`, `education_level`
*   **Relations**: `user`, `company`, `org_unit`, `internal_role`, `manager`, `skills`, `internal_applications`, `training_enrollments`, `evaluations`

### `EmployeeSkill`
*   **Description**: Compétences d'un employé.
*   **Attributs clés**: `id`, `employee_id`, `skill_id`, `level`, `years_experience`, `certified`, `last_used`

### `InternalPosition`
*   **Description**: Postes disponibles en interne pour mobilité.
*   **Attributs clés**: `id`, `company_id`, `title`, `description`, `department`, `location`, `salary_min`, `salary_max`, `status` (`OPEN`, `CLOSED`, `FILLED`), `posted_by`, `posted_at`, `closed_at`
*   **Relations**: `company`, `requirements`, `applications`

### `InternalPositionRequirement`
*   **Description**: Compétences requises pour un poste interne.
*   **Attributs clés**: `id`, `position_id`, `skill_id`, `required_level`, `is_mandatory`

### `InternalApplication`
*   **Description**: Candidatures internes (employés → postes internes).
*   **Attributs clés**: `id`, `employee_id`, `position_id`, `status` (`PENDING`, `REVIEWING`, `INTERVIEW`, `ACCEPTED`, `REJECTED`), `motivation_letter`, `applied_at`

### `Evaluation`
*   **Description**: Évaluations annuelles des employés.
*   **Attributs clés**: `id`, `employee_id`, `evaluator_id`, `period_start`, `period_end`, `overall_rating`, `strengths`, `areas_for_improvement`, `objectives`, `comments`

## 5. Formations (`internal_hr.py`)

### `Training`
*   **Description**: Catalogue de formations.
*   **Attributs clés**: `id`, `company_id`, `title`, `description`, `category` (`TECHNICAL`, `SOFT_SKILLS`, `MANAGEMENT`, `COMPLIANCE`, `LANGUAGE`), `duration_hours`, `provider`, `cost`, `max_participants`, `is_active`
*   **Relations**: `company`, `enrollments`, `skills_taught`

### `TrainingSkill`
*   **Description**: Compétences enseignées par une formation.
*   **Attributs clés**: `id`, `training_id`, `skill_id`, `level_gained`

### `TrainingEnrollment`
*   **Description**: Inscriptions aux formations.
*   **Attributs clés**: `id`, `employee_id`, `training_id`, `status` (`PENDING`, `APPROVED`, `COMPLETED`, `CANCELLED`), `enrolled_at`, `completed_at`, `score`, `feedback`

## 6. Recrutement Externe (`job.py`, `recruiter.py`, `application.py`)

### `Recruiter`
*   **Description**: Représente un recruteur appartenant à une entreprise.
*   **Attributs clés**: `id`, `user_id`, `company_id`, `position`, `hiring_authority`, `is_active`
*   **Relations**: `user`, `company`, `jobs`

### `Job`
*   **Description**: Offre d'emploi externe complète.
*   **Attributs clés**: `id`, `recruiter_id`, `company_id`, `title`, `description`, `company`, `location`, `salary_min`, `salary_max`, `min_years_experience`, `min_education_level`, `org_unit_id`
*   **Relations**: `recruiter`, `company_related`, `org_unit`, `requirements`, `applications`

### `JobRequirement`
*   **Description**: Compétences requises pour une offre d'emploi.
*   **Attributs clés**: `job_id`, `skill_id`, `required_level`, `is_mandatory`

### `Application`
*   **Description**: Candidature d'un candidat à une offre d'emploi externe.
*   **Attributs clés**: `id`, `candidate_id`, `job_id`, `status` (`PENDING`, `REVIEWING`, `SHORTLISTED`, `REJECTED`, `ACCEPTED`), `cover_letter`, `is_active`
*   **Relations**: `candidate`, `job`

## 7. Compétences Transversales (`skill.py`)

### `Skill`
*   **Description**: Référentiel global des compétences (utilisé par candidats, employés, offres d'emploi, et formations).
*   **Attributs clés**: `id`, `name`, `category`, `description`, `level1_description`, `level2_description`, `level3_description`, `level4_description`
*   **Relations**: `candidates`, `job_requirements`, `employee_skills`
