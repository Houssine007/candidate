from typing import List, Dict, Any, Optional
from ..models.candidate import Candidate
from ..models.job import Job

class RequirementWrapper:
    def __init__(self, skill_id: int, required_level: int, is_mandatory: bool):
        self.skill_id = skill_id
        self.required_level = required_level
        self.is_mandatory = is_mandatory


def _skill_category(obj) -> Optional[str]:
    """
    Tente de récupérer la catégorie d'un skill, que ce soit depuis un
    CandidateSkill (obj.skill.category) ou un JobRequirement (obj.skill.category).
    Renvoie None si la relation n'est pas chargée / absente.
    """
    skill = getattr(obj, "skill", None)
    if skill is not None:
        return getattr(skill, "category", None)
    return None

def _skill_rome(obj) -> Optional[str]:
    """Code ROME complet du skill (ex. 'M1805'), ou None si absent."""
    skill = getattr(obj, "skill", None)
    if skill is not None:
        rome = getattr(skill, "rome_code", None)
        return rome.strip().upper() if rome else None
    return None

def _skill_name(req) -> str:
    if hasattr(req, "skill_name") and req.skill_name:
        return req.skill_name
    if hasattr(req, "skill") and req.skill:
        return req.skill.name
    return f"Skill #{req.skill_id}"

def compute_potential_score(
    candidate: Candidate,
    job: Any,
    skill_gaps: List[Dict[str, Any]],
) -> Optional[float]:
    """
    Calcule le POTENTIAL SCORE : la capacité du candidat à combler ses écarts
    via de la formation. 100% de signaux factuels positifs, aucun malus.

    Principe (cf. conception Sprint 3) :
    Adjacence basée sur le référentiel ROME (hybride pondéré) :
    - même sous-domaine ROME (ex. M1805 == M1805) → poids 1.0  (bridge "exact")
    - même grand domaine ROME (ex. M18xx ~ M18xx)  → poids 0.6  (bridge "domain")
    - sinon                                        → poids 0.3  (à former)
    - Bonus certifications                         → +12 pts

    Retourne None si le candidat n'a aucun gap (l'axe potentiel n'est alors
    pas pertinent : on s'appuie sur le fit_score).
    """
    if not skill_gaps:
        return None

    # Catégories que le candidat maîtrise déjà (skill possédé, niveau > 0)
    # Codes ROME que le candidat maîtrise déjà (skill possédé, niveau > 0)
    cand_rome_full = set()       # sous-domaines complets : "M1805"
    cand_rome_domain = set()     # grands domaines : "M"

    for cs in candidate.skills:
        if (cs.level or 0) > 0:
            rome = _skill_rome(cs)
            if rome:
                cand_rome_full.add(rome)
                cand_rome_domain.add(rome[0])
    total_weight = 0.0
    for gap in skill_gaps:
        gap_rome = gap.get("rome_code")
        if gap_rome and gap_rome in cand_rome_full:
            gap["bridgeable"] = True
            gap["bridge_level"] = "exact"
            total_weight += 1.0
        elif gap_rome and gap_rome[0] in cand_rome_domain:
            gap["bridgeable"] = True
            gap["bridge_level"] = "domain"
            total_weight += 0.6    
        else:
            gap["bridgeable"] = False
            gap["bridge_level"] = "none"
            total_weight += 0.3

    adjacency_ratio = total_weight / len(skill_gaps)  # ∈ [0.3 .. 1.0]

    # Bonus certifications : factuel, le champ est rempli ou non
    certif_bonus = 0.0
    certs = getattr(candidate, "certifications", None)
    if certs and str(certs).strip():
        certif_bonus = 12.0

    potential = adjacency_ratio * 80.0 + certif_bonus
    return round(min(potential, 100.0), 1)


def _recommendation(fit_score: float, potential_score: Optional[float]) -> str:
    """Étiquette de recommandation dérivée de fit + potentiel."""
    if fit_score >= 70:
        return "STRONG_FIT"
    if potential_score is not None and potential_score >= 60:
        return "POTENTIAL"
    return "WEAK_FIT"


