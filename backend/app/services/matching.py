from typing import List, Dict, Any, Optional
from ..models.candidate import Candidate
from ..models.job import Job

class RequirementWrapper:
    def __init__(self, skill_id: int, required_level: int, is_mandatory: bool):
        self.skill_id = skill_id
        self.required_level = required_level
        self.is_mandatory = is_mandatory


def _build_rome_index(candidate_skills) -> Dict[str, int]:
    """
    Construit un index { rome_code → meilleur_niveau } pour le matching ROME.
    Permet de matcher par code ROME même si les skill_id diffèrent.
    """
    rome_map: Dict[str, int] = {}
    for cs in candidate_skills:
        if hasattr(cs, "skill") and cs.skill and cs.skill.rome_code:
            code = cs.skill.rome_code
            rome_map[code] = max(rome_map.get(code, 0), cs.level or 0)
    return rome_map


def _get_req_rome_code(req) -> Optional[str]:
    """Retourne le code ROME d'un requirement si disponible."""
    if hasattr(req, "skill") and req.skill and req.skill.rome_code:
        return req.skill.rome_code
    if hasattr(req, "rome_code") and req.rome_code:
        return req.rome_code
    return None


def calculate_match_score(candidate: Candidate, job: Any) -> Dict[str, Any]:
    """
    Calcule le score de compatibilité entre un candidat et une offre.

    Scoring :
    1. Skills (60%) — matching exact par skill_id + matching ROME (score réduit à 80%)
    2. Expérience (25%) — années d'expérience vs minimum requis
    3. Éducation (15%) — niveau de diplôme vs minimum requis
    """
    # Index de compétences du candidat
    candidate_skills_map = {cs.skill_id: cs.level for cs in candidate.skills}
    rome_index = _build_rome_index(candidate.skills)

    # --- 1. Scoring des Skills (60%) ---
    requirements = getattr(job, "requirements", [])
    skill_score = 100.0
    gaps = []

    if requirements:
        total_skill_weight = 0.0
        earned_skill_score = 0.0
        missing_mandatory_count = 0

        for req in requirements:
            weight = 2.0 if req.is_mandatory else 1.0
            total_skill_weight += weight
            required_level = req.required_level or 1

            # Matching exact (skill_id)
            candidate_level = candidate_skills_map.get(req.skill_id, 0) or 0

            # Matching ROME (fallback si pas de match exact)
            rome_match_level = 0
            rome_match_factor = 1.0
            if candidate_level == 0:
                req_rome = _get_req_rome_code(req)
                if req_rome and req_rome in rome_index:
                    rome_match_level = rome_index[req_rome]
                    rome_match_factor = 0.85  # -15% pour match ROME indirect

            effective_level = candidate_level if candidate_level > 0 else rome_match_level

            if effective_level < required_level:
                if effective_level == 0:
                    gaps.append({
                        "type": "skill",
                        "id": req.skill_id,
                        "name": _get_skill_name(req),
                        "required": required_level,
                        "actual": 0,
                    })
                else:
                    gaps.append({
                        "type": "skill",
                        "id": req.skill_id,
                        "name": _get_skill_name(req),
                        "required": required_level,
                        "actual": effective_level,
                    })

            if effective_level > 0:
                level_ratio = min(effective_level / max(required_level, 1), 1.2)
                earned_skill_score += level_ratio * weight * rome_match_factor
            else:
                if req.is_mandatory:
                    missing_mandatory_count += 1

        skill_score = (earned_skill_score / total_skill_weight) * 100 if total_skill_weight > 0 else 100.0
        # Pénalité : -30% par compétence obligatoire absente
        if missing_mandatory_count > 0:
            skill_score *= (0.7 ** missing_mandatory_count)

    # Détail des compétences pour le frontend
    detailed_skills = []
    if requirements:
        for req in requirements:
            candidate_level = candidate_skills_map.get(req.skill_id, 0) or 0
            if candidate_level == 0:
                req_rome = _get_req_rome_code(req)
                if req_rome and req_rome in rome_index:
                    candidate_level = rome_index[req_rome]
            detailed_skills.append({
                "skill_name": _get_skill_name(req),
                "required": req.required_level,
                "actual": candidate_level,
            })

    # --- 2. Scoring de l'Expérience (25%) ---
    exp_score = 100.0
    min_exp = getattr(job, "min_years_experience", 0.0) or 0.0
    cand_exp = candidate.years_of_experience or 0.0
    if min_exp > 0:
        exp_score = min((cand_exp / min_exp) * 100, 100.0)
        if cand_exp < min_exp:
            gaps.append({"type": "experience", "required": min_exp, "actual": cand_exp})

    # --- 3. Scoring de l'Éducation (15%) ---
    edu_score = 100.0
    min_edu = getattr(job, "min_education_level", 0) or 0
    cand_edu = candidate.education_level or 0
    if min_edu > 0:
        edu_score = min((cand_edu / min_edu) * 100, 100.0)
        if cand_edu < min_edu:
            gaps.append({"type": "education", "required": min_edu, "actual": cand_edu})

    final_score = (skill_score * 0.60) + (exp_score * 0.25) + (edu_score * 0.15)

    return {
        "total_score": round(final_score, 1),
        "skill_score": round(skill_score, 1),
        "experience_score": round(exp_score, 1),
        "education_score": round(edu_score, 1),
        "gaps": gaps,
        "detailed_skills": detailed_skills,
    }


def _get_skill_name(req) -> str:
    if hasattr(req, "skill_name") and req.skill_name:
        return req.skill_name
    if hasattr(req, "skill") and req.skill:
        return req.skill.name
    return f"Compétence #{req.skill_id}"


def find_matching_candidates(job: Job, candidates: List[Candidate], min_score: float = 40.0) -> List[Dict]:
    """Trouve les candidats correspondant à un poste, triés par score décroissant."""
    matches = []
    for candidate in candidates:
        match_data = calculate_match_score(candidate, job)
        if match_data["total_score"] >= min_score:
            matches.append({
                "candidate_id": candidate.id,
                "full_name": f"{candidate.first_name} {candidate.last_name}",
                "score": match_data["total_score"],
                "gaps": match_data["gaps"],
                "details": match_data,
            })
    return sorted(matches, key=lambda x: x["score"], reverse=True)


def discover_top_talents(requirements_data: List[Dict], candidates: List[Candidate], limit: int = 10) -> List[Dict]:
    """Simule une offre pour découvrir des talents via requirements ad-hoc."""
    class MockJob:
        def __init__(self, reqs):
            self.requirements = [RequirementWrapper(**rd) for rd in reqs]
            self.min_years_experience = 0.0
            self.min_education_level = 0

    mock_job = MockJob(requirements_data)
    results = []
    for candidate in candidates:
        match_data = calculate_match_score(candidate, mock_job)
        results.append({
            "candidate_id": candidate.id,
            "full_name": f"{candidate.first_name} {candidate.last_name}",
            "score": match_data["total_score"],
            "gaps": match_data["gaps"],
        })
    return sorted(results, key=lambda x: x["score"], reverse=True)[:limit]
