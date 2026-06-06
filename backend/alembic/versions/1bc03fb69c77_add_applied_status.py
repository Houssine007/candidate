"""add_applied_status

Revision ID: 1bc03fb69c77
Revises: 539efbbcfc87
Create Date: 2026-06-05 20:22:55.125628

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1bc03fb69c77'
down_revision: Union[str, Sequence[str], None] = '539efbbcfc87'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'APPLIED'")

def downgrade():
    pass  # PostgreSQL ne supporte pas DROP VALUE sur un enum