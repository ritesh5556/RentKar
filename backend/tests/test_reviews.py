"""Two-way review tests: completed-booking gate, averages, one-per-side, authorization."""

from datetime import date, timedelta

BIKES = "/api/bikes"
BOOKINGS = "/api/bookings"
REVIEWS = "/api/reviews"

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
}


def _dates(offset_start: int = 10, length: int = 2) -> tuple[str, str]:
    start = date.today() + timedelta(days=offset_start)
    return start.isoformat(), (start + timedelta(days=length)).isoformat()


async def _screen(client, headers) -> None:
    await client.post(
        "/api/users/me/verify-identity",
        json={"driver_license_number": "D1234567", "date_of_birth": "1990-05-01"},
        headers=headers,
    )


async def _book(client, headers, bike_id, start, end):
    return await client.post(
        BOOKINGS,
        json={
            "bike_id": bike_id,
            "start_date": start,
            "end_date": end,
            "protection_plan": "standard",
            "accept_terms": True,
        },
        headers=headers,
    )


async def _setup(client, make_user, prefix, complete=True):
    owner = await make_user(f"{prefix}o@example.com")
    renter = await make_user(f"{prefix}r@example.com")
    await _screen(client, renter["headers"])
    bike = (await client.post(BIKES, json=BIKE, headers=owner["headers"])).json()
    start, end = _dates()
    bid = (await _book(client, renter["headers"], bike["id"], start, end)).json()["id"]
    if complete:
        await client.post(f"{BOOKINGS}/{bid}/confirm", headers=owner["headers"])
        await client.post(f"{BOOKINGS}/{bid}/pay", headers=renter["headers"])
        await client.post(f"{BOOKINGS}/{bid}/complete", headers=owner["headers"])
    return owner, renter, bike, bid


async def test_review_requires_completed_booking(client, make_user):
    _owner, renter, _bike, bid = await _setup(client, make_user, "rc", complete=False)
    r = await client.post(REVIEWS, json={"booking_id": bid, "rating": 5}, headers=renter["headers"])
    assert r.status_code == 409


async def test_two_way_reviews_and_average(client, make_user):
    owner, renter, bike, bid = await _setup(client, make_user, "tw")

    renter_review = await client.post(
        REVIEWS, json={"booking_id": bid, "rating": 5, "comment": "Great bike"},
        headers=renter["headers"],
    )
    assert renter_review.status_code == 201
    assert renter_review.json()["target"] == "bike"

    owner_review = await client.post(
        REVIEWS, json={"booking_id": bid, "rating": 4, "comment": "Good rider"},
        headers=owner["headers"],
    )
    assert owner_review.status_code == 201
    assert owner_review.json()["target"] == "renter"

    # Bike reviews list reflects only the bike-directed review.
    listing = await client.get(f"{BIKES}/{bike['id']}/reviews")
    assert listing.status_code == 200
    assert listing.json()["average"] == 5.0
    assert listing.json()["count"] == 1

    # Bike detail surfaces the aggregate rating.
    detail = await client.get(f"{BIKES}/{bike['id']}")
    assert detail.json()["avg_rating"] == 5.0
    assert detail.json()["review_count"] == 1


async def test_duplicate_review_rejected(client, make_user):
    _owner, renter, _bike, bid = await _setup(client, make_user, "dup")
    first = await client.post(
        REVIEWS, json={"booking_id": bid, "rating": 5}, headers=renter["headers"]
    )
    assert first.status_code == 201
    second = await client.post(
        REVIEWS, json={"booking_id": bid, "rating": 3}, headers=renter["headers"]
    )
    assert second.status_code == 409


async def test_non_participant_cannot_review(client, make_user):
    _owner, _renter, _bike, bid = await _setup(client, make_user, "np")
    attacker = await make_user("np-attacker@example.com")
    r = await client.post(
        REVIEWS, json={"booking_id": bid, "rating": 5}, headers=attacker["headers"]
    )
    assert r.status_code == 403
