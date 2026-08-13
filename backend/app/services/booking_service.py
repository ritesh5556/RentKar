"""Booking domain logic: pricing, rider screening, lifecycle, and (mock) payments.

Security-relevant invariants (see docs/SECURITY.md):
- Prices are computed here from the bike's snapshot price + plan — never trusted from the client.
- Every state transition checks the caller's role (owner vs renter) → anti-IDOR.
- Payment is idempotent (a repeated "pay" cannot double-charge).
"""

from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import utcnow
from app.models.bike import Bike
from app.models.booking import BLOCKING_STATUSES, Booking, Payment
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingQuoteRequest
from app.services import payment_service

MIN_RIDER_AGE = 18

# Riders Share-style protection tiers (USD). Roadside assistance is included on all.
PLAN_CATALOG: dict[str, dict] = {
    "basic": {
        "daily_fee": Decimal("15.00"),
        "deductible": Decimal("1500.00"),
        "description": "Damage coverage with a $1,500 deductible. Roadside assistance included.",
    },
    "standard": {
        "daily_fee": Decimal("25.00"),
        "deductible": Decimal("750.00"),
        "description": "Damage coverage with a $750 deductible. Roadside assistance included.",
    },
    "premium": {
        "daily_fee": Decimal("40.00"),
        "deductible": Decimal("250.00"),
        "description": "Damage coverage with a $250 deductible. Roadside assistance included.",
    },
}

_LOADED = (
    selectinload(Booking.bike),
    selectinload(Booking.renter),
    selectinload(Booking.owner),
)
_CENTS = Decimal("0.01")


def plan_catalog() -> list[dict]:
    return [
        {"plan": name, "daily_fee": p["daily_fee"], "deductible": p["deductible"],
         "description": p["description"]}
        for name, p in PLAN_CATALOG.items()
    ]


def _rider_age(dob: date, today: date) -> int:
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def compute_quote(bike: Bike, start: date, end: date, plan: str) -> dict:
    if end < start:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "end_date must be on/after start")
    total_days = (end - start).days + 1
    rental_subtotal = (bike.price_per_day * total_days).quantize(_CENTS)
    insurance_fee = (PLAN_CATALOG[plan]["daily_fee"] * total_days).quantize(_CENTS)
    return {
        "total_days": total_days,
        "unit_price": bike.price_per_day,
        "insurance_fee": insurance_fee,
        "rental_subtotal": rental_subtotal,
        "total_price": rental_subtotal + insurance_fee,
        "deposit_amount": bike.security_deposit,
    }


async def _bike_or_404(db: AsyncSession, bike_id: int) -> Bike:
    bike = await db.scalar(select(Bike).where(Bike.id == bike_id))
    if bike is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bike not found")
    return bike


async def has_overlap(
    db: AsyncSession, bike_id: int, start: date, end: date, exclude_id: int | None = None
) -> bool:
    conditions = [
        Booking.bike_id == bike_id,
        Booking.status.in_(BLOCKING_STATUSES),
        Booking.start_date <= end,
        Booking.end_date >= start,
    ]
    if exclude_id is not None:
        conditions.append(Booking.id != exclude_id)
    count = await db.scalar(select(func.count()).select_from(Booking).where(*conditions)) or 0
    return count > 0


async def is_available(db: AsyncSession, bike_id: int, start: date, end: date) -> bool:
    return not await has_overlap(db, bike_id, start, end)


async def quote(db: AsyncSession, data: BookingQuoteRequest) -> dict:
    bike = await _bike_or_404(db, data.bike_id)
    breakdown = compute_quote(bike, data.start_date, data.end_date, data.protection_plan)
    return {
        "bike_id": bike.id,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "protection_plan": data.protection_plan,
        "roadside_assistance": True,
        **breakdown,
    }


async def get_booking_or_404(db: AsyncSession, booking_id: int) -> Booking:
    booking = await db.scalar(
        select(Booking)
        .where(Booking.id == booking_id)
        .options(*_LOADED)
        .execution_options(populate_existing=True)
    )
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    return booking


async def create_booking(db: AsyncSession, renter: User, data: BookingCreate) -> Booking:
    if not data.accept_terms:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "You must accept the rental terms"
        )
    # Rider screening (Riders Share model): license + minimum age.
    if not renter.license_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Verify your driver's license before booking"
        )
    dob = renter.date_of_birth
    if dob is None or _rider_age(dob, utcnow().date()) < MIN_RIDER_AGE:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, f"Riders must be at least {MIN_RIDER_AGE}"
        )

    bike = await _bike_or_404(db, data.bike_id)
    if bike.status != "active":
        raise HTTPException(status.HTTP_409_CONFLICT, "This bike is not available to book")
    if bike.owner_id == renter.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot book your own bike")
    if data.start_date < utcnow().date():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "start_date cannot be in the past"
        )

    breakdown = compute_quote(bike, data.start_date, data.end_date, data.protection_plan)
    if await has_overlap(db, bike.id, data.start_date, data.end_date):
        raise HTTPException(status.HTTP_409_CONFLICT, "Those dates are already booked")

    booking = Booking(
        bike_id=bike.id,
        renter_id=renter.id,
        owner_id=bike.owner_id,
        start_date=data.start_date,
        end_date=data.end_date,
        protection_plan=data.protection_plan,
        status="pending",
        payment_status="unpaid",
        terms_accepted_at=utcnow(),
        **breakdown,
    )
    db.add(booking)
    await db.commit()
    return await get_booking_or_404(db, booking.id)


