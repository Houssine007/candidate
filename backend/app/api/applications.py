from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Any
from pydantic import BaseModel
from enum import Enum
from datetime import datetime

from ..core.database import get_db
from ..models.application import Application, ApplicationStatus
from ..models.user import User, UserRole
from ..models.candidate import Candidate, CandidateSkill
from ..models.job import Job, JobRequirement
from ..models.skill import Skill
from .auth import get_current_user
from ..services.matching import calculate_match_score

router = APIRouter()

# Schémas
class ApplicationCreate(BaseModel):
    job_id: int
    cover_letter: Optional[str] = None

class ApplicationInvite(BaseModel):
    job_id: int
    candidate_id: int

class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    is_active: Optional[bool] = None

class HireRequest(BaseModel):
    # Titre de poste définitif saisi par le recruteur lors de l'intégration.
    # Optionnel : à défaut, on retombe sur le titre de l'offre.
    job_title: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    status: ApplicationStatus
    cover_letter: Optional[str]
    created_at: datetime
    
    # Pour le frontend
    job_title: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_profile: Optional[Any] = None
    match_details: Optional[Any] = None

    class Config:
        from_attributes = True

@router.post("/invite", response_model=ApplicationResponse)
async def invite_candidate(
    invite: ApplicationInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Invite un candidat à une offre (création manuelle par le recruteur).
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        raise HTTPException(status_code=403, detail="Non autorisé")

    # Vérifier que le job existe
    job = db.query(Job).filter(Job.id == invite.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job non trouvé")

    # Vérifier que le candidat existe
    candidate = db.query(Candidate).filter(Candidate.id == invite.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidat non trouvé")

    # Vérifier si déjà postulé
    existing = db.query(Application).filter(
        Application.job_id == invite.job_id,
        Application.candidate_id == invite.candidate_id
    ).first()

    if existing:
        # Si candidat s'était auto-appliqué (APPLIED), on le fait entrer dans le pipeline
        if existing.status == ApplicationStatus.APPLIED:
            existing.status = ApplicationStatus.PENDING
            db.commit()
            db.refresh(existing)
        existing.job_title = job.title
        existing.candidate_name = f"{candidate.first_name} {candidate.last_name}"
        return existing

    # Créer l'application
    db_app = Application(
        job_id=invite.job_id,
        candidate_id=invite.candidate_id,
        status=ApplicationStatus.PENDING, # Utiliser un statut valide de l'enum
        created_at=datetime.utcnow()
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)

    # Enrichir pour le retour
    db_app.job_title = job.title
    db_app.candidate_name = f"{candidate.first_name} {candidate.last_name}"
    
    return db_app

@router.post("/", response_model=ApplicationResponse)
async def create_application(
    app_in: ApplicationCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Permet à un candidat de postuler à une offre.
    """
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les candidats peuvent postuler"
        )
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profil candidat non trouvé. Veuillez compléter votre profil."
        )

    # Vérifier si l'offre existe
    job = db.query(Job).filter(Job.id == app_in.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Offre d'emploi non trouvée")

    # Vérifier si déjà postulé
    existing = db.query(Application).filter(
        Application.candidate_id == candidate.id,
        Application.job_id == app_in.job_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Vous avez déjà postulé à cette offre"
        )

    db_app = Application(
        candidate_id=candidate.id,
        job_id=app_in.job_id,
        cover_letter=app_in.cover_letter,
        status=ApplicationStatus.PENDING
    )
    
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.get("/me", response_model=List[ApplicationResponse])
async def get_my_applications(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Récupère les candidatures de l'utilisateur connecté (Candidat).
    """
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        return []
        
    apps = db.query(Application).options(
        joinedload(Application.job).joinedload(Job.requirements)
    ).filter(
        Application.candidate_id == candidate.id
    ).all()
    
    # Enrichir pour le front
    for a in apps:
        a.job_title = a.job.title
        # Injecter le match score en temps réel
        match_result = calculate_match_score(candidate, a.job)
        a.match_details = match_result
        # Injecter le profil minimal pour le front
        a.candidate_profile = {
            "bio": candidate.bio,
            "formations": candidate.formations,
            "certifications": candidate.certifications,
            "experience_detail": candidate.experience_detail,
            "years_of_experience": candidate.years_of_experience,
            "education_level": candidate.education_level
        }
    return apps

@router.get("/job/{job_id}/", response_model=List[ApplicationResponse])
async def get_job_applications(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupère toutes les candidatures pour un job spécifique (Recruteur).
    """
    # Sécurité : Seul un ADMIN ou RECRUITER peut accéder à cette route
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les recruteurs peuvent voir les candidatures"
        )

    # Récupérer le job avec ses requirements et les skills associés
    job = db.query(Job).options(
        joinedload(Job.requirements).joinedload(JobRequirement.skill)
    ).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job non trouvé")
    
    # Isolation : Un recruteur ne voit que les jobs de son entreprise
    if current_user.role == UserRole.RECRUITER:
        from ..models.recruiter import Recruiter
        recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
        if not recruiter or job.company_id != recruiter.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès aux candidatures de cette offre"
            )

    # Enrichir les requirements avec les noms de skills pour le matcher
    for req in job.requirements:
        if hasattr(req, 'skill') and req.skill:
            req.skill_name = req.skill.name
        else:
            skill = db.query(Skill).filter(Skill.id == req.skill_id).first()
            if skill:
                req.skill_name = skill.name
    
    apps = db.query(Application).options(
        joinedload(Application.candidate).joinedload(Candidate.skills).joinedload(CandidateSkill.skill)
    ).filter(
        Application.job_id == job_id,
        Application.is_active.is_not(False)
    ).all()
    
    result = []
    for a in apps:
        if not a.candidate:
            continue
            
        a.job_title = job.title
        a.candidate_name = f"{a.candidate.first_name} {a.candidate.last_name}"
        
        # Calculer le match avec gestion d'erreur au cas où
        try:
            match_result = calculate_match_score(a.candidate, job)
            a.match_details = match_result
        except Exception as e:
            print(f"⚠️ Erreur matching pour app {a.id}: {str(e)}")
            a.match_details = None
            
        # Injecter profil complet
        a.candidate_profile = {
            "bio": a.candidate.bio,
            "formations": a.candidate.formations,
            "certifications": a.candidate.certifications,
            "experience_detail": a.candidate.experience_detail,
            "years_of_experience": a.candidate.years_of_experience,
            "education_level": a.candidate.education_level,
            "cv_text": a.candidate.cv_text
        }
        result.append(a)
    
    return result

@router.patch("/{app_id}/status/", response_model=ApplicationResponse)
async def update_application_status(
    app_id: int,
    status_update: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Met à jour le statut d'une candidature (pour le Kanban).
    """
    # Récupérer la candidature avec le candidat pour enrichir la réponse
    db_app = db.query(Application).options(
        joinedload(Application.candidate).joinedload(Candidate.skills),
        joinedload(Application.job).joinedload(Job.requirements)
    ).filter(Application.id == app_id).first()

    if not db_app:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")

    previous_status = db_app.status

    if status_update.status:
        db_app.status = status_update.status

    db.commit()

     # Transition ACCEPTED → créer automatiquement l'employé
    # Recharger explicitement après commit pour avoir les relations fraîches
    if status_update.status == ApplicationStatus.ACCEPTED and previous_status != ApplicationStatus.ACCEPTED:
        candidate = db.query(Candidate).options(
            joinedload(Candidate.skills)
        ).filter(Candidate.id == db_app.candidate_id).first()
        job = db.query(Job).filter(Job.id == db_app.job_id).first()
        if candidate and job:
            try:
                await _promote_candidate_to_employee(candidate, job, db)
                print(f"✅ Employé créé pour candidat {candidate.id} ({candidate.first_name} {candidate.last_name})")
            except Exception as e:
                print(f"❌ Erreur promotion candidat→employé: {str(e)}")
                import traceback; traceback.print_exc()
    db.refresh(db_app)

    # Enrichir pour le front (même logique que get_job_applications)
    db_app.job_title = db_app.job.title
    db_app.candidate_name = f"{db_app.candidate.first_name} {db_app.candidate.last_name}"
    
    try:
        match_result = calculate_match_score(db_app.candidate, db_app.job)
        db_app.match_details = match_result
    except:
        db_app.match_details = None

    db_app.candidate_profile = {
        "bio": db_app.candidate.bio,
        "formations": db_app.candidate.formations,
        "certifications": db_app.candidate.certifications,
        "experience_detail": db_app.candidate.experience_detail,
        "years_of_experience": db_app.candidate.years_of_experience,
        "education_level": db_app.candidate.education_level,
        "cv_text": db_app.candidate.cv_text
    }

    return db_app


@router.post("/{app_id}/hire", response_model=ApplicationResponse)
async def hire_application(
    app_id: int,
    payload: HireRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Confirme l'intégration d'un candidat (bouton « Confirmer l'intégration » du
    kanban) : passe la candidature à ACCEPTED puis crée l'employé correspondant,
    en utilisant le titre de poste définitif saisi par le recruteur (sinon le
    titre de l'offre). Idempotent grâce au garde de _promote (déjà employé).
    """
    db_app = db.query(Application).options(
        joinedload(Application.candidate).joinedload(Candidate.skills),
        joinedload(Application.job).joinedload(Job.requirements)
    ).filter(Application.id == app_id).first()

    if not db_app:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")

    previous_status = db_app.status
    db_app.status = ApplicationStatus.ACCEPTED
    db.commit()

    if previous_status != ApplicationStatus.ACCEPTED:
        candidate = db.query(Candidate).options(
            joinedload(Candidate.skills)
        ).filter(Candidate.id == db_app.candidate_id).first()
        job = db.query(Job).filter(Job.id == db_app.job_id).first()
        if candidate and job:
            try:
                await _promote_candidate_to_employee(
                    candidate, job, db, job_title=(payload.job_title or None)
                )
                print(f"✅ Intégration confirmée : employé créé pour candidat {candidate.id} ({candidate.first_name} {candidate.last_name})")
            except Exception as e:
                print(f"❌ Erreur promotion candidat→employé (hire): {str(e)}")
                import traceback; traceback.print_exc()

    db.refresh(db_app)
    db_app.job_title = db_app.job.title
    db_app.candidate_name = f"{db_app.candidate.first_name} {db_app.candidate.last_name}"
    return db_app


async def _promote_candidate_to_employee(candidate: Candidate, job: Job, db: Session, job_title: Optional[str] = None):
    """
    Crée automatiquement un employé à partir d'un candidat accepté.
    Idempotent : ne crée pas si l'employé existe déjà.
    """
    from ..models.employee import Employee, EmployeeSkill
    from ..models.user import User, UserRole

    # Le candidat recruté devient un employé : on bascule son rôle système pour qu'il
    # accède à son espace employé, tout en conservant son profil (même user_id → même
    # enregistrement Candidate, donc bio/CV/skills/formations sont « emportés »).
    # On ne bascule QUE les CANDIDATE → EMPLOYEE (un RECRUITER/ADMIN qui possède aussi
    # une fiche employé ne doit jamais être rétrogradé).
    user = db.query(User).filter(User.id == candidate.user_id).first()
    if user and user.role == UserRole.CANDIDATE:
        user.role = UserRole.EMPLOYEE

    # Vérifier si déjà employé (par user_id)
    existing = db.query(Employee).filter(Employee.user_id == candidate.user_id).first()
    if existing:
        db.commit()  # persiste le basculement de rôle même si l'employé existait déjà
        print(f"ℹ️ Candidat {candidate.id} est déjà employé (id={existing.id})")
        return existing

    # Résoudre le company_id
    company_id = job.company_id
    if not company_id and job.recruiter_id:
        from ..models.recruiter import Recruiter
        recruiter = db.query(Recruiter).filter(Recruiter.id == job.recruiter_id).first()
        if recruiter:
            company_id = recruiter.company_id

    if not company_id:
        print(f"❌ _promote: company_id introuvable pour job {job.id} (recruiter_id={job.recruiter_id})")
        return None

    employee = Employee(
        user_id=candidate.user_id,
        company_id=company_id,
        first_name=candidate.first_name,
        last_name=candidate.last_name,
        email=candidate.email,
        phone=candidate.phone,
        years_of_experience=candidate.years_of_experience or 0,
        education_level=candidate.education_level or 0,
        job_title=job_title or job.title,
        hire_date=datetime.utcnow(),
    )
    db.add(employee)
    db.flush()

    # Copier les compétences du candidat vers l'employé
    for cs in candidate.skills:
        db.add(EmployeeSkill(
            employee_id=employee.id,
            skill_id=cs.skill_id,
            level=cs.level,
            years_experience=cs.years_experience or 0,
        ))

    db.commit()
    return employee
