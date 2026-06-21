"""
Seed de DÉMO réaliste — tenant « Atlas Software » (éditeur SaaS B2B, Lyon).

Crée un tenant complet et autonome pour tester/présenter la plateforme :
  • 1 entreprise + organigramme hiérarchique (Directions → Pôles)
  • 1 recruteur propriétaire (login principal) + 12 employés réels avec compétences
  • 7 appels d'offre (offres) avec exigences de compétences
  • 10 profils candidats réalistes + candidatures réparties sur tout le pipeline
    (APPLIED / PENDING / REVIEWING / SHORTLISTED / REJECTED / ACCEPTED)

Le dataset est calibré pour produire :
  • une GPEC parlante (Kubernetes / Machine Learning / Cybersécurité en tension),
  • du matching fit + potentiel crédible côté recruteur.

⚠️ N'IMPACTE PAS company 9 (TechCorp Solutions) ni la démo Java « boucle vivante ».
Idempotent : ré-exécutable sans créer de doublons (clé = nom d'entreprise + emails).

Usage :  venv\\Scripts\\python.exe seed_demo_tech.py
Logins  :  tous les comptes ont le mot de passe  Test1234!
"""
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

backend_path = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_path))
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.recruiter import Recruiter
from app.models.job import Job, JobRequirement
from app.models.candidate import Candidate, CandidateSkill
from app.models.skill import Skill
from app.models.employee import Employee, EmployeeSkill
from app.models.organization import OrgUnit
from app.models.application import Application, ApplicationStatus
from app.models.permissions import InternalRole
from app.api.auth import get_password_hash
from app.services.permissions import init_company_roles, init_permissions
from normalize_skills import resolve_rome

PWD = "Test1234!"
DOMAIN = "atlas-software.com"
COMPANY_NAME = "Atlas Software"


# ─────────────────────────── Données ───────────────────────────

