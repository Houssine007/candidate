import pytest
import time
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.models.user import User
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.skill import Skill
from sqlalchemy.orm import Session
from app.db.session import get_db

client = TestClient(app)

def test_job_search_performance():
    """Test de performance de la recherche d'offres d'emploi"""
    start_time = time.time()
    
    # Test avec différents filtres
    filters = [
        {},
        {"location": "Paris"},
        {"job_type": "FULL_TIME"},
        {"experience_level": "SENIOR"},
        {"skills": ["Python", "SQL"]}
    ]
    
    for filter_params in filters:
        response = client.get("/api/jobs", params=filter_params)
        assert response.status_code == 200
        
    end_time = time.time()
    execution_time = end_time - start_time
    
    # Le temps d'exécution total ne devrait pas dépasser 2 secondes
    assert execution_time < 2.0

def test_candidate_matching_performance():
    """Test de performance du matching des candidats"""
    start_time = time.time()
    
    # Test avec différents profils
    candidate_ids = [1, 2, 3]  # IDs des candidats de test
    
    for candidate_id in candidate_ids:
        response = client.get(f"/api/candidates/{candidate_id}/matches")
        assert response.status_code == 200
        
    end_time = time.time()
    execution_time = end_time - start_time
    
    # Le temps d'exécution total ne devrait pas dépasser 3 secondes
    assert execution_time < 3.0

def test_bulk_operations_performance():
    """Test de performance des opérations en masse"""
    start_time = time.time()
    
    # Test de création multiple d'offres d'emploi
    jobs_data = [
        {
            "title": f"Job Test {i}",
            "description": "Description test",
            "location": "Paris",
            "job_type": "FULL_TIME",
            "experience_level": "SENIOR",
            "salary_min": 50000,
            "salary_max": 70000
        }
        for i in range(10)
    ]
    
    for job_data in jobs_data:
        response = client.post("/api/jobs", json=job_data)
        assert response.status_code == 201
        
    end_time = time.time()
    execution_time = end_time - start_time
    
    # Le temps d'exécution total ne devrait pas dépasser 5 secondes
    assert execution_time < 5.0

def test_concurrent_requests_performance():
    """Test de performance des requêtes concurrentes"""
    import threading
    import queue
    
    results = queue.Queue()
    threads = []
    
    def make_request():
        start_time = time.time()
        response = client.get("/api/jobs")
        end_time = time.time()
        results.put(end_time - start_time)
    
    # Créer 10 threads pour simuler des requêtes concurrentes
    for _ in range(10):
        thread = threading.Thread(target=make_request)
        threads.append(thread)
        thread.start()
    
    # Attendre que tous les threads soient terminés
    for thread in threads:
        thread.join()
    
    # Vérifier que chaque requête prend moins de 1 seconde
    while not results.empty():
        execution_time = results.get()
        assert execution_time < 1.0

def test_database_query_performance():
    """Test de performance des requêtes de base de données"""
    db = next(get_db())
    
    start_time = time.time()
    
    # Test de requêtes complexes
    candidates = db.query(Candidate).join(User).all()
    jobs = db.query(Job).join(Skill).all()
    
    end_time = time.time()
    execution_time = end_time - start_time
    
    # Le temps d'exécution ne devrait pas dépasser 1 seconde
    assert execution_time < 1.0

def test_api_response_time():
    """Test du temps de réponse de l'API"""
    endpoints = [
        "/api/jobs",
        "/api/candidates",
        "/api/skills",
        "/api/notifications"
    ]
    
    for endpoint in endpoints:
        start_time = time.time()
        response = client.get(endpoint)
        end_time = time.time()
        
        assert response.status_code == 200
        execution_time = end_time - start_time
        
        # Chaque endpoint devrait répondre en moins de 500ms
        assert execution_time < 0.5 