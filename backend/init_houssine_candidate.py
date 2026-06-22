from app.core.database import SessionLocal
from app.models.user import User
from app.models.candidate import Candidate
from datetime import datetime

db = SessionLocal()
user = db.query(User).filter(User.full_name.ilike("%Houssine Mir%")).first()

if user:
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        new_candidate = Candidate(
            user_id=user.id,
            first_name="Houssine",
            last_name="Mir",
            email=user.email,
            created_at=datetime.utcnow(),
            onboarding_step=1,
            is_active=True,
            is_visible=True
        )
        db.add(new_candidate)
        db.commit()
        print(f"Candidate profile created for {user.full_name}")
    else:
        print(f"Candidate profile already exists for {user.full_name}")
else:
    print("User Houssine Mir not found. Cannot create candidate profile.")

db.close()
