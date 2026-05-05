"""Add coaching_format and timezone to coach_profiles.

Revision ID: 002_coach_format
Revises: 001_initial
Create Date: 2026-04-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_coach_format"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "coach_profiles",
        sa.Column("coaching_format", sa.String(length=16), nullable=True),
    )
    op.add_column(
        "coach_profiles",
        sa.Column("timezone", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("coach_profiles", "timezone")
    op.drop_column("coach_profiles", "coaching_format")
