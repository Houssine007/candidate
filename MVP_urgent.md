# RecruitPRO — Prompts Antigravity par sprint
> LLM cible : Gemini (Google AI) · Stack : FastAPI + Next.js 14 + PostgreSQL + SQLAlchemy

---

## Comment utiliser ces prompts

1. Colle le **contexte global** (ci-dessous) en premier dans chaque nouvelle session
2. Colle ensuite le **prompt du sprint** concerné
3. Chaque prompt est autonome — il contient tout ce qu'il faut

---

## CONTEXTE GLOBAL — À coller en début de chaque session

```
Tu travailles sur RecruitPRO, une plateforme SaaS RH full-stack.

Stack technique :
- Backend : FastAPI (Python), SQLAlchemy ORM, Alembic migrations, Pydantic v2, JWT auth
- Frontend : Next.js 14 App Router, TypeScript, Tailwind CSS, Zustand (auth-store)
- Base de données : PostgreSQL
- LLM : Gemini API (google-generativeai SDK Python)
- Auth : JWT HS256 + Bcrypt, rôles : ADMIN | RECRUITER | CANDIDATE | EMPLOYEE

Architecture multi-tenant : chaque table critique a un champ company_id.
Le backend tourne sur le port 8000, le frontend sur le port 3000.

Conventions de code :
- Les endpoints FastAPI sont dans app/routers/
- Les modèles SQLAlchemy dans app/models/
- Les schémas Pydantic dans app/schemas/
- Les services métier dans app/services/
- Le frontend dans src/app/ (App Router Next.js)

Réponds toujours avec du code complet, fonctionnel, prêt à être copié-collé.
Ne résume pas le code, ne mets pas de placeholder "# ... reste du code".
```

---

---

# SPRINT 1 — Fix Kanban + accès profil candidat

## Prompt 1.1 — Fix du pipeline Kanban

```
Contexte du bug :
L'endpoint GET /api/applications/job/{job_id} retourne actuellement uniquement
les candidats qui ont un score de matching calculé, au lieu de retourner TOUS
les candidats ayant postulé à ce job.

Le modèle Application existe avec ces champs :
- id, candidate_id, job_id, status (PENDING|REVIEWING|SHORTLISTED|ACCEPTED|REJECTED)
- created_at

Le modèle Candidate a : id, user_id, first_name, last_name, email,
years_of_experience, education_level, cv_text, candidate_skills (relation)

Le modèle Job a : id, title, company_id, min_years_experience, min_education_level,
job_requirements (relation vers skill_id + required_level + is_mandatory)

Tâche :
1. Réécris l'endpoint GET /api/applications/job/{job_id} dans app/routers/applications.py
   Il doit retourner TOUS les candidats ayant postulé, triés par score décroissant.
   Le score doit être calculé à la volée pour chaque candidat (pas de filtre sur score).

2. Le score de matching utilise cette formule :
   - Skills : 60% (pénalité -30% par skill obligatoire manquant)
   - Expérience : 25% (min(candidate.years_of_experience / job.min_years_experience, 1.0))
   - Éducation : 15% (min(candidate.education_level / job.min_education_level, 1.0))

3. Le schéma Pydantic de réponse doit inclure pour chaque candidat :
   { application_id, candidate_id, candidate_name, status, score_total,
     score_breakdown: {skills, experience, education}, applied_at }

4. Ajoute la vérification RBAC : seul un RECRUITER de la même company que le job
   peut accéder à cet endpoint.

Génère : app/routers/applications.py complet + app/schemas/application.py mis à jour.
```

---

## Prompt 1.2 — Lien vers profil candidat depuis Kanban (Frontend)