# Employés : (prénom, nom, intitulé, unité, rôle interne, xp, edu, manager, [(skill, niveau, ans, certifié)])
EMPLOYEES = [
    ("Thomas", "Moreau", "Lead Developer Backend", "Pôle Backend", "Manager", 9, 5, None, [
        ("Python", 4, 9, 1), ("FastAPI", 4, 6, 0), ("PostgreSQL", 4, 8, 0),
        ("Docker", 3, 5, 0), ("Microservices", 3, 4, 0), ("Git", 4, 9, 0),
        ("Anglais professionnel", 3, 9, 0)]),
    ("Inès", "Garcia", "Développeuse Backend", "Pôle Backend", "Collaborateur", 4, 5, "Thomas Moreau", [
        ("Python", 3, 4, 0), ("FastAPI", 3, 3, 0), ("PostgreSQL", 3, 4, 0),
        ("REST API", 3, 3, 0), ("Git", 3, 4, 0)]),
    ("Karim", "Haddad", "Développeur Backend Java", "Pôle Backend", "Collaborateur", 5, 5, "Thomas Moreau", [
        ("Java", 4, 5, 0), ("Spring Boot", 3, 4, 0), ("PostgreSQL", 3, 4, 0),
        ("Docker", 2, 2, 0), ("Git", 3, 5, 0)]),
    ("Léa", "Rousseau", "Lead Developer Frontend", "Pôle Frontend", "Manager", 7, 5, None, [
        ("React", 4, 7, 0), ("TypeScript", 4, 6, 0), ("Next.js", 4, 4, 0),
        ("Tailwind CSS", 4, 5, 0), ("JavaScript", 4, 7, 0), ("Git", 3, 7, 0)]),
    ("Hugo", "Lefèvre", "Développeur Frontend", "Pôle Frontend", "Collaborateur", 2, 4, "Léa Rousseau", [
        ("React", 3, 2, 0), ("TypeScript", 2, 2, 0), ("Tailwind CSS", 3, 2, 0),
        ("JavaScript", 3, 2, 0), ("Git", 2, 2, 0)]),
    ("Sarah", "Cohen", "Data Scientist", "Pôle Data & IA", "Collaborateur", 5, 5, None, [
        ("Python", 4, 5, 0), ("Machine Learning", 3, 4, 0), ("Pandas / NumPy", 4, 5, 0),
        ("SQL", 3, 5, 0), ("Scikit-learn", 3, 3, 0), ("Git", 2, 3, 0)]),
    ("Mehdi", "Tazi", "Data Engineer", "Pôle Data & IA", "Collaborateur", 4, 5, None, [
        ("Python", 3, 4, 0), ("SQL", 3, 4, 0), ("Spark / Hadoop", 2, 2, 0),
        ("Docker", 2, 2, 0), ("Git", 3, 4, 0)]),
    ("Antoine", "Girard", "Ingénieur DevOps", "Pôle DevOps & Cloud", "Manager", 6, 4, None, [
        ("Docker", 4, 6, 1), ("Kubernetes", 3, 4, 0), ("AWS", 3, 4, 1),
        ("Terraform", 3, 3, 0), ("Linux Administration", 4, 6, 0),
        ("CI/CD (GitHub Actions, GitLab CI)", 3, 4, 0), ("Git", 4, 6, 0)]),
    ("Nadia", "Slimani", "Ingénieure Cybersécurité", "Pôle Cybersécurité", "Collaborateur", 5, 5, None, [
        ("Cybersécurité", 3, 5, 0), ("Pentesting / Tests d'intrusion", 2, 2, 0),
        ("SIEM / SOC", 2, 2, 0), ("Python", 2, 3, 0), ("ISO 27001 / RGPD", 3, 4, 0)]),
    ("Julien", "Bernard", "Product Owner Senior", "Pôle Product Management", "Manager", 8, 5, None, [
        ("Agile/Scrum", 4, 8, 1), ("Product Management", 4, 6, 0),
        ("Roadmap produit", 4, 5, 0), ("JIRA / Confluence", 4, 6, 0)]),
    ("Camille", "Petit", "UX/UI Designer", "Pôle Design (UX/UI)", "Collaborateur", 4, 4, None, [
        ("Figma", 4, 4, 0), ("UX Design", 3, 4, 0), ("UI Design", 3, 4, 0),
        ("Prototypage", 3, 3, 0), ("Design System", 3, 2, 0), ("User Research", 3, 3, 0)]),
    ("Aurélie", "Marchand", "Chargée de Recrutement & RH", "Direction RH", "RH / Recruteur", 6, 5, None, [
        ("Recrutement", 4, 6, 0), ("GPEC / GEPP", 3, 4, 0),
        ("Gestion de la paie", 2, 3, 0), ("Droit du travail", 3, 4, 0)]),
]

# Organigramme : (nom, type, parent)
ORG_UNITS = [
    ("Direction Générale", "Direction", None),
    ("Direction Technique", "Direction", "Direction Générale"),
    ("Pôle Backend", "Pôle", "Direction Technique"),
    ("Pôle Frontend", "Pôle", "Direction Technique"),
    ("Pôle Data & IA", "Pôle", "Direction Technique"),
    ("Pôle DevOps & Cloud", "Pôle", "Direction Technique"),
    ("Pôle Cybersécurité", "Pôle", "Direction Technique"),
    ("Direction Produit", "Direction", "Direction Générale"),
    ("Pôle Product Management", "Pôle", "Direction Produit"),
    ("Pôle Design (UX/UI)", "Pôle", "Direction Produit"),
    ("Direction RH", "Direction", "Direction Générale"),
]
# Manager d'unité (par nom d'employé)
UNIT_MANAGERS = {
    "Pôle Backend": "Thomas Moreau",
    "Pôle Frontend": "Léa Rousseau",
    "Pôle DevOps & Cloud": "Antoine Girard",
    "Pôle Product Management": "Julien Bernard",
}

