"""Bike (motorcycle) listings and their images."""

from decimal import Decimal

from sqlalchemy import Boolean, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin
from app.models.user import User

# Riders Share-style categories. Stored as strings for DB portability.
BIKE_CATEGORIES = (
    "cruiser",
    "sport",
    "touring",
    "adventure",
    "standard",
    "dual_sport",
    "scooter",
    "dirt",
    "electric",
    "other",
)
BIKE_STATUSES = ("draft", "active", "inactive")


class Bike(TimestampMixin, Base):
    __tablename__ = "bikes"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(140), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    make: Mapped[str] = mapped_column(String(60), nullable=False)
    model: Mapped[str] = mapped_column(String(60), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    engine_cc: Mapped[int | None] = mapped_column(Integer)
    mileage: Mapped[int | None] = mapped_column(Integer)
    transmission: Mapped[str | None] = mapped_column(String(20))

    # Money is USD, Numeric(10,2). Amounts are always computed/validated server-side.
    price_per_day: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    security_deposit: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)

    city: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(40), nullable=False)
    # Private: exact address is revealed only after a confirmed booking (privacy/safety).
    address: Mapped[str | None] = mapped_column(String(255))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)

    status: Mapped[str] = mapped_column(String(12), default="active", nullable=False, index=True)

    owner: Mapped[User] = relationship()
    images: Mapped[list["BikeImage"]] = relationship(
        back_populates="bike",
        cascade="all, delete-orphan",
        order_by="BikeImage.sort_order",
    )


class BikeImage(Base):
    __tablename__ = "bike_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    bike_id: Mapped[int] = mapped_column(
        ForeignKey("bikes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Stored path like /uploads/bikes/<uuid>.jpg — only re-encoded images live on disk.
    path: Mapped[str] = mapped_column(String(512), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    bike: Mapped[Bike] = relationship(back_populates="images")
