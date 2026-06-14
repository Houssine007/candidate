
"""add EMPLOYEE role to userrole enum

Revision ID: add_employee_role
Revises: 05f893907368
Create Date: 2026-06-13 02:05:00.000000

"""
from alembic import op

revision = 'add_employee_role'
down_revision = '05f893907368'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'EMPLOYEE'")


def downgrade() -> None:
    pass