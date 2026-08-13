"""Bike listing domain logic, including object-level authorization (anti-IDOR)."""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.bike import Bike
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


async def list_active_bikes(
    db: AsyncSession, page: int, page_size: int
) -> tuple[list[Bike], int]:
    """Basic active-listing feed (Phase 3 adds filters/sort/availability)."""
    conditions = [Bike.status == "active"]
    total = await db.scalar(select(func.count()).select_from(Bike).where(*conditions)) or 0
    rows = await db.scalars(
        select(Bike)
        .where(*conditions)
        .options(selectinload(Bike.images))
        .order_by(Bike.created_at.desc())
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