```
Dans le dashboard recruteur, la page Kanban est à :
src/app/dashboard/recruiter/applications/[jobId]/page.tsx

Actuellement, les cartes candidats n'ont pas de lien cliquable vers leur profil.

Tâche :
1. Crée la page de profil candidat côté recruteur :
   src/app/dashboard/recruiter/candidates/[candidateId]/page.tsx
   
   Cette page doit afficher :
   - Infos personnelles (nom, email, expérience, niveau éducation)
   - Skills avec leur niveau (barres de progression 1-4)
   - Score de matching avec le job depuis lequel on arrive (passé en query param ?jobId=)
   - Score breakdown visuel (Skills / Expérience / Éducation) avec jauges
   - Bouton "Changer statut" (REVIEWING / SHORTLISTED / ACCEPTED / REJECTED)
   - CV texte brut dans un accordéon collapsible

2. Dans le composant KanbanCard existant, ajoute un lien cliquable sur le nom
   du candidat qui navigue vers cette page en passant le jobId en query param.

3. Le design doit respecter le style existant : Tailwind CSS, dark mode,
   glassmorphism (backdrop-blur, bg-white/10).

L'API existante à utiliser :
- GET /api/candidates/{id} → profil complet
- GET /api/applications/job/{jobId} → pour récupérer le score
- PUT /api/applications/{id}/status body: { status: string }

Génère les deux fichiers TypeScript complets.
```

---

---

# SPRINT 2 — CV Parsing avec Gemini

## Prompt 2.1 — Service de parsing CV (Backend)

```
Je dois créer un service de parsing de CV PDF utilisant l'API Gemini.

Dépendances à installer :
- google-generativeai
- pdfplumber (extraction texte depuis PDF)
- python-multipart (upload fichier FastAPI)

Modèle Candidate existant (SQLAlchemy) à enrichir avec ces nouveaux champs :
- cv_upload_path: String (chemin du fichier PDF stocké)
- cv_parsed_json: JSON (résultat structuré du parsing)
- parsing_status: String ("PENDING" | "DONE" | "ERROR")
- potential_score: Float (calculé après parsing)

Tâche :
1. Crée app/services/cv_parser.py avec :
   
   a) La fonction extract_text_from_pdf(file_bytes: bytes) -> str
      Utilise pdfplumber pour extraire le texte.
   
   b) Le schéma Pydantic ParsedCV avec ces champs :
      - skills: list[ParsedSkill]  # name, level(1-4), years_experience, certified
      - formations: list[ParsedFormation]  # titre, etablissement, annee_fin, niveau_education(1-5)
      - certifications: list[dict]
      - experience: dict  # annees_totales, postes[]
      - langues: list[dict]
      - profil_resume: str
      - domaines_metier: list[str]
   
   c) La fonction async parse_cv_with_gemini(cv_text: str) -> ParsedCV
      Utilise google.generativeai avec :
      - model = "gemini-1.5-flash"
      - generation_config = { response_mime_type: "application/json" }
      - temperature = 0
      - Le system prompt qui demande le JSON selon le schéma ParsedCV
      - 3 tentatives en cas d'échec
   
   d) La fonction async normalize_and_upsert_skills(candidate_id, parsed_skills, db)
      Mappe les skills extraits vers la table skills (référentiel global).
      Fuzzy match sur le nom (ilike), création si absent.
      Upsert dans candidate_skills, garde le niveau max si skill déjà présent.
      Ajoute un champ source="CV_PARSED" dans candidate_skills.
   
   e) La fonction async run_full_pipeline(candidate_id, cv_text, db)
      Orchestre : parse → normalize → update candidate → compute potential_score
      Gestion d'erreur : en cas d'exception, parsing_status = "ERROR", pas de crash.

2. Crée app/routers/cv_upload.py avec :
   - POST /api/candidates/upload-cv
   - Reçoit un fichier PDF (UploadFile)
   - Extrait le texte immédiatement
   - Sauvegarde cv_text et parsing_status="PENDING" en base
   - Lance run_full_pipeline en background (BackgroundTasks FastAPI)
   - Retourne immédiatement { status: "PENDING", message: "Analyse en cours..." }
   
   - GET /api/candidates/parsing-status
   - Retourne { status: "PENDING"|"DONE"|"ERROR", cv_parsed_json: ... }
   - Utilisé par le frontend pour le polling

3. Crée la migration Alembic pour les nouveaux champs Candidate.

Génère les fichiers complets : cv_parser.py, cv_upload.py, et la migration Alembic.
La clé API Gemini est dans settings.GEMINI_API_KEY (déjà dans config.py).
```

---

## Prompt 2.2 — UI d'upload CV + affichage profil enrichi (Frontend)

