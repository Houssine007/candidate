import pytest
from typing import Generator, AsyncGenerator
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Configuration de la base de données de test
TEST_DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Création du moteur de base de données de test
test_engine = create_async_engine(TEST_DATABASE_URL, echo=True)
TestingSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop():
    """Crée une boucle d'événements pour les tests asynchrones."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_db():
    """Crée et configure la base de données de test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session(test_db) -> AsyncGenerator[AsyncSession, None]:
    """Fournit une session de base de données pour les tests."""
    async with TestingSessionLocal() as session:
        yield session

@pytest.fixture
async def client(db_session) -> Generator[TestClient, None, None]:
    """Fournit un client de test FastAPI."""
    async def override_get_db():
        try:
            yield db_session
        finally:
            await db_session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user_data():
    """Fournit des données de test pour un utilisateur."""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User"
    }

@pytest.fixture
def test_candidate_data():
    """Fournit des données de test pour un candidat."""
    return {
        "full_name": "Test Candidate",
        "email": "candidate@example.com",
        "phone": "+33612345678",
        "location": "Paris, France",
        "experience_years": 5,
        "education": "Master en Informatique",
        "skills": ["Python", "FastAPI", "PostgreSQL"]
    }

@pytest.fixture
def test_job_data():
    """Fournit des données de test pour une offre d'emploi."""
    return {
        "title": "Développeur Python Senior",
        "company": "Test Company",
        "location": "Paris, France",
        "description": "Description du poste",
        "requirements": ["Python", "FastAPI", "PostgreSQL"],
        "salary_range": "50k-70k",
        "employment_type": "CDI"
    } 