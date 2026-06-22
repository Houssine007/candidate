from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr
import shutil
import os

from ..core.database import get_db
from ..models.candidate import Candidate
from ..models.user import User
from .auth import get_current_user
from ..models.candidate import CandidateSkill
from ..models.skill import Skill
from pydantic import field_validator, model_validator
from app.models.application import Application
from ..models.job import Job, JobRequirement
from ..services.matching import discover_top_talents, calculate_match_score
from ..services.cv_service import extract_text_from_pdf, parse_cv_with_ai

class SkillRequirement(BaseModel):
    skill_id: int
    required_level: int
    is_mandatory: bool = True

class DiscoveryRequest(BaseModel):
    requirements: List[SkillRequirement]
    limit: Optional[int] = 10

class DiscoveryMatch(BaseModel):
    candidate_id: int
    full_name: str
    score: float
    gaps: List[dict]





router = APIRouter()

# Modèles Pydantic

class ParseTextRequest(BaseModel):
    text: str
    context: Optional[str] = "experience"  # "experience" | "project" | "cv"

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
    phone: Optional[str] = None
    years_of_experience: float
    education_level: int
    bio: Optional[str] = None
    cv_text: Optional[str] = None
    formations: Optional[str] = None
    certifications: Optional[str] = None
    experience_detail: Optional[str] = None
    is_active: bool = True
    is_visible: bool = True
    skills: List[SkillLevel] = []
    job_title: Optional[str] = None
    location: Optional[str] = None
    remote_ok: Optional[bool] = False
    photo_url: Optional[str] = None
    links: Optional[dict] = None
    projects: Optional[list] = None

class CandidateCreate(CandidateBase):
    years_of_experience: Optional[float] = None
    education_level: Optional[int] = None
    onboarding_step: Optional[int] = None
    skills: List[SkillLevel] = []

class CandidateUpdate(CandidateBase):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_visible: Optional[bool] = None
    phone: Optional[str] = None
    skills: List[SkillLevel] = []
    years_of_experience: Optional[float] = None
    education_level: Optional[int] = None




class CandidateResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str]
    years_of_experience: Optional[float]
    education_level: Optional[int]
    bio: Optional[str]
    cv_text: Optional[str]
    formations: Optional[str] = None
    certifications: Optional[str] = None
    experience_detail: Optional[str] = None
    cv_url: Optional[str] = None
    onboarding_step: int = 1
    is_active: bool = True
    is_visible: bool = True
    skills: List[dict]  # Custom dict pour inclure name
    
    job_title: Optional[str] = None
    location: Optional[str] = None
    remote_ok: Optional[bool] = False
    photo_url: Optional[str] = None
    links: Optional[dict] = None
    projects: Optional[list] = None
    profile_completeness_score: Optional[float] = 0.0

    # Matching specific
    match_score: Optional[float] = None
    match_details: Optional[Any] = None
    current_status: Optional[str] = None
    application_id: Optional[int] = None

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
            bio=obj.bio,
            cv_text=obj.cv_text,
            cv_url=obj.cv_url,
            onboarding_step=obj.onboarding_step,
            formations=obj.formations,
            certifications=obj.certifications,
            experience_detail=obj.experience_detail,
            is_active=obj.is_active if obj.is_active is not None else True,
            is_visible=obj.is_visible if obj.is_visible is not None else True,
            skills=skills,
            job_title=obj.job_title,
            location=obj.location,
            remote_ok=obj.remote_ok if obj.remote_ok is not None else False,
            photo_url=obj.photo_url,
            links=obj.links,
            projects=obj.projects,
            profile_completeness_score=obj.profile_completeness_score if obj.profile_completeness_score is not None else 0.0,
        )



