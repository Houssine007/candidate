"""
BF-18 — Vue agrégée GPEC.

Opérationnalise les temps de la GPEC à l'échelle de l'organisation (tenant) :
  • État des lieux  : répartition des compétences détenues par domaine métier.
  • Besoins         : exigences des postes de l'entreprise.
  • Analyse d'écarts : couverture de chaque compétence requise vs effectif.
  • Plan d'action   : compétences "en tension" (critiques / partielles) à
                      développer (formation) ou recruter.

Scope tenant : tout est filtré par le company_id du recruteur connecté.
"""
from collections import defaultdict
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..core.permissions import has_permission
from ..models.employee import Employee, EmployeeSkill
from ..models.skill import Skill
from ..models.user import User
from .auth import get_current_user

router = APIRouter()


def _require_company(db: Session, current_user: User) -> int:
    """Renvoie le company_id du recruteur connecté (ou 403)."""
    from ..models.recruiter import Recruiter
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=403, detail="Aucun recruteur associé")
    return recruiter.company_id


class GpecDomain(BaseModel):
    label: str
    employees: int       # employés distincts ayant ≥1 compétence du domaine
    skill_entries: int   # nombre de couples (employé, compétence)
    avg_level: float


class GpecCoverage(BaseModel):
    skill_id: int
    skill: str
    domain: str
    required_level: int      # niveau max exigé parmi les postes
    is_mandatory: bool
    employees_with: int      # employés possédant la compétence
    employees_at_level: int  # employés au niveau requis ou plus
    avg_level: float
    status: str              # "critique" | "partiel" | "ok"
    reason: str              # explication lisible de la tension (vide si "ok")
    jobs_impacted: int       # nb de postes ouverts exigeant cette compétence
    teams_impacted: int      # nb d'unités/équipes concernées par ces postes
    job_titles: List[str]    # intitulés des postes concernés


class GpecOverview(BaseModel):
    headcount: int
    distinct_skills: int
    open_positions: int
    domains: List[GpecDomain]
    coverage: List[GpecCoverage]
    tension_count: int
    covered_count: int        # compétences requises au statut "couvert"
    required_count: int       # total des compétences requises
    coverage_index: float     # % de compétences requises couvertes
    coverage_target: int      # objectif cible (%)


