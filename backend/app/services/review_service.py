"""Review domain logic: only a participant of a completed booking may review, once per side."""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut
from app.services import booking_service


def to_out(review: Review) -> ReviewOut:
    return ReviewOut(
        id=review.id,
        booking_id=review.booking_id,
        bike_id=review.bike_id,
        reviewer_id=review.reviewer_id,
        reviewer_name=review.reviewer.full_name,
        target=review.target,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    )


async def create_review(db: AsyncSession, user: User, data: ReviewCreate) -> Review:
    booking = await booking_service.get_booking_or_404(db, data.booking_id)
    if booking.status != "completed":
        raise HTTPException(status.HTTP_409_CONFLICT, "You can only review a completed booking")

    if user.id == booking.renter_id:
        target = "bike"
    elif user.id == booking.owner_id:
        target = "renter"
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not part of this booking")

    existing = await db.scalar(
        select(Review).where(Review.booking_id == booking.id, Review.target == target)
    )
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "You already reviewed this booking")

    review = Review(
        booking_id=booking.id,
        bike_id=booking.bike_id,
        reviewer_id=user.id,
        target=target,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review, attribute_names=["reviewer"])
    return review


async def bike_rating(db: AsyncSession, bike_id: int) -> tuple[float | None, int]:
    avg, count = (
        await db.execute(
            select(func.avg(Review.rating), func.count()).where(
                Review.bike_id == bike_id, Review.target == "bike"
            )
        )
    ).one()
    return (round(float(avg), 2) if avg is not None else None, int(count))


async def ratings_for(
    db: AsyncSession, bike_ids: list[int]
) -> dict[int, tuple[float | None, int]]:
    if not bike_ids:
        return {}
    rows = await db.execute(
        select(Review.bike_id, func.avg(Review.rating), func.count())
        .where(Review.bike_id.in_(bike_ids), Review.target == "bike")
        .group_by(Review.bike_id)
    )
    found = {bid: (round(float(avg), 2), int(count)) for bid, avg, count in rows.all()}
    return {bid: found.get(bid, (None, 0)) for bid in bike_ids}


async def list_bike_reviews(
    db: AsyncSession, bike_id: int
) -> tuple[float | None, int, list[Review]]:
    rows = await db.scalars(
        select(Review)
        .where(Review.bike_id == bike_id, Review.target == "bike")
        .options(selectinload(Review.reviewer))
        .order_by(Review.created_at.desc())
    )
    reviews = list(rows.all())
    average, count = await bike_rating(db, bike_id)
    return average, count, reviews
