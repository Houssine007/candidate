from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..core.database import get_db
from ..models.job import Job, JobRequirement
from ..models.user import User
from ..models.recruiter import Recruiter
from ..models.skill import Skill
from .auth import get_current_user


router = APIRouter()

# Modèles Pydantic
class SkillRequirement(BaseModel):
    skill_id: int
    required_level: int  # 1-4
    is_mandatory: bool = True

class JobBase(BaseModel):
    title: str
    description: str
    location: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    company: str

class JobCreate(JobBase):
    requirements: List[SkillRequirement] = []

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    company: Optional[str] = None
    requirements: Optional[List[SkillRequirement]] = None

class SkillRequirementResponse(BaseModel):
    skill_id: int
    required_level: int
    is_mandatory: bool
    skill_name: Optional[str] = None

    class Config:
        from_attributes = True

class JobResponse(JobBase):
    id: int
    recruiter_id: int
    requirements: List[SkillRequirementResponse] = []

    class Config:
        from_attributes = True

class JobWithMatches(JobResponse):
    matching_candidates: List[dict] = []

# Endpoints
@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Créer une nouvelle offre d'emploi.
    Nécessite le rôle RECRUITER ou ADMIN.
    """
    # Vérifier si l'utilisateur a les droits
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas les droits pour créer une offre d'emploi"
        )
    
    # Récupérer le profil recruteur de l'utilisateur
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter and current_user.role == "RECRUITER":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil recruteur pour créer une offre"
        )
    
    # Si admin sans profil recruteur, créer un job sans recruiter_id (ou gérer autrement)
    recruiter_id = recruiter.id if recruiter else None
    
    # Créer la nouvelle offre
    job_data = job.model_dump(exclude={"requirements"})
    db_job = Job(**job_data, recruiter_id=recruiter_id)
    db.add(db_job)
    db.flush()  # Pour obtenir l'ID du job
    
    # Ajouter les compétences requises
    for req in job.requirements:
        # Vérifier que la compétence existe
        skill = db.query(Skill).filter(Skill.id == req.skill_id).first()
        if not skill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Compétence avec l'ID {req.skill_id} non trouvée"
            )
        
        job_req = JobRequirement(
            job_id=db_job.id,
            skill_id=req.skill_id,
            required_level=req.required_level,
            is_mandatory=req.is_mandatory
        )
        db.add(job_req)
    
    db.commit()
    db.refresh(db_job)
    
    # Enrichir la réponse avec les noms des compétences
    response_data = JobResponse.model_validate(db_job)
    for req in response_data.requirements:
        skill = db.query(Skill).filter(Skill.id == req.skill_id).first()
        if skill:
            req.skill_name = skill.name
    
    return response_data

@router.get("/", response_model=List[JobResponse])
async def get_jobs(
    skip: int = 0,
    limit: int = 100,
    location: Optional[str] = None,
    company: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer la liste des offres d'emploi avec filtres optionnels.
    """
    # Construire la requête
    query = db.query(Job)
    
    # Appliquer les filtres
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if company:
        query = query.filter(Job.company.ilike(f"%{company}%"))
    
    jobs = query.offset(skip).limit(limit).all()
    
    # Enrichir avec les noms des compétences
    result = []
    for job in jobs:
        job_response = JobResponse.model_validate(job)
        for req in job_response.requirements:
            skill = db.query(Skill).filter(Skill.id == req.skill_id).first()
            if skill:
                req.skill_name = skill.name
        result.append(job_response)
    
    return result

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer les détails d'une offre d'emploi spécifique.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre d'emploi non trouvée"
        )
    
    # Enrichir avec les noms des compétences
    job_response = JobResponse.model_validate(job)
    for req in job_response.requirements:
        skill = db.query(Skill).filter(Skill.id == req.skill_id).first()
        if skill:
            req.skill_name = skill.name
    
    return job_response

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mettre à jour une offre d'emploi.
    Nécessite le rôle RECRUITER ou ADMIN.
    """
    # Vérifier si l'utilisateur a les droits
    if current_user.role not in ["ADMIN", "RECRUITER"]:
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
    
    # Vérifier que le recruteur modifie sa propre offre (sauf admin)
    if current_user.role == "RECRUITER":
        recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
        if not recruiter or db_job.recruiter_id != recruiter.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez modifier que vos propres offres"
            )
    
    # Mettre à jour les champs de base
    update_data = job.model_dump(exclude_unset=True, exclude={"requirements"})
    for key, value in update_data.items():
        setattr(db_job, key, value)
    
    # Mettre à jour les compétences requises si fournies
    if job.requirements is not None:
        # Supprimer les anciennes exigences
        db.query(JobRequirement).filter(JobRequirement.job_id == job_id).delete()
        
        # Ajouter les nouvelles exigences
        for req in job.requirements:
            # Vérifier que la compétence existe
            skill = db.query(Skill).filter(Skill.id == req.skill_id).first()
            if not skill:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Compétence avec l'ID {req.skill_id} non trouvée"
                )
            
            job_req = JobRequirement(
                job_id=job_id,
                skill_id=req.skill_id,
                required_level=req.required_level,
                is_mandatory=req.is_mandatory
            )
            db.add(job_req)
    
    db.commit()
    db.refresh(db_job)
    
    # Enrichir la réponse
    job_response = JobResponse.model_validate(db_job)
    for req in job_response.requirements:
        skill = db.query(Skill).filter(Skill.id == req.skill_id).first()
        if skill:
            req.skill_name = skill.name
    
    return job_response

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supprimer une offre d'emploi.
    Seuls les ADMIN peuvent supprimer des offres.
    """
    # Vérifier si l'utilisateur a les droits
    if current_user.role != "ADMIN":
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
    
    # Supprimer l'offre (cascade supprimera les requirements)
    db.delete(db_job)
    db.commit()
    return None

@router.get("/{job_id}/matches")
async def get_job_matches(
    job_id: int,
    min_score: float = 60.0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtenir les candidats correspondant à une offre d'emploi.
    Nécessite le rôle RECRUITER ou ADMIN.
    """
    # Vérifier si l'utilisateur a les droits
    if current_user.role not in ["ADMIN", "RECRUITER"]:
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
    
    # TODO: Implémenter l'algorithme de matching
    # Pour l'instant, retourner une structure vide
    from ..models.candidate import Candidate
    candidates = db.query(Candidate).all()
    
    # Enrichir la réponse
    job_response = JobResponse.model_validate(job)
    for req in job_response.requirements:
        skill = db.query(Skill).filter(Skill.id == req.skill_id).first()
        if skill:
            req.skill_name = skill.name
    
    response_dict = job_response.model_dump()
    response_dict["matching_candidates"] = []  # TODO: Implémenter le matching
    
    return response_dict