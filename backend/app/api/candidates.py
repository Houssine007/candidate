from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from ..core.database import get_db
from ..models.candidate import Candidate
from ..models.user import User
from .auth import get_current_user
from ..models.candidate import CandidateSkill
from ..models.skill import Skill
from pydantic import field_validator, model_validator
from app.models.application import Application




router = APIRouter()

# Modèles Pydantic

class SkillLevel(BaseModel):
    skill_id: Optional[int] = None  # Optionnel si name fourni
    name: Optional[str] = None      # Alternative à id
    level: int
    years_experience: float

    @field_validator('level')
    @classmethod
    def validate_level(cls, v: int) -> int:
        if not 1 <= v <= 4:
            raise ValueError('Level must be between 1 and 4')
        return v

    @field_validator('years_experience')
    @classmethod
    def validate_years(cls, v: float) -> float:
        if v < 0:
            raise ValueError('Years experience must be >= 0')
        return v

    # Require either id or name
    @model_validator(mode='after')
    def check_id_or_name(self):
        if self.skill_id is None and self.name is None:
            raise ValueError('Either skill_id or name must be provided')
        return self    

class CandidateBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    years_of_experience: float
    education_level: int
    skills: List[SkillLevel] = []

class CandidateCreate(CandidateBase):
    years_of_experience: Optional[float] = None
    education_level: Optional[int] = None
    skills: List[SkillLevel] = []

class CandidateUpdate(CandidateBase):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    skills: List[SkillLevel] = []
    years_of_experience: Optional[float] = None
    education_level: Optional[int] = None




class CandidateResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    years_of_experience: Optional[float]
    education_level: Optional[int]
    skills: List[dict]  # Custom dict pour inclure name

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj: Candidate):
        # Load relations eagerly if not already
        skills = [
            {
                "skill_id": cs.skill_id,
                "name": cs.skill.name,  # Fetch from related Skill
                "level": cs.level,
                "years_experience": cs.years_experience
            }
            for cs in obj.skills
        ]
        return cls(
            id=obj.id,
            first_name=obj.first_name,
            last_name=obj.last_name,
            email=obj.email,
            phone=obj.phone,
            years_of_experience=obj.years_of_experience,
            education_level=obj.education_level,
            skills=skills
        )



