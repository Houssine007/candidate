"""add_org_units_and_permissions

Revision ID: d582735f583c
Revises: b588bb1fdc2c
Create Date: 2026-01-27 22:07:31.411841

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd582735f583c'
down_revision: Union[str, Sequence[str], None] = 'b588bb1fdc2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Créer les tables sans dépendances complexes
    op.create_table('permissions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('category', sa.String(length=50), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_permissions_id'), 'permissions', ['id'], unique=False)
    op.create_index(op.f('ix_permissions_name'), 'permissions', ['name'], unique=True)

    op.create_table('internal_roles',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('company_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('is_system_role', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_internal_roles_id'), 'internal_roles', ['id'], unique=False)

    # 2. Créer OrgUnits sans la FK vers Employees (car employees n'existe pas encore)
    op.create_table('org_units',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('company_id', sa.Integer(), nullable=False),
    sa.Column('parent_id', sa.Integer(), nullable=True),
    sa.Column('manager_id', sa.Integer(), nullable=True),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('unit_type', sa.String(length=100), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['parent_id'], ['org_units.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_org_units_id'), 'org_units', ['id'], unique=False)

    # 3. Créer Employees (qui dépend de internal_roles et org_units)
    op.create_table('employees',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('company_id', sa.Integer(), nullable=False),
    sa.Column('first_name', sa.String(), nullable=False),
    sa.Column('last_name', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('phone', sa.String(), nullable=True),
    sa.Column('job_title', sa.String(), nullable=False),
    sa.Column('department', sa.String(), nullable=True),
    sa.Column('org_unit_id', sa.Integer(), nullable=True),
    sa.Column('internal_role_id', sa.Integer(), nullable=True),
    sa.Column('manager_id', sa.Integer(), nullable=True),
    sa.Column('hire_date', sa.DateTime(), nullable=True),
    sa.Column('years_of_experience', sa.Float(), nullable=True),
    sa.Column('education_level', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('is_active', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['internal_role_id'], ['internal_roles.id'], ),
    sa.ForeignKeyConstraint(['manager_id'], ['employees.id'], ),
    sa.ForeignKeyConstraint(['org_unit_id'], ['org_units.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_employees_email'), 'employees', ['email'], unique=True)
    op.create_index(op.f('ix_employees_id'), 'employees', ['id'], unique=False)

    # 4. Maintenant on peut ajouter la FK manquante de OrgUnits vers Employees
    op.create_foreign_key('fk_org_units_manager_id_employees', 'org_units', 'employees', ['manager_id'], ['id'])

    # 5. Créer toutes les autres tables dépendant de Employees
    op.create_table('role_permissions',
    sa.Column('role_id', sa.Integer(), nullable=False),
    sa.Column('permission_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
    sa.ForeignKeyConstraint(['role_id'], ['internal_roles.id'], ),
    sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )

    op.create_table('employee_skills',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('employee_id', sa.Integer(), nullable=False),
    sa.Column('skill_id', sa.Integer(), nullable=False),
    sa.Column('level', sa.Integer(), nullable=False),
    sa.Column('years_experience', sa.Float(), nullable=True),
    sa.Column('certified', sa.Integer(), nullable=True),
    sa.Column('last_used', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
    sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employee_skills_id'), 'employee_skills', ['id'], unique=False)

    op.create_table('evaluations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('employee_id', sa.Integer(), nullable=False),
    sa.Column('evaluator_id', sa.Integer(), nullable=False),
    sa.Column('period_start', sa.DateTime(), nullable=False),
    sa.Column('period_end', sa.DateTime(), nullable=False),
    sa.Column('overall_rating', sa.Float(), nullable=True),
    sa.Column('strengths', sa.Text(), nullable=True),
    sa.Column('areas_for_improvement', sa.Text(), nullable=True),
    sa.Column('objectives', sa.Text(), nullable=True),
    sa.Column('comments', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
    sa.ForeignKeyConstraint(['evaluator_id'], ['employees.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_evaluations_id'), 'evaluations', ['id'], unique=False)

    op.create_table('internal_positions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('company_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('department', sa.String(), nullable=True),
    sa.Column('location', sa.String(), nullable=True),
    sa.Column('salary_min', sa.Float(), nullable=True),
    sa.Column('salary_max', sa.Float(), nullable=True),
    sa.Column('status', sa.Enum('OPEN', 'CLOSED', 'FILLED', name='internalpositionstatus'), nullable=True),
    sa.Column('posted_by', sa.Integer(), nullable=True),
    sa.Column('posted_at', sa.DateTime(), nullable=True),
    sa.Column('closed_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['posted_by'], ['employees.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_internal_positions_id'), 'internal_positions', ['id'], unique=False)

    op.create_table('trainings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('company_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('category', sa.Enum('TECHNICAL', 'SOFT_SKILLS', 'MANAGEMENT', 'COMPLIANCE', 'LANGUAGE', name='trainingcategory'), nullable=False),
    sa.Column('duration_hours', sa.Float(), nullable=True),
    sa.Column('provider', sa.String(), nullable=True),
    sa.Column('cost', sa.Float(), nullable=True),
    sa.Column('max_participants', sa.Integer(), nullable=True),
    sa.Column('is_active', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trainings_id'), 'trainings', ['id'], unique=False)

    op.create_table('internal_applications',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('employee_id', sa.Integer(), nullable=False),
    sa.Column('position_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED', name='internalapplicationstatus'), nullable=True),
    sa.Column('motivation_letter', sa.Text(), nullable=True),
    sa.Column('applied_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
    sa.ForeignKeyConstraint(['position_id'], ['internal_positions.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_internal_applications_id'), 'internal_applications', ['id'], unique=False)

    op.create_table('internal_position_requirements',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('position_id', sa.Integer(), nullable=False),
    sa.Column('skill_id', sa.Integer(), nullable=False),
    sa.Column('required_level', sa.Integer(), nullable=False),
    sa.Column('is_mandatory', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['position_id'], ['internal_positions.id'], ),
    sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_internal_position_requirements_id'), 'internal_position_requirements', ['id'], unique=False)

    op.create_table('training_enrollments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('employee_id', sa.Integer(), nullable=False),
    sa.Column('training_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED', name='enrollmentstatus'), nullable=True),
    sa.Column('enrolled_at', sa.DateTime(), nullable=True),
    sa.Column('completed_at', sa.DateTime(), nullable=True),
    sa.Column('score', sa.Float(), nullable=True),
    sa.Column('feedback', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
    sa.ForeignKeyConstraint(['training_id'], ['trainings.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_training_enrollments_id'), 'training_enrollments', ['id'], unique=False)

    op.create_table('training_skills',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('training_id', sa.Integer(), nullable=False),
    sa.Column('skill_id', sa.Integer(), nullable=False),
    sa.Column('level_gained', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ),
    sa.ForeignKeyConstraint(['training_id'], ['trainings.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_training_skills_id'), 'training_skills', ['id'], unique=False)

    # 6. Ajouter les colonnes manquantes aux tables existantes
    op.add_column('jobs', sa.Column('org_unit_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_jobs_org_unit_id', 'jobs', 'org_units', ['org_unit_id'], ['id'])
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'jobs', type_='foreignkey')
    op.drop_column('jobs', 'org_unit_id')
    op.drop_index(op.f('ix_training_skills_id'), table_name='training_skills')
    op.drop_table('training_skills')
    op.drop_index(op.f('ix_training_enrollments_id'), table_name='training_enrollments')
    op.drop_table('training_enrollments')
    op.drop_table('role_permissions')
    op.drop_index(op.f('ix_internal_position_requirements_id'), table_name='internal_position_requirements')
    op.drop_table('internal_position_requirements')
    op.drop_index(op.f('ix_internal_applications_id'), table_name='internal_applications')
    op.drop_table('internal_applications')
    op.drop_index(op.f('ix_trainings_id'), table_name='trainings')
    op.drop_table('trainings')
    op.drop_index(op.f('ix_internal_roles_id'), table_name='internal_roles')
    op.drop_table('internal_roles')
    op.drop_index(op.f('ix_internal_positions_id'), table_name='internal_positions')
    op.drop_table('internal_positions')
    op.drop_index(op.f('ix_evaluations_id'), table_name='evaluations')
    op.drop_table('evaluations')
    op.drop_index(op.f('ix_employee_skills_id'), table_name='employee_skills')
    op.drop_table('employee_skills')
    op.drop_index(op.f('ix_permissions_name'), table_name='permissions')
    op.drop_index(op.f('ix_permissions_id'), table_name='permissions')
    op.drop_table('permissions')
    op.drop_index(op.f('ix_org_units_id'), table_name='org_units')
    op.drop_table('org_units')
    op.drop_index(op.f('ix_employees_id'), table_name='employees')
    op.drop_index(op.f('ix_employees_email'), table_name='employees')
    op.drop_table('employees')
    # ### end Alembic commands ###
