import pytest
from app.services.matching import MatchingService

@pytest.mark.unit
class TestMatchingService:
    def test_calculate_skill_match(self):
        """Teste le calcul de correspondance des compétences."""
        service = MatchingService()
        
        # Test avec correspondance parfaite
        candidate_skills = ["Python", "FastAPI", "PostgreSQL"]
        job_requirements = ["Python", "FastAPI", "PostgreSQL"]
        score = service.calculate_skill_match(candidate_skills, job_requirements)
        assert score == 1.0

        # Test avec correspondance partielle
        candidate_skills = ["Python", "FastAPI", "MongoDB"]
        job_requirements = ["Python", "FastAPI", "PostgreSQL"]
        score = service.calculate_skill_match(candidate_skills, job_requirements)
        assert 0.5 <= score < 1.0

        # Test sans correspondance
        candidate_skills = ["Java", "Spring", "MySQL"]
        job_requirements = ["Python", "FastAPI", "PostgreSQL"]
        score = service.calculate_skill_match(candidate_skills, job_requirements)
        assert score == 0.0

    def test_calculate_experience_match(self):
        """Teste le calcul de correspondance de l'expérience."""
        service = MatchingService()
        
        # Test avec expérience suffisante
        score = service.calculate_experience_match(5, 3)
        assert score == 1.0

        # Test avec expérience insuffisante
        score = service.calculate_experience_match(2, 3)
        assert 0.0 <= score < 1.0

        # Test avec expérience excessive
        score = service.calculate_experience_match(10, 3)
        assert score == 1.0

    def test_calculate_location_match(self):
        """Teste le calcul de correspondance de la localisation."""
        service = MatchingService()
        
        # Test avec localisation identique
        score = service.calculate_location_match("Paris, France", "Paris, France")
        assert score == 1.0

        # Test avec localisation différente
        score = service.calculate_location_match("Paris, France", "Lyon, France")
        assert score == 0.0

        # Test avec localisation partiellement similaire
        score = service.calculate_location_match("Paris, France", "Paris, Île-de-France")
        assert 0.5 <= score < 1.0

    def test_calculate_overall_match(self):
        """Teste le calcul du score global de correspondance."""
        service = MatchingService()
        
        # Test avec correspondance parfaite
        candidate = {
            "skills": ["Python", "FastAPI", "PostgreSQL"],
            "experience_years": 5,
            "location": "Paris, France"
        }
        job = {
            "requirements": ["Python", "FastAPI", "PostgreSQL"],
            "required_experience": 3,
            "location": "Paris, France"
        }
        score = service.calculate_overall_match(candidate, job)
        assert score == 1.0

        # Test avec correspondance partielle
        candidate = {
            "skills": ["Python", "FastAPI", "MongoDB"],
            "experience_years": 2,
            "location": "Paris, France"
        }
        job = {
            "requirements": ["Python", "FastAPI", "PostgreSQL"],
            "required_experience": 3,
            "location": "Paris, France"
        }
        score = service.calculate_overall_match(candidate, job)
        assert 0.0 < score < 1.0 