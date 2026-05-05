import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.availability import CoachAvailability
    from app.models.booking import Booking
    from app.models.inquiry import Inquiry
    from app.models.sport import Sport
    from app.models.user import User

coach_profile_sports = Table(
    "coach_profile_sports",
    Base.metadata,
    Column(
        "coach_profile_id",
        UUID(as_uuid=True),
        ForeignKey("coach_profiles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "sport_id",
        Integer,
        ForeignKey("sports.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class CoachProfile(Base):
    __tablename__ = "coach_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    headline: Mapped[str] = mapped_column(String(200), nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False)
    adventure_story: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    location_region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    years_experience: Mapped[int | None] = mapped_column(nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    coaching_format: Mapped[str | None] = mapped_column(String(16), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="coach_profile")
    sports: Mapped[list["Sport"]] = relationship(
        "Sport", secondary=coach_profile_sports, back_populates="coach_profiles"
    )
    inquiries: Mapped[list["Inquiry"]] = relationship(
        "Inquiry", back_populates="coach_profile", cascade="all, delete-orphan",
        order_by="Inquiry.created_at.desc()"
    )
    availability: Mapped[list["CoachAvailability"]] = relationship(
        "CoachAvailability", back_populates="coach_profile", cascade="all, delete-orphan",
        order_by="CoachAvailability.day_of_week, CoachAvailability.start_time"
    )
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking", back_populates="coach_profile", cascade="all, delete-orphan",
        order_by="Booking.scheduled_at"
    )
