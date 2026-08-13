"""Mock payment provider behind a stable interface.

Swapping in Stripe/Razorpay later means reimplementing charge()/refund() to call the
real API (and verifying webhook signatures) — no changes at the call sites in
booking_service. See docs/ARCHITECTURE.md §8.
"""

import secrets
from dataclasses import dataclass
from decimal import Decimal


@dataclass
class ChargeResult:
    success: bool
    reference: str


def charge(amount: Decimal, description: str) -> ChargeResult:
    # Mock: always succeeds and returns a fake transaction reference.
    return ChargeResult(success=True, reference=f"mock_ch_{secrets.token_hex(8)}")


def refund(reference: str) -> ChargeResult:
    return ChargeResult(success=True, reference=f"mock_rf_{secrets.token_hex(8)}")