```
Le backend expose maintenant :
- POST /api/candidates/upload-cv  → upload PDF, retourne { status: "PENDING" }
- GET /api/candidates/parsing-status → { status: "PENDING"|"DONE"|"ERROR", cv_parsed_json }
- GET /api/candidates/me → profil complet avec cv_parsed_json et candidate_skills

Tâche — Modifier la page profil candidat :
src/app/dashboard/candidate/profile/page.tsx

1. Ajoute une section "Mon CV" avec :
   - Zone de drag & drop pour upload PDF (accept=".pdf", max 5MB)
   - Barre de progression pendant l'upload
   - Après upload : polling toutes les 2 secondes sur /parsing-status
   - Spinner "Analyse de votre CV en cours..." pendant PENDING
   - Quand DONE : affiche "Profil enrichi automatiquement !" + liste des skills extraits
   - Quand ERROR : message d'erreur avec bouton retry

2. Ajoute une section "Compétences extraites" qui affiche :
   - Les skills avec leur niveau (1-4) sous forme de pills colorées
   - Badge "Source: CV" vs "Déclaré" selon le champ source
   - Bouton pour ajuster le niveau manuellement

3. Score de complétude du profil en haut de page :
   - Barre de progression circulaire (SVG simple)
   - Calcul côté frontend : 
     + 20% si cv_text renseigné
     + 20% si cv_parsed_json présent
     + 20% si au moins 3 skills
     + 20% si formations renseignées
     + 20% si bio renseignée

Style : Tailwind CSS, dark mode, cohérent avec le dashboard existant.
Génère le fichier TypeScript complet.
```

---

---

# SPRINT 3 — Matching engine enrichi

## Prompt 3.1 — Nouveau moteur de matching avec potential score (Backend)

```
Je dois refondre le moteur de matching de RecruitPRO pour intégrer :
- Les données extraites du CV (cv_parsed_json)
- Un potential_score distinct du fit_score
- La fraîcheur des compétences (last_used dans candidate_skills)

Modèles existants (SQLAlchemy) :
- Candidate : id, years_of_experience, education_level, cv_parsed_json, potential_score
- CandidateSkill : candidate_id, skill_id, level(1-4), years_experience, certified, last_used
- Job : id, min_years_experience, min_education_level
- JobRequirement : job_id, skill_id, required_level, is_mandatory
- Evaluation : candidate_id, overall_rating(1-5), created_at (peut être vide)

Tâche :
1. Crée app/services/matching_engine.py avec :

   a) Dataclass ScoreBreakdown :
      { skills_score, cv_nlp_score, experience_score, education_score,
        potential_score, freshness_score, total_fit, total_potential,
        missing_mandatory_skills: list[str], skill_gaps: list[dict] }

   b) Fonction compute_fit_score(candidate, job, db) -> ScoreBreakdown
      Pondération :
      - skills_score : 25% (skill déclarés vs requis, pénalité -20% par mandatory manquant)
      - cv_nlp_score : 15% (skills dans cv_parsed_json["domaines_metier"] vs job.description)
      - experience_score : 25% (years_of_experience vs min_years_experience, plafonné à 1.0)
      - education_score : 15% (education_level vs min_education_level)
      - freshness_score : 10% (bonus si skill utilisé dans les 2 dernières années)
      - evaluation_score : 10% (moyenne overall_rating des évaluations passées, 0 si aucune)
      
      total_fit = somme pondérée des 6 critères × 100

   c) Fonction compute_potential_score(candidate, job, db) -> float
      Logique :
      - Base = education_level × 15 (max 75)
      - Bonus skill_adjacency : +5 par skill "proche" du requis (même catégorie)
      - Bonus certifications : +10 si au moins une certification dans cv_parsed_json
      - Bonus langues : +5 si langue étrangère niveau B2+
      - Malus expérience faible : -10 si years_of_experience < 2
      Score plafonné à 100.

   d) Fonction get_matches_for_job(job_id, db, limit=20) -> list[MatchResult]
      Scanne tous les candidates avec is_visible=True.
      Calcule fit + potential pour chacun.
      Retourne les top `limit` triés par fit_score décroissant.
      Chaque MatchResult contient : candidate_id, fit_score, potential_score,
      score_breakdown, recommendation ("STRONG_FIT"|"POTENTIAL"|"WEAK_FIT")

2. Met à jour GET /api/jobs/{id}/matches pour utiliser ce nouveau service.
   Ajoute un query param ?sort_by=fit|potential (défaut: fit).

3. Ajoute POST /api/candidates/discover avec body :
   { job_id: int, min_fit_score: float = 0, min_potential_score: float = 0,
     include_applied: bool = True }
   Retourne les candidats filtrés selon les seuils.

Génère matching_engine.py complet + mise à jour du router jobs.py.
```

