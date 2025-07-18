# Documentation de l'API

## Authentification

### POST /api/auth/register
Inscription d'un nouvel utilisateur.

**Corps de la requête :**
```json
{
    "email": "string",
    "password": "string",
    "full_name": "string",
    "role": "CANDIDATE | RECRUITER"
}
```

**Réponse :**
```json
{
    "id": "integer",
    "email": "string",
    "full_name": "string",
    "role": "string"
}
```

### POST /api/auth/login
Connexion d'un utilisateur.

**Corps de la requête :**
```json
{
    "email": "string",
    "password": "string"
}
```

**Réponse :**
```json
{
    "access_token": "string",
    "token_type": "bearer"
}
```

### GET /api/auth/me
Récupération des informations de l'utilisateur connecté.

**Réponse :**
```json
{
    "id": "integer",
    "email": "string",
    "full_name": "string",
    "role": "string"
}
```

## Candidats

### POST /api/candidates
Création d'un profil candidat.

**Corps de la requête :**
```json
{
    "title": "string",
    "bio": "string",
    "location": "string",
    "experience_years": "integer",
    "education_level": "string",
    "skills": [
        {
            "skill_id": "integer",
            "level": "BEGINNER | INTERMEDIATE | ADVANCED | EXPERT"
        }
    ]
}
```

### GET /api/candidates/{candidate_id}
Récupération d'un profil candidat.

### PUT /api/candidates/{candidate_id}
Mise à jour d'un profil candidat.

### GET /api/candidates/{candidate_id}/matches
Récupération des offres d'emploi correspondant au profil.

### POST /api/candidates/{candidate_id}/applications
Candidature à une offre d'emploi.

**Corps de la requête :**
```json
{
    "job_id": "integer",
    "cover_letter": "string"
}
```

## Offres d'emploi

### POST /api/jobs
Création d'une offre d'emploi.

**Corps de la requête :**
```json
{
    "title": "string",
    "description": "string",
    "location": "string",
    "job_type": "FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP",
    "experience_level": "string",
    "salary_min": "integer",
    "salary_max": "integer",
    "skills": [
        {
            "skill_id": "integer",
            "required_level": "BEGINNER | INTERMEDIATE | ADVANCED | EXPERT"
        }
    ]
}
```

### GET /api/jobs
Liste des offres d'emploi avec filtres.

**Paramètres de requête :**
- `location`: string
- `job_type`: string
- `experience_level`: string
- `skills`: array
- `page`: integer
- `limit`: integer

### GET /api/jobs/{job_id}
Récupération d'une offre d'emploi.

### PUT /api/jobs/{job_id}
Mise à jour d'une offre d'emploi.

### GET /api/jobs/{job_id}/applications
Liste des candidatures pour une offre.

## Compétences

### GET /api/skills
Liste des compétences.

**Paramètres de requête :**
- `category`: string
- `search`: string

### POST /api/skills
Création d'une compétence.

**Corps de la requête :**
```json
{
    "name": "string",
    "category": "string"
}
```

### GET /api/skills/{skill_id}
Récupération d'une compétence.

## Notifications

### GET /api/notifications
Liste des notifications de l'utilisateur.

### PUT /api/notifications/{notification_id}/read
Marquer une notification comme lue.

## Entretiens

### POST /api/interviews
Planification d'un entretien.

**Corps de la requête :**
```json
{
    "application_id": "integer",
    "type": "PHONE | VIDEO | ONSITE | TECHNICAL",
    "scheduled_at": "datetime",
    "duration_minutes": "integer",
    "notes": "string"
}
```

### GET /api/interviews/{interview_id}
Récupération d'un entretien.

### PUT /api/interviews/{interview_id}
Mise à jour d'un entretien.

## Codes d'erreur

- 400 : Requête invalide
- 401 : Non authentifié
- 403 : Non autorisé
- 404 : Ressource non trouvée
- 422 : Erreur de validation
- 500 : Erreur serveur

## Pagination

Toutes les routes de liste supportent la pagination avec les paramètres :
- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre d'éléments par page (défaut: 10)

**Réponse paginée :**
```json
{
    "items": [],
    "total": "integer",
    "page": "integer",
    "limit": "integer",
    "pages": "integer"
}
```

## Authentification

Toutes les routes (sauf /auth/register et /auth/login) nécessitent un token JWT dans le header :
```
Authorization: Bearer <token>
``` 