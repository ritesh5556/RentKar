"""Shared FastAPI dependencies: DB session and current-user resolution."""

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

DbSession = Annotated[AsyncSession, Depends(get_db)]

# auto_error=False so we can return a consistent 401 (HTTPBearer would raise 403).
_bearer = HTTPBearer(auto_error=False)

_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: DbSession,
) -> User:
    if credentials is None:
        raise _UNAUTHENTICATED
    try:
        payload = decode_access_token(credentials.credentials)
        if payload.get("type") != "access":
            raise _UNAUTHENTICATED
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        raise _UNAUTHENTICATED from None

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise _UNAUTHENTICATED
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_verified_user(user: CurrentUser) -> User:
    """Require a verified email — gates listing and booking (see docs/SECURITY.md §4)."""
    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before continuing.",
        )
    return user


VerifiedUser = Annotated[User, Depends(get_current_verified_user)]
