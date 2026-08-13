"""Auth request/response schemas."""

from datetime import date

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.security import utcnow


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    date_of_birth: date | None = None

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("Password must contain both letters and numbers")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def _dob_in_past(cls, v: date | None) -> date | None:
        if v is not None and v >= utcnow().date():
            raise ValueError("Date of birth must be in the past")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105
    expires_in: int  # seconds until the access token expires


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=1, max_length=256)


class MessageResponse(BaseModel):
    detail: str
