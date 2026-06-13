"""Script utilitaire pour créer un compte ADMIN (formateur) RecruitPRO.

Usage :
    python create_admin.py
    python create_admin.py mon@email.com MonMotDePasse "Mon Nom"
"""
import sys

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.api.auth import get_password_hash


def main():
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@recruitpro.com"
    password = sys.argv[2] if len(sys.argv) > 2 else "Admin1234!"
    full_name = sys.argv[3] if len(sys.argv) > 3 else "Admin RecruitPRO"

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            # Promotion d'un compte déjà présent
            existing.role = UserRole.ADMIN
            existing.is_instructor = True
            existing.is_active = True
            db.commit()
            print(f"Compte existant promu ADMIN/formateur : id={existing.id} email={existing.email}")
            return

        admin = User(
            email=email,
            password=get_password_hash(password),
            full_name=full_name,
            role=UserRole.ADMIN,
            is_instructor=True,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Admin cree : id={admin.id} email={admin.email} / mot de passe={password}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
