from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.coach_profile import coach_profile_sports

if TYPE_CHECKING:
    from app.models.coach_profile import CoachProfile


class Sport(Base):
    __tablename__ = "sports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    tagline: Mapped[str | None] = mapped_column(Text, nullable=True)

    coach_profiles: Mapped[list["CoachProfile"]] = relationship(
        "CoachProfile", secondary=coach_profile_sports, back_populates="sports"
    )
