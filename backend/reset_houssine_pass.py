from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

db = SessionLocal()
user = db.query(User).filter(User.full_name.ilike("%Houssine Mir%")).first()

if user:
    new_password = "houssine123"
    user.password = hash_password(new_password)
    db.commit()
    print(f"Password reset for {user.full_name} ({user.email})")
else:
    print("User Houssine Mir not found.")

db.close()
