"""Bike listing schemas.

BikeSummary = list-card view; BikeOut = full detail (address nulled for non-owners);
BikeCreate/BikeUpdate whitelist writable fields.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Category = Literal[
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
]
BikeStatus = Literal["draft", "active", "inactive"]


class BikeBase(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    description: str | None = Field(default=None, max_length=5000)
    make: str = Field(min_length=1, max_length=60)
    model: str = Field(min_length=1, max_length=60)
    year: int = Field(ge=1900, le=2100)
    category: Category
    engine_cc: int | None = Field(default=None, ge=0, le=10000)
    mileage: int | None = Field(default=None, ge=0)
    transmission: str | None = Field(default=None, max_length=20)
    price_per_day: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    security_deposit: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    city: str = Field(min_length=1, max_length=80)
    state: str = Field(min_length=2, max_length=40)
    address: str | None = Field(default=None, max_length=255)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class BikeCreate(BikeBase):
    status: BikeStatus = "active"


class BikeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=140)
    description: str | None = Field(default=None, max_length=5000)
    make: str | None = Field(default=None, min_length=1, max_length=60)
    model: str | None = Field(default=None, min_length=1, max_length=60)
    year: int | None = Field(default=None, ge=1900, le=2100)
    category: Category | None = None
    engine_cc: int | None = Field(default=None, ge=0, le=10000)
    mileage: int | None = Field(default=None, ge=0)
    transmission: str | None = Field(default=None, max_length=20)
    price_per_day: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    security_deposit: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    city: str | None = Field(default=None, min_length=1, max_length=80)
    state: str | None = Field(default=None, min_length=2, max_length=40)
    address: str | None = Field(default=None, max_length=255)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    status: BikeStatus | None = None


class BikeImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    path: str
    is_primary: bool
    sort_order: int


class OwnerPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    avatar_url: str | None = None


class BikeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    make: str
    model: str
    year: int
    category: str
    price_per_day: Decimal
    security_deposit: Decimal
    city: str
    state: str
    status: str
    primary_image: str | None = None
    avg_rating: float | None = None
    review_count: int = 0
    created_at: datetime


class BikeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_id: int
    title: str
    description: str | None
    make: str
    model: str
    year: int
    category: str
    engine_cc: int | None
    mileage: int | None
    transmission: str | None
    price_per_day: Decimal
    security_deposit: Decimal
    city: str
    state: str
    address: str | None  # nulled for non-owners (until a confirmed booking, Phase 4)
    latitude: float | None
    longitude: float | None
    status: str
    created_at: datetime
    updated_at: datetime
    images: list[BikeImageOut] = []
    owner: OwnerPublic
    is_owner: bool = False
    avg_rating: float | None = None
    review_count: int = 0
