import pytest
from app.models.candidate import Candidate
from app.models.job import Job
from app.services.matching import calculate_job_candidate_match, find_matching_candidates

def test_calculate_job_candidate_match():
    # Création d'un candidat de test
    candidate = Candidate(
        id=1,
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        phone="+33612345678",
        skills=["Python", "FastAPI", "SQL"],
        years_of_experience=5,
        education_level=3
    )
    
    # Création d'un poste de test
    job = Job(
        id=1,
        title="Développeur Python",
        description="Poste de développeur Python",
        required_skills=["Python", "FastAPI"],
        required_experience=3,
        required_education_level=2
    )
    
    # Test du calcul de score
    score = calculate_job_candidate_match(candidate, job)
    assert isinstance(score, float)
    assert 0 <= score <= 100
    assert score > 80  # Le candidat devrait avoir un bon score car il correspond bien au poste

def test_find_matching_candidates():
    # Création de candidats de test
    candidates = [
        Candidate(
            id=1,
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="+33612345678",
            skills=["Python", "FastAPI", "SQL"],
            years_of_experience=5,
            education_level=3
        ),
        Candidate(
            id=2,
            first_name="Jane",
            last_name="Smith",
            email="jane.smith@example.com",
            phone="+33687654321",
            skills=["Java", "Spring"],
            years_of_experience=3,
            education_level=2
        )
    ]
    
    # Création d'un poste de test
    job = Job(
        id=1,
        title="Développeur Python",
        description="Poste de développeur Python",
        required_skills=["Python", "FastAPI"],
        required_experience=3,
        required_education_level=2
    )
    
    # Test de la recherche de candidats correspondants
    matches = find_matching_candidates(job, candidates, min_score=60.0)
    assert len(matches) > 0
    assert matches[0]["candidate"].id == 1  # John Doe devrait être le meilleur match
    assert matches[0]["score"] > matches[1]["score"] if len(matches) > 1 else True 