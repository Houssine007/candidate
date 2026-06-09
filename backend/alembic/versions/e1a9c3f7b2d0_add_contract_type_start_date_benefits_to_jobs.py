"""add contract_type start_date benefits to jobs

Revision ID: e1a9c3f7b2d0
Revises: b588bb1fdc2c
Create Date: 2026-06-08
"""
from alembic import op
import sqlalchemy as sa

revision = 'e1a9c3f7b2d0'
down_revision = 'b588bb1fdc2c'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('jobs', sa.Column('contract_type', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('start_date', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('benefits', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('jobs', 'benefits')
    op.drop_column('jobs', 'start_date')
    op.drop_column('jobs', 'contract_type')
