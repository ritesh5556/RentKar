"""Email delivery — a dev stub that logs the link. Swap for a real provider in prod."""

import logging

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger("renkkar.email")


def send_verification_email(to_email: str, raw_token: str) -> None:
    link = f"{settings.frontend_url}/verify-email?token={raw_token}"
    # DEV: the token is only ever logged here (never returned by the API), so a
    # developer can complete verification locally. Replace with a real email send in prod.
    logger.info("[DEV EMAIL] Verify %s -> %s", to_email, link)