def calculate_match_score(candidate: Candidate, job: Any) -> Dict[str, Any]:
    """
    Calcule le score de compatibilité entre un candidat et une offre ou un profil cible.

    FIT SCORE (« colle-t-il au besoin déclaré aujourd'hui ? ») :
    1. Les Skills (Compétences techniques) - Poids: 60%
    2. L'Expérience (Années) - Poids: 25%
    3. L'Éducation (Niveau) - Poids: 15%

    POTENTIAL SCORE (« peut-il y arriver avec de la formation ? ») :
    Calculé séparément, signaux factuels positifs uniquement (cf. compute_potential_score).
    """
    candidate_skills_map = {cs.skill_id: cs.level for cs in candidate.skills}

    # --- 1. Scoring des Skills (60%) ---
    requirements = getattr(job, "requirements", [])
    skill_score = 100.0
    gaps = []
    skill_gaps = []  # sous-ensemble des gaps de type "skill" (pour le potentiel)

    if requirements:
        total_skill_weight = 0.0
        earned_skill_score = 0.0

        missing_mandatory_count = 0
        for req in requirements:
            weight = 2.0 if req.is_mandatory else 1.0
            total_skill_weight += weight
            candidate_level = candidate_skills_map.get(req.skill_id, 0) or 0
            required_level = req.required_level or 1

            if candidate_level < required_level:
                gap_entry = {
                    "type": "skill",
                    "id": req.skill_id,
                    "name": _skill_name(req),   
                    "required": req.required_level,
                    "actual": candidate_level,
                    "category": _skill_category(req),
                    "rome_code": _skill_rome(req),
                }
                gaps.append(gap_entry)
                skill_gaps.append(gap_entry)

            if candidate_level > 0:
                level_ratio = min(candidate_level / max(required_level, 1), 1.2)
                earned_skill_score += level_ratio * weight
            else:
                if req.is_mandatory:
                    missing_mandatory_count += 1

        skill_score = (earned_skill_score / total_skill_weight) * 100 if total_skill_weight > 0 else 100.0
        # Pénalité : -30% par compétence obligatoire manquante
        if missing_mandatory_count > 0:
            skill_score *= (0.7 ** missing_mandatory_count)

    # Rassembler les détails pour le frontend
    detailed_skills = []
    if requirements:
        for req in requirements:
            # Essayer de trouver le nom de la compétence (via la relation ou l'attribut injecté)
            skill_name = "Compétence"
            if hasattr(req, "skill_name") and req.skill_name:
                skill_name = req.skill_name
            elif hasattr(req, "skill") and req.skill:
                skill_name = req.skill.name
            else:
                skill_name = f"Skill #{req.skill_id}"

            detailed_skills.append({
                "skill_name": skill_name,
                "required": req.required_level,
                "actual": candidate_skills_map.get(req.skill_id, 0)
            })

    # --- 2. Scoring de l'Expérience (25%) ---
    exp_score = 100.0
    min_exp = getattr(job, "min_years_experience", 0.0)
    if min_exp is None: min_exp = 0.0

    cand_exp = candidate.years_of_experience or 0.0

    if min_exp > 0:
        exp_score = min((cand_exp / min_exp) * 100, 100.0)
        if cand_exp < min_exp:
            gaps.append({
                "type": "experience",
                "required": min_exp,
                "actual": cand_exp
            })

    # --- 3. Scoring de l'Éducation (15%) ---
    edu_score = 100.0
    min_edu = getattr(job, "min_education_level", 0)
    if min_edu is None: min_edu = 0

    cand_edu = candidate.education_level or 0

    if min_edu > 0:
        edu_score = min((cand_edu / min_edu) * 100, 100.0)
        if cand_edu < min_edu:
            gaps.append({
                "type": "education",
                "required": min_edu,
                "actual": cand_edu
            })

    # --- Score Final Pondéré (FIT) ---
    final_score = (skill_score * 0.60) + (exp_score * 0.25) + (edu_score * 0.15)
    final_score = round(final_score, 1)

    # --- Potential Score (axe séparé) ---
    potential_score = compute_potential_score(candidate, job, skill_gaps)
    recommendation = _recommendation(final_score, potential_score)

    return {
        "total_score": final_score,
        "skill_score": round(skill_score, 1),
        "experience_score": round(exp_score, 1),
        "education_score": round(edu_score, 1),
        "potential_score": potential_score,
        "recommendation": recommendation,
        "gaps": gaps,
        "detailed_skills": detailed_skills
    }


def find_matching_candidates(job: Job, candidates: List[Candidate], min_score: float = 40.0) -> List[Dict]:
    """
    Trouve les candidats correspondant à un poste réel.
    """
    matches = []
    for candidate in candidates:
        match_data = calculate_match_score(candidate, job)
        if match_data["total_score"] >= min_score:
            matches.append({
                "candidate_id": candidate.id,
                "full_name": f"{candidate.first_name} {candidate.last_name}",
                "score": match_data["total_score"],
                "potential_score": match_data["potential_score"],
                "recommendation": match_data["recommendation"],
                "gaps": match_data["gaps"],
                "details": match_data
            })

    return sorted(matches, key=lambda x: x["score"], reverse=True)


def discover_top_talents(requirements_data: List[Dict], candidates: List[Candidate], limit: int = 10) -> List[Dict]:
    """
    Simule une offre (via requirements_data) pour découvrir des talents.
    """
    results = []
    # Création d'un objet "fictif" pour porter les requirements
    class MockJob:
        def __init__(self, reqs):
            self.requirements = [RequirementWrapper(**rd) for rd in reqs]
            self.min_years_experience = 0.0
            self.min_education_level = 0

    mock_job = MockJob(requirements_data)

    for candidate in candidates:
        match_data = calculate_match_score(candidate, mock_job)
        results.append({
            "candidate_id": candidate.id,
            "full_name": f"{candidate.first_name} {candidate.last_name}",
            "score": match_data["total_score"],
            "potential_score": match_data["potential_score"],
            "recommendation": match_data["recommendation"],
            "gaps": match_data["gaps"]
        })

    return sorted(results, key=lambda x: x["score"], reverse=True)[:limit]