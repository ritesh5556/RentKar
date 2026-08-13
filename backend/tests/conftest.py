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

import app.models  # noqa: F401  (register models on Base.metadata)
from app.core.database import Base, engine
from app.main import app


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
