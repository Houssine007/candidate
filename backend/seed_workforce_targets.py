"""
Seed démo — GPEC prévisionnelle sur le tenant « Atlas Software » (company 10).

Crée / met à jour 3 emplois-types cibles (JobStandard) avec des compétences
ATOMIQUES alignées sur les compétences réellement détenues par les employés
d'Atlas (sinon tout le monde scorerait 0), dont 1 compétence ÉMERGENTE par métier,
puis 3 cibles d'effectif (WorkforceTarget) avec horizon.

Calibré pour : Data Scientist (partiel), Cybersécurité (critique), DevOps (partiel).

Usage :  venv\\Scripts\\python.exe seed_workforce_targets.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from app.core.database import SessionLocal
from app.models.company import Company
from app.models.organization import OrgUnit
from app.models.skill import Skill
from app.models.job_standard import JobStandard, JobStandardRequirement
from app.models.workforce_target import WorkforceTarget

COMPANY_NAME = "Atlas Software"

# emploi-type : rome, titre, catégorie, [(skill, niveau, obligatoire, émergent)]
STANDARDS = [
    ("M1403", "Data Scientist", "Data / IA", [
        ("Python", 4, True, False), ("Machine Learning", 3, True, False),
        ("SQL", 3, True, False), ("Pandas / NumPy", 3, False, False),
        ("Modèles de langage (LLM)", 3, False, True)]),   # émergente
    ("M1802", "Ingénieur / Ingénieure Cybersécurité", "Sécurité", [
        ("Cybersécurité", 3, True, False), ("Pentesting / Tests d'intrusion", 3, True, False),
        ("SIEM / SOC", 2, False, False), ("Cryptographie", 2, False, True)]),  # émergente
    ("M1801_DO", "Ingénieur / Ingénieure DevOps / SRE", "DevOps", [
        ("Docker", 4, True, False), ("Kubernetes", 3, True, False),
        ("AWS", 3, True, False), ("Terraform", 2, False, False),
        ("CI/CD (GitHub Actions, GitLab CI)", 3, False, True)]),  # émergente
]

# cible : rome, effectif cible, horizon, unité, priorité
TARGETS = [
    ("M1403", 4, "2026", "Pôle Data & IA", 1),
    ("M1802", 2, "2026", "Pôle Cybersécurité", 1),
    ("M1801_DO", 3, "T+18m", "Pôle DevOps & Cloud", 2),
]


def main():
    db = SessionLocal()
    try:
        company = db.query(Company).filter(Company.name == COMPANY_NAME).first()
        if not company:
            print(f"❌ Entreprise '{COMPANY_NAME}' introuvable — lance d'abord seed_demo_tech.py")
            return
        cid = company.id

        std_by_rome = {}
        for rome, title, cat, skills in STANDARDS:
            js = db.query(JobStandard).filter(JobStandard.rome_code == rome).first()
            if not js:
                js = JobStandard(title=title, rome_code=rome, category=cat,
                                 description=f"Fiche emploi-type cible : {title}.")
                db.add(js)
                db.flush()
            # (Ré)aligne les exigences sur des compétences atomiques
            db.query(JobStandardRequirement).filter(
                JobStandardRequirement.job_standard_id == js.id).delete()
            for sname, lvl, mand, emergent in skills:
                sk = db.query(Skill).filter(Skill.name == sname).first()
                if not sk:
                    print(f"  ⚠️ skill absente, ignorée : {sname}")
                    continue
                db.add(JobStandardRequirement(
                    job_standard_id=js.id, skill_id=sk.id, min_level=lvl,
                    is_mandatory=mand, is_emergent=emergent))
            std_by_rome[rome] = js
        db.flush()
        print(f"✅ {len(std_by_rome)} emplois-types cibles (JobStandard) prêts")

        n = 0
        for rome, headcount, horizon, unit_name, prio in TARGETS:
            js = std_by_rome[rome]
            unit = db.query(OrgUnit).filter(
                OrgUnit.company_id == cid, OrgUnit.name == unit_name).first()
            t = db.query(WorkforceTarget).filter(
                WorkforceTarget.company_id == cid,
                WorkforceTarget.job_standard_id == js.id).first()
            if not t:
                t = WorkforceTarget(company_id=cid, job_standard_id=js.id)
                db.add(t)
            t.org_unit_id = unit.id if unit else None
            t.target_headcount = headcount
            t.horizon = horizon
            t.priority = prio
            t.status = "active"
            n += 1
        db.commit()
        print(f"✅ {n} cibles d'effectif (WorkforceTarget) pour {COMPANY_NAME} (company {cid})")
        print("→ Vérifie : GET /api/gpec/forecast (login claire.fontaine@atlas-software.com)")
    except Exception as e:
        db.rollback()
        print(f"❌ {e}")
        import traceback; traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
