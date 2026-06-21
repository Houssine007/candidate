"""
Analyse le profil d'un candidat et produit des suggestions d'évolution.

Logique (révisée) :
  1. Grouper les skills du candidat par code ROME (interne, jamais exposé).
  2. Pour chaque groupe → label du domaine métier (libellé lisible).
  3. Établir la BASE DE RÉFÉRENCE du domaine à partir de la DEMANDE RÉELLE :
     les compétences exigées par les postes (JobRequirement) de ce domaine.
     → évite de comparer le candidat au catalogue entier (biais « à découvrir »).
  4. Suggérer en priorité les compétences DEMANDÉES que le candidat n'a pas,
     puis compléter par France Travail, puis par le catalogue — toujours
     après dédoublonnage par rapport aux compétences déjà possédées.
  5. Calculer fit_level en croisant couverture de la demande ET maîtrise (niveau).

Aucun code ROME ne sort de ce service : le frontend reçoit uniquement des
libellés et des noms de compétences.
"""
from __future__ import annotations

import re
import asyncio
import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from ..models.skill import Skill
from ..models.candidate import Candidate, CandidateSkill
from ..models.job import JobRequirement

logger = logging.getLogger(__name__)

# ─── Référentiel de libellés (jamais exposé au frontend sous forme de codes) ──

_ROME_LABELS: dict[str, str] = {
    "M1805": "Développement logiciel",
    "M1803": "Développement web / frontend",
    "M1403": "Data, IA et analyse",
    "M1810": "DevOps, cloud et infrastructure",
    "M1802": "Cybersécurité",
    "M1806": "Ingénierie des données",
    "M1801": "Architecture & systèmes",
    "M1302": "Gestion de projet et management",
    "M1705": "Marketing digital",
    "M1604": "Communication et relations",
    "M1203": "Finance et comptabilité",
    "M1402": "Conseil et stratégie",
    "M1501": "Ressources humaines",
    "M1502": "Formation et ingénierie pédagogique",
    "E1205": "Design et expérience utilisateur",
    "E1106": "Communication digitale",
    "E1401": "Études et analytique",
    "D1212": "Commerce et vente",
    "N1303": "Logistique et supply chain",
    "N2102": "Maintenance ferroviaire",
    "N4101": "Transport ferroviaire",
    "H1206": "Électronique et automatisme",
    "H1208": "Industrie et production",
    "I1302": "Maintenance électrique",
    "K1802": "Langues et communication interpersonnelle",
}

_DOMAIN_LABELS: dict[str, str] = {
    "A": "Agriculture", "B": "Arts et spectacles", "C": "Banque / Assurances",
    "D": "Commerce", "E": "Communication / Multimédia", "F": "BTP / Construction",
    "G": "Hôtellerie / Tourisme", "H": "Industrie", "I": "Installation / Maintenance",
    "J": "Santé", "K": "Services aux personnes", "M": "Informatique / Gestion",
    "N": "Transport / Logistique",
}


def _label(rome_code: str) -> str:
    """Libellé lisible pour un code ROME — jamais le code lui-même."""
    code = (rome_code or "").upper().strip()
    if code in _ROME_LABELS:
        return _ROME_LABELS[code]
    domain = _DOMAIN_LABELS.get(code[0].upper() if code else "")
    return domain or "Domaine professionnel"


# ─── Normalisation & dédoublonnage des noms de compétences ────────────────────

# Tokens trop courts/ambigus à ignorer dans la comparaison
_STOP_TOKENS = {"js", "ci", "cd", "go", "et", "de", "la", "le", "du", "the", "and"}


def _tokens(name: str) -> frozenset[str]:
    """
    Tokens significatifs d'un nom de compétence, pour comparer deux compétences
    sans les faux positifs du matching par sous-chaîne (« Java » ≠ « JavaScript »).
    """
    raw = re.split(r"[^a-z0-9]+", (name or "").lower())
    return frozenset(t for t in raw if len(t) >= 3 and t not in _STOP_TOKENS)


def _overlaps(tok: frozenset[str], owned_tokens: list[frozenset[str]]) -> bool:
    """
    True si la compétence (par ses tokens) recoupe une compétence déjà possédée.
    Deux compétences se recoupent si elles partagent au moins un token significatif
    (« React / Next.js » recoupe « React » via 'react', mais « Java » ne recoupe
    pas « JavaScript »).
    """
    if not tok:
        return False
    return any(tok & ot for ot in owned_tokens)


# ─── Calcul du niveau d'adéquation au domaine ─────────────────────────────────

def _fit_level(owned: List[dict], demanded_tokens: list[frozenset[str]]) -> str:
    """
    Croise la couverture de la demande réelle du domaine et la maîtrise moyenne.
    Ne compare PAS au catalogue entier (qui rendait tout le monde « à découvrir »).
    """
    n = len(owned)
    if n == 0:
        return "à découvrir"

    avg_level = sum(s["level"] for s in owned) / n
    mastery = max(0.0, min(1.0, (avg_level - 1) / 3.0))  # niv 1 → 0, niv 4 → 1

    if demanded_tokens:
        # base de référence : la demande réelle, bornée [4 .. 8] pour éviter
        # qu'un domaine peu sollicité ne gonfle le score, ou qu'un catalogue
        # d'exigences pléthorique ne le rende inatteignable
        baseline = min(max(len(demanded_tokens), 4), 8)
        covered = sum(1 for s in owned if _overlaps(s["_tokens"], demanded_tokens))
        coverage = min(1.0, covered / baseline)
    else:
        # aucune demande connue : on se rabat sur l'ampleur du profil
        coverage = min(1.0, n / 5.0)

    # ampleur : une compétence isolée, même experte, n'est pas une force de domaine
    breadth = min(1.0, n / 4.0)

    score = 0.5 * coverage + 0.3 * mastery + 0.2 * breadth
    if score >= 0.55:
        return "fort"
    if score >= 0.30:
        return "potentiel"
    return "à découvrir"


