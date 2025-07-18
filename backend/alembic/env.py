from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Configuration ABSOLUE du chemin
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
sys.path.insert(0, str(BASE_DIR))

# Chargement des variables d'environnement
load_dotenv()

# Import de la Base APRÈS configuration du path
try:
    from app.core.database import Base
    # Import des modèles pour que Alembic les détecte
    from app.models.user import User  # noqa: F401
    from app.models.candidate import Candidate  # noqa: F401
    from app.models.recruiter import Recruiter  # noqa: F401
    from app.models.company import Company  # noqa: F401
    from app.models.job import Job  # noqa: F401
    from app.models.application import Application  # noqa: F401
    from app.models.skill import Skill  # noqa: F401
except ImportError as e:
    print(f"Erreur d'import : {e}")
    raise

# Configuration Alembic
config = context.config
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

# Configuration du logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Métadonnées pour les migrations
target_metadata = Base.metadata

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()