# Offres : (titre, unité, type contrat, xp, edu, sal_min, sal_max, start, [bénéfices], [(skill, niveau, mandatory)])
BENEFITS = ["Télétravail hybride (3j/sem)", "Tickets restaurant", "Mutuelle premium", "Budget formation 1500€/an", "RTT"]
JOBS = [
    ("Ingénieur DevOps / SRE (H/F)", "Pôle DevOps & Cloud", "CDI", 4, 4, 50000, 65000, "Dès que possible", BENEFITS, [
        ("Docker", 4, True), ("Kubernetes", 3, True), ("AWS", 3, True),
        ("Terraform", 2, False), ("Linux Administration", 3, False), ("Git", 3, False)]),
    ("Data Scientist Senior (H/F)", "Pôle Data & IA", "CDI", 5, 5, 55000, 70000, "Dès que possible", BENEFITS, [
        ("Python", 4, True), ("Machine Learning", 3, True), ("SQL", 3, True),
        ("Pandas / NumPy", 3, False), ("Spark / Hadoop", 2, False)]),
    ("Développeur Backend Python (H/F)", "Pôle Backend", "CDI", 3, 5, 42000, 52000, "01/09/2026", BENEFITS, [
        ("Python", 3, True), ("FastAPI", 3, True), ("PostgreSQL", 3, True),
        ("Docker", 2, False), ("Git", 3, False)]),
    ("Développeur Frontend React (H/F)", "Pôle Frontend", "CDI", 2, 4, 38000, 48000, "Dès que possible", BENEFITS, [
        ("React", 3, True), ("TypeScript", 3, True), ("Next.js", 2, False), ("Tailwind CSS", 3, False)]),
    ("Ingénieur Cybersécurité (H/F)", "Pôle Cybersécurité", "CDI", 4, 5, 50000, 66000, "Dès que possible", BENEFITS, [
        ("Cybersécurité", 3, True), ("Pentesting / Tests d'intrusion", 3, True),
        ("SIEM / SOC", 2, False), ("ISO 27001 / RGPD", 2, False)]),
    ("Product Owner (H/F)", "Pôle Product Management", "CDI", 5, 5, 50000, 62000, "Dès que possible", BENEFITS, [
        ("Agile/Scrum", 4, True), ("Product Management", 3, True), ("Roadmap produit", 3, False)]),
    ("Alternant Développeur Fullstack (H/F)", "Pôle Backend", "Alternance", 0, 3, 12000, 15000, "01/09/2026",
     ["Télétravail hybride", "Tickets restaurant", "Tuteur dédié"], [
        ("Python", 2, True), ("React", 2, True), ("Git", 1, False)]),
]

