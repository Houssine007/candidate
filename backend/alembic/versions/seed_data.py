"""seed data

Revision ID: 002
Revises: 001
Create Date: 2024-03-20 10:01:00.000000

"""

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime
#from werkzeug.security import generate_password_hash
from app.core.security import hash_password


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Création des utilisateurs de test
    op.bulk_insert(
        sa.table('users',
            sa.column('email', sa.String),
            sa.column('password', sa.String),
            sa.column('full_name', sa.String),
            sa.column('role', sa.String),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'email': 'admin@example.com',
                'password': generate_password_hash('admin123'),
                'full_name': 'Admin User',
                'role': 'ADMIN',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            },
            {
                'email': 'recruiter@example.com',
                'password': generate_password_hash('recruiter123'),
                'full_name': 'John Recruiter',
                'role': 'RECRUITER',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            },
            {
                'email': 'candidate@example.com',
                'password': generate_password_hash('candidate123'),
                'full_name': 'Jane Candidate',
                'role': 'CANDIDATE',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Création des entreprises de test
    op.bulk_insert(
        sa.table('companies',
            sa.column('name', sa.String),
            sa.column('description', sa.Text),
            sa.column('industry', sa.String),
            sa.column('size', sa.String),
            sa.column('website', sa.String),
            sa.column('location', sa.String),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'name': 'Tech Solutions Inc.',
                'description': 'Une entreprise innovante dans le domaine de la technologie',
                'industry': 'Technologie',
                'size': '100-500',
                'website': 'https://techsolutions.example.com',
                'location': 'Paris, France',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Création des compétences de test
    op.bulk_insert(
        sa.table('skills',
            sa.column('name', sa.String),
            sa.column('category', sa.String),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'name': 'Python',
                'category': 'Programmation',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            },
            {
                'name': 'JavaScript',
                'category': 'Programmation',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            },
            {
                'name': 'SQL',
                'category': 'Base de données',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Création du profil recruteur
    op.bulk_insert(
        sa.table('recruiters',
            sa.column('user_id', sa.Integer),
            sa.column('company_id', sa.Integer),
            sa.column('position', sa.String),
            sa.column('hiring_authority', sa.Boolean),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'user_id': 2,  # ID de l'utilisateur recruteur
                'company_id': 1,  # ID de l'entreprise
                'position': 'Senior Recruiter',
                'hiring_authority': True,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Création du profil candidat
    op.bulk_insert(
        sa.table('candidates',
            sa.column('user_id', sa.Integer),
            sa.column('title', sa.String),
            sa.column('bio', sa.Text),
            sa.column('location', sa.String),
            sa.column('experience_years', sa.Integer),
            sa.column('education_level', sa.String),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'user_id': 3,  # ID de l'utilisateur candidat
                'title': 'Développeur Full Stack',
                'bio': 'Développeur passionné avec 5 ans d\'expérience',
                'location': 'Paris, France',
                'experience_years': 5,
                'education_level': 'Master',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Création d'une offre d'emploi de test
    op.bulk_insert(
        sa.table('jobs',
            sa.column('title', sa.String),
            sa.column('description', sa.Text),
            sa.column('company_id', sa.Integer),
            sa.column('recruiter_id', sa.Integer),
            sa.column('location', sa.String),
            sa.column('job_type', sa.String),
            sa.column('experience_level', sa.String),
            sa.column('salary_min', sa.Integer),
            sa.column('salary_max', sa.Integer),
            sa.column('status', sa.String),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'title': 'Développeur Python Senior',
                'description': 'Nous recherchons un développeur Python expérimenté',
                'company_id': 1,
                'recruiter_id': 1,
                'location': 'Paris, France',
                'job_type': 'FULL_TIME',
                'experience_level': 'SENIOR',
                'salary_min': 50000,
                'salary_max': 70000,
                'status': 'PUBLISHED',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Ajout des compétences au candidat
    op.bulk_insert(
        sa.table('candidate_skills',
            sa.column('candidate_id', sa.Integer),
            sa.column('skill_id', sa.Integer),
            sa.column('level', sa.String)
        ),
        [
            {
                'candidate_id': 1,
                'skill_id': 1,  # Python
                'level': 'ADVANCED'
            },
            {
                'candidate_id': 1,
                'skill_id': 2,  # JavaScript
                'level': 'INTERMEDIATE'
            }
        ]
    )

    # Ajout des compétences requises pour l'offre d'emploi
    op.bulk_insert(
        sa.table('job_skills',
            sa.column('job_id', sa.Integer),
            sa.column('skill_id', sa.Integer),
            sa.column('required_level', sa.String)
        ),
        [
            {
                'job_id': 1,
                'skill_id': 1,  # Python
                'required_level': 'ADVANCED'
            },
            {
                'job_id': 1,
                'skill_id': 3,  # SQL
                'required_level': 'INTERMEDIATE'
            }
        ]
    )

def downgrade() -> None:
    # Suppression des données de test dans l'ordre inverse
    op.execute('DELETE FROM job_skills')
    op.execute('DELETE FROM candidate_skills')
    op.execute('DELETE FROM jobs')
    op.execute('DELETE FROM candidates')
    op.execute('DELETE FROM recruiters')
    op.execute('DELETE FROM skills')
    op.execute('DELETE FROM companies')
    op.execute('DELETE FROM users') 

"""

"""seed data

Revision ID: 002
Revises: 001
Create Date: 2024-03-20 10:01:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime
import os
import sys
from pathlib import Path

# Configuration du chemin absolu
backend_path = Path(__file__).resolve().parent.parent.parent  # versions → alembic → backend
sys.path.insert(0, str(backend_path))

# Import de la fonction de hachage
from app.core.security import hash_password

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Création des utilisateurs de test
    op.bulk_insert(
        sa.table('users',
            sa.column('email', sa.String),
            sa.column('password', sa.String),
            sa.column('full_name', sa.String),
            sa.column('role', sa.String),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'email': 'admin@example.com',
                'password': hash_password('admin123'),  # Utilisation de hash_password
                'full_name': 'Admin User',
                'role': 'ADMIN',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            },
            {
                'email': 'recruiter@example.com',
                'password': hash_password('recruiter123'),
                'full_name': 'John Recruiter',
                'role': 'RECRUITER',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            },
            {
                'email': 'candidate@example.com',
                'password': hash_password('candidate123'),
                'full_name': 'Jane Candidate',
                'role': 'CANDIDATE',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Création des entreprises de test
    op.bulk_insert(
        sa.table('companies',
            sa.column('name', sa.String),
            sa.column('description', sa.Text),
            sa.column('industry', sa.String),
            sa.column('size', sa.String),
            sa.column('website', sa.String),
            sa.column('location', sa.String),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'name': 'Tech Solutions Inc.',
                'description': 'Une entreprise innovante dans le domaine de la technologie',
                'industry': 'Technologie',
                'size': '100-500',
                'website': 'https://techsolutions.example.com',
                'location': 'Paris, France',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Création des compétences de test
    op.bulk_insert(
        sa.table('skills',
            sa.column('name', sa.String),
            sa.column('category', sa.String),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'name': 'Python',
                'category': 'Programmation',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            },
            {
                'name': 'JavaScript',
                'category': 'Programmation',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            },
            {
                'name': 'SQL',
                'category': 'Base de données',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Création du profil recruteur
    op.bulk_insert(
        sa.table('recruiters',
            sa.column('user_id', sa.Integer),
            sa.column('company_id', sa.Integer),
            sa.column('position', sa.String),
            sa.column('hiring_authority', sa.Boolean),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'user_id': 2,  # ID de l'utilisateur recruteur
                'company_id': 1,  # ID de l'entreprise
                'position': 'Senior Recruiter',
                'hiring_authority': True,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Création du profil candidat
    op.bulk_insert(
        sa.table('candidates',
            sa.column('user_id', sa.Integer),
            sa.column('first_name', sa.String),
            sa.column('last_name', sa.String),
            sa.column('email', sa.String),
            sa.column('phone', sa.String),
            sa.column('skills', sa.String),
            sa.column('years_of_experience', sa.Float),
            sa.column('education_level', sa.Integer),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean),
        ),
        [
            {
                'user_id': 3,
                'first_name': 'Alice',
                'last_name': 'Durand',
                'email': 'alice.durand@example.com',
                'phone': '0606060606',
                'skills': 'Python,FastAPI',   # ou JSON si tu veux
                'years_of_experience': 5,
                'education_level': 2,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Création d'une offre d'emploi de test
    op.bulk_insert(
        sa.table('jobs',
            sa.column('title', sa.String),
            sa.column('description', sa.Text),
            sa.column('company_id', sa.Integer),
            sa.column('recruiter_id', sa.Integer),
            sa.column('location', sa.String),
            sa.column('job_type', sa.String),
            sa.column('experience_level', sa.String),
            sa.column('salary_min', sa.Integer),
            sa.column('salary_max', sa.Integer),
            sa.column('status', sa.String),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        ),
        [
            {
                'title': 'Développeur Python Senior',
                'description': 'Nous recherchons un développeur Python expérimenté',
                'company_id': 1,
                'recruiter_id': 1,
                'location': 'Paris, France',
                'job_type': 'FULL_TIME',
                'experience_level': 'SENIOR',
                'salary_min': 50000,
                'salary_max': 70000,
                'status': 'PUBLISHED',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'is_active': True
            }
        ]
    )

    # Ajout des compétences au candidat
    op.bulk_insert(
        sa.table('candidate_skills',
            sa.column('candidate_id', sa.Integer),
            sa.column('skill_id', sa.Integer),
            sa.column('level', sa.ENUM)
        ),
        [
            {
                'candidate_id': 1,
                'skill_id': 1,  # Python
                'level': 'ADVANCED'
            },
            {
                'candidate_id': 1,
                'skill_id': 2,  # JavaScript
                'level': 'INTERMEDIATE'
            }
        ]
    )

    # Ajout des compétences requises pour l'offre d'emploi
    op.bulk_insert(
        sa.table('job_skills',
            sa.column('job_id', sa.Integer),
            sa.column('skill_id', sa.Integer),
            sa.column('required_level', sa.String)
        ),
        [
            {
                'job_id': 1,
                'skill_id': 1,  # Python
                'required_level': 'ADVANCED'
            },
            {
                'job_id': 1,
                'skill_id': 3,  # SQL
                'required_level': 'INTERMEDIATE'
            }
        ]
    )

def downgrade() -> None:
    # Suppression des données de test dans l'ordre inverse
    op.execute('DELETE FROM job_skills')
    op.execute('DELETE FROM candidate_skills')
    op.execute('DELETE FROM jobs')
    op.execute('DELETE FROM candidates')
    op.execute('DELETE FROM recruiters')
    op.execute('DELETE FROM skills')
    op.execute('DELETE FROM companies')
    op.execute('DELETE FROM users')