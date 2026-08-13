"""Bike listing domain logic, including object-level authorization (anti-IDOR)."""

from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.bike import Bike
from app.models.booking import BLOCKING_STATUSES, Booking
from app.models.user import User
from app.schemas.bike import BikeCreate, BikeUpdate

_LOADED = (selectinload(Bike.images), selectinload(Bike.owner))


def primary_image_path(bike: Bike) -> str | None:
    for image in bike.images:
        if image.is_primary:
            return image.path
    return bike.images[0].path if bike.images else None


async def get_bike_or_404(db: AsyncSession, bike_id: int) -> Bike:
    # populate_existing refreshes all columns on the identity-mapped instance so
    # server-side timestamps aren't left expired (which would break serialization).
    bike = await db.scalar(
        select(Bike)
        .where(Bike.id == bike_id)
        .options(*_LOADED)
        .execution_options(populate_existing=True)
    )
    if bike is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bike not found")
    return bike


async def create_bike(db: AsyncSession, owner: User, data: BikeCreate) -> Bike:
    bike = Bike(owner_id=owner.id, **data.model_dump())
    db.add(bike)
    await db.commit()
    return await get_bike_or_404(db, bike.id)


async def require_owned_bike(db: AsyncSession, bike_id: int, user: User) -> Bike:
    """Fetch a bike and assert the user owns it (or is admin). Prevents IDOR."""
    bike = await get_bike_or_404(db, bike_id)
    if bike.owner_id != user.id and not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not own this bike")
    return bike


async def update_bike(db: AsyncSession, bike: Bike, data: BikeUpdate) -> Bike:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(bike, field, value)
    await db.commit()
    return await get_bike_or_404(db, bike.id)


async def delete_bike(db: AsyncSession, bike: Bike) -> None:
    await db.delete(bike)
    await db.commit()


_SORTS = {
    "newest": Bike.created_at.desc(),
    "price_asc": Bike.price_per_day.asc(),
    "price_desc": Bike.price_per_day.desc(),
}


async def search_bikes(
    db: AsyncSession,
    *,
    q: str | None = None,
    city: str | None = None,
    state: str | None = None,
    category: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    sort: str = "newest",
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Bike], int]:
    """Filtered, sorted, paginated feed of active listings.

    If both start_date and end_date are given, bikes with an overlapping
    pending/confirmed booking are excluded.
    """
    conditions = [Bike.status == "active"]
    if q:
        like = f"%{q}%"
        conditions.append(
            or_(
                Bike.title.ilike(like),
                Bike.make.ilike(like),
                Bike.model.ilike(like),
                Bike.description.ilike(like),
            )
        )
    if city:
        conditions.append(Bike.city.ilike(f"%{city}%"))
    if state:
        conditions.append(Bike.state.ilike(state))
    if category:
        conditions.append(Bike.category == category)
    if min_price is not None:
        conditions.append(Bike.price_per_day >= min_price)
    if max_price is not None:
        conditions.append(Bike.price_per_day <= max_price)
    if start_date is not None and end_date is not None:
        overlapping = select(Booking.id).where(
            Booking.bike_id == Bike.id,
            Booking.status.in_(BLOCKING_STATUSES),
            Booking.start_date <= end_date,
            Booking.end_date >= start_date,
        )
        conditions.append(~exists(overlapping))

    total = await db.scalar(select(func.count()).select_from(Bike).where(*conditions)) or 0
    rows = await db.scalars(
        select(Bike)
        .where(*conditions)
        .options(selectinload(Bike.images))
        .order_by(_SORTS.get(sort, Bike.created_at.desc()))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(rows.all()), int(total)


async def list_owner_bikes(db: AsyncSession, owner: User) -> list[Bike]:
    rows = await db.scalars(
        select(Bike)
        .where(Bike.owner_id == owner.id)
        .options(selectinload(Bike.images))
        .order_by(Bike.created_at.desc())
    )
    return list(rows.all())
