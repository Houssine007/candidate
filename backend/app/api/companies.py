from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.company import Company
from ..models.user import User
from .auth import get_current_user
from ..services.permissions import init_company_roles

router = APIRouter(prefix="/companies", tags=["Companies"])

# Schémas (copie-les ici ou importe-les si tu as un fichier schemas)
from pydantic import BaseModel, HttpUrl
from typing import Optional

class CompanyBase(BaseModel):
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[HttpUrl] = None
    location: Optional[str] = None
    is_active: Optional[bool] = True

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    description: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[HttpUrl] = None
    location: Optional[str] = None
    is_active: Optional[bool] = True

class CompanyResponse(CompanyBase):
    id: int

    class Config:
        from_attributes = True


@router.post("/", response_model=CompanyResponse)
async def create_company(company: CompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul un admin peut créer une entreprise")

    # Utiliser mode='json' pour sérialiser HttpUrl en string
    company_data = company.model_dump(mode='json')
    db_company = Company(**company_data)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    
    # Initialiser les rôles par défaut pour cette entreprise
    init_company_roles(db, db_company.id)
    
    return db_company

@router.get("/", response_model=list[CompanyResponse])
async def get_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    companies = db.query(Company).offset(skip).limit(limit).all()
    return companies

@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")
    return company

@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: int, company_data: CompanyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")

    update_data = company_data.model_dump(exclude_unset=True, mode='json')
    for key, value in update_data.items():
        setattr(company, key, value)

    db.commit()
    db.refresh(company)
    return company

@router.delete("/{company_id}")
async def delete_company(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul un admin peut supprimer une entreprise")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")

    db.delete(company)
    db.commit()
    return {"detail": "Entreprise supprimée"}
