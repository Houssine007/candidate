from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ..core.database import get_db
from ..models.job_standard import JobStandard, JobStandardRequirement
from ..models.skill import Skill
from ..core.config import settings
from pydantic import BaseModel
import json

router = APIRouter()

# ─── Schemas ──────────────────────────────────────────────────────────────────

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

class SkillSuggestion(BaseModel):
    skill_id: int
    skill_name: str
    category: str
    min_level: int
    is_mandatory: bool

class JobStandardSuggestSchema(BaseModel):
    id: int
    title: str
    rome_code: str
    description: Optional[str]
    category: Optional[str]
    skills: List[SkillSuggestion] = []

    class Config:
        from_attributes = True

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/jobs/suggest", response_model=List[JobStandardSuggestSchema])
async def suggest_job_standards(
    q: str = Query("", description="Titre du poste à rechercher"),
    limit: int = Query(5),
    db: Session = Depends(get_db)
):
    """Suggestions de fiches métiers ROME avec leurs compétences associées."""
    query = db.query(JobStandard).options(
        joinedload(JobStandard.skills_requirements).joinedload(JobStandardRequirement.skill)
    )
    if q:
        query = query.filter(
            (JobStandard.title.ilike(f"%{q}%")) |
            (JobStandard.rome_code.ilike(f"%{q}%")) |
            (JobStandard.category.ilike(f"%{q}%"))
        )
    standards = query.limit(limit).all()

    result = []
    for std in standards:
        skills = []
        for req in std.skills_requirements:
            if req.skill:
                skills.append(SkillSuggestion(
                    skill_id=req.skill_id,
                    skill_name=req.skill.name,
                    category=req.skill.category,
                    min_level=req.min_level,
                    is_mandatory=req.is_mandatory
                ))
        result.append(JobStandardSuggestSchema(
            id=std.id,
            title=std.title,
            rome_code=std.rome_code,
            description=std.description,
            category=std.category,
            skills=skills
        ))
    return result

@router.get("/jobs/suggest-ai")
async def suggest_job_ai(
    q: str = Query("", description="Titre du poste"),
    db: Session = Depends(get_db)
):
    """Génère des suggestions de description et compétences via IA (Groq)."""
    from ..core.config import settings

    if not q:
        return {"description": "", "required_skills": [], "source": "empty"}

    # Try Groq AI first
    if settings.GROQ_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1"
            )
            prompt = f"""Tu es un expert RH. Pour le poste "{q}", génère en JSON :
{{
  "description": "Description professionnelle du poste en 3-4 phrases",
  "required_skills": [
    {{"name": "Nom compétence", "level": 1-4, "mandatory": true/false}}
  ]
}}
Propose 5-8 compétences pertinentes. Réponds UNIQUEMENT avec le JSON, sans markdown."""

            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=800
            )
            import json
            raw = response.choices[0].message.content.strip()
            data = json.loads(raw)

            # Match skill names to DB skills
            all_skills = db.query(Skill).all()
            skills_map = {s.name.lower(): s for s in all_skills}

            matched_skills = []
            for s in data.get("required_skills", []):
                name_lower = s["name"].lower()
                # Exact match
                db_skill = skills_map.get(name_lower)
                # Fuzzy match
                if not db_skill:
                    for skill_name, skill_obj in skills_map.items():
                        if name_lower in skill_name or skill_name in name_lower:
                            db_skill = skill_obj
                            break
                if db_skill:
                    matched_skills.append({
                        "skill_id": db_skill.id,
                        "skill_name": db_skill.name,
                        "category": db_skill.category,
                        "level": s.get("level", 2),
                        "mandatory": s.get("mandatory", True)
                    })

            return {
                "description": data.get("description", ""),
                "required_skills": matched_skills,
                "source": "groq"
            }
        except Exception as e:
            print(f"Groq AI error: {e}")

    # Fallback: use ROME data
    standards = db.query(JobStandard).options(
        joinedload(JobStandard.skills_requirements).joinedload(JobStandardRequirement.skill)
    ).filter(
        (JobStandard.title.ilike(f"%{q}%")) |
        (JobStandard.category.ilike(f"%{q}%"))
    ).first()

    if standards:
        skills = []
        for req in standards.skills_requirements:
            if req.skill:
                skills.append({
                    "skill_id": req.skill_id,
                    "skill_name": req.skill.name,
                    "category": req.skill.category,
                    "level": req.min_level,
                    "mandatory": req.is_mandatory
                })
        return {
            "description": standards.description or "",
            "required_skills": skills,
            "source": "rome"
        }

    return {"description": "", "required_skills": [], "source": "none"}


@router.get("/jobs", response_model=List[JobStandardSchema])
async def get_job_standards(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(JobStandard)
    if q:
        query = query.filter(
            (JobStandard.title.ilike(f"%{q}%")) |
            (JobStandard.rome_code.ilike(f"%{q}%"))
        )
    return query.limit(20).all()


@router.get("/skills", response_model=List[SkillSchema])
async def get_skills_catalog(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Skill)
    if q:
        query = query.filter(
            (Skill.name.ilike(f"%{q}%")) |
            (Skill.category.ilike(f"%{q}%"))
        )
    return query.limit(50).all()