# Endpoints
@router.post("/me/parse-text")
async def parse_text_for_skills(
    req: ParseTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Parse a text with Groq to extract ROME skills and experience."""
    from ..services.cv_service import parse_text_skills
    result = await parse_text_skills(req.text, req.context)
    return result

@router.get("/me/", response_model=CandidateResponse)
async def get_my_candidate_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupère le profil du candidat actuellement connecté.
    """
    candidate = (
        db.query(Candidate)
        .options(joinedload(Candidate.skills).joinedload(CandidateSkill.skill))
        .filter(Candidate.user_id == current_user.id)
        .first()
    )

    if not candidate:
        # Création paresseuse : on crée le profil s'il n'existe pas pour éviter les 404 console
        candidate = Candidate(
            user_id=current_user.id, 
            email=current_user.email,
            first_name=current_user.full_name.split()[0] if current_user.full_name else "Candidat",
            last_name=current_user.full_name.split()[1] if (current_user.full_name and len(current_user.full_name.split()) > 1) else "Profil",
            onboarding_step=1
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)

    return CandidateResponse.from_orm(candidate)

@router.put("/me/", response_model=CandidateResponse)
async def update_my_candidate_profile(
    candidate_in: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Met à jour ou crée le profil du candidat actuellement connecté.
    """
    db_candidate = (
        db.query(Candidate)
        .options(joinedload(Candidate.skills).joinedload(CandidateSkill.skill))
        .filter(Candidate.user_id == current_user.id)
        .first()
    )

    if not db_candidate:
        # Créer le profil s'il n'existe pas (Onboarding)
        db_candidate = Candidate(
            user_id=current_user.id,
            email=current_user.email,
            first_name=current_user.full_name.split()[0] if current_user.full_name else "Candidate",
            last_name=" ".join(current_user.full_name.split()[1:]) if current_user.full_name and len(current_user.full_name.split()) > 1 else ""
        )
        db.add(db_candidate)
        db.flush()

    update_data = candidate_in.model_dump(exclude_unset=True)
    
    # On interdit au candidat de changer son email ou son statut actif/visible via cet endpoint 
    # pour garder le contrôle (ou on laisse s'il veut être invisible)
    # Pour l'instant on laisse is_visible car c'est utile.
    
    simple_fields = {k: v for k, v in update_data.items() if k != "skills"}
    for key, value in simple_fields.items():
        setattr(db_candidate, key, value)

    if "skills" in update_data:
        # Supprimer les anciennes relations
        db.query(CandidateSkill).filter(
            CandidateSkill.candidate_id == db_candidate.id
        ).delete()
        db.flush()

        skill_inputs = update_data["skills"]
        for s in skill_inputs:
            skill_id = s.get("skill_id")
            name = s.get("name")
            
            if skill_id:
                db_skill = db.query(Skill).filter(Skill.id == skill_id).first()
            elif name:
                db_skill = db.query(Skill).filter(Skill.name == name).first()
                if not db_skill:
                    db_skill = Skill(name=name, category="default")
                    db.add(db_skill)
                    db.flush()
            else: continue

            if db_skill:
                db_skill_link = CandidateSkill(
                    candidate_id=db_candidate.id,
                    skill_id=db_skill.id,
                    level=s.get("level"),
                    years_experience=s.get("years_experience")
                )
                db.add(db_skill_link)

    db.commit()
    db.refresh(db_candidate)
    return CandidateResponse.from_orm(db_candidate)

@router.patch("/me/onboarding/", response_model=CandidateResponse)
async def update_onboarding_progress(
    candidate_in: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sauvegarde progressive du profil pendant l'onboarding.
    """
    db_candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not db_candidate:
        db_candidate = Candidate(user_id=current_user.id, email=current_user.email,
                                 first_name=current_user.full_name.split()[0] if current_user.full_name else "Candidate")
        db.add(db_candidate)
        db.flush()

    update_data = candidate_in.model_dump(exclude_unset=True)
    
    # Mise à jour des champs simples (y compris onboarding_step)
    for key, value in update_data.items():
        if key != "skills":
            setattr(db_candidate, key, value)

    # Mise à jour des skills si présentes
    if "skills" in update_data:
        # On ajoute les skills sans forcément supprimer les anciennes pour l'onboarding 
        # (Ou on remplace, selon la logique désirée. Ici on remplace pour éviter les doublons).
        db.query(CandidateSkill).filter(CandidateSkill.candidate_id == db_candidate.id).delete()
        for s in update_data["skills"]:
            db_skill = db.query(Skill).filter(
                (Skill.id == s.get("skill_id")) | (Skill.name == s.get("name"))
            ).first()
            if not db_skill and s.get("name"):
                db_skill = Skill(name=s.get("name"), category="default")
                db.add(db_skill)
                db.flush()
            
            if db_skill:
                db.add(CandidateSkill(
                    candidate_id=db_candidate.id,
                    skill_id=db_skill.id,
                    level=s.get("level"),
                    years_experience=s.get("years_experience")
                ))

    from ..services.completeness import calculate_completeness_score
    db_candidate.profile_completeness_score = calculate_completeness_score(db_candidate)

    db.commit()
    db.refresh(db_candidate)
    return CandidateResponse.from_orm(db_candidate)

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
        education_level=candidate.education_level,
        bio=candidate.bio,
        cv_text=candidate.cv_text,
        formations=candidate.formations,
        certifications=candidate.certifications,
        experience_detail=candidate.experience_detail,
        is_active=candidate.is_active,
        is_visible=candidate.is_visible
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

    
@router.post("/me/cv/", response_model=CandidateResponse)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uploader un CV PDF, extraire son texte et l'analyser avec l'IA.
    """
    if current_user.role != "CANDIDATE":
        raise HTTPException(status_code=403, detail="Seuls les candidats peuvent uploader un CV")

    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Profil candidat non trouvé")

    # Créer le répertoire si nécessaire
    upload_dir = "uploads/cvs"
    os.makedirs(upload_dir, exist_ok=True)

    # Sauvegarder le fichier
    file_ext = os.path.splitext(file.filename)[1]
    if file_ext.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")

    file_path = os.path.join(upload_dir, f"cv_{candidate.id}{file_ext}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Mettre à jour l'URL du CV
    candidate.cv_url = file_path

    # Extraction et Analyse
    raw_text = extract_text_from_pdf(file_path)
    if raw_text:
        candidate.cv_text = raw_text
        # Analyse IA (en asynchrone idéalement, mais ici on attend pour l'exemple)
        ai_data = await parse_cv_with_ai(raw_text)
        
        if ai_data:
            # Injecter les données extraites (écrasement intelligent ou partiel)
            if ai_data.get("bio_summary"):
                candidate.bio = ai_data.get("bio_summary")
            if ai_data.get("experience_detail"):
                candidate.experience_detail = ai_data.get("experience_detail")
            if ai_data.get("years_of_experience"):
                candidate.years_of_experience = float(ai_data.get("years_of_experience"))
            if ai_data.get("education_level"):
                candidate.education_level = int(ai_data.get("education_level"))
            if ai_data.get("formations"):
                candidate.formations = ai_data.get("formations")
            if ai_data.get("certifications"):
                candidate.certifications = ai_data.get("certifications")
            
            # --- Nouveau : Mapper les skills extraits vers CandidateSkill ---
            extracted_skills = ai_data.get("skills", [])
            if extracted_skills:
                # Supprimer les anciens skills si on veut repartir d'une base propre suite au CV
                db.query(CandidateSkill).filter(CandidateSkill.candidate_id == candidate.id).delete()
                
                for s_data in extracted_skills:
                    name = s_data.get("name")
                    if not name: continue
                    
                    # Trouver ou créer le skill dans le référentiel
                    db_skill = db.query(Skill).filter(Skill.name.ilike(name)).first()
                    if not db_skill:
                        db_skill = Skill(name=name, category="extracted")
                        db.add(db_skill)
                        db.flush()
                    
                    # Lier au candidat
                    db.add(CandidateSkill(
                        candidate_id=candidate.id,
                        skill_id=db_skill.id,
                        level=s_data.get("level", 1),
                        years_experience=s_data.get("years_experience", 0.0)
                    ))

    db.commit()
    db.refresh(candidate)
    
    return CandidateResponse.from_orm(candidate)

@router.get("/me/profile-analysis")
async def get_profile_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyse le profil du candidat et propose des suggestions d'évolution par domaine métier.
    La liaison interne par code ROME est transparente : le candidat ne voit que des libellés.
    """
    candidate = (
        db.query(Candidate)
        .options(joinedload(Candidate.skills).joinedload(CandidateSkill.skill))
        .filter(Candidate.user_id == current_user.id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Profil candidat non trouvé")

    from ..services.profile_analysis import analyse_profile
    result = await analyse_profile(candidate, db)
    return result


@router.get("/{candidate_id}/", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: int,
    job_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupère un candidat par son ID.
    Si job_id est fourni, calcule le score de matching et récupère le statut de la candidature.
    """
    # Vérification des permissions
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas les droits pour voir ce candidat"
        )

    try:
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
            print(f"❌ Candidat {candidate_id} non trouvé")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidat non trouvé"
            )

        print(f"✅ Candidat {candidate_id} récupéré: {candidate.first_name} {candidate.last_name}")
        
        response = CandidateResponse.from_orm(candidate)
        
        if job_id:
            # 1. Calcul du Matching Score
            job = db.query(Job).options(
                joinedload(Job.requirements).joinedload(JobRequirement.skill)
            ).filter(Job.id == job_id).first()
            
            if job:
                # Injecter skill_name pour le matcher
                for req in job.requirements:
                    req.skill_name = req.skill.name if req.skill else f"Skill #{req.skill_id}"
                
                match_data = calculate_match_score(candidate, job)
                response.match_score = match_data["total_score"]
                response.match_details = match_data

            # 2. Récupération du Statut actuel
            app = db.query(Application).filter(
                Application.candidate_id == candidate_id,
                Application.job_id == job_id
            ).first()
            if app:
                response.current_status = app.status
                response.application_id = app.id

        return response
    except Exception as e:
        print(f"🔥 Erreur fatale lors de la récupération du candidat {candidate_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{candidate_id}/", response_model=CandidateResponse)
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



@router.delete("/{candidate_id}/", status_code=status.HTTP_204_NO_CONTENT)
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


@router.post("/discover", response_model=List[DiscoveryMatch])
async def discover_candidates(
    request: DiscoveryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Détecte les meilleurs talents pour un profil cible (referentielle), même sans offre.
    Utile pour la "chasse de tête" proactive ou la planification de besoins futurs.
    """
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(status_code=403, detail="Accès refusé")

    candidates = db.query(Candidate).filter(
        Candidate.is_visible == True,
        Candidate.is_active == True
    ).options(
        joinedload(Candidate.skills)
    ).all()
    
    # Convertir les requirements Pydantic en dict pour le service
    req_data = [req.model_dump() for req in request.requirements]
    
    matches = discover_top_talents(req_data, candidates, limit=request.limit)
    
    return matches