---

## Prompt 3.2 — UI Match Deep Dive enrichi (Frontend)

```
Le backend retourne maintenant pour chaque candidat un score_breakdown :
{
  skills_score: 0.8,
  cv_nlp_score: 0.6,
  experience_score: 1.0,
  education_score: 0.9,
  freshness_score: 0.7,
  evaluation_score: 0.5,
  total_fit: 78.5,
  total_potential: 82.0,
  missing_mandatory_skills: ["Docker", "Kubernetes"],
  skill_gaps: [{ skill: "React", required_level: 3, candidate_level: 2 }],
  recommendation: "STRONG_FIT"
}

Tâche :
1. Crée le composant src/components/MatchDeepDive.tsx
   Modal ou side panel (au choix) qui affiche :
   
   a) Deux scores en tête : FIT SCORE (grand, coloré) + POTENTIAL SCORE
      Code couleur : >75 = vert, 50-75 = orange, <50 = rouge
   
   b) Badge recommendation : "Fort profil" / "Haut potentiel" / "Profil faible"
   
   c) Radar chart ou barres horizontales pour les 6 critères
      Utilise Recharts (déjà dans le projet) : BarChart horizontal
      Chaque barre = nom critère + % + barre colorée
   
   d) Section "Compétences manquantes" : pills rouges pour missing_mandatory_skills
   
   e) Section "Écarts de niveau" : pour chaque skill_gap,
      affiche le niveau actuel vs requis avec une barre double
   
   f) Bouton "Inviter à postuler" si le candidat n'a pas encore postulé
      (appelle POST /api/applications avec status PENDING)

2. Dans le Kanban, chaque carte candidat doit avoir un bouton "Voir analyse"
   qui ouvre ce composant avec les données du candidat sélectionné.

Style : Tailwind, dark mode, animations légères sur les barres (transition CSS).
Génère MatchDeepDive.tsx complet.
```

---

---

# SPRINT 4 — LMS & évaluations

## Prompt 4.1 — API LMS complète (Backend)

```
Les modèles SQLAlchemy LMS existent déjà mais n'ont pas d'endpoints :

Training : id, company_id, title, description, category
  (TECHNICAL|SOFT_SKILLS|MANAGEMENT|COMPLIANCE|LANGUAGE),
  duration_hours, generates_certificate, certificate_weight

TrainingSkill : training_id, skill_id, level_gained

TrainingEnrollment : id, employee_id, training_id, status
  (PENDING|APPROVED|COMPLETED|CANCELLED),
  score, completion_date, feedback, certificate_issued

Evaluation : id, employee_id, evaluator_id, overall_rating(1-5),
  strengths, areas_for_improvement, objectives, created_at

Tâche — crée app/routers/lms.py avec ces endpoints :

FORMATIONS :
- GET /api/trainings → liste (filtrée par company_id du recruiter connecté)
  Query params : category, search
- POST /api/trainings → créer une formation (RECRUITER requis)
- GET /api/trainings/{id} → détail + skills enseignées

INSCRIPTIONS :
- POST /api/trainings/{id}/enroll body: { employee_id }
  Crée une enrollment en PENDING
- GET /api/enrollments/employee/{employee_id} → formations d'un employé
- PUT /api/enrollments/{id} body: { status, score, feedback, completion_date }
  Quand status passe à COMPLETED :
  → Si generates_certificate=true : certificate_issued=true
  → Met à jour les employee_skills pour les skills enseignées par la formation
  → Recalcule le potential_score du candidat lié (si l'employé a un compte candidat)

ÉVALUATIONS :
- POST /api/evaluations body: { employee_id, overall_rating, strengths,
  areas_for_improvement, objectives }
  evaluator_id = user connecté
- GET /api/evaluations/employee/{employee_id} → historique des évaluations
- GET /api/evaluations/pending → évaluations à faire pour le manager connecté

Génère app/routers/lms.py complet + app/schemas/lms.py.
Ajoute l'enregistrement du router dans app/main.py.
```

