"""Auth flow + auth-security tests."""

REGISTER = "/api/auth/register"
VERIFY = "/api/auth/verify-email"
LOGIN = "/api/auth/login"
REFRESH = "/api/auth/refresh"
LOGOUT = "/api/auth/logout"
ME = "/api/auth/me"


def _reg(email="rider@example.com", password="password123", full_name="Test Rider"):
    return {"email": email, "password": password, "full_name": full_name}


async def test_register_login_me(client):
    assert (await client.post(REGISTER, json=_reg(email="a@example.com"))).status_code == 201

    r = await client.post(LOGIN, json={"email": "a@example.com", "password": "password123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    r = await client.get(ME, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    me = r.json()
    assert me["email"] == "a@example.com"
    assert me["is_email_verified"] is False
    # Sensitive fields must never be serialized.
    assert "hashed_password" not in me
    assert "password" not in me


async def test_duplicate_email_conflicts(client):
    await client.post(REGISTER, json=_reg(email="b@example.com"))
    r = await client.post(REGISTER, json=_reg(email="b@example.com", full_name="Other"))
    assert r.status_code == 409


async def test_login_is_non_enumerating(client):
    """Wrong password and unknown email must return the identical error."""
    await client.post(REGISTER, json=_reg(email="c@example.com"))
    wrong_pw = await client.post(LOGIN, json={"email": "c@example.com", "password": "wrongpass1"})
    unknown = await client.post(LOGIN, json={"email": "nope@example.com", "password": "wrongpass1"})
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json()["detail"] == unknown.json()["detail"]


async def test_me_requires_authentication(client):
    assert (await client.get(ME)).status_code == 401
    bad = await client.get(ME, headers={"Authorization": "Bearer not-a-real-token"})
    assert bad.status_code == 401


async def test_refresh_rotates_and_logout_revokes(client):
    await client.post(REGISTER, json=_reg(email="d@example.com"))
    login = await client.post(LOGIN, json={"email": "d@example.com", "password": "password123"})
    assert login.status_code == 200

    # Refresh cookie was set by login; refresh should mint a new access token.
    r = await client.post(REFRESH)
    assert r.status_code == 200 and r.json()["access_token"]

    # Logout revokes the (rotated) refresh token; subsequent refresh fails.
    assert (await client.post(LOGOUT)).status_code == 200
    assert (await client.post(REFRESH)).status_code == 401


async def test_weak_passwords_rejected(client):
    too_short = await client.post(REGISTER, json=_reg(email="e@example.com", password="ab1"))
    assert too_short.status_code == 422
    no_digit = await client.post(REGISTER, json=_reg(email="f@example.com", password="allletters"))
    assert no_digit.status_code == 422


async def test_email_verification_flow(client, monkeypatch):
    captured: dict[str, str] = {}
    from app.services import email_service

    monkeypatch.setattr(
        email_service, "send_verification_email", lambda to, raw: captured.update(token=raw)
    )

    await client.post(REGISTER, json=_reg(email="g@example.com"))
    assert "token" in captured

    assert (await client.post(VERIFY, json={"token": captured["token"]})).status_code == 200

    r = await client.post(LOGIN, json={"email": "g@example.com", "password": "password123"})
    me = await client.get(ME, headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.json()["is_email_verified"] is True


async def test_verify_email_rejects_bad_token(client):
    assert (await client.post(VERIFY, json={"token": "totally-invalid"})).status_code == 400
