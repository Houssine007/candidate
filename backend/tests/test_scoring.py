import pytest
from app.models.candidate import Candidate
from app.models.job import Job
from app.services.scoring import (
    calculate_skill_score,
    calculate_experience_score,
    calculate_education_score,
    calculate_overall_score
)

def test_calculate_skill_score():
    # Test avec des compétences correspondantes
    candidate_skills = ["Python", "FastAPI", "SQL"]
    required_skills = ["Python", "FastAPI"]
    score = calculate_skill_score(candidate_skills, required_skills)
    assert score == 1.0  # Score parfait car toutes les compétences requises sont présentes
    
    # Test avec des compétences partielles
    candidate_skills = ["Python", "Java"]
    required_skills = ["Python", "FastAPI", "SQL"]
    score = calculate_skill_score(candidate_skills, required_skills)
    assert 0.3 <= score <= 0.4  # Score partiel car seulement 1/3 des compétences requises
    
    # Test avec des compétences supplémentaires
    candidate_skills = ["Python", "FastAPI", "SQL", "Docker", "Kubernetes"]
    required_skills = ["Python", "FastAPI"]
    score = calculate_skill_score(candidate_skills, required_skills)
    assert score > 1.0  # Score > 1.0 car compétences supplémentaires pertinentes

def test_calculate_experience_score():
    # Test avec expérience suffisante
    assert calculate_experience_score(5, 3) == 1.0
    
    # Test avec expérience insuffisante
    assert calculate_experience_score(2, 3) == 2/3
    
    # Test avec expérience requise nulle
    assert calculate_experience_score(5, 0) == 1.0

def test_calculate_education_score():
    # Test avec niveau d'études suffisant
    assert calculate_education_score(3, 2) == 1.0
    
    # Test avec niveau d'études légèrement inférieur
    assert calculate_education_score(2, 3) == 0.8
    
    # Test avec niveau d'études insuffisant
    assert calculate_education_score(1, 3) == 0.5

def test_calculate_overall_score():
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
    
    # Test du calcul de score global
    scores = calculate_overall_score(candidate, job)
    assert isinstance(scores, dict)
    assert "final_score" in scores
    assert "skill_score" in scores
    assert "experience_score" in scores
    assert "education_score" in scores
    assert all(0 <= score <= 100 for score in scores.values())
    assert scores["final_score"] > 80  # Le candidat devrait avoir un bon score global 