async def list_for_renter(db: AsyncSession, user: User) -> list[Booking]:
    rows = await db.scalars(
        select(Booking).where(Booking.renter_id == user.id).options(*_LOADED)
        .order_by(Booking.created_at.desc())
    )
    return list(rows.all())


async def list_for_owner(db: AsyncSession, user: User) -> list[Booking]:
    rows = await db.scalars(
        select(Booking).where(Booking.owner_id == user.id).options(*_LOADED)
        .order_by(Booking.created_at.desc())
    )
    return list(rows.all())


def _require_owner(booking: Booking, user: User) -> None:
    if booking.owner_id != user.id and not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the bike owner can do this")


def _require_participant(booking: Booking, user: User) -> None:
    if user.id not in (booking.renter_id, booking.owner_id) and not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not part of this booking")


async def confirm_booking(db: AsyncSession, booking: Booking, user: User) -> Booking:
    _require_owner(booking, user)
    if booking.status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "Only pending bookings can be approved")
    if await has_overlap(db, booking.bike_id, booking.start_date, booking.end_date, booking.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Those dates were just taken")
    booking.status = "confirmed"
    await db.commit()
    return await get_booking_or_404(db, booking.id)


async def reject_booking(db: AsyncSession, booking: Booking, user: User) -> Booking:
    _require_owner(booking, user)
    if booking.status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "Only pending bookings can be rejected")
    booking.status = "rejected"
    await db.commit()
    return await get_booking_or_404(db, booking.id)


async def cancel_booking(db: AsyncSession, booking: Booking, user: User) -> Booking:
    _require_participant(booking, user)
    if booking.status not in ("pending", "confirmed"):
        raise HTTPException(status.HTTP_409_CONFLICT, "This booking can no longer be cancelled")
    booking.status = "cancelled"
    if booking.payment_status == "paid":
        result = payment_service.refund(f"booking_{booking.id}")
        db.add(Payment(
            booking_id=booking.id, amount=booking.total_price, kind="refund",
            status="refunded", provider="mock", transaction_ref=result.reference,
        ))
        booking.payment_status = "refunded"
    await db.commit()
    return await get_booking_or_404(db, booking.id)


async def pay_booking(
    db: AsyncSession, booking: Booking, user: User, idempotency_key: str | None = None
) -> Booking:
    if booking.renter_id != user.id and not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the renter can pay for this booking")
    if booking.status != "confirmed":
        raise HTTPException(status.HTTP_409_CONFLICT, "Booking must be approved before payment")
    if booking.payment_status == "paid":
        return booking  # idempotent no-op
    if idempotency_key:
        seen = await db.scalar(
            select(Payment).where(Payment.idempotency_key == idempotency_key)
        )
        if seen is not None:
            return booking

    rental = payment_service.charge(booking.total_price, f"RenkKar rental #{booking.id}")
    db.add(Payment(
        booking_id=booking.id, amount=booking.total_price, kind="rental", status="succeeded",
        provider="mock", transaction_ref=rental.reference, idempotency_key=idempotency_key,
    ))
    if booking.deposit_amount and booking.deposit_amount > 0:
        hold = payment_service.charge(booking.deposit_amount, f"Deposit hold #{booking.id}")
        db.add(Payment(
            booking_id=booking.id, amount=booking.deposit_amount, kind="deposit_hold",
            status="succeeded", provider="mock", transaction_ref=hold.reference,
        ))
    booking.payment_status = "paid"
    await db.commit()
    return await get_booking_or_404(db, booking.id)


async def complete_booking(db: AsyncSession, booking: Booking, user: User) -> Booking:
    _require_owner(booking, user)
    if booking.status != "confirmed":
        raise HTTPException(status.HTTP_409_CONFLICT, "Only a confirmed booking can be completed")
    if booking.payment_status != "paid":
        raise HTTPException(status.HTTP_409_CONFLICT, "Booking must be paid before completion")
    booking.status = "completed"
    if booking.deposit_amount and booking.deposit_amount > 0:
        release = payment_service.refund(f"deposit_{booking.id}")
        db.add(Payment(
            booking_id=booking.id, amount=booking.deposit_amount, kind="deposit_release",
            status="succeeded", provider="mock", transaction_ref=release.reference,
        ))
    await db.commit()
    return await get_booking_or_404(db, booking.id)
