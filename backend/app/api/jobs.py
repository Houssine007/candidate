from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..core.database import get_db
from ..models.job import Job, JobRequirement
from ..models.application import Application, ApplicationStatus
from ..models.user import User
from ..models.recruiter import Recruiter
from ..models.skill import Skill
from ..models.candidate import Candidate, CandidateSkill
from ..services.matching import find_matching_candidates
from .auth import get_current_user, get_current_user_optional
from ..core.permissions import has_permission


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
    min_years_experience: Optional[float] = 0.0
    min_education_level: Optional[int] = 0
    contract_type: Optional[str] = None
    start_date: Optional[str] = None
    benefits: Optional[list] = None
    is_active: bool = True

class JobCreate(JobBase):
    requirements: List[SkillRequirement] = []

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    company: Optional[str] = None
    min_years_experience: Optional[float] = None
    min_education_level: Optional[int] = None
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
    recruiter_id: Optional[int] = None
    requirements: List[SkillRequirementResponse] = []
    is_active: bool = True
    match_score: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class JobWithMatches(JobResponse):
    matching_candidates: List[dict] = []  # Sera enrichi avec score et gaps
    status_counts: dict = {} # New field for status overview


# Endpoints
@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _permission: bool = Depends(has_permission("jobs:create"))
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
    
    # Si recruteur, on récupère son company_id pour l'isolation
    company_id = recruiter.company_id if recruiter else None
    recruiter_id = recruiter.id if recruiter else None
    
    # Créer la nouvelle offre
    job_data = job.model_dump(exclude={"requirements"})
    db_job = Job(**job_data, recruiter_id=recruiter_id, company_id=company_id)
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
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Récupérer la liste des offres d'emploi avec filtres optionnels.
    """
    # Construire la requête avec chargement immédiat des relations
    query = db.query(Job).options(
        joinedload(Job.requirements).joinedload(JobRequirement.skill)
    )
    
    # Isolation Multi-tenant : si c'est un recruteur, il ne voit que ses jobs
    if current_user and current_user.role == "RECRUITER":
        recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
        if recruiter:
            query = query.filter(Job.company_id == recruiter.company_id)
    
    # Tri par date de création (décroissant)
    query = query.order_by(Job.created_at.desc())
    
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
    current_user: Optional[User] = Depends(get_current_user_optional)
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
            
    # --- Nouveau : Calculer le matching si l'utilisateur est un candidat ---
    if current_user and current_user.role == "CANDIDATE":
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if candidate:
            from ..services.matching import calculate_match_score
            match_data = calculate_match_score(candidate, job)
            job_response.match_score = match_data["total_score"]
    
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
    min_score: float = 40.0,
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
    
    # Récupérer l'offre avec ses exigences et les noms des compétences associés
    job = db.query(Job).options(
        joinedload(Job.requirements).joinedload(JobRequirement.skill)
    ).filter(Job.id == job_id).first()
    
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre d'emploi non trouvée"
        )
        
    # Isolation Multi-tenant : un recruteur ne peut voir que les matches de ses propres offres
    if current_user.role == "RECRUITER":
        recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
        if not recruiter or job.company_id != recruiter.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez voir les matches que pour les offres de votre entreprise"
            )
    
    # Injecter skill_name pour les détails du matching
    for req in job.requirements:
        req.skill_name = req.skill.name if req.skill else f"Skill #{req.skill_id}"
    
    # Implémentation de l'algorithme de matching
    candidates = db.query(Candidate).options(
        joinedload(Candidate.skills).joinedload(CandidateSkill.skill)
    ).all()
    
    matches = find_matching_candidates(job, candidates, min_score)
    
    # Enrichir avec le statut "a postulé"
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    applied_candidate_ids = [app.candidate_id for app in applications]
    
    for match in matches:
        match["has_applied"] = match["candidate_id"] in applied_candidate_ids

    # Enrichir la réponse Pydantic pour le frontend
    job_response = JobResponse.model_validate(job)
    
    # Fusionner les matches dans l'objet réponse
    response_dict = job_response.model_dump()
    response_dict["matching_candidates"] = matches
    
    # Calculer les status_counts
    status_counts = {}
    for app in applications:
        status_counts[app.status.value] = status_counts.get(app.status.value, 0) + 1
    response_dict["status_counts"] = status_counts
    
    return response_dict


@router.patch("/{job_id}/archive")
async def archive_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Archive ou désarchive une offre d'emploi.
    """
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    
    db_job = db.query(Job).filter(Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job non trouvé")
    
    # Sécurité isolation
    if current_user.role == "RECRUITER":
        recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
        if not recruiter or db_job.company_id != recruiter.company_id:
            raise HTTPException(status_code=403, detail="Non autorisé")

    db_job.is_active = not db_job.is_active
    db.commit()
    return {"id": job_id, "is_active": db_job.is_active}


@router.get("/{job_id}/internal-matches")
async def get_internal_mobility_matches(
    job_id: int,
    min_score: float = 30.0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Identifie les employés internes qui pourraient combler le besoin avec des formations.
    Retourne les employés triés par score de matching avec leurs gaps de compétences.
    """
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(status_code=403, detail="Accès refusé")

    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=400, detail="Profil recruteur non trouvé")

    job = db.query(Job).options(
        joinedload(Job.requirements).joinedload(JobRequirement.skill)
    ).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job non trouvé")

    # Injecter skill_name pour le matching
    for req in job.requirements:
        req.skill_name = req.skill.name if req.skill else f"Skill #{req.skill_id}"

    # Charger les employés de l'entreprise avec leurs compétences
    from ..models.employee import Employee, EmployeeSkill
    employees = db.query(Employee).options(
        joinedload(Employee.skills)
    ).filter(Employee.company_id == recruiter.company_id).all()

    if not employees:
        return []

    # Adapter les employés pour calculate_match_score (même interface que Candidate)
    from ..services.matching import calculate_match_score

    results = []
    for emp in employees:
        # Créer un wrapper qui expose la même interface que Candidate
        class EmployeeWrapper:
            def __init__(self, e):
                self.skills = e.skills
                self.years_of_experience = e.years_of_experience or 0
                self.education_level = e.education_level or 0

        wrapper = EmployeeWrapper(emp)
        match = calculate_match_score(wrapper, job)

        if match["total_score"] >= min_score:
            # Enrichir les gaps avec le nom de la compétence
            enriched_gaps = []
            for gap in match["gaps"]:
                if gap["type"] == "skill":
                    req = next((r for r in job.requirements if r.skill_id == gap["id"]), None)
                    skill_name = req.skill_name if req else f"Skill #{gap['id']}"
                    enriched_gaps.append({**gap, "skill_name": skill_name})
                else:
                    enriched_gaps.append(gap)

            results.append({
                "employee_id": emp.id,
                "full_name": f"{emp.first_name} {emp.last_name}",
                "job_title": emp.job_title,
                "total_score": match["total_score"],
                "skill_score": match["skill_score"],
                "gaps": enriched_gaps,
                "detailed_skills": match["detailed_skills"],
                "trainable": len([g for g in enriched_gaps if g["type"] == "skill"]) <= 3,
            })

    return sorted(results, key=lambda x: x["total_score"], reverse=True)