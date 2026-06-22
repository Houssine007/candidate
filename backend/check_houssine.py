from app.core.database import SessionLocal
from app.models.user import User
from app.models.candidate import Candidate

db = SessionLocal()
user = db.query(User).filter(User.full_name.ilike("%Houssine%")).first()

if user:
    print(f"User found: {user.full_name} (ID: {user.id}, Role: {user.role})")
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if candidate:
        print(f"Candidate profile already exists (ID: {candidate.id})")
    else:
        print("User exists but has no candidate profile.")
else:
    print("No user named Houssine found.")

db.close()
