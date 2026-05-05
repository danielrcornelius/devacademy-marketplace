"""Add coach_availability and bookings tables.

Revision ID: 005_bookings
Revises: 004_inquiries
Create Date: 2026-04-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005_bookings"
down_revision: Union[str, None] = "004_inquiries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "coach_availability",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("coach_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("slot_duration_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.ForeignKeyConstraint(
            ["coach_profile_id"], ["coach_profiles.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_coach_availability_coach_profile_id"),
        "coach_availability",
        ["coach_profile_id"],
        unique=False,
    )

    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("coach_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("athlete_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("athlete_name", sa.String(length=120), nullable=False),
        sa.Column("athlete_email", sa.String(length=320), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="confirmed"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["coach_profile_id"], ["coach_profiles.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["athlete_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        # Prevents double-booking the same coach at the same time
        sa.UniqueConstraint("coach_profile_id", "scheduled_at", name="uq_booking_coach_slot"),
    )
    op.create_index(
        op.f("ix_bookings_coach_profile_id"),
        "bookings",
        ["coach_profile_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_bookings_athlete_user_id"),
        "bookings",
        ["athlete_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_bookings_scheduled_at"),
        "bookings",
        ["scheduled_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_bookings_scheduled_at"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_athlete_user_id"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_coach_profile_id"), table_name="bookings")
    op.drop_table("bookings")
    op.drop_index(
        op.f("ix_coach_availability_coach_profile_id"), table_name="coach_availability"
    )
    op.drop_table("coach_availability")
