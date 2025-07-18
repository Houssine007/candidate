import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.models.user import UserRole

client = TestClient(app)

@pytest.mark.integration
class TestAuthAPI:
    def test_register_user(self):
        """Teste l'enregistrement d'un nouvel utilisateur."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "Test123!",
                "full_name": "Test User",
                "role": UserRole.CANDIDATE
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
        assert data["role"] == UserRole.CANDIDATE
        assert "id" in data
        assert "password" not in data

    def test_login_user(self):
        """Teste la connexion d'un utilisateur."""
        # D'abord, créer un utilisateur
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "login@example.com",
                "password": "Test123!",
                "full_name": "Login Test",
                "role": UserRole.CANDIDATE
            }
        )

        # Ensuite, tester la connexion
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "login@example.com",
                "password": "Test123!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_get_current_user(self):
        """Teste la récupération des informations de l'utilisateur connecté."""
        # Créer et connecter un utilisateur
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "current@example.com",
                "password": "Test123!",
                "full_name": "Current User",
                "role": UserRole.CANDIDATE
            }
        )
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "current@example.com",
                "password": "Test123!"
            }
        )
        token = login_response.json()["access_token"]

        # Tester la récupération des informations
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "current@example.com"
        assert data["full_name"] == "Current User"
        assert data["role"] == UserRole.CANDIDATE

    def test_refresh_token(self):
        """Teste le rafraîchissement du token."""
        # Créer et connecter un utilisateur
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "refresh@example.com",
                "password": "Test123!",
                "full_name": "Refresh User",
                "role": UserRole.CANDIDATE
            }
        )
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "refresh@example.com",
                "password": "Test123!"
            }
        )
        refresh_token = login_response.json()["refresh_token"]

        # Tester le rafraîchissement
        response = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_invalid_login(self):
        """Teste la connexion avec des identifiants invalides."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "invalid@example.com",
                "password": "WrongPassword123!"
            }
        )
        assert response.status_code == 401

    def test_register_duplicate_email(self):
        """Teste l'enregistrement avec un email déjà utilisé."""
        # Créer un premier utilisateur
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "duplicate@example.com",
                "password": "Test123!",
                "full_name": "First User",
                "role": UserRole.CANDIDATE
            }
        )

        # Tenter de créer un second utilisateur avec le même email
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "duplicate@example.com",
                "password": "Test123!",
                "full_name": "Second User",
                "role": UserRole.CANDIDATE
            }
        )
        assert response.status_code == 400 