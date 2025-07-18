import pytest
from app.services.validation import ValidationService
from app.core.exceptions import ValidationError

@pytest.mark.unit
class TestValidationService:
    def test_validate_email(self):
        """Teste la validation des adresses email."""
        service = ValidationService()
        
        # Test avec email valide
        assert service.validate_email("test@example.com") is True
        assert service.validate_email("user.name@domain.co.uk") is True
        
        # Test avec email invalide
        with pytest.raises(ValidationError):
            service.validate_email("invalid-email")
        with pytest.raises(ValidationError):
            service.validate_email("test@")
        with pytest.raises(ValidationError):
            service.validate_email("@domain.com")

    def test_validate_phone(self):
        """Teste la validation des numéros de téléphone."""
        service = ValidationService()
        
        # Test avec numéro valide
        assert service.validate_phone("+33612345678") is True
        assert service.validate_phone("0612345678") is True
        
        # Test avec numéro invalide
        with pytest.raises(ValidationError):
            service.validate_phone("123")
        with pytest.raises(ValidationError):
            service.validate_phone("abcdefghij")

    def test_validate_password(self):
        """Teste la validation des mots de passe."""
        service = ValidationService()
        
        # Test avec mot de passe valide
        assert service.validate_password("StrongP@ss123") is True
        assert service.validate_password("Complex!Pass456") is True
        
        # Test avec mot de passe invalide
        with pytest.raises(ValidationError):
            service.validate_password("weak")
        with pytest.raises(ValidationError):
            service.validate_password("no-uppercase-123")
        with pytest.raises(ValidationError):
            service.validate_password("NO-LOWERCASE-123")

    def test_validate_skills(self):
        """Teste la validation des compétences."""
        service = ValidationService()
        
        # Test avec compétences valides
        valid_skills = ["Python", "FastAPI", "PostgreSQL"]
        assert service.validate_skills(valid_skills) is True
        
        # Test avec compétences invalides
        with pytest.raises(ValidationError):
            service.validate_skills([])
        with pytest.raises(ValidationError):
            service.validate_skills(["Python", ""])
        with pytest.raises(ValidationError):
            service.validate_skills(["Python", " "])

    def test_validate_experience(self):
        """Teste la validation de l'expérience."""
        service = ValidationService()
        
        # Test avec expérience valide
        assert service.validate_experience(5) is True
        assert service.validate_experience(0) is True
        
        # Test avec expérience invalide
        with pytest.raises(ValidationError):
            service.validate_experience(-1)
        with pytest.raises(ValidationError):
            service.validate_experience(100)

    def test_validate_salary_range(self):
        """Teste la validation des fourchettes de salaire."""
        service = ValidationService()
        
        # Test avec fourchette valide
        assert service.validate_salary_range("30k-50k") is True
        assert service.validate_salary_range("50k-70k") is True
        
        # Test avec fourchette invalide
        with pytest.raises(ValidationError):
            service.validate_salary_range("invalid")
        with pytest.raises(ValidationError):
            service.validate_salary_range("50k-30k")  # Min > Max

    def test_validate_candidate_data(self):
        """Teste la validation complète des données candidat."""
        service = ValidationService()
        
        # Test avec données valides
        valid_data = {
            "email": "test@example.com",
            "phone": "+33612345678",
            "skills": ["Python", "FastAPI"],
            "experience_years": 5
        }
        assert service.validate_candidate_data(valid_data) is True
        
        # Test avec données invalides
        invalid_data = {
            "email": "invalid-email",
            "phone": "123",
            "skills": [],
            "experience_years": -1
        }
        with pytest.raises(ValidationError):
            service.validate_candidate_data(invalid_data)

    def test_validate_job_data(self):
        """Teste la validation complète des données d'offre d'emploi."""
        service = ValidationService()
        
        # Test avec données valides
        valid_data = {
            "title": "Développeur Python",
            "company": "Test Company",
            "requirements": ["Python", "FastAPI"],
            "salary_range": "50k-70k"
        }
        assert service.validate_job_data(valid_data) is True
        
        # Test avec données invalides
        invalid_data = {
            "title": "",
            "company": "",
            "requirements": [],
            "salary_range": "invalid"
        }
        with pytest.raises(ValidationError):
            service.validate_job_data(invalid_data) 