from typing import List, Dict
from ..models.candidate import Candidate
from ..models.job import Job

def calculate_skill_score(candidate_skills: List[str], required_skills: List[str]) -> float:
    """
    Calcule le score de compétences entre les compétences du candidat et celles requises.
    """
    if not required_skills:
        return 1.0
        
    candidate_skill_set = set(candidate_skills)
    required_skill_set = set(required_skills)
    
    # Calcul du score de base
    base_score = len(candidate_skill_set.intersection(required_skill_set)) / len(required_skill_set)
    
    # Bonus pour les compétences supplémentaires pertinentes
    extra_skills = candidate_skill_set - required_skill_set
    bonus = min(len(extra_skills) * 0.1, 0.3)  # Maximum 30% de bonus
    
    return min(base_score + bonus, 1.0)

def calculate_experience_score(candidate_experience: float, required_experience: float) -> float:
    """
    Calcule le score d'expérience.
    """
    if required_experience == 0:
        return 1.0
        
    return min(candidate_experience / required_experience, 1.0)

def calculate_education_score(candidate_level: int, required_level: int) -> float:
    """
    Calcule le score de niveau d'études.
    """
    if candidate_level >= required_level:
        return 1.0
    elif candidate_level >= required_level - 1:
        return 0.8
    else:
        return 0.5

def calculate_overall_score(candidate: Candidate, job: Job) -> Dict[str, float]:
    """
    Calcule le score global détaillé pour un candidat par rapport à un poste.
    """
    skill_score = calculate_skill_score(candidate.skills, job.required_skills)
    experience_score = calculate_experience_score(candidate.years_of_experience, job.required_experience)
    education_score = calculate_education_score(candidate.education_level, job.required_education_level)
    
    # Calcul du score final avec pondération
    final_score = (
        skill_score * 0.5 +      # 50% pour les compétences
        experience_score * 0.3 +  # 30% pour l'expérience
        education_score * 0.2     # 20% pour l'éducation
    )
    
    return {
        "final_score": round(final_score * 100, 2),
        "skill_score": round(skill_score * 100, 2),
        "experience_score": round(experience_score * 100, 2),
        "education_score": round(education_score * 100, 2)
    } 