# Candidats : (prénom, nom, email, titre, ville, xp, edu, bio, [(skill, niveau, ans)], [(offre_titre, statut)])
CANDIDATES = [
    ("Romain", "Faure", "romain.faure@gmail.com", "Ingénieur DevOps · 5 ans", "Lyon", 5, 5,
     "Ingénieur DevOps passionné par l'automatisation et la fiabilité des plateformes cloud.",
     [("Docker", 4, 5), ("Kubernetes", 4, 4), ("AWS", 3, 4), ("Terraform", 3, 3),
      ("Linux Administration", 3, 4), ("Git", 4, 5)],
     [("Ingénieur DevOps / SRE (H/F)", "REVIEWING")]),
    ("Élodie", "Lambert", "elodie.lambert@outlook.fr", "Administratrice Systèmes & Réseaux", "Grenoble", 3, 4,
     "Administratrice systèmes souhaitant évoluer vers une fonction DevOps / Cloud.",
     [("Docker", 3, 3), ("AWS", 2, 2), ("Linux Administration", 3, 3), ("Git", 3, 3)],
     [("Ingénieur DevOps / SRE (H/F)", "PENDING")]),
    ("Yanis", "Bouzid", "yanis.bouzid@gmail.com", "Data Scientist · 6 ans", "Paris", 6, 5,
     "Data Scientist senior, expert en modèles prédictifs et industrialisation ML.",
     [("Python", 4, 6), ("Machine Learning", 4, 5), ("SQL", 4, 6), ("Pandas / NumPy", 4, 5),
      ("Spark / Hadoop", 3, 3), ("Scikit-learn", 4, 4)],
     [("Data Scientist Senior (H/F)", "SHORTLISTED")]),
    ("Clara", "Nguyen", "clara.nguyen@gmail.com", "Data Analyst", "Lyon", 3, 5,
     "Data Analyst orientée business intelligence, en montée en compétences sur le ML.",
     [("Python", 3, 3), ("SQL", 3, 3), ("Pandas / NumPy", 3, 3), ("Machine Learning", 1, 1)],
     [("Data Scientist Senior (H/F)", "PENDING")]),
    ("Maxime", "Dubois", "maxime.dubois.dev@gmail.com", "Développeur Backend Python · 4 ans", "Lyon", 4, 5,
     "Développeur backend Python/FastAPI, adepte du clean code et des tests automatisés.",
     [("Python", 4, 4), ("FastAPI", 3, 3), ("PostgreSQL", 3, 4), ("Docker", 3, 3), ("Git", 3, 4)],
     [("Développeur Backend Python (H/F)", "REVIEWING")]),
    ("Sofia", "Da Silva", "sofia.dasilva@gmail.com", "Développeuse Frontend React · 3 ans", "Lyon", 3, 4,
     "Développeuse frontend spécialisée React/Next.js et design systems.",
     [("React", 4, 3), ("TypeScript", 3, 3), ("Next.js", 3, 2), ("Tailwind CSS", 4, 3), ("JavaScript", 3, 3)],
     [("Développeur Frontend React (H/F)", "SHORTLISTED")]),
    ("Lucas", "Robert", "lucas.robert.sec@gmail.com", "Pentester / Analyste SOC · 4 ans", "Paris", 4, 5,
     "Spécialiste cybersécurité offensive, certifié, expérience SOC et tests d'intrusion.",
     [("Cybersécurité", 3, 4), ("Pentesting / Tests d'intrusion", 3, 3), ("SIEM / SOC", 3, 3),
      ("Python", 2, 2), ("ISO 27001 / RGPD", 2, 2)],
     [("Ingénieur Cybersécurité (H/F)", "REVIEWING")]),
    ("Emma", "Leroy", "emma.leroy@etu.univ-lyon.fr", "Étudiante M1 Informatique", "Lyon", 1, 3,
     "Étudiante en Master Informatique, recherche une alternance en développement fullstack.",
     [("Python", 2, 1), ("React", 2, 1), ("Git", 2, 1), ("JavaScript", 2, 1)],
     [("Alternant Développeur Fullstack (H/F)", "APPLIED")]),
    ("Nora", "Benkacem", "nora.benkacem@gmail.com", "Développeuse Fullstack Junior", "Villeurbanne", 2, 5,
     "Développeuse junior polyvalente, à l'aise sur le front comme sur le back.",
     [("Python", 2, 2), ("React", 3, 2), ("FastAPI", 2, 1), ("Git", 2, 2)],
     [("Développeur Backend Python (H/F)", "REJECTED"), ("Alternant Développeur Fullstack (H/F)", "PENDING")]),
    ("Paul", "Mercier", "paul.mercier.dev@gmail.com", "Lead Backend · 8 ans", "Lyon", 8, 5,
     "Lead développeur backend, architecture microservices et mentoring d'équipe.",
     [("Python", 4, 8), ("FastAPI", 4, 5), ("PostgreSQL", 4, 7), ("Docker", 3, 4),
      ("Microservices", 3, 4), ("Git", 4, 8)],
     [("Développeur Backend Python (H/F)", "ACCEPTED")]),
]


# ─────────────────────────── Helpers ───────────────────────────

