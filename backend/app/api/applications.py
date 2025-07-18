from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.application import Application, ApplicationStatus
from ..models.user import User
from .auth import get_current_user

router = APIRouter(prefix="/applications", tags=["Applications"])

# Schémas : à copier ici ou importer:
from pydantic import BaseModel
from typing import Optional
from enum import Enum

class ApplicationStatus(str, Enum):
    PENDING = "PENDING"
    REVIEWING = "REVIEWING"
    SHORTLISTED = "SHORTLISTED"
    REJECTED = "REJECTED"
    ACCEPTED = "ACCEPTED"

class ApplicationBase(BaseModel):
    candidate_id: int
    job_id: int
    status: Optional[ApplicationStatus] = ApplicationStatus.PENDING
    cover_letter: Optional[str] = None
    is_active: Optional[bool] = True

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    cover_letter: Optional[str] = None
    is_active: Optional[bool] = None

class ApplicationResponse(ApplicationBase):
    id: int

    class Config:
        from_attributes = True




@router.post("/", response_model=ApplicationResponse)
async def create_application(app: ApplicationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_app = Application(**app.model_dump())
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.get("/", response_model=list[ApplicationResponse])
async def get_applications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    apps = db.query(Application).offset(skip).limit(limit).all()
    return apps

@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(app_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")
    return app

@router.patch("/{app_id}", response_model=ApplicationResponse)
async def update_application(app_id: int, app_data: ApplicationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")

    update_data = app_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(app, key, value)

    db.commit()
    db.refresh(app)
    return app

@router.delete("/{app_id}")
async def delete_application(app_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")

    db.delete(app)
    db.commit()
    return {"detail": "Candidature supprimée"}
