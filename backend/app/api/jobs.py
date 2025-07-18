from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..core.database import get_db
from ..models.job import Job
from ..models.user import User
from ..services.matching import find_matching_candidates
from .auth import get_current_user
from ..models.candidate import Candidate


router = APIRouter()

# Modèles Pydantic
class JobBase(BaseModel):
    title: str
    description: str
    required_skills: List[str]
    required_experience: float
    required_education_level: int
    location: str
    salary_range: str
    company: str
    is_active: bool = True

class JobCreate(JobBase):
    pass

class JobUpdate(JobBase):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    required_experience: Optional[float] = None
    required_education_level: Optional[int] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    company: Optional[str] = None
    is_active: Optional[bool] = None

class JobResponse(JobBase):
    id: int

    class Config:
        from_attributes = True

class JobWithMatches(JobResponse):
    matching_candidates: List[dict]

# Endpoints
@router.post("/", response_model=JobResponse)
async def create_job(
    job: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier si l'utilisateur a les droits
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas les droits pour créer une offre d'emploi"
        )
    
    # Créer la nouvelle offre
    db_job = Job(**job.model_dump())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.get("/", response_model=List[JobResponse])
async def get_jobs(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Construire la requête
    query = db.query(Job)
    if active_only:
        query = query.filter(Job.is_active == True)
    
    jobs = query.offset(skip).limit(limit).all()
    return jobs

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre d'emploi non trouvée"
        )
    return job

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier si l'utilisateur a les droits
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas les droits pour modifier une offre d'emploi"
        )
    
    # Récupérer l'offre
    db_job = db.query(Job).filter(Job.id == job_id).first()
    if db_job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre d'emploi non trouvée"
        )
    
    # Mettre à jour l'offre
    update_data = job.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_job, key, value)
    
    db.commit()
    db.refresh(db_job)
    return db_job

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier si l'utilisateur a les droits
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les administrateurs peuvent supprimer des offres d'emploi"
        )
    
    # Récupérer l'offre
    db_job = db.query(Job).filter(Job.id == job_id).first()
    if db_job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre d'emploi non trouvée"
        )
    
    # Supprimer l'offre
    db.delete(db_job)
    db.commit()
    return None

@router.get("/{job_id}/matches", response_model=JobWithMatches)
async def get_job_matches(
    job_id: int,
    min_score: float = 60.0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier si l'utilisateur a les droits
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas les droits pour voir les correspondances"
        )
    
    # Récupérer l'offre
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre d'emploi non trouvée"
        )
    
    # Récupérer tous les candidats
    candidates = db.query(Candidate).all()
    
    # Trouver les correspondances
    matches = find_matching_candidates(job, candidates, min_score)
    
    # Construire la réponse
    response = JobResponse.from_orm(job)
    response_dict = response.model_dump()
    response_dict["matching_candidates"] = matches
    
    return response_dict 