def get_or_create_user(db, email, full_name, role):
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(email=email, password=get_password_hash(PWD), full_name=full_name,
                 role=role, is_active=True)
        db.add(u)
        db.flush()
    return u


def get_or_create_skill(db, name, cache):
    if name in cache:
        return cache[name]
    s = db.query(Skill).filter(Skill.name == name).first()
    if not s:
        s = Skill(name=name)
        rome, category = resolve_rome(s, use_api=False)
        s.rome_code, s.category = rome, category
        db.add(s)
        db.flush()
        print(f"   + skill créé : {name} ({category})")
    cache[name] = s
    return s


# ─────────────────────────── Seed ───────────────────────────

def seed():
    db = SessionLocal()
    skill_cache = {}
    try:
        print("🚀 Seed démo « Atlas Software »…")
        init_permissions(db)

        # 1) Entreprise
        company = db.query(Company).filter(Company.name == COMPANY_NAME).first()
        if not company:
            company = Company(
                name=COMPANY_NAME,
                industry="Édition de logiciels SaaS B2B",
                description="Éditeur de solutions SaaS pour la gestion de la donnée d'entreprise. "
                            "Plateforme cloud-native, équipes produit et tech intégrées.",
                website="https://atlas-software.io",
                location="Lyon, France",
                size="200-500",
            )
            db.add(company)
            db.flush()
        cid = company.id
        print(f"✅ Entreprise : {company.name} (id={cid})")

        # 2) Rôles internes
        if not db.query(InternalRole).filter(InternalRole.company_id == cid).first():
            init_company_roles(db, cid)
        roles = {r.name: r for r in db.query(InternalRole).filter(InternalRole.company_id == cid).all()}

        # 3) Recruteur propriétaire (login principal)
        owner_email = f"claire.fontaine@{DOMAIN}"
        owner_user = get_or_create_user(db, owner_email, "Claire Fontaine", UserRole.RECRUITER)
        recruiter = db.query(Recruiter).filter(Recruiter.user_id == owner_user.id).first()
        if not recruiter:
            recruiter = Recruiter(user_id=owner_user.id, company_id=cid,
                                  position="Directrice des Ressources Humaines", hiring_authority=True)
            db.add(recruiter)
            db.flush()
        print(f"✅ Recruteur propriétaire : {owner_email}")

        # 4) Organigramme
        units = {}
        for name, utype, parent in ORG_UNITS:
            u = db.query(OrgUnit).filter(OrgUnit.name == name, OrgUnit.company_id == cid).first()
            if not u:
                u = OrgUnit(name=name, unit_type=utype, company_id=cid,
                            parent_id=units[parent].id if parent else None)
                db.add(u)
                db.flush()
            units[name] = u
        print(f"✅ Organigramme : {len(units)} unités")

        # 5) Employés
        emp_by_name = {}
        for fname, lname, title, unit, role_name, xp, edu, _mgr, eskills in EMPLOYEES:
            email = f"{fname}.{lname}@{DOMAIN}".lower().replace(" ", "").replace("è", "e").replace("é", "e").replace("ï", "i")
            u = get_or_create_user(db, email, f"{fname} {lname}", UserRole.EMPLOYEE)
            emp = db.query(Employee).filter(Employee.user_id == u.id).first()
            if not emp:
                emp = Employee(
                    user_id=u.id, company_id=cid, first_name=fname, last_name=lname, email=email,
                    job_title=title, org_unit_id=units[unit].id,
                    internal_role_id=roles[role_name].id, years_of_experience=xp, education_level=edu,
                    hire_date=datetime.utcnow() - timedelta(days=int(xp * 200)),
                )
                db.add(emp)
                db.flush()
                for sname, lvl, yrs, cert in eskills:
                    sk = get_or_create_skill(db, sname, skill_cache)
                    db.add(EmployeeSkill(employee_id=emp.id, skill_id=sk.id, level=lvl,
                                         years_experience=yrs, certified=cert,
                                         last_used=datetime.utcnow()))
            emp_by_name[f"{fname} {lname}"] = emp
        db.flush()
        print(f"✅ Employés : {len(emp_by_name)} (+ compétences)")

        # 5b) Liens hiérarchiques (manager_id employé + manager d'unité)
        for fname, lname, title, unit, role_name, xp, edu, mgr, eskills in EMPLOYEES:
            if mgr and mgr in emp_by_name:
                emp_by_name[f"{fname} {lname}"].manager_id = emp_by_name[mgr].id
        for unit_name, mgr_name in UNIT_MANAGERS.items():
            if mgr_name in emp_by_name:
                units[unit_name].manager_id = emp_by_name[mgr_name].id
        db.flush()

        # 6) Offres
        job_by_title = {}
        for title, unit, ctype, xp, edu, smin, smax, start, benefits, reqs in JOBS:
            job = db.query(Job).filter(Job.title == title, Job.company_id == cid).first()
            if not job:
                job = Job(
                    title=title,
                    description=f"Au sein du {unit}, vous rejoignez Atlas Software pour contribuer à notre "
                                f"plateforme SaaS. Poste {ctype} basé à Lyon (télétravail hybride).",
                    company=company.name, company_id=cid, recruiter_id=recruiter.id,
                    org_unit_id=units[unit].id, location="Lyon / Remote",
                    salary_min=smin, salary_max=smax, min_years_experience=xp, min_education_level=edu,
                    contract_type=ctype, start_date=start, benefits=benefits,
                )
                db.add(job)
                db.flush()
                for sname, lvl, mand in reqs:
                    sk = get_or_create_skill(db, sname, skill_cache)
                    db.add(JobRequirement(job_id=job.id, skill_id=sk.id, required_level=lvl, is_mandatory=mand))
            job_by_title[title] = job
        print(f"✅ Offres : {len(job_by_title)} (+ exigences)")

        # 7) Candidats + candidatures
        n_apps = 0
        for fname, lname, email, ctitle, city, xp, edu, bio, cskills, apps in CANDIDATES:
            u = get_or_create_user(db, email, f"{fname} {lname}", UserRole.CANDIDATE)
            c = db.query(Candidate).filter(Candidate.user_id == u.id).first()
            if not c:
                c = Candidate(
                    user_id=u.id, first_name=fname, last_name=lname, email=email,
                    years_of_experience=xp, education_level=edu, bio=bio, job_title=ctitle, location=city,
                    remote_ok=True, is_active=True, is_visible=True,
                    onboarding_step=4, onboarding_completed_at=datetime.utcnow(),
                    profile_completeness_score=0.9,
                )
                db.add(c)
                db.flush()
                for sname, lvl, yrs in cskills:
                    sk = get_or_create_skill(db, sname, skill_cache)
                    db.add(CandidateSkill(candidate_id=c.id, skill_id=sk.id, level=lvl, years_experience=yrs))
            for job_title, status in apps:
                job = job_by_title[job_title]
                exists = db.query(Application).filter(
                    Application.candidate_id == c.id, Application.job_id == job.id).first()
                if not exists:
                    db.add(Application(candidate_id=c.id, job_id=job.id,
                                       status=ApplicationStatus[status],
                                       cover_letter=f"Bonjour, je suis très intéressé(e) par le poste de {job_title}."))
                    n_apps += 1
        print(f"✅ Candidats : {len(CANDIDATES)} | Candidatures : {n_apps}")

        db.commit()
        print("\n✨ SEED DÉMO TERMINÉ.")
        print("─" * 60)
        print(f"  Entreprise   : {COMPANY_NAME} (company_id={cid})")
        print(f"  🔑 RECRUTEUR (login principal) : {owner_email}  /  {PWD}")
        print(f"  🔑 EMPLOYÉ  ex : thomas.moreau@{DOMAIN}  /  {PWD}")
        print(f"  🔑 CANDIDAT ex : romain.faure@gmail.com  /  {PWD}")
        print("─" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ ERREUR : {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
