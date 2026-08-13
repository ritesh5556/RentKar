"""Application settings, loaded from environment / .env (pydantic-settings)."""

import json
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "RenkKar API"
    environment: str = "development"

    # Database — SQLite for dev; swap to postgresql+asyncpg://... for prod (config only).
    database_url: str = "sqlite+aiosqlite:///./renkkar.db"

    # Auth / JWT
    jwt_secret: str = "dev-only-insecure-secret-change-me-to-a-long-random-value"  # noqa: S105
    jwt_algorithm: str = "HS256"
    access_token_min: int = 30
    refresh_token_days: int = 7

    # CORS (JSON array or comma-separated string in env)
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Used to build email-verification links in the (stubbed) email service
    frontend_url: str = "http://localhost:5173"

    # Uploads
    upload_dir: str = "uploads"
    max_upload_mb: int = 5
    max_images_per_bike: int = 8
    allowed_image_types: list[str] = ["image/jpeg", "image/png", "image/webp"]

    # Rate limiting — disable in tests
    rate_limit_enabled: bool = True

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @field_validator("cors_origins", "allowed_image_types", mode="before")
    @classmethod
    def _parse_list(cls, v: object) -> object:
        if isinstance(v, str):
            s = v.strip()
            if s.startswith("["):
                return json.loads(s)
            return [item.strip() for item in s.split(",") if item.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
