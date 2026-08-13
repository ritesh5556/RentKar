"""Pytest fixtures: isolated test DB + in-process HTTP client.

Environment variables are set BEFORE importing the app so the engine binds to a
throwaway database and rate limiting is disabled for deterministic tests.
"""

import os

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./_test.db")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production-000000000000")

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import update

import app.models  # noqa: F401  (register models on Base.metadata)
from app.core.database import AsyncSessionLocal, Base, engine
from app.main import app
from app.models.user import User


@pytest_asyncio.fixture(autouse=True)
async def _setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def make_user(client):
    """Register (and by default email-verify) a user, then return their auth header + id."""

    async def _make(email: str, password: str = "password123", full_name: str = "Rider",
                    verified: bool = True) -> dict:
        await client.post(
            "/api/auth/register",
            json={"email": email, "password": password, "full_name": full_name},
        )
        if verified:
            async with AsyncSessionLocal() as session:
                await session.execute(
                    update(User).where(User.email == email.lower()).values(is_email_verified=True)
                )
                await session.commit()
        login = await client.post("/api/auth/login", json={"email": email, "password": password})
        token = login.json()["access_token"]
        me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        return {"headers": {"Authorization": f"Bearer {token}"}, "id": me.json()["id"]}

    return _make
