"""merge heads

Revision ID: 05f893907368
Revises: e1a9c3f7b2d0, fc1920402399
Create Date: 2026-06-10 02:43:44.162680

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '05f893907368'
down_revision: Union[str, Sequence[str], None] = ('e1a9c3f7b2d0', 'fc1920402399')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
