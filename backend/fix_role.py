from sqlalchemy import create_engine, text
from app.core.config import settings

def fix_user_role(user_id: int):
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as connection:
        # Vérifier le rôle actuel
        result = connection.execute(text(f"SELECT email, role FROM users WHERE id = {user_id}"))
        user = result.fetchone()
        
        if not user:
            print(f"❌ Utilisateur {user_id} non trouvé!")
            return

        print(f"🔍 Utilisateur trouvé: {user[0]} (Rôle actuel: {user[1]})")
        
        # Mettre à jour le rôle
        print(f"🔄 Mise à jour du rôle vers 'RECRUITER'...")
        connection.execute(text(f"UPDATE users SET role = 'RECRUITER' WHERE id = {user_id}"))
        connection.commit()
        
        print("✅ Succès ! L'utilisateur est maintenant RECRUITER.")
        print("💡 Vous devez vous reconnecter pour obtenir un nouveau token avec le bon rôle.")

if __name__ == "__main__":
    # ID de mir@gmail.com
    fix_user_role(8)
