import sys
import os
from pathlib import Path

# Ajouter le chemin du backend pour les imports
backend_path = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_path))

from sqlalchemy.orm import Session
from sqlalchemy import delete
from app.core.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.recruiter import Recruiter
from app.models.job import Job, JobRequirement
from app.models.candidate import Candidate, CandidateSkill
from app.models.skill import Skill
from app.models.employee import Employee
from app.models.organization import OrgUnit
from app.models.permissions import Permission, InternalRole, role_permissions
from app.api.auth import get_password_hash
from app.services.permissions import init_company_roles, init_permissions
from datetime import datetime

def seed():
    db = SessionLocal()
    try:
        print("🚀 DEBUT DU SEEDING COMPLET & REALISTE...")

        # 1. Initialiser les permissions globales (système)
        init_permissions(db)
        print("✅ Permissions système initialisées")

        # 2. Création de l'entreprise TechCorp
        company = db.query(Company).filter(Company.name == "TechCorp").first()
        if not company:
            company = Company(
                name="TechCorp",
                industry="Informatique & SaaS",
                description="Leader européen des solutions HR-Tech innovantes.",
                website="https://techcorp.io",
                location="Paris, France",
                size="100-500"
            )
            db.add(company)
            db.flush()
            print(f"✅ Entreprise créée : {company.name}")
        
        # S'assurer que les rôles internes existent pour cette entreprise
        existing_roles = db.query(InternalRole).filter(InternalRole.company_id == company.id).all()
        if not existing_roles:
            init_company_roles(db, company.id)
            print(f"✅ Rôles par défaut initialisés pour {company.name}")
        
        roles_dict = {r.name: r for r in db.query(InternalRole).filter(InternalRole.company_id == company.id).all()}

        # 3. Création des Utilisateurs types
        user_data = [
            ("recruiter@techcorp.com", "Jean Recruteur", UserRole.RECRUITER),
            ("ceo@techcorp.com", "Marc Boss", UserRole.RECRUITER),
            ("dev-manager@techcorp.com", "Alice Tech", UserRole.RECRUITER),
            ("hr-assistant@techcorp.com", "Sophie RH", UserRole.RECRUITER),
        ]

        users = {}
        for email, name, role in user_data:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    email=email,
                    password=get_password_hash("password123"),
                    full_name=name,
                    role=role,
                    is_active=True
                )
                db.add(u)
                db.flush()
            users[email] = u
        print(f"✅ {len(user_data)} Utilisateurs système vérifiés/créés")

        # 4. Création des profils Recruteurs
        for email, u in users.items():
            r = db.query(Recruiter).filter(Recruiter.user_id == u.id).first()
            if not r:
                r = Recruiter(
                    user_id=u.id,
                    company_id=company.id,
                    position="Manager" if "manager" in email else ("CEO" if "ceo" in email else "HR"),
                    hiring_authority=True
                )
                db.add(r)
        db.flush()

        # 5. Structure Organisationnelle (OrgUnits)
        print("🏢 Construction de l'organigramme...")
        
        # Directions
        directions = [
            ("Direction Technique", "Direction", None),
            ("Produit & Design", "Direction", None),
            ("Relations Humaines", "Direction", None)
        ]
        
        for name, utype, _ in directions:
            unit = db.query(OrgUnit).filter(OrgUnit.name == name, OrgUnit.company_id == company.id).first()
            if not unit:
                unit = OrgUnit(name=name, unit_type=utype, company_id=company.id)
                db.add(unit)
                db.flush()
        
        # Récupérer les IDs des directions pour les parents
        parents = {u.name: u.id for u in db.query(OrgUnit).filter(OrgUnit.company_id == company.id).all()}
        
        # Sous-unités (Squads)
        squads = [
            ("Squad Backend", "Squad", parents["Direction Technique"]),
            ("Squad Frontend", "Squad", parents["Direction Technique"]),
            ("Squad DevOps", "Squad", parents["Direction Technique"])
        ]
        
        for name, utype, pid in squads:
            unit = db.query(OrgUnit).filter(OrgUnit.name == name, OrgUnit.company_id == company.id).first()
            if not unit:
                db.add(OrgUnit(name=name, unit_type=utype, company_id=company.id, parent_id=pid))
        
        db.flush()
        units_dict = {u.name: u for u in db.query(OrgUnit).filter(OrgUnit.company_id == company.id).all()}

        # 6. Création des Employés Internes
        print("👥 Création des employés internes...")
        employee_data = [
            ("recruiter@techcorp.com", "Jean", "Recruteur", "HR Manager", "Relations Humaines", "Administrateur"),
            ("ceo@techcorp.com", "Marc", "Boss", "CEO", None, "Administrateur"),
            ("dev-manager@techcorp.com", "Alice", "Tech", "VP Engineering", "Direction Technique", "Manager"),
            ("hr-assistant@techcorp.com", "Sophie", "RH", "Chargée de Recrutement", "Relations Humaines", "RH / Recruteur"),
        ]

        for email, fname, lname, title, unit_name, role_name in employee_data:
            u = users[email]
            emp = db.query(Employee).filter(Employee.user_id == u.id).first()
            if not emp:
                emp = Employee(
                    user_id=u.id,
                    company_id=company.id,
                    first_name=fname,
                    last_name=lname,
                    email=email,
                    job_title=title,
                    org_unit_id=units_dict[unit_name].id if unit_name else None,
                    internal_role_id=roles_dict[role_name].id if role_name in roles_dict else None,
                    hire_date=datetime.utcnow()
                )
                db.add(emp)
            else:
                # Mise à jour forcée pour garantir le fonctionnement du test
                emp.org_unit_id = units_dict[unit_name].id if unit_name else None
                emp.internal_role_id = roles_dict[role_name].id if role_name in roles_dict else None
                emp.job_title = title
        db.flush()

        # 7. Skills & Jobs (Plus réalistes)
        print("🛠️ Configuration des Skills et Offres...")
        skills_raw = {
            "Python": "Bakend", "FastAPI": "Backend", "PostgreSQL": "Database",
            "React": "Frontend", "Next.js": "Frontend", "TypeScript": "Frontend",
            "Tailwind CSS": "Frontend", "Docker": "DevOps", "Kubernetes": "DevOps",
            "AWS": "Cloud", "Git": "Tools", "Agile/Scrum": "Soft Skills"
        }
        skill_objs = {}
        for name, cat in skills_raw.items():
            s = db.query(Skill).filter(Skill.name == name).first()
            if not s:
                s = Skill(name=name, category=cat)
                db.add(s)
                db.flush()
            skill_objs[name] = s

        jobs_raw = [
            {
                "title": "Senior Backend Architect",
                "unit": "Squad Backend",
                "xp": 6, "edu": 5, "salary": (65000, 85000),
                "skills": [("Python", 4, True), ("FastAPI", 4, True), ("PostgreSQL", 3, True), ("AWS", 2, False)]
            },
            {
                "title": "Fullstack Developer (Next.js)",
                "unit": "Squad Frontend",
                "xp": 3, "edu": 3, "salary": (45000, 55000),
                "skills": [("React", 4, True), ("Next.js", 3, True), ("TypeScript", 3, True), ("Tailwind CSS", 3, False)]
            },
            {
                "title": "DevOps Engineer",
                "unit": "Squad DevOps",
                "xp": 4, "edu": 4, "salary": (55000, 75000),
                "skills": [("Docker", 4, True), ("Kubernetes", 3, True), ("AWS", 3, True), ("Git", 4, True)]
            },
            {
                "title": "Junior Python Developer",
                "unit": "Squad Backend",
                "xp": 1, "edu": 5, "salary": (38000, 42000),
                "skills": [("Python", 2, True), ("Git", 2, True), ("FastAPI", 1, False)]
            },
             {
                "title": "Product Owner",
                "unit": "Produit & Design",
                "xp": 5, "edu": 5, "salary": (50000, 65000),
                "skills": [("Agile/Scrum", 5, True), ("Git", 2, False)]
            },
        ]

        main_recruiter = db.query(Recruiter).filter(Recruiter.user_id == users["recruiter@techcorp.com"].id).first()

        for jd in jobs_raw:
            existing_job = db.query(Job).filter(Job.title == jd["title"], Job.company_id == company.id).first()
            if not existing_job:
                job = Job(
                    title=jd["title"],
                    description=f"Nous recherchons un {jd['title']} talentueux pour rejoindre notre équipe {jd['unit']}.",
                    location="Paris / Remote",
                    salary_min=jd["salary"][0],
                    salary_max=jd["salary"][1],
                    company=company.name,
                    company_id=company.id,
                    recruiter_id=main_recruiter.id,
                    org_unit_id=units_dict[jd["unit"]].id,
                    min_years_experience=jd["xp"],
                    min_education_level=jd["edu"]
                )
                db.add(job)
                db.flush()
                for sname, level, mandatory in jd["skills"]:
                    db.add(JobRequirement(
                        job_id=job.id, skill_id=skill_objs[sname].id,
                        required_level=level, is_mandatory=mandatory
                    ))
        
        # 8. Candidats Diversifiés pour le Matching
        print("🎯 Création de candidats pour test de matching...")
        candidates_data = [
            ("Houssine", "Expert", "houssine@candidate.com", 7, 5, [("Python", 4, 7), ("FastAPI", 4, 3), ("PostgreSQL", 4, 5)]),
            ("Marie", "Frontend", "marie@test.com", 4, 3, [("React", 4, 4), ("TypeScript", 4, 3), ("Next.js", 3, 2)]),
            ("Thomas", "DevOps", "thomas@test.com", 5, 4, [("Docker", 4, 5), ("Kubernetes", 4, 4), ("AWS", 3, 3)]),
            ("Kevin", "Junior", "kevin@test.com", 1, 5, [("Python", 2, 1), ("Git", 2, 1)]),
        ]

        for fname, lname, email, xp, edu, cskills in candidates_data:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(email=email, password=get_password_hash("password123"), full_name=f"{fname} {lname}", role=UserRole.CANDIDATE)
                db.add(u)
                db.flush()
            
            c = db.query(Candidate).filter(Candidate.user_id == u.id).first()
            if not c:
                c = Candidate(
                    user_id=u.id, first_name=fname, last_name=lname, email=email,
                    years_of_experience=xp, education_level=edu, is_active=True, is_visible=True
                )
                db.add(c)
                db.flush()
                for sname, level, sxp in cskills:
                    db.add(CandidateSkill(candidate_id=c.id, skill_id=skill_objs[sname].id, level=level, years_experience=sxp))

        db.commit()
        print("✨ SEEDING TERMINE AVEC SUCCES !")
        print("🔑 Identifiants Recruteur : recruiter@techcorp.com / password123")
        print("🔑 Identifiants Candidat : houssine@candidate.com / password123")

    except Exception as e:
        print(f"❌ ERREUR FATALE LORS DU SEEDING : {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
