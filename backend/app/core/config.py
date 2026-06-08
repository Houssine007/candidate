from pydantic_settings import BaseSettings
from typing import List, Optional
import secrets
import json

class Settings(BaseSettings):
    # Informations de l'API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Recruitment Platform"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = """
    API de la plateforme de recrutement permettant de :
    - Gérer les candidats et leurs profils
    - Publier et gérer les offres d'emploi
    - Faire correspondre les candidats aux postes
    - Gérer les compétences et les catégories
    """
    
    # Sécurité
    SECRET_KEY: str = "dev_secret_key_fixed_for_stability_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    GOOGLE_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://192.168.56.1:3000"]
    
    
    # Base de données
    DATABASE_URL: str = "postgresql://postgres:Houssine.007@localhost:5432/recruitment_db"
    
    
    # Configuration des emails
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
    # Configuration du serveur
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # Documentation OpenAPI
    OPENAPI_URL: str = "/openapi.json"
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

    def __init__(self, **values):
        super().__init__(**values)
        # Correction pour la liste CORS
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            try:
                self.BACKEND_CORS_ORIGINS = json.loads(self.BACKEND_CORS_ORIGINS)
            except Exception:
                self.BACKEND_CORS_ORIGINS = [self.BACKEND_CORS_ORIGINS]

settings = Settings() 