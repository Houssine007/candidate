from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..core.database import get_db
from ..models.organization import OrgUnit
from ..models.user import User
from ..models.recruiter import Recruiter
from .auth import get_current_user
from ..core.permissions import has_permission

router = APIRouter()

# Modèles Pydantic
class OrgUnitBase(BaseModel):
    name: str
    unit_type: Optional[str] = "Département"
    description: Optional[str] = None
    parent_id: Optional[int] = None
    manager_id: Optional[int] = None

class OrgUnitCreate(OrgUnitBase):
    pass

class OrgUnitResponse(OrgUnitBase):
    id: int
    company_id: int
    
    class Config:
        from_attributes = True

# Une version avec les enfants pour l'affichage en arbre
class OrgUnitTree(OrgUnitResponse):
    children: List['OrgUnitTree'] = []

# Endpoints
@router.post("/", response_model=OrgUnitResponse, status_code=status.HTTP_201_CREATED)
async def create_org_unit(
    unit: OrgUnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("org:edit"))
):

    """Créer une nouvelle unité organisationnelle."""
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    # Récupérer l'entreprise de l'utilisateur
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=400, detail="Profil recruteur non trouvé")
    
    # Vérifier le parent si spécifié
    if unit.parent_id:
        parent = db.query(OrgUnit).filter(OrgUnit.id == unit.parent_id, OrgUnit.company_id == recruiter.company_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Unité parente non trouvée ou appartient à une autre entreprise")

    db_unit = OrgUnit(**unit.model_dump(), company_id=recruiter.company_id)
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit

@router.get("/", response_model=List[OrgUnitResponse])
async def get_org_units(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer toutes les unités de l'entreprise."""
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        return []
        
    return db.query(OrgUnit).filter(OrgUnit.company_id == recruiter.company_id).all()

@router.get("/tree", response_model=List[OrgUnitTree])
async def get_org_tree(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer la structure sous forme d'arbre."""
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        return []
    
    all_units = db.query(OrgUnit).filter(OrgUnit.company_id == recruiter.company_id).all()
    
    # Construction de l'arbre
    unit_dict = {unit.id: OrgUnitTree.model_validate(unit) for unit in all_units}
    tree = []
    
    for unit in all_units:
        if unit.parent_id and unit.parent_id in unit_dict:
            unit_dict[unit.parent_id].children.append(unit_dict[unit.id])
        else:
            tree.append(unit_dict[unit.id])
            
    return tree

@router.put("/{unit_id}", response_model=OrgUnitResponse)
async def update_org_unit(
    unit_id: int,
    unit_update: OrgUnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("org:edit"))
):

    """Modifier une unité."""
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    db_unit = db.query(OrgUnit).filter(OrgUnit.id == unit_id, OrgUnit.company_id == recruiter.company_id).first()
    
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unité non trouvée")
        
    for key, value in unit_update.model_dump().items():
        setattr(db_unit, key, value)
        
    db.commit()
    db.refresh(db_unit)
    return db_unit

@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_org_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("org:edit"))
):

    """Supprimer une unité."""
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    db_unit = db.query(OrgUnit).filter(OrgUnit.id == unit_id, OrgUnit.company_id == recruiter.company_id).first()
    
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unité non trouvée")
        
    db.delete(db_unit)
    db.commit()
    return None
