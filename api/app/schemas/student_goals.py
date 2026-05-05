import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.sports import SportOut


class StudentGoalOut(BaseModel):
    id: uuid.UUID
    title: str
    goal_description: str
    skill_level: str | None
    target_date: date | None
    created_at: datetime
    display_name: str
    email: EmailStr
    sport: SportOut | None


class StudentGoalCreate(BaseModel):
    email: EmailStr
    display_name: str = Field(..., min_length=1, max_length=120)
    title: str = Field(..., min_length=1, max_length=200)
    goal_description: str = Field(..., min_length=1)
    sport_slug: str | None = None
    skill_level: str | None = Field(default=None, max_length=64)
    target_date: date | None = None