---

## Prompt 4.2 — Dashboard LMS (Frontend)

```
Le backend LMS expose maintenant :
- GET /api/trainings → liste des formations
- POST /api/trainings/{id}/enroll
- GET /api/enrollments/employee/{id}
- PUT /api/enrollments/{id}
- GET /api/evaluations/employee/{id}

Tâche :
1. Crée src/app/dashboard/recruiter/lms/page.tsx
   Page principale LMS avec deux onglets :
   
   Onglet "Catalogue" :
   - Grille de cartes formations (titre, catégorie, durée, nb inscrits)
   - Filtre par catégorie (pills cliquables)
   - Bouton "Créer une formation" → modal avec formulaire
   - Chaque carte : bouton "Inscrire un employé" → modal avec select employé
   
   Onglet "Suivi" :
   - Tableau des enrollments en cours
   - Colonnes : employé, formation, statut, score, actions
   - Action "Valider completion" → modal pour entrer score + feedback
   - Badge coloré par statut

2. Crée src/app/dashboard/recruiter/evaluations/page.tsx
   - Liste des évaluations à effectuer (GET /api/evaluations/pending)
   - Pour chaque employé : bouton "Évaluer" → formulaire sur toute la page
   - Formulaire : slider 1-5 pour overall_rating, textareas pour strengths
     et areas_for_improvement, textarea pour objectives
   - Affiche l'historique des évaluations passées de l'employé

Style : Tailwind, dark mode, cohérent avec le dashboard existant.
Génère les deux fichiers TypeScript complets.
```

---

---

# SPRINT 5 — Mobilité interne

## Prompt 5.1 — API mobilité interne (Backend)

```
Les modèles SQLAlchemy mobilité existent déjà :

InternalPosition : id, company_id, title, description, org_unit_id,
  required_skills (JSON), status (OPEN|CLOSED|FILLED), created_at

InternalApplication : id, employee_id, position_id, status
  (PENDING|REVIEWING|INTERVIEW|ACCEPTED|REJECTED),
  motivation_letter, created_at

Tâche — crée app/routers/mobility.py :

POSTES INTERNES :
- GET /api/internal-positions → liste des postes ouverts (company_id filtré)
  Inclut un score de matching pour l'employé connecté si rôle EMPLOYEE
- POST /api/internal-positions → créer un poste (RECRUITER)
- PUT /api/internal-positions/{id}/status body: { status }

CANDIDATURES INTERNES :
- POST /api/internal-positions/{id}/apply body: { motivation_letter }
  Vérifie que l'employee existe pour le user connecté
  Vérifie qu'il n'a pas déjà postulé au même poste
- GET /api/internal-applications/position/{position_id} → candidatures reçues
- PUT /api/internal-applications/{id}/status body: { status }
  Quand ACCEPTED : met à jour employee.org_unit_id si le poste a un org_unit_id

MATCHING INTERNE :
- GET /api/internal-positions/{id}/matches
  Utilise le même matching_engine.py que pour le recrutement externe
  Mais scanne les employees (pas les candidates) de la même company

Génère mobility.py complet + schemas/mobility.py.
```

---

## Prompt 5.2 — UI mobilité interne (Frontend)

