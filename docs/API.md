# 📡 Documentation API RecruitPro

L'API est documentée interactivement via Swagger à l'adresse : `http://localhost:8000/docs`

## 🔐 Authentification
- `POST /api/auth/token` : Connexion (OAuth2 Password Flow).
- `GET /api/auth/me` : Détails de l'utilisateur connecté.

## 💼 Jobs (Offres d'emploi)
- `GET /api/jobs/` : Liste de toutes les offres (Public).
- `GET /api/jobs/{id}/` : Détails d'une offre.
- `GET /api/jobs/{id}/matches/` : (Recruteur) Récupère les meilleurs candidats pour un job avec scores de matching.

## 👥 Candidats
- `GET /api/candidates/discovery/` : Liste publique des candidats (si profil visible).
- `GET /api/candidates/me/` : Détails du profil du candidat connecté.

## 📝 Candidatures (Applications)
- `POST /api/applications/` : Postuler à une offre (Candidat uniquement).
- `GET /api/applications/me/` : Liste des candidatures effectuées par l'utilisateur.
- `GET /api/applications/job/{job_id}/` : (Recruteur) Candidatures reçues pour un job spécifique.
- `PATCH /api/applications/{id}/status/` : (Recruteur) Changer le statut d'une candidature (Kanban).

## 🛠️ Skills
- `GET /api/skills/` : Liste de toutes les compétences référencées.