"""add_applied_status

Revision ID: 539efbbcfc87
Revises: d582735f583c
Create Date: 2026-06-05 20:21:00.533584

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '539efbbcfc87'
down_revision: Union[str, Sequence[str], None] = 'd582735f583c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'APPLIED'")

def downgrade():
    pass  # PostgreSQL ne supporte pas DROP VALUE sur un enum