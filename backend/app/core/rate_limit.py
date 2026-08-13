"""Shared slowapi rate limiter (per client IP)."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

settings = get_settings()

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["300/minute"],
    enabled=settings.rate_limit_enabled,
    headers_enabled=True,
)
