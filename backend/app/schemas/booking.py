"""Booking + payment schemas."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict

ProtectionPlan = Literal["basic", "standard", "premium"]


class BookingCreate(BaseModel):
    bike_id: int
    start_date: date
    end_date: date
    protection_plan: ProtectionPlan = "standard"
    accept_terms: bool


class BookingQuoteRequest(BaseModel):
    bike_id: int
    start_date: date
    end_date: date
    protection_plan: ProtectionPlan = "standard"


class BookingQuote(BaseModel):
    bike_id: int
    start_date: date
    end_date: date
    total_days: int
    unit_price: Decimal
    protection_plan: ProtectionPlan
    insurance_fee: Decimal
    rental_subtotal: Decimal
    total_price: Decimal
    deposit_amount: Decimal
    roadside_assistance: bool = True


class PlanInfo(BaseModel):
    plan: ProtectionPlan
    daily_fee: Decimal
    deductible: Decimal
    description: str


class BikeMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    make: str
    model: str
    year: int
    city: str
    state: str


class PartyMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bike_id: int
    renter_id: int
    owner_id: int
    start_date: date
    end_date: date
    total_days: int
    unit_price: Decimal
    protection_plan: str
    insurance_fee: Decimal
    rental_subtotal: Decimal
    total_price: Decimal
    deposit_amount: Decimal
    status: str
    payment_status: str
    roadside_assistance: bool = True
    created_at: datetime
    updated_at: datetime
    bike: BikeMini
    renter: PartyMini
    owner: PartyMini
