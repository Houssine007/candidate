"""backfill_application_is_active

Revision ID: a998daa1172d
Revises: 08b7264a1a2a
Create Date: 2026-06-10 06:15:30.541961

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a998daa1172d'
down_revision: Union[str, Sequence[str], None] = '08b7264a1a2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE applications SET is_active = TRUE WHERE is_active IS NULL")
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