```
Backend disponible :
- GET /api/internal-positions → liste postes avec score si employé connecté
- POST /api/internal-positions/{id}/apply
- GET /api/internal-applications/position/{id}
- PUT /api/internal-applications/{id}/status

Tâche :
1. Crée src/app/dashboard/recruiter/mobility/page.tsx
   Vue recruteur : liste des postes internes avec leur pipeline de candidatures.
   Pour chaque poste : titre, département, nb candidatures, statut.
   Bouton "Voir candidatures" → panel latéral avec liste des candidats internes
   + leurs scores de matching + boutons de changement de statut.
   Bouton "Créer un poste" → modal formulaire.

2. Crée src/app/dashboard/employee/page.tsx
   Dashboard employé (nouveau rôle EMPLOYEE) avec :
   - Section "Postes internes pour moi" : top 3 postes avec score de matching
     Bouton "Je suis intéressé(e)" → ouvre modal lettre de motivation
   - Section "Mes candidatures" : liste avec statuts
   - Section "Mes formations" : enrollments en cours et complétés
   - Section "Mon profil de compétences" : skills avec niveaux + certificats

Style : Tailwind, dark mode, même design system que le reste.
Génère les deux fichiers TypeScript complets.
```

---

---

# SPRINT 6 — Dashboard ROI & Analytics

## Prompt 6.1 — API Analytics (Backend)

```
Tâche — crée app/routers/analytics.py avec des endpoints de pilotage RH :

Tous les endpoints sont réservés au rôle RECRUITER/ADMIN, filtrés par company_id.

1. GET /api/analytics/overview
   Retourne :
   {
     total_jobs: int,
     total_applications: int,
     avg_matching_score: float,
     acceptance_rate: float,        // ACCEPTED / total applications
     avg_time_to_hire_days: float,  // created_at PENDING → ACCEPTED
     top_skills_demanded: list[{skill, count}],   // top 10 skills dans job_requirements
     top_skills_available: list[{skill, count}],  // top 10 dans candidate_skills
     skill_gaps: list[{skill, demanded, available}]  // demandé mais rare dans le pool
   }

2. GET /api/analytics/pipeline
   Retourne par job :
   [{ job_id, job_title, pending, reviewing, shortlisted, accepted, rejected,
      avg_score, best_candidate_name }]

3. GET /api/analytics/lms-roi
   Retourne :
   [{ training_id, training_title, enrolled_count, completed_count,
      avg_score, skills_unlocked, candidates_score_improvement }]
   candidates_score_improvement = delta potential_score moyen avant/après formation
   (basé sur created_at de l'enrollment vs potential_score actuel)

4. GET /api/analytics/turnover-risk
   Algorithme simple de risque de départ par employé :
   - Score de risque = f(dernière évaluation < 3, aucune formation depuis 6 mois,
     aucune mobilité tentée, ancienneté > 3 ans sans promotion)
   Retourne list[{ employee_id, name, risk_score(0-100), risk_factors: list[str] }]
   Triés par risk_score décroissant.

Génère analytics.py complet + schemas/analytics.py.
Utilise SQLAlchemy aggregate functions (func.count, func.avg, func.sum).
```

---

## Prompt 6.2 — Dashboard Analytics (Frontend)

```
Backend analytics disponible :
- GET /api/analytics/overview
- GET /api/analytics/pipeline
- GET /api/analytics/lms-roi
- GET /api/analytics/turnover-risk

Tâche :
Crée src/app/dashboard/recruiter/analytics/page.tsx

Page dashboard avec 4 sections :

1. KPIs en haut (4 cartes) :
   - Total candidatures ce mois
   - Score moyen de matching
   - Taux d'acceptation %
   - Temps moyen recrutement (jours)

2. Graphique "Gap de compétences" (Recharts BarChart) :
   Axe X = compétences, deux barres côte à côte : demandées vs disponibles
   Source : analytics/overview.skill_gaps

3. Table "Pipeline par poste" :
   Colonnes : Poste | À examiner | En revue | Finalistes | Acceptés | Score moyen
   Couleurs selon le taux de remplissage

4. Section "Risque de départ" :
   Liste des employés avec risk_score affiché comme barre de progression colorée
   (vert < 30, orange 30-60, rouge > 60)
   Affiche les risk_factors comme tags sous le nom

Utilise Recharts pour les graphiques (déjà installé).
Génère le fichier TypeScript complet avec les appels API et la gestion du loading.
```

---

---

# SPRINT 7 — Notifications & temps réel

## Prompt 7.1 — Système de notifications (Backend)

