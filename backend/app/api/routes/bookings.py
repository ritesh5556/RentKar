"""Booking endpoints: quote, create, list, and lifecycle transitions."""

from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status

from app.core.deps import CurrentUser, DbSession, VerifiedUser
from app.schemas.booking import (
    BookingCreate,
    BookingOut,
    BookingQuote,
    BookingQuoteRequest,
    PlanInfo,
)
from app.services import booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("/plans", response_model=list[PlanInfo])
async def protection_plans() -> list[PlanInfo]:
    return booking_service.plan_catalog()


@router.post("/quote", response_model=BookingQuote)
async def quote_booking(data: BookingQuoteRequest, db: DbSession) -> BookingQuote:
    return await booking_service.quote(db, data)


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(data: BookingCreate, user: VerifiedUser, db: DbSession) -> BookingOut:
    booking = await booking_service.create_booking(db, user, data)
    return BookingOut.model_validate(booking)


@router.get("/mine", response_model=list[BookingOut])
async def my_bookings(user: CurrentUser, db: DbSession) -> list[BookingOut]:
    bookings = await booking_service.list_for_renter(db, user)
    return [BookingOut.model_validate(b) for b in bookings]


@router.get("/incoming", response_model=list[BookingOut])
async def incoming_bookings(user: CurrentUser, db: DbSession) -> list[BookingOut]:
    bookings = await booking_service.list_for_owner(db, user)
    return [BookingOut.model_validate(b) for b in bookings]


@router.get("/{booking_id}", response_model=BookingOut)
async def get_booking(booking_id: int, user: CurrentUser, db: DbSession) -> BookingOut:
    booking = await booking_service.get_booking_or_404(db, booking_id)
    if user.id not in (booking.renter_id, booking.owner_id) and not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not part of this booking")
    return BookingOut.model_validate(booking)


@router.post("/{booking_id}/confirm", response_model=BookingOut)
async def confirm(booking_id: int, user: CurrentUser, db: DbSession) -> BookingOut:
    booking = await booking_service.get_booking_or_404(db, booking_id)
    return BookingOut.model_validate(await booking_service.confirm_booking(db, booking, user))


@router.post("/{booking_id}/reject", response_model=BookingOut)
async def reject(booking_id: int, user: CurrentUser, db: DbSession) -> BookingOut:
    booking = await booking_service.get_booking_or_404(db, booking_id)
    return BookingOut.model_validate(await booking_service.reject_booking(db, booking, user))


@router.post("/{booking_id}/cancel", response_model=BookingOut)
async def cancel(booking_id: int, user: CurrentUser, db: DbSession) -> BookingOut:
    booking = await booking_service.get_booking_or_404(db, booking_id)
    return BookingOut.model_validate(await booking_service.cancel_booking(db, booking, user))


@router.post("/{booking_id}/pay", response_model=BookingOut)
async def pay(
    booking_id: int,
    user: CurrentUser,
    db: DbSession,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> BookingOut:
    booking = await booking_service.get_booking_or_404(db, booking_id)
    updated = await booking_service.pay_booking(db, booking, user, idempotency_key)
    return BookingOut.model_validate(updated)


@router.post("/{booking_id}/complete", response_model=BookingOut)
async def complete(booking_id: int, user: CurrentUser, db: DbSession) -> BookingOut:
    booking = await booking_service.get_booking_or_404(db, booking_id)
    return BookingOut.model_validate(await booking_service.complete_booking(db, booking, user))
