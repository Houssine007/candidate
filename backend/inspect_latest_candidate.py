from app.core.database import SessionLocal
from app.models.candidate import Candidate, CandidateSkill
from app.models.skill import Skill

db = SessionLocal()
# On prend le dernier candidat créé
candidate = db.query(Candidate).order_by(Candidate.id.desc()).first()

if candidate:
    print(f"--- INSPECTION DU PROFIL : {candidate.first_name} {candidate.last_name} ---")
    print(f"Email: {candidate.email}")
    print(f"Expérience: {candidate.years_of_experience} ans")
    print(f"Éducation: Bac+{candidate.education_level}")
    print(f"Titre: {candidate.job_title}")
    
    print("\n[COMPÉTENCES EXTRAITES]")
    skills = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == candidate.id).all()
    for cs in skills:
        skill_name = db.query(Skill.name).filter(Skill.id == cs.skill_id).scalar()
        print(f"- {skill_name}: Niveau {cs.level}/4 ({cs.years_experience} ans)")
    
    print("\n[BIO / RÉSUMÉ IA]")
    print(candidate.bio)
else:
    print("Aucun candidat trouvé.")

db.close()
