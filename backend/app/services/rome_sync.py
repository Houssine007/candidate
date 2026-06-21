"""
Phase 0 — Auto-alimentation du référentiel de compétences cibles depuis ROME.

L'API ROME décrit chaque métier par des SAVOIR-FAIRE en langage naturel
(ex. « Concevoir une application web »), pas par des compétences atomiques
(ex. « Python »). On utilise donc le LLM en INGESTION (cartographie sémantique)
pour traduire les savoir-faire ROME → compétences de NOTRE référentiel, en
restant strictement borné aux compétences existantes (aucune invention).

Repli sans LLM : matching textuel (un nom de compétence apparaissant dans une
phrase ROME). Faible rendement mais honnête et déterministe.

NB : les `competencesMobiliseesEmergentes` sont souvent vides côté France Travail
pour les métiers IT — on les remonte quand elles existent, sans rien inventer.
"""
import json
import re
from typing import Optional

from sqlalchemy.orm import Session

from ..core.config import settings
from ..models.skill import Skill
from ..models.job_standard import JobStandard, JobStandardRequirement
from .rome_api import fetch_metier_competences


def _parse_json(text: str) -> dict:
    text = (text or "").strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        text = m.group(0)
    return json.loads(text)


def _resolve(name: str, by_lower: dict) -> Optional[Skill]:
    """Nom LLM → Skill du référentiel (exact, puis inclusion)."""
    if not name:
        return None
    n = name.strip().lower()
    if n in by_lower:
        return by_lower[n]
    for k, s in by_lower.items():
        if n == k or n in k or k in n:
            return s
    return None


def propose_from_rome(db: Session, rome_code: str) -> dict:
    """Propose un profil de compétences cibles dérivé de ROME (sans persister)."""
    comp = fetch_metier_competences(rome_code)
    if not comp:
        return {"available": False, "rome_code": rome_code,
                "reason": "ROME indisponible ou code métier inconnu."}

    skills = db.query(Skill).all()
    names = sorted({s.name for s in skills})
    by_lower = {s.name.lower(): s for s in skills}

    core: list = []
    emerging: list = []
    seen: set = set()
    source = "fallback"

    def _add(bucket, skill: Skill, level: int):
        if skill and skill.id not in seen:
            seen.add(skill.id)
            bucket.append({"skill_id": skill.id, "skill": skill.name, "level": max(1, min(4, level))})

    if settings.GROQ_API_KEY and comp["principales"]:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.GROQ_API_KEY,
                            base_url="https://api.groq.com/openai/v1")
            emj = "\n".join("- " + e for e in comp["emergentes"]) or "(aucune fournie par ROME)"
            prompt = (
                f'Métier ROME : "{comp["libelle"]}".\n\n'
                "Savoir-faire ROME mobilisés (cœur du métier) :\n"
                + "\n".join("- " + p for p in comp["principales"]) + "\n\n"
                "Compétences émergentes ROME :\n" + emj + "\n\n"
                "Référentiel de compétences techniques disponibles "
                "(tu DOIS choisir uniquement dans cette liste, noms EXACTS) :\n"
                + ", ".join(names) + "\n\n"
                "Tâche : sélectionne dans le RÉFÉRENTIEL les compétences qui composent le cœur "
                "de ce métier (8 maximum), avec un niveau cible de 1 à 4, et celles correspondant "
                "aux compétences émergentes s'il y en a. N'invente aucun nom.\n"
                'Réponds UNIQUEMENT en JSON : '
                '{"core":[{"skill":"<nom exact>","level":1-4}],"emerging":[{"skill":"<nom exact>","level":1-4}]}'
            )
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2, max_tokens=700,
            )
            data = _parse_json(resp.choices[0].message.content)
            for it in data.get("core", []):
                _add(core, _resolve(it.get("skill", ""), by_lower), int(it.get("level", 3)))
            for it in data.get("emerging", []):
                _add(emerging, _resolve(it.get("skill", ""), by_lower), int(it.get("level", 2)))
            source = "groq"
        except Exception as e:
            print(f"[rome_sync] LLM indisponible, repli textuel : {e}")

    if source == "fallback":
        for p in comp["principales"]:
            s = _resolve(p, by_lower)
            _add(core, s, 3)
        for e in comp["emergentes"]:
            s = _resolve(e, by_lower)
            _add(emerging, s, 2)

    return {
        "available": True,
        "rome_code": rome_code,
        "rome_libelle": comp["libelle"],
        "source": source,
        "rome_principales": comp["principales"],
        "rome_emergentes": comp["emergentes"],
        "core": core,
        "emerging": emerging,
    }


def apply_proposal(db: Session, job_standard_id: int, proposal: dict, replace: bool = True) -> int:
    """Persiste la proposition dans JobStandardRequirement. Renvoie le nb d'exigences écrites."""
    js = db.get(JobStandard, job_standard_id)
    if not js:
        raise ValueError("JobStandard introuvable")
    if replace:
        db.query(JobStandardRequirement).filter(
            JobStandardRequirement.job_standard_id == js.id).delete()
    n = 0
    written: set = set()
    for it in proposal.get("core", []):
        if it["skill_id"] in written:
            continue
        written.add(it["skill_id"])
        db.add(JobStandardRequirement(job_standard_id=js.id, skill_id=it["skill_id"],
                                      min_level=it["level"], is_mandatory=True, is_emergent=False))
        n += 1
    for it in proposal.get("emerging", []):
        if it["skill_id"] in written:
            continue
        written.add(it["skill_id"])
        db.add(JobStandardRequirement(job_standard_id=js.id, skill_id=it["skill_id"],
                                      min_level=it["level"], is_mandatory=False, is_emergent=True))
        n += 1
    db.commit()
    return n
