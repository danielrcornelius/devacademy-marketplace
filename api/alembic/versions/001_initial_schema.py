"""Initial athletics marketplace schema with seed sports and demo coaches.

Revision ID: 001_initial
Revises:
Create Date: 2026-04-23
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("tagline", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "coach_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("headline", sa.String(length=200), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("adventure_story", sa.Text(), nullable=True),
        sa.Column("location_city", sa.String(length=120), nullable=True),
        sa.Column("location_region", sa.String(length=120), nullable=True),
        sa.Column("years_experience", sa.Integer(), nullable=True),
        sa.Column("website_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "coach_profile_sports",
        sa.Column("coach_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sport_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["coach_profile_id"], ["coach_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sport_id"], ["sports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("coach_profile_id", "sport_id"),
    )

    op.create_table(
        "student_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("goal_description", sa.Text(), nullable=False),
        sa.Column("sport_id", sa.Integer(), nullable=True),
        sa.Column("skill_level", sa.String(length=64), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["sport_id"], ["sports.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_student_goals_user_id"), "student_goals", ["user_id"], unique=False)

    sports = sa.table(
        "sports",
        sa.column("id", sa.Integer),
        sa.column("slug", sa.String),
        sa.column("name", sa.String),
        sa.column("tagline", sa.Text),
    )
    op.bulk_insert(
        sports,
        [
            {
                "id": 1,
                "slug": "swimming",
                "name": "Swimming",
                "tagline": "Efficiency, pacing, and open-water confidence for the moments that count.",
            },
            {
                "id": 2,
                "slug": "triathlon",
                "name": "Triathlon",
                "tagline": "Swim-bike-run rhythm for your first sprint or your next full distance.",
            },
            {
                "id": 3,
                "slug": "mountain_biking",
                "name": "Mountain biking",
                "tagline": "Technical roots, drops, and cornering with trail-smart progression.",
            },
            {
                "id": 4,
                "slug": "running",
                "name": "Running",
                "tagline": "From base miles to race peaks — durable mechanics and smart volume.",
            },
        ],
    )
    op.execute(sa.text("SELECT setval(pg_get_serial_sequence('sports', 'id'), (SELECT MAX(id) FROM sports))"))

    coach_users = sa.table(
        "users",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("email", sa.String),
        sa.column("display_name", sa.String),
        sa.column("role", sa.String),
    )
    coach_profiles = sa.table(
        "coach_profiles",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
        sa.column("headline", sa.String),
        sa.column("bio", sa.Text),
        sa.column("adventure_story", sa.Text),
        sa.column("location_city", sa.String),
        sa.column("location_region", sa.String),
        sa.column("years_experience", sa.Integer),
        sa.column("website_url", sa.String),
    )
    links = sa.table(
        "coach_profile_sports",
        sa.column("coach_profile_id", postgresql.UUID(as_uuid=True)),
        sa.column("sport_id", sa.Integer),
    )

    u1, u2, u3 = (
        "11111111-1111-1111-1111-111111111101",
        "22222222-2222-2222-2222-222222222202",
        "33333333-3333-3333-3333-333333333303",
    )
    p1, p2, p3 = (
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01",
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02",
        "cccccccc-cccc-cccc-cccc-cccccccccc03",
    )

    op.bulk_insert(
        coach_users,
        [
            {
                "id": u1,
                "email": "morgan.rivera@example.com",
                "display_name": "Morgan Rivera",
                "role": "coach",
            },
            {
                "id": u2,
                "email": "kai.nakamura@example.com",
                "display_name": "Kai Nakamura",
                "role": "coach",
            },
            {
                "id": u3,
                "email": "jordan.ellis@example.com",
                "display_name": "Jordan Ellis",
                "role": "coach",
            },
        ],
    )
    op.bulk_insert(
        coach_profiles,
        [
            {
                "id": p1,
                "user_id": u1,
                "headline": "Open-water swimmer · Iron-distance pacing",
                "bio": "I help age-groupers and elites smooth out stroke mechanics, sighting, and race-day fueling so the swim feels like a strength, not a survival lap.",
                "adventure_story": "My first crossing taught me that calm technique beats panic every time — I bring that mindset to every athlete I coach.",
                "location_city": "San Diego",
                "location_region": "CA",
                "years_experience": 12,
                "website_url": None,
            },
            {
                "id": p2,
                "user_id": u2,
                "headline": "Triathlon coach · Swim-bike-run integration",
                "bio": "From sprint weekends to full-distance dreams, we build durability without burnout. Brick sessions, transitions, and mental race plans included.",
                "adventure_story": "Racing Kona changed how I think about cumulative training — I love helping others stack smart weeks toward a start line that excites them.",
                "location_city": "Boulder",
                "location_region": "CO",
                "years_experience": 9,
                "website_url": None,
            },
            {
                "id": p3,
                "user_id": u3,
                "headline": "Technical MTB skills · Trail confidence",
                "bio": "Cornering, drops, steep chutes, and line choice for riders who want flow on demanding terrain. Progressions that keep rubber side down.",
                "adventure_story": "I still get butterflies on new lines — coaching is about turning nerves into repeatable skills you trust when it gets spicy.",
                "location_city": "Squamish",
                "location_region": "BC",
                "years_experience": 7,
                "website_url": None,
            },
        ],
    )
    op.bulk_insert(
        links,
        [
            {"coach_profile_id": p1, "sport_id": 1},
            {"coach_profile_id": p1, "sport_id": 2},
            {"coach_profile_id": p2, "sport_id": 2},
            {"coach_profile_id": p2, "sport_id": 4},
            {"coach_profile_id": p3, "sport_id": 3},
        ],
    )

    goals = sa.table(
        "student_goals",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
        sa.column("title", sa.String),
        sa.column("goal_description", sa.Text),
        sa.column("sport_id", sa.Integer),
        sa.column("skill_level", sa.String),
        sa.column("target_date", sa.Date),
    )
    su = "44444444-4444-4444-4444-444444444404"
    op.bulk_insert(
        coach_users,
        [
            {
                "id": su,
                "email": "alex.patel@example.com",
                "display_name": "Alex Patel",
                "role": "student",
            }
        ],
    )
    op.bulk_insert(
        goals,
        [
            {
                "id": "dddddddd-dddd-dddd-dddd-dddddddddd05",
                "user_id": su,
                "title": "Olympic-distance triathlon — first finish strong",
                "goal_description": "I can swim 1500m in the pool but need open-water confidence and a pacing plan for the full Olympic distance this fall.",
                "sport_id": 2,
                "skill_level": "intermediate",
                "target_date": None,
            }
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_student_goals_user_id"), table_name="student_goals")
    op.drop_table("student_goals")
    op.drop_table("coach_profile_sports")
    op.drop_table("coach_profiles")
    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.drop_table("sports")