@router.get("/overview", response_model=GpecOverview)
async def gpec_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:view")),
):
    from ..models.recruiter import Recruiter
    from ..models.job import Job, JobRequirement
    from ..services.profile_analysis import _label

    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=403, detail="Aucun recruteur associé")
    cid = recruiter.company_id

    employees = db.query(Employee).filter(Employee.company_id == cid).all()
    emp_ids = [e.id for e in employees]

    emp_skills = []
    if emp_ids:
        emp_skills = (
            db.query(EmployeeSkill, Skill)
            .join(Skill, EmployeeSkill.skill_id == Skill.id)
            .filter(EmployeeSkill.employee_id.in_(emp_ids))
            .all()
        )

    # ── État des lieux : répartition par domaine ROME ──
    dom_levels: dict[str, list[int]] = defaultdict(list)
    dom_emps: dict[str, set] = defaultdict(set)
    skill_holders: dict[int, list[tuple[int, int]]] = defaultdict(list)
    distinct_skill_ids: set[int] = set()
    for es, sk in emp_skills:
        rc = sk.rome_code or "ZZZ"
        dom_levels[rc].append(es.level)
        dom_emps[rc].add(es.employee_id)
        skill_holders[es.skill_id].append((es.employee_id, es.level))
        distinct_skill_ids.add(es.skill_id)

    domains = [
        GpecDomain(
            label=_label(rc) if rc != "ZZZ" else "Non classé",
            employees=len(dom_emps[rc]),
            skill_entries=len(levels),
            avg_level=round(sum(levels) / len(levels), 2),
        )
        for rc, levels in dom_levels.items()
    ]
    domains.sort(key=lambda d: d.skill_entries, reverse=True)

    # ── Besoins : exigences des postes de l'entreprise ──
    jobs = db.query(Job).filter(Job.company_id == cid).all()
    job_ids = [j.id for j in jobs]
    reqs = []
    if job_ids:
        reqs = (
            db.query(JobRequirement, Skill)
            .join(Skill, JobRequirement.skill_id == Skill.id)
            .filter(JobRequirement.job_id.in_(job_ids))
            .all()
        )

    # Cartographie poste → unité/équipe, pour mesurer l'impact d'une compétence
    job_unit = {j.id: j.org_unit_id for j in jobs}
    job_title = {j.id: j.title for j in jobs}

    req_map: dict[int, dict] = {}
    for jr, sk in reqs:
        m = req_map.setdefault(sk.id, {
            "name": sk.name,
            "domain": _label(sk.rome_code) if sk.rome_code else "Non classé",
            "required_level": 0,
            "mandatory": False,
            "jobs": set(),
            "teams": set(),
        })
        m["required_level"] = max(m["required_level"], jr.required_level or 1)
        m["mandatory"] = m["mandatory"] or bool(jr.is_mandatory)
        m["jobs"].add(jr.job_id)
        uid = job_unit.get(jr.job_id)
        if uid:
            m["teams"].add(uid)

    def _reason(status: str, required_level: int, employees_with: int, at_level: int) -> str:
        """Explique en clair POURQUOI une compétence est en tension."""
        if status == "ok":
            return ""
        below = employees_with - at_level
        if at_level == 0:
            if employees_with == 0:
                return f"Aucun collaborateur ne possède cette compétence (niveau {required_level} requis)."
            return (f"{employees_with} collaborateur(s) la possèdent mais aucun n'atteint "
                    f"le niveau {required_level} requis.")
        # at_level >= 1 et statut "partiel"
        if at_level == 1 and below > 0:
            return (f"Un seul collaborateur au niveau {required_level} requis "
                    f"(dépendance critique) ; {below} autre(s) en-dessous.")
        if at_level == 1:
            return f"Un seul collaborateur atteint le niveau {required_level} requis (point de dépendance)."
        # at_level >= 2 : tension par profondeur insuffisante
        return f"{below} collaborateur(s) en-dessous du niveau {required_level} requis."

    # ── Analyse d'écarts ──
    coverage: List[GpecCoverage] = []
    tension = 0
    for sid, m in req_map.items():
        holders = skill_holders.get(sid, [])
        employees_with = len({e for e, _ in holders})
        at_level = len({e for e, lvl in holders if lvl >= m["required_level"]})
        avg = round(sum(lvl for _, lvl in holders) / len(holders), 2) if holders else 0.0
        if at_level == 0:
            status = "critique"
        elif at_level < 2 or employees_with > at_level:
            status = "partiel"
        else:
            status = "ok"
        if status != "ok":
            tension += 1
        coverage.append(GpecCoverage(
            skill_id=sid,
            skill=m["name"],
            domain=m["domain"],
            required_level=m["required_level"],
            is_mandatory=m["mandatory"],
            employees_with=employees_with,
            employees_at_level=at_level,
            avg_level=avg,
            status=status,
            reason=_reason(status, m["required_level"], employees_with, at_level),
            jobs_impacted=len(m["jobs"]),
            teams_impacted=len(m["teams"]),
            job_titles=sorted(job_title[j] for j in m["jobs"] if j in job_title),
        ))
    order = {"critique": 0, "partiel": 1, "ok": 2}
    coverage.sort(key=lambda c: (order[c.status], not c.is_mandatory, -c.required_level))

    required_count = len(coverage)
    covered_count = required_count - tension
    coverage_index = round(100 * covered_count / required_count, 1) if required_count else 0.0

    return GpecOverview(
        headcount=len(emp_ids),
        distinct_skills=len(distinct_skill_ids),
        open_positions=len(jobs),
        domains=domains,
        coverage=coverage,
        tension_count=tension,
        covered_count=covered_count,
        required_count=required_count,
        coverage_index=coverage_index,
        coverage_target=85,
    )


class GpecGapEmployee(BaseModel):
    user_id: int        # ID utilisateur RH = cible d'inscription LMS (Enrollment.employeeId)
    name: str
    job_title: str | None = None
    current_level: int  # 0 si la compétence est absente


class GpecSkillGap(BaseModel):
    skill_id: int
    skill: str
    required_level: int
    employees: List[GpecGapEmployee]  # employés sous le niveau requis (à former)


