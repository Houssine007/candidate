from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

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
    Appelé par le LMS quand un employé complète un cours.
    Met à jour le niveau de compétence de l'employé dans PostgreSQL.
    """
    # Seul un service interne (ADMIN) ou l'employé lui-même peut appeler ce bridge
    if current_user.role not in [UserRole.ADMIN] and current_user.id != payload.employee_id:
        raise HTTPException(status_code=403, detail="Non autorisé")

    # Trouver le profil candidat lié à cet employé
    candidate = db.query(Candidate).filter(Candidate.user_id == payload.employee_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Profil employé non trouvé")

    # Mettre à jour ou créer la compétence
    existing_skill = db.query(CandidateSkill).filter(
        CandidateSkill.candidate_id == candidate.id,
        CandidateSkill.skill_id == payload.skill_id
    ).first()

    if existing_skill:
        # Ne diminue pas le niveau si déjà supérieur
        if payload.skill_level > existing_skill.level:
            existing_skill.level = payload.skill_level
    else:
        new_skill = CandidateSkill(
            candidate_id=candidate.id,
            skill_id=payload.skill_id,
            level=payload.skill_level,
            years_experience=0
        )
        db.add(new_skill)

    db.commit()

    return {
        "status": "updated",
        "employee_id": payload.employee_id,
        "skill_id": payload.skill_id,
        "skill_level": payload.skill_level,
        "message": f"Compétence mise à jour avec succès"
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
    token = db.execute(
        "SELECT access_token FROM user_tokens WHERE user_id = :id LIMIT 1",
    )

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
    import jwt
    import os
    from datetime import datetime, timedelta

    secret = os.getenv("SECRET_KEY", "dev_secret_key_fixed_for_stability_change_in_prod")
    payload = {
        "sub": "0",
        "email": "service@internal",
        "full_name": "Service Account",
        "role": "ADMIN",
        "exp": datetime.utcnow() + timedelta(minutes=5)
    }
    return jwt.encode(payload, secret, algorithm="HS256")
