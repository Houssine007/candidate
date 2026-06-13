"""add_is_instructor_to_users

Revision ID: e1a2b3c4d5e6
Revises: d582735f583c
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, None] = 'd582735f583c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_instructor', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('users', 'is_instructor')