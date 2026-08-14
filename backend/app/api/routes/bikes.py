"""Bike listing + reviews-read endpoints."""

from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession, OptionalUser, VerifiedUser
from app.models.bike import Bike, BikeImage
from app.models.user import User
from app.schemas.bike import BikeCreate, BikeOut, BikeSummary, BikeUpdate, Category
from app.schemas.common import Page
from app.schemas.review import BikeReviews
from app.services import bike_service, booking_service, review_service, upload_service

settings = get_settings()
router = APIRouter(prefix="/bikes", tags=["bikes"])

Rating = tuple[float | None, int]
_NO_RATING: Rating = (None, 0)


def _to_out(bike: Bike, viewer: User | None, rating: Rating = _NO_RATING) -> BikeOut:
    out = BikeOut.model_validate(bike)
    out.avg_rating, out.review_count = rating
    is_owner = viewer is not None and viewer.id == bike.owner_id
    out.is_owner = is_owner
    if not is_owner:
        out.address = None  # privacy; Phase 4 reveals to a confirmed renter
    return out


def _to_summary(bike: Bike, rating: Rating = _NO_RATING) -> BikeSummary:
    summary = BikeSummary.model_validate(bike)
    summary.primary_image = bike_service.primary_image_path(bike)
    summary.avg_rating, summary.review_count = rating
    return summary


@router.get("", response_model=Page[BikeSummary])
async def list_bikes(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    city: Annotated[str | None, Query(max_length=80)] = None,
    state: Annotated[str | None, Query(max_length=40)] = None,
    category: Annotated[Category | None, Query()] = None,
    min_price: Annotated[Decimal | None, Query(ge=0)] = None,
    max_price: Annotated[Decimal | None, Query(ge=0)] = None,
    sort: Annotated[Literal["newest", "price_asc", "price_desc"], Query()] = "newest",
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
) -> Page[BikeSummary]:
    bikes, total = await bike_service.search_bikes(
        db,
        q=q,
        city=city,
        state=state,
        category=category,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )
    ratings = await review_service.ratings_for(db, [b.id for b in bikes])
    items = [_to_summary(b, ratings.get(b.id, _NO_RATING)) for b in bikes]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/mine", response_model=list[BikeSummary])
async def my_bikes(user: CurrentUser, db: DbSession) -> list[BikeSummary]:
    bikes = await bike_service.list_owner_bikes(db, user)
    ratings = await review_service.ratings_for(db, [b.id for b in bikes])
    return [_to_summary(b, ratings.get(b.id, _NO_RATING)) for b in bikes]


@router.post("", response_model=BikeOut, status_code=status.HTTP_201_CREATED)
async def create_bike(data: BikeCreate, user: VerifiedUser, db: DbSession) -> BikeOut:
    bike = await bike_service.create_bike(db, user, data)
    return _to_out(bike, user)


@router.get("/{bike_id}", response_model=BikeOut)
async def get_bike(bike_id: int, viewer: OptionalUser, db: DbSession) -> BikeOut:
    bike = await bike_service.get_bike_or_404(db, bike_id)
    rating = await review_service.bike_rating(db, bike.id)
    return _to_out(bike, viewer, rating)


@router.get("/{bike_id}/availability")
async def check_availability(
    bike_id: int, db: DbSession, start: date, end: date
) -> dict[str, bool]:
    await bike_service.get_bike_or_404(db, bike_id)
    return {"available": await booking_service.is_available(db, bike_id, start, end)}


@router.get("/{bike_id}/reviews", response_model=BikeReviews)
async def bike_reviews(bike_id: int, db: DbSession) -> BikeReviews:
    await bike_service.get_bike_or_404(db, bike_id)
    average, count, reviews = await review_service.list_bike_reviews(db, bike_id)
    return BikeReviews(
        average=average, count=count, items=[review_service.to_out(r) for r in reviews]
    )


@router.patch("/{bike_id}", response_model=BikeOut)
async def update_bike(
    bike_id: int, data: BikeUpdate, user: CurrentUser, db: DbSession
) -> BikeOut:
    bike = await bike_service.require_owned_bike(db, bike_id, user)
    bike = await bike_service.update_bike(db, bike, data)
    rating = await review_service.bike_rating(db, bike.id)
    return _to_out(bike, user, rating)


@router.delete("/{bike_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bike(bike_id: int, user: CurrentUser, db: DbSession) -> None:
    bike = await bike_service.require_owned_bike(db, bike_id, user)
    for image in bike.images:
        upload_service.delete_image_file(image.path)
    await bike_service.delete_bike(db, bike)


@router.post("/{bike_id}/images", response_model=BikeOut)
async def upload_bike_images(
    bike_id: int,
    user: CurrentUser,
    db: DbSession,
    files: Annotated[list[UploadFile], File()],
) -> BikeOut:
    bike = await bike_service.require_owned_bike(db, bike_id, user)
    if len(bike.images) + len(files) > settings.max_images_per_bike:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"A listing can have at most {settings.max_images_per_bike} images",
        )
    start = len(bike.images)
    for offset, upload in enumerate(files):
        path = await upload_service.save_image(upload, subdir="bikes")
        db.add(
            BikeImage(
                bike_id=bike.id,
                path=path,
                is_primary=(start == 0 and offset == 0),
                sort_order=start + offset,
            )
        )
    await db.commit()
    bike = await bike_service.get_bike_or_404(db, bike_id)
    rating = await review_service.bike_rating(db, bike.id)
    return _to_out(bike, user, rating)


@router.delete("/{bike_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bike_image(
    bike_id: int, image_id: int, user: CurrentUser, db: DbSession
) -> None:
    bike = await bike_service.require_owned_bike(db, bike_id, user)
    image = next((im for im in bike.images if im.id == image_id), None)
    if image is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    path = image.path
    await db.delete(image)
    await db.commit()
    upload_service.delete_image_file(path)
