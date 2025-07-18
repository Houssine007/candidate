import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import UserRole

client = TestClient(app)

@pytest.mark.integration
class TestJobsAPI:
    @pytest.fixture
    def recruiter_token(self):
        """Fixture pour obtenir un token d'authentification recruteur."""
        # Créer un utilisateur recruteur
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "recruiter@example.com",
                "password": "Test123!",
                "full_name": "Test Recruiter",
                "role": UserRole.RECRUITER
            }
        )
        
        # Obtenir le token
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "recruiter@example.com",
                "password": "Test123!"
            }
        )
        return response.json()["access_token"]

    def test_create_job(self, recruiter_token):
        """Teste la création d'une offre d'emploi."""
        response = client.post(
            "/api/v1/jobs",
            headers={"Authorization": f"Bearer {recruiter_token}"},
            json={
                "title": "Développeur Python",
                "company": "Tech Company",
                "description": "Nous recherchons un développeur Python expérimenté...",
                "requirements": ["Python", "FastAPI", "PostgreSQL"],
                "location": "Paris, France",
                "salary_range": "50k-70k",
                "contract_type": "CDI",
                "experience_years": 3
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Développeur Python"
        assert data["company"] == "Tech Company"
        assert data["requirements"] == ["Python", "FastAPI", "PostgreSQL"]
        assert data["location"] == "Paris, France"
        assert data["salary_range"] == "50k-70k"
        assert data["contract_type"] == "CDI"
        assert data["experience_years"] == 3

    def test_get_job(self, recruiter_token):
        """Teste la récupération d'une offre d'emploi."""
        # D'abord créer une offre
        create_response = client.post(
            "/api/v1/jobs",
            headers={"Authorization": f"Bearer {recruiter_token}"},
            json={
                "title": "Développeur Full Stack",
                "company": "Tech Company",
                "description": "Description du poste...",
                "requirements": ["Python", "React"],
                "location": "Lyon, France",
                "salary_range": "45k-65k",
                "contract_type": "CDI",
                "experience_years": 2
            }
        )
        job_id = create_response.json()["id"]

        # Récupérer l'offre
        response = client.get(
            f"/api/v1/jobs/{job_id}",
            headers={"Authorization": f"Bearer {recruiter_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Développeur Full Stack"
        assert data["company"] == "Tech Company"
        assert data["requirements"] == ["Python", "React"]
        assert data["location"] == "Lyon, France"

    def test_update_job(self, recruiter_token):
        """Teste la mise à jour d'une offre d'emploi."""
        # D'abord créer une offre
        create_response = client.post(
            "/api/v1/jobs",
            headers={"Authorization": f"Bearer {recruiter_token}"},
            json={
                "title": "Développeur Python",
                "company": "Tech Company",
                "description": "Description initiale...",
                "requirements": ["Python"],
                "location": "Paris",
                "salary_range": "40k-60k",
                "contract_type": "CDI",
                "experience_years": 2
            }
        )
        job_id = create_response.json()["id"]

        # Mettre à jour l'offre
        response = client.put(
            f"/api/v1/jobs/{job_id}",
            headers={"Authorization": f"Bearer {recruiter_token}"},
            json={
                "title": "Développeur Python Senior",
                "company": "Tech Company",
                "description": "Description mise à jour...",
                "requirements": ["Python", "FastAPI", "Docker"],
                "location": "Paris",
                "salary_range": "60k-80k",
                "contract_type": "CDI",
                "experience_years": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Développeur Python Senior"
        assert data["requirements"] == ["Python", "FastAPI", "Docker"]
        assert data["salary_range"] == "60k-80k"
        assert data["experience_years"] == 5

    def test_list_jobs(self, recruiter_token):
        """Teste la liste des offres d'emploi."""
        # Créer quelques offres
        for i in range(3):
            client.post(
                "/api/v1/jobs",
                headers={"Authorization": f"Bearer {recruiter_token}"},
                json={
                    "title": f"Développeur {i}",
                    "company": "Tech Company",
                    "description": f"Description {i}",
                    "requirements": ["Python"],
                    "location": "Paris",
                    "salary_range": "40k-60k",
                    "contract_type": "CDI",
                    "experience_years": 2
                }
            )

        # Lister les offres
        response = client.get(
            "/api/v1/jobs",
            headers={"Authorization": f"Bearer {recruiter_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3

    def test_search_jobs(self, recruiter_token):
        """Teste la recherche d'offres d'emploi."""
        # Créer des offres avec différents critères
        client.post(
            "/api/v1/jobs",
            headers={"Authorization": f"Bearer {recruiter_token}"},
            json={
                "title": "Développeur Python",
                "company": "Tech Company",
                "description": "Description Python",
                "requirements": ["Python", "FastAPI"],
                "location": "Paris",
                "salary_range": "50k-70k",
                "contract_type": "CDI",
                "experience_years": 3
            }
        )

        # Rechercher des offres
        response = client.get(
            "/api/v1/jobs/search?skill=Python&location=Paris",
            headers={"Authorization": f"Bearer {recruiter_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Python" in data[0]["requirements"]

    def test_get_job_applications(self, recruiter_token):
        """Teste la récupération des candidatures pour une offre."""
        # D'abord créer une offre
        create_response = client.post(
            "/api/v1/jobs",
            headers={"Authorization": f"Bearer {recruiter_token}"},
            json={
                "title": "Développeur Python",
                "company": "Tech Company",
                "description": "Description",
                "requirements": ["Python"],
                "location": "Paris",
                "salary_range": "40k-60k",
                "contract_type": "CDI",
                "experience_years": 2
            }
        )
        job_id = create_response.json()["id"]

        # Récupérer les candidatures
        response = client.get(
            f"/api/v1/jobs/{job_id}/applications",
            headers={"Authorization": f"Bearer {recruiter_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) 