@router.get("/skill/{skill_id}/gap", response_model=GpecSkillGap)
async def gpec_skill_gap(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:view")),
):
    """Employés de l'entreprise sous le niveau requis pour une compétence donnée
    — la cible d'un plan d'action (assignation de formation)."""
    from ..models.recruiter import Recruiter
    from ..models.job import Job, JobRequirement

    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=403, detail="Aucun recruteur associé")
    cid = recruiter.company_id

    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Compétence introuvable")

    # Niveau requis = max exigé par les postes de l'entreprise (défaut 1)
    job_ids = [j.id for j in db.query(Job).filter(Job.company_id == cid).all()]
    required_level = 1
    if job_ids:
        levels = [
            jr.required_level or 1
            for jr in db.query(JobRequirement)
            .filter(JobRequirement.job_id.in_(job_ids), JobRequirement.skill_id == skill_id)
            .all()
        ]
        if levels:
            required_level = max(levels)

    employees = db.query(Employee).filter(Employee.company_id == cid).all()
    emp_ids = [e.id for e in employees]
    levels_by_emp: dict[int, int] = {}
    if emp_ids:
        for es in (
            db.query(EmployeeSkill)
            .filter(EmployeeSkill.employee_id.in_(emp_ids), EmployeeSkill.skill_id == skill_id)
            .all()
        ):
            levels_by_emp[es.employee_id] = es.level

    gap = []
    for e in employees:
        lvl = levels_by_emp.get(e.id, 0)
        if lvl < required_level:
            gap.append(GpecGapEmployee(
                user_id=e.user_id,
                name=f"{e.first_name} {e.last_name}".strip(),
                job_title=getattr(e, "job_title", None),
                current_level=lvl,
            ))

    return GpecSkillGap(
        skill_id=skill_id,
        skill=skill.name,
        required_level=required_level,
        employees=gap,
    )


# ══════════════════════════════════════════════════════════════════════════
# GPEC PRÉVISIONNELLE — cibles d'effectif (WorkforceTarget) + analyse de forecast
# ══════════════════════════════════════════════════════════════════════════

class WorkforceTargetCreate(BaseModel):
    job_standard_id: int
    org_unit_id: Optional[int] = None
    target_headcount: int = 1
    horizon: Optional[str] = None
    priority: int = 2
    notes: Optional[str] = None


class WorkforceTargetOut(BaseModel):
    id: int
    job_standard_id: int
    role: str                 # titre de l'emploi-type
    rome_code: Optional[str]
    org_unit_id: Optional[int]
    target_headcount: int
    horizon: Optional[str]
    priority: int
    status: str


@router.get("/targets", response_model=List[WorkforceTargetOut])
async def list_targets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:view")),
):
    from ..models.workforce_target import WorkforceTarget
    cid = _require_company(db, current_user)
    rows = (
        db.query(WorkforceTarget)
        .options(joinedload(WorkforceTarget.job_standard))
        .filter(WorkforceTarget.company_id == cid, WorkforceTarget.status == "active")
        .all()
    )
    return [
        WorkforceTargetOut(
            id=t.id, job_standard_id=t.job_standard_id,
            role=t.job_standard.title if t.job_standard else "—",
            rome_code=t.job_standard.rome_code if t.job_standard else None,
            org_unit_id=t.org_unit_id, target_headcount=t.target_headcount,
            horizon=t.horizon, priority=t.priority, status=t.status,
        )
        for t in rows
    ]


