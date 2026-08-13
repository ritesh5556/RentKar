"""Bookings and (mock) payments."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin
from app.models.bike import Bike
from app.models.user import User

BOOKING_STATUSES = ("pending", "confirmed", "rejected", "cancelled", "completed")
# Statuses that occupy the calendar and therefore block overlapping bookings.
BLOCKING_STATUSES = ("pending", "confirmed")
PAYMENT_STATUSES = ("unpaid", "paid", "refunded")
PROTECTION_PLANS = ("basic", "standard", "premium")


class Booking(TimestampMixin, Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    bike_id: Mapped[int] = mapped_column(
        ForeignKey("bikes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    renter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Denormalized for quick "incoming bookings" lookups by owner.
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_days: Mapped[int] = mapped_column(Integer, nullable=False)

    # All amounts are USD and computed server-side. unit_price is a snapshot so a later
    # price change on the bike never rewrites booking history.
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    protection_plan: Mapped[str] = mapped_column(String(12), nullable=False)
    insurance_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    rental_subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)

    status: Mapped[str] = mapped_column(String(12), default="pending", nullable=False, index=True)
    payment_status: Mapped[str] = mapped_column(String(12), default="unpaid", nullable=False)
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime)

    bike: Mapped[Bike] = relationship()
    renter: Mapped[User] = relationship(foreign_keys=[renter_id])
    owner: Mapped[User] = relationship(foreign_keys=[owner_id])
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="booking", cascade="all, delete-orphan"
    )


class Payment(Base):
    """A mock payment ledger entry. Real providers implement the same shape later."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # rental | deposit_hold | deposit_release | refund
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(12), nullable=False)  # succeeded | refunded
    provider: Mapped[str] = mapped_column(String(20), default="mock", nullable=False)
    transaction_ref: Mapped[str] = mapped_column(String(80), nullable=False)
    # Unique so a repeated "pay" (double-submit) cannot double-charge.
    idempotency_key: Mapped[str | None] = mapped_column(String(80), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    booking: Mapped[Booking] = relationship(back_populates="payments")
