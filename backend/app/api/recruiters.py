from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.recruiter import Recruiter
from ..models.user import User
from .auth import get_current_user

router = APIRouter(prefix="/recruiters", tags=["Recruiters"])

# Schémas (les mêmes que ci-dessus)
# Copie ici directement ou garde-les si déjà dans ce fichier
from pydantic import BaseModel
from typing import Optional

class RecruiterBase(BaseModel):
    user_id: int
    company_id: int
    position: Optional[str] = None
    hiring_authority: bool
    is_active: Optional[bool] = True

class RecruiterCreate(RecruiterBase):
    pass

class RecruiterUpdate(BaseModel):
    position: Optional[str]
    hiring_authority: Optional[bool]
    is_active: Optional[bool]

class RecruiterResponse(RecruiterBase):
    id: int

    class Config:
        from_attributes = True


@router.post("/", response_model=RecruiterResponse)
async def create_recruiter(recruiter: RecruiterCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul un admin peut créer un recruteur")

    db_recruiter = Recruiter(**recruiter.model_dump())
    db.add(db_recruiter)
    db.commit()
    db.refresh(db_recruiter)
    return db_recruiter

@router.get("/{recruiter_id}", response_model=RecruiterResponse)
async def get_recruiter(recruiter_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruteur non trouvé")
    return recruiter

@router.patch("/{recruiter_id}", response_model=RecruiterResponse)
async def update_recruiter(recruiter_id: int, recruiter_data: RecruiterUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruteur non trouvé")
    
    update_data = recruiter_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(recruiter, key, value)

    db.commit()
    db.refresh(recruiter)
    return recruiter

@router.delete("/{recruiter_id}")
async def delete_recruiter(recruiter_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul un admin peut supprimer un recruteur")

    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruteur non trouvé")

    db.delete(recruiter)
    db.commit()
    return {"detail": "Recruteur supprimé"}
