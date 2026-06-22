from app.core.database import SessionLocal
from app.models.candidate import Candidate
from app.models.user import User

db = SessionLocal()
try:
    for cid in [21, 32]:
        c = db.query(Candidate).filter(Candidate.id == cid).first()
        if c:
            uid = c.user_id
            print(f"Deleting Candidate {c.first_name} {c.last_name} (ID: {cid})...")
            db.delete(c)
            u = db.query(User).filter(User.id == uid).first()
            if u:
                print(f"Deleting associated User {u.email} (ID: {uid})...")
                db.delete(u)
    db.commit()
    print("Cleanup successful.")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