@router.post("/targets", response_model=WorkforceTargetOut)
async def create_target(
    payload: WorkforceTargetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:edit")),
):
    from ..models.workforce_target import WorkforceTarget
    from ..models.job_standard import JobStandard
    cid = _require_company(db, current_user)
    js = db.get(JobStandard, payload.job_standard_id)
    if not js:
        raise HTTPException(status_code=404, detail="Emploi-type (JobStandard) introuvable")
    t = WorkforceTarget(
        company_id=cid, job_standard_id=payload.job_standard_id,
        org_unit_id=payload.org_unit_id, target_headcount=payload.target_headcount,
        horizon=payload.horizon, priority=payload.priority, notes=payload.notes,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return WorkforceTargetOut(
        id=t.id, job_standard_id=t.job_standard_id, role=js.title, rome_code=js.rome_code,
        org_unit_id=t.org_unit_id, target_headcount=t.target_headcount,
        horizon=t.horizon, priority=t.priority, status=t.status,
    )


@router.delete("/targets/{target_id}")
async def delete_target(
    target_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:edit")),
):
    from ..models.workforce_target import WorkforceTarget
    cid = _require_company(db, current_user)
    t = db.query(WorkforceTarget).filter(
        WorkforceTarget.id == target_id, WorkforceTarget.company_id == cid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Cible introuvable")
    db.delete(t)
    db.commit()
    return {"deleted": target_id}


# ─── Forecast : analyse d'écarts prévisionnelle ─────────────────────────────

class ForecastRole(BaseModel):
    target_id: int
    role: str
    rome_code: Optional[str]
    org_unit_id: Optional[int]
    horizon: Optional[str]
    priority: int
    target_headcount: int
    qualified_count: int
    potential_count: int
    gap: int
    coverage_pct: float
    status: str
    qualified: List[dict]
    potentials: List[dict]
    emergent_skills: List[dict]


class ForecastOverview(BaseModel):
    headcount: int
    targets_count: int
    total_target_headcount: int
    total_qualified: int
    total_gap: int
    coverage_index: float        # Σ qualifiés / Σ effectif cible (%)
    coverage_target: int
    tension_count: int           # cibles non "couvert"
    roles: List[ForecastRole]


class ForecastSynthesis(BaseModel):
    synthesis: str
    source: str               # "groq" | "fallback"
    coverage_index: float
    tension_count: int


def _build_forecast(db: Session, cid: int) -> dict:
    """Calcule la couverture prévisionnelle (réutilisé par /forecast et /synthesis)."""
    from ..models.workforce_target import WorkforceTarget
    from ..models.job_standard import JobStandard, JobStandardRequirement
    from ..services.forecast import evaluate_target

    employees = (
        db.query(Employee)
        .options(joinedload(Employee.skills).joinedload(EmployeeSkill.skill))
        .filter(Employee.company_id == cid)
        .all()
    )
    targets = (
        db.query(WorkforceTarget)
        .options(
            joinedload(WorkforceTarget.job_standard)
            .joinedload(JobStandard.skills_requirements)
            .joinedload(JobStandardRequirement.skill)
        )
        .filter(WorkforceTarget.company_id == cid, WorkforceTarget.status == "active")
        .all()
    )

    raw_roles = []
    total_target = total_qual = total_gap = tension = 0
    for t in targets:
        r = evaluate_target(t, employees)
        total_target += r["target_headcount"]
        total_qual += r["qualified_count"]
        total_gap += r["gap"]
        if r["status"] != "couvert":
            tension += 1
        raw_roles.append(r)

    order = {"critique": 0, "partiel": 1, "couvert": 2}
    raw_roles.sort(key=lambda x: (order[x["status"]], x["priority"], -x["gap"]))
    coverage_index = round(100 * total_qual / total_target, 1) if total_target else 0.0

    return {
        "headcount": len(employees),
        "targets_count": len(targets),
        "total_target_headcount": total_target,
        "total_qualified": total_qual,
        "total_gap": total_gap,
        "coverage_index": coverage_index,
        "coverage_target": 85,
        "tension_count": tension,
        "roles": raw_roles,
    }


@router.get("/forecast", response_model=ForecastOverview)
async def gpec_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:view")),
):
    """GPEC prévisionnelle : couverture des emplois-types cibles par l'effectif."""
    cid = _require_company(db, current_user)
    f = _build_forecast(db, cid)
    f["roles"] = [ForecastRole(**{k: r[k] for k in ForecastRole.model_fields}) for r in f["roles"]]
    return ForecastOverview(**f)


@router.get("/forecast/synthesis", response_model=ForecastSynthesis)
async def gpec_forecast_synthesis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:view")),
):
    """Synthèse RH en langage naturel (LLM) des faits déterministes du forecast."""
    from ..services.forecast_synthesis import build_synthesis
    cid = _require_company(db, current_user)
    f = _build_forecast(db, cid)
    text, source = build_synthesis(f)
    return ForecastSynthesis(
        synthesis=text, source=source,
        coverage_index=f["coverage_index"], tension_count=f["tension_count"],
    )


# ─── Phase 0 : auto-alimentation du référentiel cible depuis ROME ───────────

