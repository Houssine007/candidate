from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.user import User, UserRole
from ..core.security import hash_password  # Tu peux créer une fonction pour hasher
from .auth import get_current_user

router = APIRouter(tags=["Users"])

# Schémas à copier ici ou importer depuis schemas
from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    CANDIDATE = "CANDIDATE"
    RECRUITER = "RECRUITER"
    ADMIN = "ADMIN"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = True

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True


# Permissions Response



class UserPermissionsResponse(BaseModel):
    permissions: list[str]
    internal_role: Optional[dict] = None

    class Config:
        from_attributes = True





@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    hashed_pw = hash_password(user.password)
    db_user = User(
        email=user.email,
        full_name=user.full_name,
        password=hashed_pw,
        role=user.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/", response_model=list[UserResponse])
async def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/me/permissions", response_model=UserPermissionsResponse)
async def get_current_user_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retourne les permissions de l'utilisateur actuellement connecté"""
    from ..models.employee import Employee
    from ..models.permissions import InternalRole
    from sqlalchemy.orm import joinedload

    permissions = []
    role_data = None

    if current_user.role.value == "EMPLOYEE":
        employee = db.query(Employee).filter(
            Employee.user_id == current_user.id
        ).options(
            joinedload(Employee.internal_role).joinedload(InternalRole.permissions)
        ).first()

        if employee and employee.internal_role:
            permissions = [p.name for p in employee.internal_role.permissions]
            role_data = {
                "id": employee.internal_role.id,
                "name": employee.internal_role.name,
                "description": employee.internal_role.description,
            }

    elif current_user.role.value in ("ADMIN", "RECRUITER"):
        permissions = [
            "employees:view",
            "employees:manage",
            "recruitment:view",
            "recruitment:manage",
            "org:manage",
            "trainings:assign",
            "roles:assign"
        ]

    return {
        "permissions": permissions,
        "internal_role": role_data
    }


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Non autorisé")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Non autorisé")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user_data.password:
        user.password = hash_password(user_data.password)
    if user_data.full_name:
        user.full_name = user_data.full_name
    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    db.commit()
    db.refresh(user)
    return user

@router.patch("/{user_id}/set-instructor")
async def set_instructor(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value not in ("ADMIN", "RECRUITER"):
        raise HTTPException(status_code=403, detail="Réservé aux admins et recruteurs")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    user.is_instructor = not user.is_instructor
    db.commit()
    db.refresh(user)
    return {"id": user.id, "is_instructor": user.is_instructor}


@router.delete("/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Seul un admin peut supprimer un utilisateur")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    db.delete(user)
    db.commit()
    return {"detail": "Utilisateur supprimé"}



