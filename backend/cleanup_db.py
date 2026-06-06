from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import (
    Application, JobRequirement, Job, CandidateSkill, Candidate, 
    Recruiter, Employee, User, TrainingEnrollment, Evaluation,
    TrainingSkill, Training, InternalApplication, InternalPositionRequirement,
    InternalPosition, OrgUnit, JobStandardRequirement, JobStandard, Company
)

def cleanup_db():
    db = SessionLocal()
    try:
        print("清理数据库...")
        # (Ordre important pour les FK)
        db.query(Evaluation).delete()
        db.query(TrainingEnrollment).delete()
        db.query(InternalApplication).delete()
        db.query(Application).delete()
        db.query(TrainingSkill).delete()
        db.query(Training).delete()
        db.query(InternalPositionRequirement).delete()
        db.query(InternalPosition).delete()
        db.query(JobRequirement).delete()
        db.query(Job).delete()
        db.query(JobStandardRequirement).delete()
        db.query(JobStandard).delete()
        db.query(CandidateSkill).delete()
        db.query(Candidate).delete()
        db.query(Employee).delete()
        db.query(Recruiter).delete()
        db.query(OrgUnit).delete()
        db.query(Company).delete()

        # 7. Utilisateurs (Sauf ADMIN)
        deleted_users = db.query(User).filter(User.role != "ADMIN").delete()
        print(f"✅ {deleted_users} utilisateurs (non-admin) supprimés")

        db.commit()
        print("\n✨ Nettoyage terminé avec succès !")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors du nettoyage : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_db()
