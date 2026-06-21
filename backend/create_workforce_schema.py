"""
Crée le schéma de la GPEC prévisionnelle (idempotent), sans passer par Alembic
(l'historique a des merge heads). Convention : scripts one-off à la racine backend/.

  - table  workforce_targets               (nouvelle)
  - colonne job_standard_requirements.is_emergent (ajoutée si absente)

Usage :  venv\\Scripts\\python.exe create_workforce_schema.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from sqlalchemy import inspect, text
from app.core.database import engine
from app.models.workforce_target import WorkforceTarget


def main():
    insp = inspect(engine)

    # 1) Table workforce_targets
    if "workforce_targets" in insp.get_table_names():
        print("= table workforce_targets déjà présente")
    else:
        WorkforceTarget.__table__.create(bind=engine, checkfirst=True)
        print("✅ table workforce_targets créée")

    # 2) Colonne is_emergent sur job_standard_requirements
    cols = [c["name"] for c in insp.get_columns("job_standard_requirements")]
    if "is_emergent" in cols:
        print("= colonne is_emergent déjà présente")
    else:
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE job_standard_requirements "
                "ADD COLUMN is_emergent BOOLEAN NOT NULL DEFAULT FALSE"
            ))
        print("✅ colonne job_standard_requirements.is_emergent ajoutée")

    print("Schéma GPEC prévisionnelle prêt.")


if __name__ == "__main__":
    main()
