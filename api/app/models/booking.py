import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.coach_profile import CoachProfile
    from app.models.user import User


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    coach_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("coach_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    athlete_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    athlete_name: Mapped[str] = mapped_column(String(120), nullable=False)
    athlete_email: Mapped[str] = mapped_column(String(320), nullable=False)
    # Exact UTC start of the session — unique per coach prevents double-booking
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    # pending | confirmed | cancelled
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="confirmed")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    coach_profile: Mapped["CoachProfile"] = relationship(
        "CoachProfile", back_populates="bookings"
    )
    athlete_user: Mapped["User | None"] = relationship("User", back_populates="bookings")

    @property
    def coach_name(self) -> str:
        return self.coach_profile.user.display_name
