"""Review schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class ReviewOut(BaseModel):
    id: int
    booking_id: int
    bike_id: int
    reviewer_id: int
    reviewer_name: str
    target: str
    rating: int
    comment: str | None
    created_at: datetime


class BikeReviews(BaseModel):
    average: float | None
    count: int
    items: list[ReviewOut]
