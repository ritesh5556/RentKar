"""User request/response schemas.

UserPublic is the PII-minimized view returned to anyone; UserMe adds private fields
for the authenticated owner; UserUpdate whitelists the only fields a user may change
(prevents mass assignment of, e.g., is_admin or verification flags).
"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    avatar_url: str | None = None
    bio: str | None = None
    created_at: datetime


class UserMe(UserPublic):
    email: EmailStr
    phone: str | None = None
    date_of_birth: date | None = None
    is_email_verified: bool
    id_verified: bool
    license_verified: bool
    is_admin: bool


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    bio: str | None = Field(default=None, max_length=1000)
    avatar_url: str | None = Field(default=None, max_length=512)
    date_of_birth: date | None = None
