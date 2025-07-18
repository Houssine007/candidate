from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from ..core.database import get_db
from ..models.skill import Skill
from ..models.user import User
from .auth import get_current_user

router = APIRouter()

# Modèles Pydantic
class SkillBase(BaseModel):
    name: str
    category: str
    description: str

class SkillCreate(SkillBase):
    pass

class SkillResponse(SkillBase):
    id: int

    class Config:
        from_attributes = True

# Endpoints
@router.post("/", response_model=SkillResponse)
async def create_skill(
    skill: SkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier si l'utilisateur a les droits
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les administrateurs peuvent créer des compétences"
        )
    
    # Vérifier si la compétence existe déjà
    db_skill = db.query(Skill).filter(Skill.name == skill.name).first()
    if db_skill:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette compétence existe déjà"
        )
    
    # Créer la nouvelle compétence
    db_skill = Skill(**skill.model_dump())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill

@router.get("/", response_model=List[SkillResponse])
async def get_skills(
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Construire la requête
    query = db.query(Skill)
    if category:
        query = query.filter(Skill.category == category)
    
    skills = query.offset(skip).limit(limit).all()
    return skills

@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compétence non trouvée"
        )
    return skill

@router.put("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: int,
    skill: SkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier si l'utilisateur a les droits
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les administrateurs peuvent modifier les compétences"
        )
    
    # Récupérer la compétence
    db_skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if db_skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compétence non trouvée"
        )
    
    # Vérifier si le nouveau nom existe déjà
    if skill.name != db_skill.name:
        existing_skill = db.query(Skill).filter(Skill.name == skill.name).first()
        if existing_skill:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Une compétence avec ce nom existe déjà"
            )
    
    # Mettre à jour la compétence
    for key, value in skill.model_dump().items():
        setattr(db_skill, key, value)
    
    db.commit()
    db.refresh(db_skill)
    return db_skill

@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier si l'utilisateur a les droits
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les administrateurs peuvent supprimer des compétences"
        )
    
    # Récupérer la compétence
    db_skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if db_skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compétence non trouvée"
        )
    
    # Supprimer la compétence
    db.delete(db_skill)
    db.commit()
    return None

@router.get("/categories/", response_model=List[str])
async def get_skill_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Récupérer toutes les catégories uniques
    categories = db.query(Skill.category).distinct().all()
    return [category[0] for category in categories] 