# Endpoints
@router.post("/", response_model=CandidateResponse)
async def create_candidate(
    candidate: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(status_code=403, detail="Pas les droits")

    existing = db.query(Candidate).filter(Candidate.email == candidate.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Candidat existe déjà")

    db_candidate = Candidate(
        first_name=candidate.first_name,
        last_name=candidate.last_name,
        email=candidate.email,
        phone=candidate.phone,
        user_id=current_user.id,
        years_of_experience=candidate.years_of_experience,
        education_level=candidate.education_level
    )
    db.add(db_candidate)
    db.flush()  # Flush pour get id sans commit yet

    # Skills handling avec batch query pour perf
    skill_names = [s.name for s in candidate.skills if s.name]
    skill_ids = [s.skill_id for s in candidate.skills if s.skill_id]
    
    # Fetch existants en batch
    existing_skills_by_id = {s.id: s for s in db.query(Skill).filter(Skill.id.in_(skill_ids)).all()}
    existing_skills_by_name = {s.name: s for s in db.query(Skill).filter(Skill.name.in_(skill_names)).all()}

    for s in candidate.skills:
        if s.skill_id:
            db_skill = existing_skills_by_id.get(s.skill_id)
        elif s.name:
            db_skill = existing_skills_by_name.get(s.name)
            if not db_skill:
                # Créer si missing (optionnel : si admin only, raise 404)
                db_skill = Skill(name=s.name, category="default")  # Ajoute category/desc si besoin
                db.add(db_skill)
                db.flush()
        
        if not db_skill:
            raise HTTPException(status_code=404, detail=f"Skill {s.skill_id or s.name} n'existe pas")

        db_skill_link = CandidateSkill(
            candidate_id=db_candidate.id,
            skill_id=db_skill.id,
            level=s.level,
            years_experience=s.years_experience
        )
        db.add(db_skill_link)

    db.commit()
    db.refresh(db_candidate)
    return CandidateResponse.from_orm(db_candidate)


@router.get("/", response_model=list[CandidateResponse])
async def get_candidates(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier les permissions
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas les droits pour voir les candidats"
        )

    # Charger candidates + skills + skill details (Eager load)
    candidates = (
        db.query(Candidate)
        .options(
            joinedload(Candidate.skills).joinedload(CandidateSkill.skill)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Mapping pour éviter erreurs ORM/Pydantic
    return [CandidateResponse.from_orm(c) for c in candidates]

    
@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérification des permissions
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas les droits pour voir ce candidat"
        )

    # Eager loading : Candidate → CandidateSkill → Skill
    candidate = (
        db.query(Candidate)
        .options(
            joinedload(Candidate.skills).joinedload(CandidateSkill.skill)
        )
        .filter(Candidate.id == candidate_id)
        .first()
    )

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidat non trouvé"
        )

    return CandidateResponse.from_orm(candidate)

@router.put("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    candidate_id: int,
    candidate: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier permissions
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas les droits pour modifier les candidats"
        )

    # Récupérer candidat + skills existants
    db_candidate = (
        db.query(Candidate)
        .options(joinedload(Candidate.skills).joinedload(CandidateSkill.skill))
        .filter(Candidate.id == candidate_id)
        .first()
    )

    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidat non trouvé"
        )

    # --- Mise à jour des champs simples ---
    update_data = candidate.model_dump(exclude_unset=True)
    simple_fields = {k: v for k, v in update_data.items() if k != "skills"}

    for key, value in simple_fields.items():
        setattr(db_candidate, key, value)

    # --- Mise à jour des skills ---
    if "skills" in update_data:   # <-- CORRECTEMENT INDENTÉ ICI

        # Supprimer les anciennes relations
        db.query(CandidateSkill).filter(
            CandidateSkill.candidate_id == candidate_id
        ).delete()

        db.flush()

        skill_inputs = update_data["skills"]

        skill_names = [s.get("name") for s in skill_inputs if s.get("name")]
        skill_ids = [s.get("skill_id") for s in skill_inputs if s.get("skill_id")]

        # Charger skills existants
        existing_by_id = {
            s.id: s for s in db.query(Skill).filter(Skill.id.in_(skill_ids)).all()
        }
        existing_by_name = {
            s.name: s for s in db.query(Skill).filter(Skill.name.in_(skill_names)).all()
        }

        for s in skill_inputs:

            skill_id = s.get("skill_id")
            name = s.get("name")

            # Trouver ou créer skill
            if skill_id:
                db_skill = existing_by_id.get(skill_id)
            elif name:
                db_skill = existing_by_name.get(name)
                if not db_skill:
                    db_skill = Skill(name=name, category="default")
                    db.add(db_skill)
                    db.flush()
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Chaque skill doit avoir 'skill_id' ou 'name'"
                )

            # Créer lien CandidateSkill
            db_skill_link = CandidateSkill(
                candidate_id=candidate_id,
                skill_id=db_skill.id,
                level=s.get("level"),
                years_experience=s.get("years_experience")
            )
            db.add(db_skill_link)

    # Commit final
    db.commit()
    db.refresh(db_candidate)

    return CandidateResponse.from_orm(db_candidate)



@router.delete("/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérification permissions
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Seuls les administrateurs peuvent supprimer des candidats"
        )

    # Charger candidat + ses skills
    db_candidate = (
        db.query(Candidate)
        .options(selectinload(Candidate.skills))
        .filter(Candidate.id == candidate_id)
        .first()
    )

    if not db_candidate:
        raise HTTPException(
            status_code=404,
            detail="Candidat non trouvé"
        )

    # Supprimer les relations skills
    db.query(CandidateSkill).filter(
        CandidateSkill.candidate_id == candidate_id
    ).delete()

    db.flush()

    # Supprimer le candidat
    db.delete(db_candidate)
    db.commit()

    return None  # Pas de body pour 204HUB
