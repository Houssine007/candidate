from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import (
    User, Candidate, Recruiter, Company, Job, 
    JobRequirement, Skill, CandidateSkill, Application, ApplicationStatus
)
from app.api.auth import get_password_hash
from datetime import datetime, timedelta

def seed_simulation():
    db = SessionLocal()
    try:
        print("🌱 Début de la simulation de données réalistes...")

        # 1. Compétences de base
        skills_data = [
            {"name": "React", "category": "Frontend"},
            {"name": "Node.js", "category": "Backend"},
            {"name": "Python", "category": "Backend"},
            {"name": "FastAPI", "category": "Backend"},
            {"name": "TypeScript", "category": "Frontend"},
            {"name": "PostgreSQL", "category": "Database"},
            {"name": "Docker", "category": "DevOps"},
            {"name": "AWS", "category": "Cloud"},
            {"name": "UI/UX Design", "category": "Design"},
            {"name": "Project Management", "category": "Management"},
        ]
        
        db_skills = {}
        for s in skills_data:
            skill = db.query(Skill).filter(Skill.name == s["name"]).first()
            if not skill:
                skill = Skill(**s)
                db.add(skill)
                db.flush()
            db_skills[s["name"]] = skill

        # 2. Entreprise
        company = db.query(Company).filter(Company.name == "TechCorp Solutions").first()
        if not company:
            company = Company(
                name="TechCorp Solutions",
                description="Leader européen des solutions SaaS pour la logistique.",
                website="https://techcorp.solutions",
                location="Paris, France"
            )
            db.add(company)
            db.flush()

        # 3. Recruteur (Yasser Zinedine)
        # On vérifie si l'utilisateur existe déjà
        user_email = "yasser@techcorp.com"
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            user = User(
                email=user_email,
                password=get_password_hash("password123"),
                full_name="Yasser Zinedine",
                role="RECRUITER"
            )
            db.add(user)
            db.flush()

        recruiter = db.query(Recruiter).filter(Recruiter.user_id == user.id).first()
        if not recruiter:
            recruiter = Recruiter(
                user_id=user.id,
                company_id=company.id,
                position="Directeur Général",
                hiring_authority=True
            )
            db.add(recruiter)
            db.flush()

        # 4. Offres d'emploi
        jobs_data = [
            {
                "title": "Développeur Fullstack Senior (React/Python)",
                "description": "Nous recherchons un talent capable de piloter nos développements front et back sur notre plateforme principale.",
                "location": "Paris (Hyrbide)",
                "salary_min": 60000,
                "salary_max": 75000,
                "min_years_experience": 5.0,
                "min_education_level": 5, # Master
                "requirements": [
                    {"skill": "React", "level": 4, "mandatory": True},
                    {"skill": "Python", "level": 4, "mandatory": True},
                    {"skill": "FastAPI", "level": 3, "mandatory": False},
                    {"skill": "TypeScript", "level": 3, "mandatory": True},
                ]
            },
            {
                "title": "Product Designer Senior",
                "description": "Rejoignez notre équipe design pour refondre l'expérience utilisateur de nos clients globaux.",
                "location": "Remote",
                "salary_min": 55000,
                "salary_max": 65000,
                "min_years_experience": 4.0,
                "min_education_level": 3,
                "requirements": [
                    {"skill": "UI/UX Design", "level": 4, "mandatory": True},
                    {"skill": "React", "level": 2, "mandatory": False}, # Notions
                ]
            },
            {
                "title": "Data Scientist Senior (MLOps)",
                "description": "Nous cherchons un expert en Machine Learning pour industrialiser nos modèles de prédiction de fraude.",
                "location": "Lyon (ou Remote)",
                "salary_min": 65000,
                "salary_max": 85000,
                "min_years_experience": 5.0,
                "min_education_level": 5,
                "requirements": [
                    {"skill": "Python", "level": 4, "mandatory": True},
                    {"skill": "Docker", "level": 3, "mandatory": True},
                    {"skill": "PostgreSQL", "level": 3, "mandatory": False},
                ]
            }
        ]

        for jd in jobs_data:
            job = db.query(Job).filter(Job.title == jd["title"]).first()
            if not job:
                job = Job(
                    title=jd["title"],
                    description=jd["description"],
                    location=jd["location"],
                    salary_min=jd["salary_min"],
                    salary_max=jd["salary_max"],
                    min_years_experience=jd["min_years_experience"],
                    min_education_level=jd["min_education_level"],
                    recruiter_id=recruiter.id,
                    company_id=company.id,
                    company="TechCorp Solutions"
                )
                db.add(job)
                db.flush()
                
                for req in jd["requirements"]:
                    jr = JobRequirement(
                        job_id=job.id,
                        skill_id=db_skills[req["skill"]].id,
                        required_level=req["level"],
                        is_mandatory=req["mandatory"]
                    )
                    db.add(jr)

        # 5. Candidats
        candidates_data = [
            {
                "full_name": "Thomas Martin",
                "email": "thomas.martin@email.com",
                "phone": "0601020304",
                "xp": 6.0,
                "edu": 5,
                "skills": [
                    {"skill": "React", "level": 4, "xp": 5.0},
                    {"skill": "Python", "level": 3, "xp": 3.0},
                    {"skill": "TypeScript", "level": 4, "xp": 4.0},
                ]
            },
            {
                "full_name": "Sophie Legrand",
                "email": "sophie.legrand@email.com",
                "phone": "0611223344",
                "xp": 4.5,
                "edu": 3,
                "skills": [
                    {"skill": "UI/UX Design", "level": 4, "xp": 4.0},
                    {"skill": "React", "level": 1, "xp": 1.0},
                ]
            },
            {
                "full_name": "Marc Dubois",
                "email": "marc.dubois@email.com",
                "phone": "0622334455",
                "xp": 8.0,
                "edu": 5,
                "skills": [
                    {"skill": "Python", "level": 4, "xp": 7.0},
                    {"skill": "Docker", "level": 4, "xp": 6.0},
                    {"skill": "PostgreSQL", "level": 4, "xp": 8.0},
                ]
            }
        ]

        for cd in candidates_data:
            c_user = db.query(User).filter(User.email == cd["email"]).first()
            if not c_user:
                c_user = User(
                    email=cd["email"],
                    password=get_password_hash("password123"),
                    full_name=cd["full_name"],
                    role="CANDIDATE"
                )
                db.add(c_user)
                db.flush()
            
            candidate = db.query(Candidate).filter(Candidate.user_id == c_user.id).first()
            if not candidate:
                first_name = cd["full_name"].split()[0]
                last_name = cd["full_name"].split()[1]
                candidate = Candidate(
                    user_id=c_user.id,
                    first_name=first_name,
                    last_name=last_name,
                    email=cd["email"],
                    phone=cd["phone"],
                    years_of_experience=cd["xp"],
                    education_level=cd["edu"],
                    bio=f"Passionné par le développement {cd['full_name'].split()[0]} est un profil expérimenté.",
                    onboarding_step=3
                )
                db.add(candidate)
                db.flush()
                
                for s in cd["skills"]:
                    cs = CandidateSkill(
                        candidate_id=candidate.id,
                        skill_id=db_skills[s["skill"]].id,
                        level=s["level"],
                        years_experience=s["xp"]
                    )
                    db.add(cs)

        db.commit()
        print("\n✨ Simulation peuplée avec succès !")
        print(f"Utilisateur Recruteur : {user_email} / password123")

    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la simulation : {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_simulation()
