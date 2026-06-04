from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ..core.database import get_db
from ..models.job_standard import JobStandard
from ..models.skill import Skill
from pydantic import BaseModel

router = APIRouter()

class SkillSchema(BaseModel):
    id: int
    name: str
    category: str
    rome_code: Optional[str]

    class Config:
        from_attributes = True

class JobStandardSchema(BaseModel):
    id: int
    title: str
    rome_code: str
    description: Optional[str]
    category: Optional[str]

    class Config:
        from_attributes = True

@router.get("/jobs", response_model=List[JobStandardSchema])
async def get_job_standards(
    q: Optional[str] = Query(None, description="Recherche par titre ou code ROME"),
    db: Session = Depends(get_db)
):
    """Récupère la liste des métiers (Fiches ROME)."""
    query = db.query(JobStandard)
    if q:
        query = query.filter(
            (JobStandard.title.ilike(f"%{q}%")) | 
            (JobStandard.rome_code.ilike(f"%{q}%"))
        )
    return query.limit(20).all()

@router.get("/skills", response_model=List[SkillSchema])
async def get_skills_catalog(
    q: Optional[str] = Query(None, description="Recherche par nom ou catégorie"),
    db: Session = Depends(get_db)
):
    """Récupère la liste des compétences du catalogue."""
    query = db.query(Skill)
    if q:
        query = query.filter(
            (Skill.name.ilike(f"%{q}%")) | 
            (Skill.category.ilike(f"%{q}%"))
        )
    return query.limit(50).all()
