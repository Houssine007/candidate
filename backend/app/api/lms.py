from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..core.config import settings
from ..core.database import get_db
from ..models.candidate import Candidate, CandidateSkill
from ..models.user import User, UserRole
from .auth import get_current_user

router = APIRouter()


class CourseCompletedPayload(BaseModel):
    employee_id: int
    course_id: str
    skill_id: int
    skill_level: int
    score: Optional[float] = None


@router.post("/course-completed")
async def lms_course_completed(
    payload: CourseCompletedPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bridge appelé par le LMS à la réussite d'un cours. Relève le niveau de la
    compétence (jamais à la baisse) dans les DEUX profils de l'utilisateur :
    son profil candidat (vivier de talents) ET son profil employé (vue
    organisation / GPEC), selon ceux qui existent. C'est ce double-écrit qui
    permet à la boucle vivante de se refléter dans la cartographie GPEC, qui
    lit les compétences employé.
    """
    from ..models.employee import Employee, EmployeeSkill

    # Seul un service interne (ADMIN) ou l'employé lui-même peut appeler ce bridge
    if current_user.role not in [UserRole.ADMIN] and current_user.id != payload.employee_id:
        raise HTTPException(status_code=403, detail="Non autorisé")

    def _raise_or_create(existing, model, owner_field: str, owner_id: int) -> str:
        """Relève le niveau (jamais à la baisse) ou crée l'entrée de compétence."""
        if existing:
            if payload.skill_level > (existing.level or 0):
                existing.level = payload.skill_level
                return "relevé"
            return "inchangé"
        db.add(model(**{owner_field: owner_id, "skill_id": payload.skill_id, "level": payload.skill_level}))
        return "créé"

    updated: list[str] = []

    # ── Profil candidat (vivier global) ──
    candidate = db.query(Candidate).filter(Candidate.user_id == payload.employee_id).first()
    if candidate:
        existing = db.query(CandidateSkill).filter(
            CandidateSkill.candidate_id == candidate.id,
            CandidateSkill.skill_id == payload.skill_id,
        ).first()
        updated.append(f"candidat:{_raise_or_create(existing, CandidateSkill, 'candidate_id', candidate.id)}")

    # ── Profil(s) employé (vue organisation / GPEC) ──
    employees = db.query(Employee).filter(Employee.user_id == payload.employee_id).all()
    for emp in employees:
        existing = db.query(EmployeeSkill).filter(
            EmployeeSkill.employee_id == emp.id,
            EmployeeSkill.skill_id == payload.skill_id,
        ).first()
        updated.append(f"employe#{emp.id}:{_raise_or_create(existing, EmployeeSkill, 'employee_id', emp.id)}")

    if not candidate and not employees:
        raise HTTPException(status_code=404, detail="Aucun profil (candidat/employé) trouvé pour cet utilisateur")

    db.commit()

    return {
        "status": "updated",
        "employee_id": payload.employee_id,
        "skill_id": payload.skill_id,
        "skill_level": payload.skill_level,
        "profiles": updated,
        "message": "Compétence mise à jour (profils candidat + employé)",
    }


@router.get("/courses")
async def get_lms_courses_for_employee(
    skill_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retourne la liste des cours LMS disponibles, optionnellement filtrés par compétence.
    Proxy vers le LMS — utile pour le frontend RH.
    """
    import httpx
    import os

    LMS_URL = os.getenv("LMS_API_URL", "http://localhost:3001")
    params = {}
    if skill_id:
        params["skillId"] = skill_id

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{LMS_URL}/api/courses", params=params, timeout=5.0)
            return resp.json()
    except Exception:
        return []


@router.get("/enrollments")
async def get_enrollments_proxy(
    employeeId: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Proxy vers le LMS pour lister les enrollments d'un employé."""
    import httpx, os
    LMS_URL = os.getenv("LMS_API_URL", "http://localhost:3001")
    params = {}
    if employeeId:
        params["employeeId"] = employeeId
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{LMS_URL}/api/enrollments",
                params=params,
                headers={"Authorization": f"Bearer {_get_service_token()}"},
                timeout=5.0
            )
            return resp.json()
    except Exception:
        return []






@router.post("/enroll")
async def assign_course_to_employee(
    employee_id: int,
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Le RH assigne un cours LMS à un employé depuis la plateforme RH.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        raise HTTPException(status_code=403, detail="Non autorisé")

    import httpx
    import os

    LMS_URL = os.getenv("LMS_API_URL", "http://localhost:3001")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{LMS_URL}/api/enrollments",
                json={"employeeId": employee_id, "courseId": course_id},
                headers={"Authorization": f"Bearer {_get_service_token()}"},
                timeout=5.0
            )
            if resp.status_code == 409:
                raise HTTPException(status_code=409, detail="Employé déjà inscrit à ce cours")
            resp.raise_for_status()
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LMS non accessible: {str(e)}")


def _get_service_token() -> str:
    """Génère un token de service pour les appels internes LMS ↔ RH."""
    from jose import jwt
    from datetime import datetime, timedelta

    secret = settings.SECRET_KEY
    payload = {
        "sub": "0",
        "email": "service@internal",
        "full_name": "Service Account",
        "role": "ADMIN",
        "exp": datetime.utcnow() + timedelta(minutes=5)
    }
    return jwt.encode(payload, secret, algorithm="HS256")
