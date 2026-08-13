"""Password hashing (Argon2), JWT access tokens, and opaque-token helpers."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

settings = get_settings()

# Argon2 by default — memory-hard, GPU-resistant, current OWASP recommendation.
_password_hash = PasswordHash.recommended()


def utcnow() -> datetime:
    """Naive UTC now — matches how naive DateTime columns round-trip on SQLite."""
    return datetime.now(UTC).replace(tzinfo=None)


# --- Passwords -------------------------------------------------------------
def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return _password_hash.verify(password, hashed)


# --- JWT access tokens -----------------------------------------------------
def create_access_token(subject: str | int, expires_minutes: int | None = None) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=expires_minutes or settings.access_token_min)
    payload = {"sub": str(subject), "iat": now, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode + validate a JWT. Raises jwt.PyJWTError on any problem."""
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


# --- Opaque tokens (refresh + email verification) --------------------------
def generate_opaque_token() -> str:
    """A high-entropy URL-safe token. The raw value is shown once; only its hash is stored."""
    return secrets.token_urlsafe(48)


def hash_opaque_token(token: str) -> str:
    """SHA-256 of an opaque token — fast, and a DB leak can't be replayed as a live token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
