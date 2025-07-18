import pytest
from app.services.scoring import ScoringService

@pytest.mark.unit
class TestScoringService:
    def test_calculate_skill_score(self):
        """Teste le calcul du score des compétences."""
        service = ScoringService()
        
        # Test avec compétences exactes
        candidate_skills = ["Python", "FastAPI", "PostgreSQL"]
        job_requirements = ["Python", "FastAPI", "PostgreSQL"]
        score = service.calculate_skill_score(candidate_skills, job_requirements)
        assert score == 100

        # Test avec compétences partielles
        candidate_skills = ["Python", "FastAPI", "MongoDB"]
        job_requirements = ["Python", "FastAPI", "PostgreSQL"]
        score = service.calculate_skill_score(candidate_skills, job_requirements)
        assert 50 <= score < 100

        # Test sans compétences correspondantes
        candidate_skills = ["Java", "Spring", "MySQL"]
        job_requirements = ["Python", "FastAPI", "PostgreSQL"]
        score = service.calculate_skill_score(candidate_skills, job_requirements)
        assert score == 0

    def test_calculate_experience_score(self):
        """Teste le calcul du score d'expérience."""
        service = ScoringService()
        
        # Test avec expérience suffisante
        score = service.calculate_experience_score(5, 3)
        assert score == 100

        # Test avec expérience insuffisante
        score = service.calculate_experience_score(2, 3)
        assert 0 <= score < 100

        # Test avec expérience excessive
        score = service.calculate_experience_score(10, 3)
        assert score == 100

    def test_calculate_education_score(self):
        """Teste le calcul du score d'éducation."""
        service = ScoringService()
        
        # Test avec éducation requise
        candidate_education = "Master en Informatique"
        required_education = "Master en Informatique"
        score = service.calculate_education_score(candidate_education, required_education)
        assert score == 100

        # Test avec éducation supérieure
        candidate_education = "Doctorat en Informatique"
        required_education = "Master en Informatique"
        score = service.calculate_education_score(candidate_education, required_education)
        assert score == 100

        # Test avec éducation inférieure
        candidate_education = "Licence en Informatique"
        required_education = "Master en Informatique"
        score = service.calculate_education_score(candidate_education, required_education)
        assert 0 <= score < 100

    def test_calculate_location_score(self):
        """Teste le calcul du score de localisation."""
        service = ScoringService()
        
        # Test avec localisation identique
        score = service.calculate_location_score("Paris, France", "Paris, France")
        assert score == 100

        # Test avec localisation différente
        score = service.calculate_location_score("Paris, France", "Lyon, France")
        assert score == 0

        # Test avec localisation partiellement similaire
        score = service.calculate_location_score("Paris, France", "Paris, Île-de-France")
        assert 50 <= score < 100

    def test_calculate_overall_score(self):
        """Teste le calcul du score global."""
        service = ScoringService()
        
        # Test avec profil parfait
        candidate = {
            "skills": ["Python", "FastAPI", "PostgreSQL"],
            "experience_years": 5,
            "education": "Master en Informatique",
            "location": "Paris, France"
        }
        job = {
            "requirements": ["Python", "FastAPI", "PostgreSQL"],
            "required_experience": 3,
            "required_education": "Master en Informatique",
            "location": "Paris, France"
        }
        score = service.calculate_overall_score(candidate, job)
        assert score == 100

        # Test avec profil partiel
        candidate = {
            "skills": ["Python", "FastAPI", "MongoDB"],
            "experience_years": 2,
            "education": "Licence en Informatique",
            "location": "Paris, France"
        }
        job = {
            "requirements": ["Python", "FastAPI", "PostgreSQL"],
            "required_experience": 3,
            "required_education": "Master en Informatique",
            "location": "Paris, France"
        }
        score = service.calculate_overall_score(candidate, job)
        assert 0 < score < 100 