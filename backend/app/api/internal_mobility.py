from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..core.database import get_db
from ..models.internal_hr import InternalPosition, InternalApplication, InternalApplicationStatus, InternalPositionRequirement
from ..models.employee import Employee, EmployeeSkill
from ..models.skill import Skill
from ..models.user import User
from .auth import get_current_user

router = APIRouter(prefix="/internal-mobility", tags=["Internal Mobility"])


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class SkillRequirementResponse(BaseModel):
    skill_id: int
    skill_name: Optional[str] = None
    required_level: int
    is_mandatory: bool

    class Config:
        from_attributes = True


class InternalPositionResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    status: str
    posted_by: Optional[int] = None
    posted_at: datetime
    requirements: List[SkillRequirementResponse] = []

    class Config:
        from_attributes = True


class InternalApplicationResponse(BaseModel):
    id: int
    position_id: int
    employee_id: int
    status: str
    motivation_letter: Optional[str] = None
    applied_at: datetime
    updated_at: datetime
    position: Optional[InternalPositionResponse] = None

    class Config:
        from_attributes = True


class InternalApplicationCreate(BaseModel):
    position_id: int
    motivation_letter: Optional[str] = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/positions", response_model=List[InternalPositionResponse])
async def get_internal_positions(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lister les postes internes disponibles"""
    from ..models.recruiter import Recruiter

    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=403, detail="Profil recruteur non trouvé")

    query = db.query(InternalPosition).options(
        joinedload(InternalPosition.requirements).joinedload(InternalPositionRequirement.skill)
    ).filter(InternalPosition.company_id == recruiter.company_id)

    if status:
        query = query.filter(InternalPosition.status == status)
    else:
        query = query.filter(InternalPosition.status == "OPEN")

    positions = query.offset(skip).limit(limit).all()
    return positions


@router.get("/positions/{position_id}", response_model=InternalPositionResponse)
async def get_internal_position(
    position_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Détails d'un poste interne"""
    from ..models.recruiter import Recruiter

    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=403, detail="Profil recruteur non trouvé")

    position = db.query(InternalPosition).options(
        joinedload(InternalPosition.requirements).joinedload(InternalPositionRequirement.skill)
    ).filter(
        InternalPosition.id == position_id,
        InternalPosition.company_id == recruiter.company_id
    ).first()

    if not position:
        raise HTTPException(status_code=404, detail="Poste non trouvé")

    return position


@router.get("/my-applications", response_model=List[InternalApplicationResponse])
async def get_my_internal_applications(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer mes candidatures internes"""
    if current_user.role.value != "EMPLOYEE":
        raise HTTPException(
            status_code=403,
            detail="Cet endpoint est réservé aux employés"
        )

    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Profil employé non trouvé")

    query = db.query(InternalApplication).options(
        joinedload(InternalApplication.position).joinedload(InternalPosition.requirements)
    ).filter(InternalApplication.employee_id == employee.id)

    if status:
        query = query.filter(InternalApplication.status == status)

    return query.all()


@router.post("/applications", response_model=InternalApplicationResponse)
async def create_internal_application(
    application: InternalApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Postuler à un poste interne"""
    if current_user.role.value != "EMPLOYEE":
        raise HTTPException(
            status_code=403,
            detail="Cet endpoint est réservé aux employés"
        )

    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Profil employé non trouvé")

    # Vérifier que le poste existe et est ouvert
    position = db.query(InternalPosition).filter(
        InternalPosition.id == application.position_id,
        InternalPosition.status == "OPEN"
    ).first()
    if not position:
        raise HTTPException(status_code=404, detail="Poste non disponible")

    # Vérifier qu'on n'a pas déjà postulé
    existing = db.query(InternalApplication).filter(
        InternalApplication.employee_id == employee.id,
        InternalApplication.position_id == application.position_id,
        InternalApplication.status.in_(["PENDING", "REVIEWING", "INTERVIEW"])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà postulé à ce poste")

    db_application = InternalApplication(
        employee_id=employee.id,
        position_id=application.position_id,
        motivation_letter=application.motivation_letter,
        status=InternalApplicationStatus.PENDING
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    db.refresh(db_application, ["position"])

    return db_application


@router.patch("/applications/{application_id}", response_model=InternalApplicationResponse)
async def update_internal_application(
    application_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modifier sa candidature (ex: motivation_letter)"""
    if current_user.role.value != "EMPLOYEE":
        raise HTTPException(
            status_code=403,
            detail="Cet endpoint est réservé aux employés"
        )

    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Profil employé non trouvé")

    app = db.query(InternalApplication).filter(
        InternalApplication.id == application_id,
        InternalApplication.employee_id == employee.id
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")

    if "motivation_letter" in updates:
        app.motivation_letter = updates["motivation_letter"]

    db.commit()
    db.refresh(app)
    db.refresh(app, ["position"])
    return app


@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_internal_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Annuler sa candidature"""
    if current_user.role.value != "EMPLOYEE":
        raise HTTPException(
            status_code=403,
            detail="Cet endpoint est réservé aux employés"
        )

    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Profil employé non trouvé")

    app = db.query(InternalApplication).filter(
        InternalApplication.id == application_id,
        InternalApplication.employee_id == employee.id,
        InternalApplication.status.in_(["PENDING", "REVIEWING"])
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Candidature non trouvée ou ne peut pas être annulée")

    db.delete(app)
    db.commit()
