import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import UserRole

client = TestClient(app)

@pytest.mark.integration
class TestSkillsAPI:
    @pytest.fixture
    def admin_token(self):
        """Fixture pour obtenir un token d'authentification administrateur."""
        # Créer un utilisateur administrateur
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "admin@example.com",
                "password": "Test123!",
                "full_name": "Test Admin",
                "role": UserRole.ADMIN
            }
        )
        
        # Obtenir le token
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "admin@example.com",
                "password": "Test123!"
            }
        )
        return response.json()["access_token"]

    def test_create_skill(self, admin_token):
        """Teste la création d'une compétence."""
        response = client.post(
            "/api/v1/skills",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Python",
                "category": "Programming",
                "description": "Langage de programmation Python"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Python"
        assert data["category"] == "Programming"
        assert data["description"] == "Langage de programmation Python"

    def test_get_skill(self, admin_token):
        """Teste la récupération d'une compétence."""
        # D'abord créer une compétence
        create_response = client.post(
            "/api/v1/skills",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "FastAPI",
                "category": "Framework",
                "description": "Framework web Python"
            }
        )
        skill_id = create_response.json()["id"]

        # Récupérer la compétence
        response = client.get(
            f"/api/v1/skills/{skill_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "FastAPI"
        assert data["category"] == "Framework"
        assert data["description"] == "Framework web Python"

    def test_update_skill(self, admin_token):
        """Teste la mise à jour d'une compétence."""
        # D'abord créer une compétence
        create_response = client.post(
            "/api/v1/skills",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "PostgreSQL",
                "category": "Database",
                "description": "Base de données relationnelle"
            }
        )
        skill_id = create_response.json()["id"]

        # Mettre à jour la compétence
        response = client.put(
            f"/api/v1/skills/{skill_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "PostgreSQL",
                "category": "Database",
                "description": "Système de gestion de base de données relationnelle open source"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "PostgreSQL"
        assert data["category"] == "Database"
        assert data["description"] == "Système de gestion de base de données relationnelle open source"

    def test_list_skills(self, admin_token):
        """Teste la liste des compétences."""
        # Créer quelques compétences
        skills = [
            {
                "name": "Python",
                "category": "Programming",
                "description": "Langage de programmation"
            },
            {
                "name": "JavaScript",
                "category": "Programming",
                "description": "Langage de programmation web"
            },
            {
                "name": "Docker",
                "category": "DevOps",
                "description": "Conteneurisation"
            }
        ]
        
        for skill in skills:
            client.post(
                "/api/v1/skills",
                headers={"Authorization": f"Bearer {admin_token}"},
                json=skill
            )

        # Lister les compétences
        response = client.get(
            "/api/v1/skills",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= len(skills)

    def test_search_skills(self, admin_token):
        """Teste la recherche de compétences."""
        # Créer des compétences
        client.post(
            "/api/v1/skills",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Python",
                "category": "Programming",
                "description": "Langage de programmation"
            }
        )

        # Rechercher des compétences
        response = client.get(
            "/api/v1/skills/search?query=Python",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["name"] == "Python"

    def test_get_skill_categories(self, admin_token):
        """Teste la récupération des catégories de compétences."""
        # Créer des compétences dans différentes catégories
        categories = ["Programming", "Database", "DevOps", "Design"]
        for category in categories:
            client.post(
                "/api/v1/skills",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "name": f"Skill {category}",
                    "category": category,
                    "description": f"Description {category}"
                }
            )

        # Récupérer les catégories
        response = client.get(
            "/api/v1/skills/categories",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= len(categories)
        for category in categories:
            assert category in data

    def test_delete_skill(self, admin_token):
        """Teste la suppression d'une compétence."""
        # D'abord créer une compétence
        create_response = client.post(
            "/api/v1/skills",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Skill",
                "category": "Test",
                "description": "Skill to delete"
            }
        )
        skill_id = create_response.json()["id"]

        # Supprimer la compétence
        response = client.delete(
            f"/api/v1/skills/{skill_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 204

        # Vérifier que la compétence n'existe plus
        get_response = client.get(
            f"/api/v1/skills/{skill_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 404 