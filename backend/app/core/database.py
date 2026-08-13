"""Async SQLAlchemy engine, session factory, declarative Base, and the get_db dependency.

Models use only portable column types so the same models/migrations run on both
SQLite (dev) and PostgreSQL (prod). All datetimes are stored as naive UTC (see
`app.core.security.utcnow`) to avoid aware/naive comparison pitfalls on SQLite.
"""

from collections.abc import AsyncGenerator
from datetime import datetime

from sqlalchemy import DateTime, event, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import get_settings

settings = get_settings()

_connect_args: dict = {}
if settings.is_sqlite:
    _connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

# SQLite disables foreign-key enforcement by default — turn it on per connection
# so dev behaves like production (referential integrity is enforced).
if settings.is_sqlite:

    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_fks(dbapi_connection, _record) -> None:  # noqa: ANN001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


class TimestampMixin:
    """Adds created_at / updated_at (naive UTC) to a model."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
