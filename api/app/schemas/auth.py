import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RequestLinkIn(BaseModel):
    email: EmailStr
    display_name: str | None = Field(default=None, max_length=120)
    role: str = Field(default="student", pattern="^(student|coach)$")


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class VerifyOut(BaseModel):
    user: UserOut
    access_token: str
    token_type: str = "bearer"
