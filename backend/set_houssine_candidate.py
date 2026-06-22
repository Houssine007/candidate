from app.core.database import SessionLocal
from app.models.user import User, UserRole

db = SessionLocal()
user = db.query(User).filter(User.full_name.ilike("%Houssine Mir%")).first()

if user:
    user.role = UserRole.CANDIDATE
    db.commit()
    print(f"Role updated to CANDIDATE for {user.full_name}")
else:
    print("User Houssine Mir not found.")

db.close()
