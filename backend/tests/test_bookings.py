"""Booking lifecycle + booking-security tests (pricing, screening, overlap, IDOR, idempotency)."""

from datetime import date, timedelta

from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.models.booking import Payment

BIKES = "/api/bikes"
BOOKINGS = "/api/bookings"

BIKE = {
    "title": "2021 Kawasaki Ninja 400",
    "make": "Kawasaki",
    "model": "Ninja 400",
    "year": 2021,
    "category": "sport",
    "price_per_day": "45.00",
    "security_deposit": "500.00",
    "city": "Austin",
    "state": "TX",
    "address": "123 Main St",
}


def _dates(offset_start: int = 10, length: int = 2) -> tuple[str, str]:
    start = date.today() + timedelta(days=offset_start)
    return start.isoformat(), (start + timedelta(days=length)).isoformat()


async def _screen(client, headers, dob: str = "1990-05-01") -> None:
    r = await client.post(
        "/api/users/me/verify-identity",
        json={"driver_license_number": "D1234567", "date_of_birth": dob},
        headers=headers,
    )
    assert r.status_code == 200, r.text


async def _make_bike(client, owner_headers) -> dict:
    r = await client.post(BIKES, json=BIKE, headers=owner_headers)
    assert r.status_code == 201, r.text
    return r.json()


async def _book(client, headers, bike_id, start, end, plan="standard"):
    return await client.post(
        BOOKINGS,
        json={
            "bike_id": bike_id,
            "start_date": start,
            "end_date": end,
            "protection_plan": plan,
            "accept_terms": True,
        },
        headers=headers,
    )


async def test_booking_requires_license(client, make_user):
    owner = await make_user("o1@example.com")
    renter = await make_user("r1@example.com")  # email-verified but NOT license-verified
    bike = await _make_bike(client, owner["headers"])
    start, end = _dates()
    r = await _book(client, renter["headers"], bike["id"], start, end)
    assert r.status_code == 403  # rider screening gate


async def test_full_lifecycle_and_server_pricing(client, make_user):
    owner = await make_user("o2@example.com")
    renter = await make_user("r2@example.com")
    await _screen(client, renter["headers"])
    bike = await _make_bike(client, owner["headers"])
    start, end = _dates(10, 2)  # 3 inclusive days

    created = await _book(client, renter["headers"], bike["id"], start, end)
    assert created.status_code == 201, created.text
    b = created.json()
    # Prices are computed by the server (the client never sends amounts).
    assert b["status"] == "pending"
    assert b["total_days"] == 3
    assert b["rental_subtotal"] == "135.00"  # 45 * 3
    assert b["insurance_fee"] == "75.00"  # standard $25/day * 3
    assert b["total_price"] == "210.00"
    assert b["deposit_amount"] == "500.00"
    assert b["roadside_assistance"] is True
    bid = b["id"]

    # Renter cannot approve their own request (owner-only).
    denied = await client.post(f"{BOOKINGS}/{bid}/confirm", headers=renter["headers"])
    assert denied.status_code == 403
    approved = await client.post(f"{BOOKINGS}/{bid}/confirm", headers=owner["headers"])
    assert approved.status_code == 200

    paid = await client.post(f"{BOOKINGS}/{bid}/pay", headers=renter["headers"])
    assert paid.status_code == 200 and paid.json()["payment_status"] == "paid"

    done = await client.post(f"{BOOKINGS}/{bid}/complete", headers=owner["headers"])
    assert done.status_code == 200 and done.json()["status"] == "completed"


async def test_cannot_book_own_bike(client, make_user):
    owner = await make_user("o3@example.com")
    await _screen(client, owner["headers"])
    bike = await _make_bike(client, owner["headers"])
    start, end = _dates()
    r = await _book(client, owner["headers"], bike["id"], start, end)
    assert r.status_code == 400


async def test_overlap_rejected(client, make_user):
    owner = await make_user("o4@example.com")
    renter = await make_user("r4@example.com")
    await _screen(client, renter["headers"])
    bike = await _make_bike(client, owner["headers"])
    start, end = _dates(10, 3)
    assert (await _book(client, renter["headers"], bike["id"], start, end)).status_code == 201
    s2, e2 = _dates(11, 3)  # overlaps
    assert (await _book(client, renter["headers"], bike["id"], s2, e2)).status_code == 409


async def test_payment_is_idempotent(client, make_user):
    owner = await make_user("o5@example.com")
    renter = await make_user("r5@example.com")
    await _screen(client, renter["headers"])
    bike = await _make_bike(client, owner["headers"])
    start, end = _dates()
    bid = (await _book(client, renter["headers"], bike["id"], start, end)).json()["id"]
    await client.post(f"{BOOKINGS}/{bid}/confirm", headers=owner["headers"])

    key = {"Idempotency-Key": "pay-once-123"}
    first = await client.post(f"{BOOKINGS}/{bid}/pay", headers={**renter["headers"], **key})
    second = await client.post(f"{BOOKINGS}/{bid}/pay", headers={**renter["headers"], **key})
    assert first.status_code == 200 and second.status_code == 200

    async with AsyncSessionLocal() as session:
        rentals = await session.scalar(
            select(func.count()).select_from(Payment).where(
                Payment.booking_id == bid, Payment.kind == "rental"
            )
        )
    assert rentals == 1  # charged exactly once despite two calls


async def test_non_renter_cannot_pay(client, make_user):
    owner = await make_user("o6@example.com")
    renter = await make_user("r6@example.com")
    attacker = await make_user("a6@example.com")
    await _screen(client, renter["headers"])
    bike = await _make_bike(client, owner["headers"])
    start, end = _dates()
    bid = (await _book(client, renter["headers"], bike["id"], start, end)).json()["id"]
    await client.post(f"{BOOKINGS}/{bid}/confirm", headers=owner["headers"])
    r = await client.post(f"{BOOKINGS}/{bid}/pay", headers=attacker["headers"])
    assert r.status_code == 403


async def test_search_excludes_booked_dates(client, make_user):
    owner = await make_user("o7@example.com")
    renter = await make_user("r7@example.com")
    await _screen(client, renter["headers"])
    bike = await _make_bike(client, owner["headers"])
    start, end = _dates(10, 2)
    assert (await _book(client, renter["headers"], bike["id"], start, end)).status_code == 201

    booked = await client.get(BIKES, params={"start_date": start, "end_date": end})
    assert booked.json()["total"] == 0  # excluded during the booked window

    s2, e2 = _dates(40, 2)
    free = await client.get(BIKES, params={"start_date": s2, "end_date": e2})
    assert free.json()["total"] == 1
