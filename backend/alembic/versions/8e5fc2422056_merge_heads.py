"""merge_heads

Revision ID: 8e5fc2422056
Revises: 0d3a45240844, add_employee_role, e1a2b3c4d5e6
Create Date: 2026-06-21 23:27:54.512736

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e5fc2422056'
down_revision: Union[str, Sequence[str], None] = ('0d3a45240844', 'add_employee_role', 'e1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
