import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.schemas.sports import SportOut

CoachingFormat = Literal["in_person", "remote", "both"]


class CoachProfileOut(BaseModel):
    id: uuid.UUID
    headline: str
    bio: str
    adventure_story: str | None
    location_city: str | None
    location_region: str | None
    years_experience: int | None
    website_url: str | None
    coaching_format: str | None
    timezone: str | None
    created_at: datetime
    display_name: str
    email: str
    sports: list[SportOut]

    model_config = {"from_attributes": True}


class CoachCreate(BaseModel):
    # Optional when an authenticated user is creating their profile via JWT.
    # Required when creating anonymously (no JWT).
    email: EmailStr | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    headline: str = Field(..., min_length=1, max_length=200)
    bio: str = Field(..., min_length=1)
    adventure_story: str | None = None
    location_city: str | None = None
    location_region: str | None = None
    years_experience: int | None = Field(default=None, ge=0, le=80)
    website_url: str | None = None
    coaching_format: CoachingFormat | None = None
    timezone: str | None = Field(default=None, max_length=64)
    sport_slugs: list[str] = Field(..., min_length=1)


class CoachUpdate(BaseModel):
    """All fields optional — only provided fields are updated."""
    headline: str | None = Field(default=None, min_length=1, max_length=200)
    bio: str | None = Field(default=None, min_length=1)
    adventure_story: str | None = None
    location_city: str | None = None
    location_region: str | None = None
    years_experience: int | None = Field(default=None, ge=0, le=80)
    website_url: str | None = None
    coaching_format: CoachingFormat | None = None
    timezone: str | None = Field(default=None, max_length=64)
    sport_slugs: list[str] | None = None