# ─── Enrichissement France Travail (optionnel) ────────────────────────────────

async def _fetch_rome_competences(rome_code: str) -> List[str]:
    """
    Compétences typiques d'un code ROME via l'API France Travail.
    Retourne des libellés (jamais de codes). [] si non configurée ou échec.
    """
    try:
        from .france_travail_api import fetch_competences, is_configured
        if not is_configured():
            return []
        competences = await asyncio.wait_for(fetch_competences(rome_code), timeout=5.0)
        return [
            c.get("libelle") or c.get("label") or c.get("name") or ""
            for c in (competences or [])
            if isinstance(c, dict)
        ]
    except Exception as e:
        logger.debug(f"[ROME FT] {rome_code} : {e}")
        return []


# ─── Analyse principale ───────────────────────────────────────────────────────

async def analyse_profile(candidate: Candidate, db: Session) -> dict:
    """
    Retourne un dict avec la liste des domaines métier du candidat,
    ses compétences par domaine, et les suggestions d'évolution.

    Structure :
    {
        "domains": [
            {
                "label": "Développement logiciel",
                "fit_level": "fort" | "potentiel" | "à découvrir",
                "owned_skills": [{"name": "Python", "level": 3}, ...],
                "suggested_skills": ["TypeScript", "Tests logiciels"],
                "owned_count": 4,
                "typical_count": 6,   # taille de la base de référence (demande)
            }
        ],
        "has_rome_data": bool
    }
    """
    candidate_skills: List[CandidateSkill] = (
        db.query(CandidateSkill)
        .join(Skill, CandidateSkill.skill_id == Skill.id)
        .filter(CandidateSkill.candidate_id == candidate.id)
        .all()
    )

    # Map skill_id → infos
    skill_infos: dict[int, dict] = {}
    for cs in candidate_skills:
        skill = db.get(Skill, cs.skill_id)
        if skill:
            skill_infos[cs.skill_id] = {
                "name": skill.name,
                "level": cs.level or 1,
                "rome_code": skill.rome_code,
                "_tokens": _tokens(skill.name),
            }

    # Grouper par rome_code (on ignore les skills sans code ROME)
    rome_groups: dict[str, list[dict]] = {}
    for info in skill_infos.values():
        rc = info.get("rome_code")
        if not rc:
            continue
        rome_groups.setdefault(rc, []).append(info)

    if not rome_groups:
        return {"domains": [], "has_rome_data": False}

    domains = []

    for rome_code, owned in rome_groups.items():
        owned_tokens = [s["_tokens"] for s in owned]

        # 1. Demande réelle du domaine : compétences exigées par des postes
        demanded_rows = (
            db.query(Skill.name)
            .join(JobRequirement, JobRequirement.skill_id == Skill.id)
            .filter(Skill.rome_code == rome_code)
            .distinct()
            .all()
        )
        demanded_names = [r[0] for r in demanded_rows if r[0]]
        demanded_tokens = [_tokens(n) for n in demanded_names if _tokens(n)]

        # accumulateur de dédoublonnage (tokens déjà couverts par profil + suggestions)
        used_tokens: list[frozenset[str]] = list(owned_tokens)

        def _try_add(name: str, bucket: list[str]) -> bool:
            tok = _tokens(name)
            if not tok or _overlaps(tok, used_tokens):
                return False
            bucket.append(name)
            used_tokens.append(tok)
            return True

        # 2. Suggestions PRIORITAIRES : compétences demandées non possédées
        suggestions: list[str] = []
        for name in demanded_names:
            _try_add(name, suggestions)

        # 3. Enrichissement France Travail (compétences réelles du métier)
        if len(suggestions) < 6:
            for c in await _fetch_rome_competences(rome_code):
                if len(suggestions) >= 6:
                    break
                _try_add(c, suggestions)

        # 4. Repli sur le catalogue interne UNIQUEMENT si rien de mieux
        if not suggestions:
            catalogue = db.query(Skill).filter(Skill.rome_code == rome_code).all()
            for s in catalogue:
                if len(suggestions) >= 6:
                    break
                _try_add(s.name, suggestions)

        # Base de référence affichée : la demande (plancher à 4), sinon le profil
        typical_count = max(len(demanded_tokens), 4) if demanded_tokens else len(owned)

        domains.append({
            "label": _label(rome_code),
            "fit_level": _fit_level(owned, demanded_tokens),
            "owned_skills": [
                {"name": s["name"], "level": s["level"]}
                for s in sorted(owned, key=lambda x: x["level"], reverse=True)
            ],
            "suggested_skills": suggestions[:6],
            "owned_count": len(owned),
            "typical_count": typical_count,
        })

    # Trier : fort en premier, puis potentiel, puis à découvrir
    order = {"fort": 0, "potentiel": 1, "à découvrir": 2}
    domains.sort(key=lambda d: order.get(d["fit_level"], 3))

    return {"domains": domains, "has_rome_data": True}
