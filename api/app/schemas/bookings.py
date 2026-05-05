import uuid
from datetime import datetime, time
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

BookingStatus = Literal["pending", "confirmed", "cancelled"]


# ── Availability ──────────────────────────────────────────────────────────────

class AvailabilityWindowIn(BaseModel):
    """One recurring weekly window submitted by the coach."""
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: time
    end_time: time
    slot_duration_minutes: int = Field(default=60, ge=15, le=480)

    model_config = {"from_attributes": True}


class AvailabilityWindowOut(BaseModel):
    id: uuid.UUID
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration_minutes: int
    is_active: bool

    model_config = {"from_attributes": True}


class SetAvailabilityIn(BaseModel):
    """Full replacement of a coach's weekly windows."""
    windows: list[AvailabilityWindowIn] = Field(default_factory=list)


# ── Slots (open times returned to athletes) ───────────────────────────────────

class SlotOut(BaseModel):
    """A single bookable time slot."""
    start: datetime   # UTC ISO-8601
    end: datetime     # UTC ISO-8601
    duration_minutes: int


# ── Bookings ──────────────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    scheduled_at: datetime = Field(..., description="UTC ISO-8601 datetime of the slot start")
    athlete_name: str = Field(..., min_length=1, max_length=120)
    athlete_email: EmailStr
    notes: str | None = Field(default=None, max_length=1000)


class BookingOut(BaseModel):
    id: uuid.UUID
    coach_profile_id: uuid.UUID
    coach_name: str
    athlete_name: str
    athlete_email: str
    scheduled_at: datetime
    duration_minutes: int
    status: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
