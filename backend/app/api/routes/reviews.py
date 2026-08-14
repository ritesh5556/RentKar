"""Review endpoints."""

from fastapi import APIRouter, status

from app.core.deps import DbSession, VerifiedUser
from app.schemas.review import ReviewCreate, ReviewOut
from app.services import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(data: ReviewCreate, user: VerifiedUser, db: DbSession) -> ReviewOut:
    review = await review_service.create_review(db, user, data)
    return review_service.to_out(review)
