"""Auth endpoints: register, verify-email, login, refresh, logout, me."""

from fastapi import APIRouter, Request, Response, status

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.core.rate_limit import limiter
from app.core.security import create_access_token
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.user import UserMe
from app.services import auth_service, email_service

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "renkkar_refresh"
# Scope the cookie to the auth routes only — it's never needed elsewhere.
_COOKIE_PATH = "/api/auth"


def _set_refresh_cookie(response: Response, raw: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        raw,
        max_age=settings.refresh_token_days * 24 * 3600,
        httponly=True,
        secure=settings.is_production,  # requires HTTPS in prod; off for http dev
        samesite="lax",
        path=_COOKIE_PATH,
    )


def _access_response(user_id: int) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user_id),
        expires_in=settings.access_token_min * 60,
    )


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, data: RegisterRequest, db: DbSession) -> MessageResponse:
    user, raw_token = await auth_service.register_user(db, data)
    email_service.send_verification_email(user.email, raw_token)
    return MessageResponse(detail="Registered. Check your email to verify your account.")


@router.post("/verify-email", response_model=MessageResponse)
@limiter.limit("10/minute")
async def verify_email(
    request: Request, data: VerifyEmailRequest, db: DbSession
) -> MessageResponse:
    await auth_service.verify_email(db, data.token)
    return MessageResponse(detail="Email verified. You can now list and book bikes.")


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request, response: Response, data: LoginRequest, db: DbSession
) -> TokenResponse:
    user = await auth_service.authenticate(db, data.email, data.password)
    raw_refresh = await auth_service.issue_refresh_token(db, user)
    await db.commit()
    _set_refresh_cookie(response, raw_refresh)
    return _access_response(user.id)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
async def refresh(request: Request, response: Response, db: DbSession) -> TokenResponse:
    raw = request.cookies.get(REFRESH_COOKIE)
    if not raw:
        raise _missing_session()
    user, new_raw = await auth_service.rotate_refresh_token(db, raw)
    await db.commit()
    _set_refresh_cookie(response, new_raw)
    return _access_response(user.id)


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, response: Response, db: DbSession) -> MessageResponse:
    raw = request.cookies.get(REFRESH_COOKIE)
    if raw:
        await auth_service.revoke_refresh_token(db, raw)
        await db.commit()
    response.delete_cookie(REFRESH_COOKIE, path=_COOKIE_PATH)
    return MessageResponse(detail="Logged out.")


@router.get("/me", response_model=UserMe)
async def me(user: CurrentUser) -> UserMe:
    return UserMe.model_validate(user)


def _missing_session():
    from fastapi import HTTPException

    return HTTPException(status.HTTP_401_UNAUTHORIZED, "No active session")
