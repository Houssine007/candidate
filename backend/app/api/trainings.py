from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..core.database import get_db
from ..models.internal_hr import Training, TrainingCategory, TrainingEnrollment, EnrollmentStatus, TrainingSkill
from ..models.employee import Employee
from ..models.skill import Skill
from ..models.user import User
from .auth import get_current_user

router = APIRouter(prefix="/trainings", tags=["Trainings"])


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class SkillTaughtResponse(BaseModel):
    skill_id: int
    skill_name: Optional[str] = None
    level_gained: int

    class Config:
        from_attributes = True


class TrainingResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: str
    duration_hours: Optional[float] = None
    provider: Optional[str] = None
    cost: Optional[float] = None
    max_participants: Optional[int] = None
    is_active: int = 1
    created_at: datetime
    skills_taught: List[SkillTaughtResponse] = []

    class Config:
        from_attributes = True


class EnrollmentResponse(BaseModel):
    id: int
    employee_id: int
    training_id: int
    status: str
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    training: Optional[TrainingResponse] = None

    class Config:
        from_attributes = True


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/catalog", response_model=List[TrainingResponse])
async def get_trainings_catalog(
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lister le catalogue des formations disponibles"""
    from ..models.recruiter import Recruiter

    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=403, detail="Profil recruteur non trouvé")

    query = db.query(Training).options(
        joinedload(Training.skills_taught).joinedload(TrainingSkill.skill)
    ).filter(
        Training.company_id == recruiter.company_id,
        Training.is_active == 1
    )

    if category:
        query = query.filter(Training.category == category)

    trainings = query.offset(skip).limit(limit).all()
    return trainings


@router.get("/my-enrollments", response_model=List[EnrollmentResponse])
async def get_my_enrollments(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer mes formations assignées/en cours"""
    if current_user.role.value != "EMPLOYEE":
        raise HTTPException(
            status_code=403,
            detail="Cet endpoint est réservé aux employés"
        )

    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Profil employé non trouvé")

    query = db.query(TrainingEnrollment).options(
        joinedload(TrainingEnrollment.training).joinedload(Training.skills_taught)
    ).filter(TrainingEnrollment.employee_id == employee.id)

    if status:
        query = query.filter(TrainingEnrollment.status == status)

    return query.all()


@router.get("/{training_id}", response_model=TrainingResponse)
async def get_training(
    training_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Détails d'une formation"""
    from ..models.recruiter import Recruiter

    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=403, detail="Profil recruteur non trouvé")

    training = db.query(Training).options(
        joinedload(Training.skills_taught).joinedload(TrainingSkill.skill)
    ).filter(
        Training.id == training_id,
        Training.company_id == recruiter.company_id
    ).first()

    if not training:
        raise HTTPException(status_code=404, detail="Formation non trouvée")

    return training


@router.post("/enrollments", response_model=EnrollmentResponse)
async def assign_training(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assigner une formation à un employé (RH/Manager)"""
    from ..core.permissions import has_permission

    # Vérifier permission
    perm_check = await has_permission("trainings:assign")(db, current_user)
    if not perm_check:
        raise HTTPException(status_code=403, detail="Permission refusée")

    employee_id = data.get("employee_id")
    training_id = data.get("training_id")

    if not employee_id or not training_id:
        raise HTTPException(status_code=400, detail="employee_id et training_id requis")

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")

    training = db.query(Training).filter(Training.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Formation non trouvée")

    # Vérifier qu'il n'existe pas déjà
    existing = db.query(TrainingEnrollment).filter(
        TrainingEnrollment.employee_id == employee_id,
        TrainingEnrollment.training_id == training_id,
        TrainingEnrollment.status.in_(["PENDING", "APPROVED", "COMPLETED"])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employé déjà inscrit à cette formation")

    enrollment = TrainingEnrollment(
        employee_id=employee_id,
        training_id=training_id,
        status=EnrollmentStatus.PENDING
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    db.refresh(enrollment, ["training"])

    return enrollment


@router.patch("/enrollments/{enrollment_id}", response_model=EnrollmentResponse)
async def update_enrollment(
    enrollment_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mettre à jour l'inscription (marquer comme complétée, etc.)"""
    enrollment = db.query(TrainingEnrollment).filter(
        TrainingEnrollment.id == enrollment_id
    ).options(
        joinedload(TrainingEnrollment.training)
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")

    # Vérifier que c'est bien l'employé concerné ou un manager/RH
    employee = db.query(Employee).filter(Employee.id == enrollment.employee_id).first()
    if current_user.id != employee.user_id and current_user.role.value not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(status_code=403, detail="Non autorisé")

    if "status" in updates:
        enrollment.status = updates["status"]
    if "score" in updates:
        enrollment.score = updates["score"]
    if "completed_at" in updates and updates["status"] == "COMPLETED":
        enrollment.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(enrollment)
    db.refresh(enrollment, ["training"])
    return enrollment
