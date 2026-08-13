"""Bike CRUD + authorization (IDOR) + upload-hardening tests."""

import io

from PIL import Image

BIKES = "/api/bikes"

BIKE_PAYLOAD = {
    "title": "2021 Kawasaki Ninja 400",
    "description": "Great starter sportbike",
    "make": "Kawasaki",
    "model": "Ninja 400",
    "year": 2021,
    "category": "sport",
    "engine_cc": 399,
    "mileage": 8000,
    "transmission": "manual",
    "price_per_day": "45.00",
    "security_deposit": "500.00",
    "city": "Austin",
    "state": "TX",
    "address": "123 Main St",
}


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (16, 16), "red").save(buf, format="PNG")
    return buf.getvalue()


async def _create_bike(client, headers) -> dict:
    r = await client.post(BIKES, json=BIKE_PAYLOAD, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


async def test_unverified_user_cannot_list_bike(client, make_user):
    user = await make_user("unverified@example.com", verified=False)
    r = await client.post(BIKES, json=BIKE_PAYLOAD, headers=user["headers"])
    assert r.status_code == 403


async def test_create_and_address_privacy(client, make_user):
    owner = await make_user("owner@example.com")
    bike = await _create_bike(client, owner["headers"])
    assert bike["is_owner"] is True
    assert bike["address"] == "123 Main St"  # owner sees the exact address

    # Anonymous viewer: address is hidden.
    anon = await client.get(f"{BIKES}/{bike['id']}")
    assert anon.status_code == 200
    assert anon.json()["address"] is None
    assert anon.json()["is_owner"] is False


async def test_non_owner_cannot_update_or_delete(client, make_user):
    owner = await make_user("owner2@example.com")
    attacker = await make_user("attacker@example.com")
    bike = await _create_bike(client, owner["headers"])

    upd = await client.patch(
        f"{BIKES}/{bike['id']}", json={"title": "Hacked title"}, headers=attacker["headers"]
    )
    assert upd.status_code == 403

    dele = await client.delete(f"{BIKES}/{bike['id']}", headers=attacker["headers"])
    assert dele.status_code == 403


async def test_owner_can_update(client, make_user):
    owner = await make_user("owner3@example.com")
    bike = await _create_bike(client, owner["headers"])
    upd = await client.patch(
        f"{BIKES}/{bike['id']}", json={"price_per_day": "60.00"}, headers=owner["headers"]
    )
    assert upd.status_code == 200
    assert upd.json()["price_per_day"] == "60.00"


async def test_list_and_mine(client, make_user):
    owner = await make_user("owner4@example.com")
    await _create_bike(client, owner["headers"])

    listing = await client.get(BIKES)
    assert listing.status_code == 200
    assert listing.json()["total"] >= 1

    mine = await client.get(f"{BIKES}/mine", headers=owner["headers"])
    assert mine.status_code == 200
    assert len(mine.json()) == 1


async def test_image_upload_accepts_real_image(client, make_user):
    owner = await make_user("owner5@example.com")
    bike = await _create_bike(client, owner["headers"])
    r = await client.post(
        f"{BIKES}/{bike['id']}/images",
        files=[("files", ("photo.png", _png_bytes(), "image/png"))],
        headers=owner["headers"],
    )
    assert r.status_code == 200, r.text
    images = r.json()["images"]
    assert len(images) == 1
    assert images[0]["is_primary"] is True
    assert images[0]["path"].startswith("/uploads/bikes/")


async def test_image_upload_rejects_disguised_file(client, make_user):
    owner = await make_user("owner6@example.com")
    bike = await _create_bike(client, owner["headers"])
    # A ".png" that is really a script → magic-byte check must reject it.
    r = await client.post(
        f"{BIKES}/{bike['id']}/images",
        files=[("files", ("evil.png", b"<?php system($_GET['c']); ?>", "image/png"))],
        headers=owner["headers"],
    )
    assert r.status_code == 400


async def test_search_filters_and_sort(client, make_user):
    owner = await make_user("searchowner@example.com")
    await client.post(BIKES, json=BIKE_PAYLOAD, headers=owner["headers"])  # sport, $45
    cruiser = {
        **BIKE_PAYLOAD,
        "title": "2019 Harley Iron 883",
        "make": "Harley-Davidson",
        "model": "Iron 883",
        "category": "cruiser",
        "price_per_day": "100.00",
    }
    await client.post(BIKES, json=cruiser, headers=owner["headers"])

    by_category = await client.get(BIKES, params={"category": "cruiser"})
    assert by_category.json()["total"] == 1
    assert by_category.json()["items"][0]["make"] == "Harley-Davidson"

    by_price = await client.get(BIKES, params={"min_price": "50"})
    assert by_price.json()["total"] == 1

    by_keyword = await client.get(BIKES, params={"q": "Ninja"})
    assert by_keyword.json()["total"] == 1

    cheapest_first = await client.get(BIKES, params={"sort": "price_asc"})
    prices = [item["price_per_day"] for item in cheapest_first.json()["items"]]
    assert prices == ["45.00", "100.00"]


async def test_image_upload_requires_ownership(client, make_user):
    owner = await make_user("owner7@example.com")
    attacker = await make_user("attacker2@example.com")
    bike = await _create_bike(client, owner["headers"])
    r = await client.post(
        f"{BIKES}/{bike['id']}/images",
        files=[("files", ("photo.png", _png_bytes(), "image/png"))],
        headers=attacker["headers"],
    )
    assert r.status_code == 403
