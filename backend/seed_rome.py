from sqlalchemy import text, create_engine
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

# Importation des modèles
from app.core.database import Base, engine, SessionLocal
from app.models.skill import Skill
from app.models.job_standard import JobStandard, JobStandardRequirement

load_dotenv()

def seed_rome_data():
    print("Synchronisation de la base de données...")
    Base.metadata.create_all(bind=engine)
    
    # Correction manuelle pour les colonnes ajoutées sur des tables existantes
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE skills ADD COLUMN IF NOT EXISTS rome_code VARCHAR"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS formations TEXT"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS certifications TEXT"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS experience_detail TEXT"))
            conn.commit()
            print("Colonnes synchronisées.")
        except Exception as e:
            print(f"Note (Colonnes peut-être déjà présentes): {e}")
    
    db = SessionLocal()
    try:
        # 1. Création des Skills (Source: ROME / ESCO simplified)
        tech_skills = [
            # ID, Name, Category, ROME Code
            {"name": "Python", "cat": "Dev", "rome": "M1805"},
            {"name": "JavaScript / React", "cat": "Dev", "rome": "M1805"},
            {"name": "Node.js", "cat": "Dev", "rome": "M1805"},
            {"name": "SQL / PostgreSQL", "cat": "Data", "rome": "M1805"},
            {"name": "Docker / Kubernetes", "cat": "Ops", "rome": "M1801"},
            {"name": "Linux Administration", "cat": "Ops", "rome": "M1801"},
            {"name": "Sécurité Réseaux", "cat": "Ops", "rome": "M1801"},
            {"name": "Programmation d'Automates (PLC)", "cat": "Robotics", "rome": "H1208"},
            {"name": "Conception CAO (SolidWorks)", "cat": "Robotics", "rome": "H1208"},
            {"name": "Vision Industrielle", "cat": "Robotics", "rome": "H1208"},
        ]

        print("Seeding Skills...")
        for s_data in tech_skills:
            skill = db.query(Skill).filter(Skill.name == s_data["name"]).first()
            if not skill:
                skill = Skill(
                    name=s_data["name"],
                    category=s_data["cat"],
                    rome_code=s_data["rome"],
                    description=f"Compétence liée au domaine {s_data['cat']}"
                )
                db.add(skill)
        db.flush()

        # 2. Création des Fiches Métiers (JobStandards)
        jobs = [
            {
                "title": "Développeur Fullstack",
                "code": "M1805",
                "desc": "Conçoit et développe des applications web de bout en bout.",
                "skills": [
                    {"name": "Python", "level": 3},
                    {"name": "JavaScript / React", "level": 3},
                    {"name": "SQL / PostgreSQL", "level": 2}
                ]
            },
            {
                "title": "Administrateur Systèmes & Cloud",
                "code": "M1801",
                "desc": "Gère l'infrastructure, les serveurs et la sécurité.",
                "skills": [
                    {"name": "Linux Administration", "level": 4},
                    {"name": "Docker / Kubernetes", "level": 3},
                    {"name": "Sécurité Réseaux", "level": 3}
                ]
            },
            {
                "title": "Ingénieur en Robotique Industrielle",
                "code": "H1208",
                "desc": "Conçoit, installe et programme des systèmes robotisés.",
                "skills": [
                    {"name": "Programmation d'Automates (PLC)", "level": 4},
                    {"name": "Conception CAO (SolidWorks)", "level": 3},
                    {"name": "Vision Industrielle", "level": 2}
                ]
            }
        ]

        print("Seeding Job Standards...")
        for j_data in jobs:
            std = db.query(JobStandard).filter(JobStandard.rome_code == j_data["code"]).first()
            if not std:
                std = JobStandard(
                    title=j_data["title"],
                    rome_code=j_data["code"],
                    description=j_data["desc"],
                    category="Informatique / Tech"
                )
                db.add(std)
                db.flush()

                # Ajouter les requirements
                for s_req in j_data["skills"]:
                    skill = db.query(Skill).filter(Skill.name == s_req["name"]).first()
                    if skill:
                        req = JobStandardRequirement(
                            job_standard_id=std.id,
                            skill_id=skill.id,
                            min_level=s_req["level"],
                            is_mandatory=True
                        )
                        db.add(req)

        db.commit()
        print("✅ Seeding ROME terminé.")

    except Exception as e:
        print(f"❌ Erreur lors du seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_rome_data()
