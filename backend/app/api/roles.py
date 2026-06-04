from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..core.database import get_db
from ..models.permissions import InternalRole, Permission
from ..models.recruiter import Recruiter
from ..models.user import User
from .auth import get_current_user
from ..core.permissions import has_permission

router = APIRouter()

# Modèles Pydantic pour les rôles
class PermissionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: str

    class Config:
        from_attributes = True

class InternalRoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class InternalRoleCreate(InternalRoleBase):
    permission_ids: List[int] = []

class InternalRoleResponse(InternalRoleBase):
    id: int
    company_id: int
    is_system_role: bool
    permissions: List[PermissionResponse] = []

    class Config:
        from_attributes = True

# Endpoints pour les rôles
@router.get("/", response_model=List[InternalRoleResponse])
async def get_internal_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer tous les rôles internes de l'entreprise."""
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=400, detail="Profil recruteur non trouvé")
        
    return db.query(InternalRole).filter(InternalRole.company_id == recruiter.company_id).all()

# Endpoints pour les permissions (liste globale pour le sélecteur)
@router.get("/permissions", response_model=List[PermissionResponse])
async def get_all_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Liste globale des permissions disponibles."""
    return db.query(Permission).all()

@router.post("/", response_model=InternalRoleResponse)
async def create_internal_role(
    role: InternalRoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("settings:edit"))
):
    """Créer un nouveau rôle personnalisé pour l'entreprise."""
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=400, detail="Profil recruteur non trouvé")
        
    db_role = InternalRole(
        name=role.name,
        description=role.description,
        company_id=recruiter.company_id
    )
    
    if role.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(role.permission_ids)).all()
        db_role.permissions = perms
        
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role
