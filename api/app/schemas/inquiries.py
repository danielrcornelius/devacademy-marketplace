import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class InquiryCreate(BaseModel):
    sender_name: str = Field(..., min_length=1, max_length=120)
    sender_email: EmailStr
    message: str = Field(..., min_length=10)


class InquiryOut(BaseModel):
    id: uuid.UUID
    sender_name: str
    sender_email: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}
