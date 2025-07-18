from typing import List, Dict
from ..models.candidate import Candidate
from ..models.job import Job

def calculate_job_candidate_match(candidate: Candidate, job: Job) -> float:
    """
    Calcule le score de compatibilité entre un candidat et un poste.
    """
    # Score de base pour les compétences requises
    skill_score = 0
    required_skills = set(job.required_skills)
    candidate_skills = set(candidate.skills)
    
    if required_skills:
        skill_score = len(required_skills.intersection(candidate_skills)) / len(required_skills)
    
    # Score pour l'expérience
    experience_score = min(candidate.years_of_experience / job.required_experience, 1.0) if job.required_experience > 0 else 1.0
    
    # Score pour le niveau d'études
    education_score = 1.0 if candidate.education_level >= job.required_education_level else 0.5
    
    # Calcul du score final (pondération à ajuster selon les besoins)
    final_score = (skill_score * 0.5) + (experience_score * 0.3) + (education_score * 0.2)
    
    return round(final_score * 100, 2)

def find_matching_candidates(job: Job, candidates: List[Candidate], min_score: float = 60.0) -> List[Dict]:
    """
    Trouve les candidats correspondant à un poste avec un score minimum.
    """
    matches = []
    for candidate in candidates:
        score = calculate_job_candidate_match(candidate, job)
        if score >= min_score:
            matches.append({
                "candidate": candidate,
                "score": score
            })
    
    # Trier les résultats par score décroissant
    return sorted(matches, key=lambda x: x["score"], reverse=True) 