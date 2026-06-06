def calculate_completeness_score(candidate) -> float:
    score = 0.0
    # Identity complete (first+last+phone)
    if candidate.first_name and candidate.last_name and candidate.phone:
        score += 10
    # Bio
    if candidate.bio:
        score += 5
    # Photo
    if candidate.photo_url:
        score += 5
    # GitHub or Portfolio
    links = candidate.links or {}
    if links.get("github") or links.get("portfolio"):
        score += 10
    # LinkedIn
    if links.get("linkedin"):
        score += 5
    # At least 1 formation
    if candidate.formations:
        score += 10
    # At least 1 experience
    if candidate.experience_detail or candidate.years_of_experience:
        score += 15
    # At least 1 project
    projects = candidate.projects or []
    if len(projects) >= 1:
        score += 10
    # At least 5 skills
    skills_count = len(candidate.skills) if hasattr(candidate, 'skills') else 0
    if skills_count >= 5:
        score += 15
    # At least 1 certification
    if candidate.certifications:
        score += 5
    # CV uploaded
    if candidate.cv_url or candidate.cv_text:
        score += 10
    return min(score, 100.0)
