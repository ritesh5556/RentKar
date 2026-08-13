"""Authentication domain logic: registration, login, refresh rotation, email verification.

Design notes (see docs/SECURITY.md):
- Login returns a uniform error for unknown-email vs wrong-password, and burns a
  hash comparison on the unknown-email path so timing can't be used to enumerate users.
- Refresh tokens are stored hashed and rotated on every use (old one revoked).
- Only token *hashes* are persisted; the raw token is shown to the client once.
"""

from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
    utcnow,
    verify_password,
)
from app.models.user import EmailVerificationToken, RefreshToken, User
from app.schemas.auth import RegisterRequest

settings = get_settings()

# Precomputed hash so the unknown-email login path spends ~the same time as a real verify.
_DUMMY_HASH = hash_password("timing-equalization-placeholder-123")

EMAIL_TOKEN_TTL = timedelta(hours=24)


async def register_user(db: AsyncSession, data: RegisterRequest) -> tuple[User, str]:
    email = data.email.lower()
    existing = await db.scalar(select(User).where(User.email == email))
    if existing is not None:
        # Registration is one of the few places we surface existence, so the user
        # knows to log in instead. (Login/verify remain non-enumerating.)
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    user = User(
        email=email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name.strip(),
        phone=data.phone,
        date_of_birth=data.date_of_birth,
    )
    db.add(user)
    await db.flush()  # assigns user.id

    raw_token = await _create_email_verification(db, user)
    await db.commit()
    return user, raw_token


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    user = await db.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        verify_password(password, _DUMMY_HASH)  # equalize timing; result ignored
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not verify_password(password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been disabled")
    return user


async def issue_refresh_token(db: AsyncSession, user: User) -> str:
    raw = generate_opaque_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_opaque_token(raw),
            expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
        )
    )
    return raw


async def rotate_refresh_token(db: AsyncSession, raw: str) -> tuple[User, str]:
    token = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_opaque_token(raw))
    )
    if token is None or token.revoked_at is not None or token.expires_at < utcnow():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")

    token.revoked_at = utcnow()  # rotate: the presented token is now spent
    user = await db.get(User, token.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")

    new_raw = await issue_refresh_token(db, user)
    return user, new_raw


async def revoke_refresh_token(db: AsyncSession, raw: str) -> None:
    token = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_opaque_token(raw))
    )
    if token is not None and token.revoked_at is None:
        token.revoked_at = utcnow()


async def _create_email_verification(db: AsyncSession, user: User) -> str:
    raw = generate_opaque_token()
    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=hash_opaque_token(raw),
            expires_at=utcnow() + EMAIL_TOKEN_TTL,
        )
    )
    return raw


async def verify_email(db: AsyncSession, raw: str) -> None:
    token = await db.scalar(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash == hash_opaque_token(raw)
        )
    )
    if token is None or token.used_at is not None or token.expires_at < utcnow():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired verification link")

    token.used_at = utcnow()
    user = await db.get(User, token.user_id)
    if user is not None:
        user.is_email_verified = True
    await db.commit()
