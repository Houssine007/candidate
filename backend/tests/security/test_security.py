import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.models.user import User, UserRole
from datetime import datetime, timedelta
import time

client = TestClient(app)

def test_authentication_required():
    """Test que l'authentification est requise pour les routes protégées"""
    protected_routes = [
        "/api/candidates",
        "/api/jobs",
        "/api/skills",
        "/api/notifications"
    ]
    
    for route in protected_routes:
        response = client.get(route)
        assert response.status_code == 401

def test_invalid_token():
    """Test avec un token invalide"""
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/api/candidates", headers=headers)
    assert response.status_code == 401

def test_expired_token():
    """Test avec un token expiré"""
    # Créer un token expiré
    expired_token = create_access_token(
        data={"sub": "test@example.com"},
        expires_delta=timedelta(microseconds=1)
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    
    # Attendre que le token expire
    time.sleep(0.1)
    
    response = client.get("/api/candidates", headers=headers)
    assert response.status_code == 401

def test_role_based_access():
    """Test des restrictions basées sur les rôles"""
    # Créer des tokens pour différents rôles
    candidate_token = create_access_token(
        data={"sub": "candidate@example.com", "role": UserRole.CANDIDATE}
    )
    recruiter_token = create_access_token(
        data={"sub": "recruiter@example.com", "role": UserRole.RECRUITER}
    )
    admin_token = create_access_token(
        data={"sub": "admin@example.com", "role": UserRole.ADMIN}
    )
    
    # Test des routes candidat
    candidate_headers = {"Authorization": f"Bearer {candidate_token}"}
    response = client.get("/api/candidates/me", headers=candidate_headers)
    assert response.status_code == 200
    
    # Un candidat ne devrait pas pouvoir accéder aux routes recruteur
    response = client.post("/api/jobs", headers=candidate_headers)
    assert response.status_code == 403
    
    # Test des routes recruteur
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}
    response = client.post("/api/jobs", headers=recruiter_headers)
    assert response.status_code == 201
    
    # Un recruteur ne devrait pas pouvoir accéder aux routes admin
    response = client.get("/api/admin/users", headers=recruiter_headers)
    assert response.status_code == 403
    
    # Test des routes admin
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/admin/users", headers=admin_headers)
    assert response.status_code == 200

def test_sql_injection_prevention():
    """Test de prévention des injections SQL"""
    # Tentative d'injection SQL dans les paramètres de recherche
    malicious_params = {
        "search": "'; DROP TABLE users; --",
        "location": "' OR '1'='1"
    }
    
    response = client.get("/api/jobs", params=malicious_params)
    assert response.status_code == 200
    # Vérifier que la requête a été traitée de manière sécurisée
    assert "DROP TABLE" not in response.text

def test_xss_prevention():
    """Test de prévention des attaques XSS"""
    # Données contenant du code JavaScript malveillant
    malicious_data = {
        "title": "<script>alert('xss')</script>",
        "description": "javascript:alert('xss')"
    }
    
    response = client.post("/api/jobs", json=malicious_data)
    assert response.status_code == 201
    # Vérifier que le code malveillant a été échappé
    assert "<script>" not in response.text

def test_rate_limiting():
    """Test de limitation du taux de requêtes"""
    # Faire plusieurs requêtes rapides
    for _ in range(100):
        response = client.get("/api/jobs")
    
    # La dernière requête devrait être bloquée
    assert response.status_code == 429

def test_password_security():
    """Test de la sécurité des mots de passe"""
    # Test avec un mot de passe faible
    weak_password = {
        "email": "test@example.com",
        "password": "123456",
        "full_name": "Test User",
        "role": "CANDIDATE"
    }
    
    response = client.post("/api/auth/register", json=weak_password)
    assert response.status_code == 422
    
    # Test avec un mot de passe fort
    strong_password = {
        "email": "test@example.com",
        "password": "StrongP@ssw0rd123!",
        "full_name": "Test User",
        "role": "CANDIDATE"
    }
    
    response = client.post("/api/auth/register", json=strong_password)
    assert response.status_code == 201

def test_cors_security():
    """Test de la sécurité CORS"""
    # Test avec une origine non autorisée
    headers = {"Origin": "https://malicious-site.com"}
    response = client.get("/api/jobs", headers=headers)
    assert "Access-Control-Allow-Origin" not in response.headers
    
    # Test avec une origine autorisée
    headers = {"Origin": "http://localhost:3000"}
    response = client.get("/api/jobs", headers=headers)
    assert "Access-Control-Allow-Origin" in response.headers 