import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import UserRole

client = TestClient(app)

@pytest.mark.integration
class TestCandidatesAPI:
    @pytest.fixture
    def auth_token(self):
        """Fixture pour obtenir un token d'authentification."""
        # Créer un utilisateur candidat
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "candidate@example.com",
                "password": "Test123!",
                "full_name": "Test Candidate",
                "role": UserRole.CANDIDATE
            }
        )
        
        # Obtenir le token
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "candidate@example.com",
                "password": "Test123!"
            }
        )
        return response.json()["access_token"]

    def test_create_candidate_profile(self, auth_token):
        """Teste la création d'un profil candidat."""
        response = client.post(
            "/api/v1/candidates/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "skills": ["Python", "FastAPI", "PostgreSQL"],
                "experience_years": 5,
                "education": "Master en Informatique",
                "location": "Paris, France",
                "bio": "Développeur Python passionné",
                "phone": "+33612345678"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["skills"] == ["Python", "FastAPI", "PostgreSQL"]
        assert data["experience_years"] == 5
        assert data["education"] == "Master en Informatique"
        assert data["location"] == "Paris, France"
        assert data["bio"] == "Développeur Python passionné"
        assert data["phone"] == "+33612345678"

    def test_get_candidate_profile(self, auth_token):
        """Teste la récupération d'un profil candidat."""
        # D'abord créer un profil
        client.post(
            "/api/v1/candidates/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "skills": ["Python", "FastAPI"],
                "experience_years": 3,
                "education": "Licence en Informatique",
                "location": "Lyon, France",
                "bio": "Développeur junior",
                "phone": "+33612345678"
            }
        )

        # Ensuite récupérer le profil
        response = client.get(
            "/api/v1/candidates/profile",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["skills"] == ["Python", "FastAPI"]
        assert data["experience_years"] == 3
        assert data["education"] == "Licence en Informatique"
        assert data["location"] == "Lyon, France"

    def test_update_candidate_profile(self, auth_token):
        """Teste la mise à jour d'un profil candidat."""
        # D'abord créer un profil
        client.post(
            "/api/v1/candidates/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "skills": ["Python"],
                "experience_years": 2,
                "education": "Licence",
                "location": "Paris",
                "bio": "Développeur",
                "phone": "+33612345678"
            }
        )

        # Ensuite mettre à jour le profil
        response = client.put(
            "/api/v1/candidates/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "skills": ["Python", "FastAPI", "Docker"],
                "experience_years": 3,
                "education": "Master",
                "location": "Lyon",
                "bio": "Développeur Full Stack",
                "phone": "+33612345678"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["skills"] == ["Python", "FastAPI", "Docker"]
        assert data["experience_years"] == 3
        assert data["education"] == "Master"
        assert data["location"] == "Lyon"
        assert data["bio"] == "Développeur Full Stack"

    def test_get_candidate_matches(self, auth_token):
        """Teste la récupération des matches d'un candidat."""
        # D'abord créer un profil
        client.post(
            "/api/v1/candidates/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "skills": ["Python", "FastAPI"],
                "experience_years": 3,
                "education": "Master",
                "location": "Paris",
                "bio": "Développeur",
                "phone": "+33612345678"
            }
        )

        # Récupérer les matches
        response = client.get(
            "/api/v1/candidates/matches",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_apply_to_job(self, auth_token):
        """Teste la candidature à un poste."""
        # D'abord créer un profil
        client.post(
            "/api/v1/candidates/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "skills": ["Python", "FastAPI"],
                "experience_years": 3,
                "education": "Master",
                "location": "Paris",
                "bio": "Développeur",
                "phone": "+33612345678"
            }
        )

        # Postuler à un poste
        response = client.post(
            "/api/v1/candidates/jobs/1/apply",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "cover_letter": "Je suis très intéressé par ce poste...",
                "resume_url": "https://example.com/resume.pdf"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["job_id"] == 1
        assert data["cover_letter"] == "Je suis très intéressé par ce poste..."
        assert data["resume_url"] == "https://example.com/resume.pdf"

    def test_get_candidate_applications(self, auth_token):
        """Teste la récupération des candidatures d'un candidat."""
        # D'abord créer un profil et postuler
        client.post(
            "/api/v1/candidates/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "skills": ["Python", "FastAPI"],
                "experience_years": 3,
                "education": "Master",
                "location": "Paris",
                "bio": "Développeur",
                "phone": "+33612345678"
            }
        )
        client.post(
            "/api/v1/candidates/jobs/1/apply",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "cover_letter": "Test",
                "resume_url": "https://example.com/resume.pdf"
            }
        )

        # Récupérer les candidatures
        response = client.get(
            "/api/v1/candidates/applications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["job_id"] == 1 