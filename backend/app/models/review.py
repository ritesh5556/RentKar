"""Two-way reviews: a renter reviews the bike, an owner reviews the renter."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User

REVIEW_TARGETS = ("bike", "renter")


class Review(Base):
    __tablename__ = "reviews"
    # One review per booking per target (renter->bike, owner->renter).
    __table_args__ = (UniqueConstraint("booking_id", "target", name="uq_review_booking_target"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    bike_id: Mapped[int] = mapped_column(
        ForeignKey("bikes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reviewer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target: Mapped[str] = mapped_column(String(10), nullable=False)  # "bike" | "renter"
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..5
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    reviewer: Mapped[User] = relationship()