class RomeSyncResult(BaseModel):
    available: bool
    rome_code: Optional[str] = None
    rome_libelle: Optional[str] = None
    source: Optional[str] = None          # "groq" | "fallback"
    rome_principales: List[str] = []
    rome_emergentes: List[str] = []
    core: List[dict] = []                 # compétences cœur proposées (skill, level)
    emerging: List[dict] = []             # compétences émergentes proposées
    applied: bool = False
    written: int = 0
    reason: Optional[str] = None


@router.post("/standards/{job_standard_id}/sync-rome", response_model=RomeSyncResult)
async def sync_standard_from_rome(
    job_standard_id: int,
    apply: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:edit")),
):
    """Dérive (et applique si apply=true) le profil de compétences cibles d'un
    emploi-type depuis l'API ROME (savoir-faire → compétences atomiques, via LLM)."""
    from ..models.job_standard import JobStandard
    from ..services.rome_sync import propose_from_rome, apply_proposal

    js = db.get(JobStandard, job_standard_id)
    if not js:
        raise HTTPException(status_code=404, detail="Emploi-type introuvable")
    if not js.rome_code:
        raise HTTPException(status_code=400, detail="Cet emploi-type n'a pas de code ROME")

    proposal = propose_from_rome(db, js.rome_code)
    applied, written = False, 0
    if proposal.get("available") and apply:
        written = apply_proposal(db, job_standard_id, proposal)
        applied = True

    return RomeSyncResult(
        available=proposal.get("available", False),
        rome_code=proposal.get("rome_code"),
        rome_libelle=proposal.get("rome_libelle"),
        source=proposal.get("source"),
        rome_principales=proposal.get("rome_principales", []),
        rome_emergentes=proposal.get("rome_emergentes", []),
        core=proposal.get("core", []),
        emerging=proposal.get("emerging", []),
        applied=applied, written=written,
        reason=proposal.get("reason"),
    )


# ─── Phase 3 : vivier interne d'une cible (qualifiés + potentiels + à former) ─

@router.get("/targets/{target_id}/pool")
async def target_internal_pool(
    target_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:view")),
):
    """Vivier interne pour une cible d'effectif : collaborateurs déjà qualifiés et
    potentiels à former (avec, pour chacun, les compétences à développer)."""
    from ..models.workforce_target import WorkforceTarget
    from ..models.job_standard import JobStandard, JobStandardRequirement
    from ..services.forecast import build_pool

    cid = _require_company(db, current_user)
    target = (
        db.query(WorkforceTarget)
        .options(
            joinedload(WorkforceTarget.job_standard)
            .joinedload(JobStandard.skills_requirements)
            .joinedload(JobStandardRequirement.skill)
        )
        .filter(WorkforceTarget.id == target_id, WorkforceTarget.company_id == cid)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Cible introuvable")

    employees = (
        db.query(Employee)
        .options(joinedload(Employee.skills).joinedload(EmployeeSkill.skill))
        .filter(Employee.company_id == cid)
        .all()
    )
    return build_pool(target, employees)


@router.get("/targets/{target_id}/mobility/{employee_id}")
async def target_mobility_explain(
    target_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:view")),
):
    """Explication (LLM) de la mobilité d'un collaborateur vers une cible : atouts,
    compétences à développer, proximité — aide à la décision (ne prescrit pas de formation nommée)."""
    from ..models.workforce_target import WorkforceTarget
    from ..models.job_standard import JobStandard, JobStandardRequirement
    from ..services.forecast import assess_employee
    from ..services.forecast_synthesis import build_mobility_explanation

    cid = _require_company(db, current_user)
    target = (
        db.query(WorkforceTarget)
        .options(
            joinedload(WorkforceTarget.job_standard)
            .joinedload(JobStandard.skills_requirements)
            .joinedload(JobStandardRequirement.skill)
        )
        .filter(WorkforceTarget.id == target_id, WorkforceTarget.company_id == cid)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Cible introuvable")
    employee = (
        db.query(Employee)
        .options(joinedload(Employee.skills).joinedload(EmployeeSkill.skill))
        .filter(Employee.id == employee_id, Employee.company_id == cid)
        .first()
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Collaborateur introuvable")

    a = assess_employee(target, employee)
    text, source = build_mobility_explanation(a)
    return {**a, "explanation": text, "source": source}
