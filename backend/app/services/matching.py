from typing import List, Dict, Any, Optional
from ..models.candidate import Candidate
from ..models.job import Job

class RequirementWrapper:
    def __init__(self, skill_id: int, required_level: int, is_mandatory: bool):
        self.skill_id = skill_id
        self.required_level = required_level
        self.is_mandatory = is_mandatory

def calculate_match_score(candidate: Candidate, job: Any) -> Dict[str, Any]:
    """
    Calcule le score de compatibilité entre un candidat et une offre ou un profil cible.
    Prend en compte :
    1. Les Skills (Compétences techniques) - Poids: 60%
    2. L'Expérience (Années) - Poids: 25%
    3. L'Éducation (Niveau) - Poids: 15%
    """
    candidate_skills_map = {cs.skill_id: cs.level for cs in candidate.skills}
    
    # --- 1. Scoring des Skills (60%) ---
    requirements = getattr(job, "requirements", [])
    skill_score = 100.0
    gaps = []
    
    if requirements:
        total_skill_weight = 0.0
        earned_skill_score = 0.0
        mandatory_fail = False

        missing_mandatory_count = 0
        for req in requirements:
            weight = 2.0 if req.is_mandatory else 1.0
            total_skill_weight += weight
            candidate_level = candidate_skills_map.get(req.skill_id, 0) or 0
            required_level = req.required_level or 1
            
            if candidate_level < required_level:
                gaps.append({
                    "type": "skill",
                    "id": req.skill_id,
                    "required": req.required_level,
                    "actual": candidate_level
                })
            
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

    # --- Score Final Pondéré ---
    final_score = (skill_score * 0.60) + (exp_score * 0.25) + (edu_score * 0.15)
        
    return {
        "total_score": round(final_score, 1),
        "skill_score": round(skill_score, 1),
        "experience_score": round(exp_score, 1),
        "education_score": round(edu_score, 1),
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
            "gaps": match_data["gaps"]
        })
    
    return sorted(results, key=lambda x: x["score"], reverse=True)[:limit]