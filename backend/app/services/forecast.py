"""
GPEC prévisionnelle — moteur d'analyse d'écarts vs cibles d'effectif.

Principe : réutilise intégralement le moteur de matching (`matching.py`).
On traite chaque EMPLOYÉ comme un « candidat » et chaque emploi-type cible
(JobStandard) comme un « profil cible », pour mesurer :
  • qualifiés  : employés couvrant TOUS les obligatoires au niveau requis
                 (cohérent avec la notion GPEC « au niveau ») ;
  • potentiels : employés formables (adjacence ROME, potential_score ≥ seuil) ;
  • écart      : effectif cible − qualifiés ;
  • statut     : critique / partiel / couvert.

Aucune logique de scoring n'est dupliquée : le moteur déterministe reste juge.
"""
from typing import List, Dict, Any
from .matching import calculate_match_score

POTENTIAL_MIN = 60.0   # seuil "formable" (potential_score)


class _TargetReq:
    """Adapte un JobStandardRequirement au contrat attendu par matching.py
    (qui lit `required_level`, là où JobStandard expose `min_level`)."""
    def __init__(self, jsr):
        self.skill_id = jsr.skill_id
        self.required_level = jsr.min_level
        self.is_mandatory = bool(jsr.is_mandatory)
        self.is_emergent = bool(getattr(jsr, "is_emergent", False))
        self.skill = jsr.skill  # conserve rome_code/name/category (adjacence ROME)


class _TargetProfile:
    """Profil cible duck-typé comme une 'offre' pour matching.calculate_match_score."""
    def __init__(self, job_standard):
        self.requirements = [_TargetReq(r) for r in job_standard.skills_requirements]
        self.min_years_experience = 0.0   # un emploi-type cible se juge sur les compétences
        self.min_education_level = 0


def evaluate_target(target, employees) -> Dict[str, Any]:
    """Évalue une cible d'effectif contre l'effectif de l'entreprise."""
    js = target.job_standard
    profile = _TargetProfile(js)
    reqs = profile.requirements
    mandatory = [r for r in reqs if r.is_mandatory]
    emergent_skill_ids = {r.skill_id for r in reqs if r.is_emergent}

    qualified: List[Dict] = []
    potentials: List[Dict] = []

    for emp in employees:
        emp_levels = {es.skill_id: (es.level or 0) for es in emp.skills}
        mandatory_ok = all(emp_levels.get(r.skill_id, 0) >= r.required_level for r in mandatory)

        m = calculate_match_score(emp, profile)
        entry = {
            "employee_id": emp.id,
            "name": f"{emp.first_name} {emp.last_name}".strip(),
            "job_title": emp.job_title,
            "skill_score": m["skill_score"],
            "potential_score": m["potential_score"],
        }
        if mandatory_ok and reqs:
            qualified.append(entry)
        elif (m["potential_score"] or 0) >= POTENTIAL_MIN:
            potentials.append(entry)

    potentials.sort(key=lambda e: (e["potential_score"] or 0), reverse=True)

    n_qual = len(qualified)
    H = target.target_headcount or 0
    gap = max(H - n_qual, 0)
    if n_qual == 0:
        status = "critique"
    elif n_qual < H:
        status = "partiel"
    else:
        status = "couvert"
    coverage_pct = round(100 * min(n_qual / H, 1.0), 1) if H else 0.0

    # Compétences d'avenir (émergentes) et leur couverture interne
    emergent = []
    for r in reqs:
        if r.is_emergent:
            holders = sum(1 for emp in employees
                          if {es.skill_id for es in emp.skills if (es.level or 0) >= r.required_level}
                          .__contains__(r.skill_id))
            emergent.append({
                "skill": r.skill.name if r.skill else f"#{r.skill_id}",
                "required_level": r.required_level,
                "holders_at_level": holders,
            })

    return {
        "target_id": target.id,
        "role": js.title,
        "rome_code": js.rome_code,
        "org_unit_id": target.org_unit_id,
        "horizon": target.horizon,
        "priority": target.priority,
        "target_headcount": H,
        "qualified_count": n_qual,
        "potential_count": len(potentials),
        "gap": gap,
        "coverage_pct": coverage_pct,
        "status": status,
        "qualified": qualified,
        "potentials": potentials[:10],
        "emergent_skills": emergent,
        "required_count": len(reqs),
    }


def build_pool(target, employees) -> Dict[str, Any]:
    """Vivier interne détaillé pour une cible : qualifiés + potentiels avec, pour
    chaque potentiel, les compétences à développer (écarts) — base d'un plan de formation."""
    js = target.job_standard
    profile = _TargetProfile(js)
    reqs = profile.requirements
    mandatory = [r for r in reqs if r.is_mandatory]

    qualified: List[Dict] = []
    potentials: List[Dict] = []
    for emp in employees:
        emp_levels = {es.skill_id: (es.level or 0) for es in emp.skills}
        mandatory_ok = all(emp_levels.get(r.skill_id, 0) >= r.required_level for r in mandatory)
        m = calculate_match_score(emp, profile)

        to_develop = []
        for r in reqs:
            actual = emp_levels.get(r.skill_id, 0)
            if actual < r.required_level:
                to_develop.append({
                    "skill": r.skill.name if r.skill else f"#{r.skill_id}",
                    "required": r.required_level, "actual": actual,
                    "mandatory": r.is_mandatory,
                })
        entry = {
            "employee_id": emp.id,
            "name": f"{emp.first_name} {emp.last_name}".strip(),
            "job_title": emp.job_title,
            "skill_score": m["skill_score"],
            "potential_score": m["potential_score"],
            "to_develop": to_develop,
        }
        if mandatory_ok and reqs:
            qualified.append(entry)
        elif (m["potential_score"] or 0) >= POTENTIAL_MIN:
            potentials.append(entry)

    potentials.sort(key=lambda e: (e["potential_score"] or 0), reverse=True)
    return {
        "target_id": target.id,
        "role": js.title,
        "rome_code": js.rome_code,
        "horizon": target.horizon,
        "target_headcount": target.target_headcount or 0,
        "qualified": qualified,
        "potentials": potentials,
    }


def assess_employee(target, employee) -> Dict[str, Any]:
    """Évalue UN collaborateur vis-à-vis d'une cible : atouts (compétences déjà au
    niveau) + compétences à développer + score de potentiel. Base factuelle de
    l'explication de mobilité interne."""
    js = target.job_standard
    profile = _TargetProfile(js)
    reqs = profile.requirements
    mandatory = [r for r in reqs if r.is_mandatory]
    emp_levels = {es.skill_id: (es.level or 0) for es in employee.skills}
    mandatory_ok = all(emp_levels.get(r.skill_id, 0) >= r.required_level for r in mandatory)
    m = calculate_match_score(employee, profile)

    have, to_develop = [], []
    for r in reqs:
        actual = emp_levels.get(r.skill_id, 0)
        name = r.skill.name if r.skill else f"#{r.skill_id}"
        if actual >= r.required_level:
            have.append({"skill": name, "level": actual})
        else:
            to_develop.append({"skill": name, "required": r.required_level,
                               "actual": actual, "mandatory": r.is_mandatory})
    return {
        "employee_id": employee.id,
        "name": f"{employee.first_name} {employee.last_name}".strip(),
        "job_title": employee.job_title,
        "role": js.title,
        "horizon": target.horizon,
        "qualified": bool(mandatory_ok and reqs),
        "potential_score": m["potential_score"],
        "skill_score": m["skill_score"],
        "have": have,
        "to_develop": to_develop,
    }