```
Tâche — ajoute un système de notifications en base pour RecruitPRO.

1. Crée le modèle SQLAlchemy Notification dans app/models/notification.py :
   - id, user_id, type (string), title, message, is_read, entity_id, entity_type, created_at

2. Crée app/services/notification_service.py avec :
   - create_notification(db, user_id, type, title, message, entity_id=None, entity_type=None)
   - Types : NEW_APPLICATION | STATUS_CHANGED | MATCH_FOUND | TRAINING_COMPLETED
     EVALUATION_DUE | INTERNAL_POSITION_MATCH

3. Intègre les notifications aux événements existants :
   - POST /api/applications → notifie le recruiter : "Nouvelle candidature pour {job_title}"
   - PUT /api/applications/{id}/status → notifie le candidat : "Votre candidature a évolué"
   - run_full_pipeline CV parsing DONE → notifie le candidat : "Votre profil a été enrichi"
   - Enrollment COMPLETED → notifie l'employé : "Certificat disponible pour {training}"
   - Nouveau InternalPosition OPEN → notifie les employés dont le score > 60

4. Crée app/routers/notifications.py :
   - GET /api/notifications → mes notifications (triées, non lues en premier)
     Query param : unread_only=true
   - PUT /api/notifications/{id}/read → marquer comme lue
   - PUT /api/notifications/read-all → tout marquer comme lu
   - GET /api/notifications/count → { unread_count: int }

Génère notification.py (model), notification_service.py, notifications.py (router),
et la migration Alembic correspondante.
```

---

## Prompt 7.2 — UI Notifications (Frontend)

```
Backend notifications disponible :
- GET /api/notifications → liste
- GET /api/notifications/count → { unread_count }
- PUT /api/notifications/{id}/read
- PUT /api/notifications/read-all

Tâche :
1. Crée src/components/NotificationBell.tsx
   - Icône cloche dans la navbar
   - Badge rouge avec le nombre non lues (polling toutes les 30s sur /count)
   - Clic → dropdown avec les 10 dernières notifications
   - Chaque notification : icône selon type, titre, message, date relative ("il y a 2h")
   - Clic sur une notification → marquer comme lue + naviguer vers l'entité concernée
   - Bouton "Tout marquer comme lu" en bas du dropdown

2. Ajoute NotificationBell dans le layout principal :
   src/app/dashboard/layout.tsx
   Position : dans la barre de navigation en haut à droite

3. Types de notifications et leurs icônes (Lucide Icons) :
   - NEW_APPLICATION → UserPlus
   - STATUS_CHANGED → RefreshCw
   - MATCH_FOUND → Zap
   - TRAINING_COMPLETED → Award
   - EVALUATION_DUE → ClipboardList
   - INTERNAL_POSITION_MATCH → Briefcase

Génère NotificationBell.tsx complet + modification minimale de layout.tsx.
```

---

---

# RÉCAPITULATIF — Ordre d'exécution recommandé

| Sprint | Prompt | Priorité | Durée estimée |
|--------|--------|----------|---------------|
| 1 | 1.1 Fix Kanban backend | CRITIQUE | 1h |
| 1 | 1.2 Profil candidat frontend | HAUTE | 2h |
| 2 | 2.1 CV Parsing Gemini backend | HAUTE | 3h |
| 2 | 2.2 UI Upload CV frontend | HAUTE | 2h |
| 3 | 3.1 Matching engine enrichi | HAUTE | 3h |
| 3 | 3.2 Match Deep Dive UI | MOYENNE | 2h |
| 4 | 4.1 API LMS | MOYENNE | 2h |
| 4 | 4.2 Dashboard LMS | MOYENNE | 2h |
| 5 | 5.1 API Mobilité | MOYENNE | 2h |
| 5 | 5.2 UI Mobilité + Employee | MOYENNE | 3h |
| 6 | 6.1 API Analytics | BASSE | 2h |
| 6 | 6.2 Dashboard Analytics | BASSE | 2h |
| 7 | 7.1 Notifications backend | BASSE | 2h |
| 7 | 7.2 Notifications frontend | BASSE | 1h |

**Total estimé : ~29h de développement assisté**

---

*RecruitPRO — Prompts v1.0 — Mai 2026*