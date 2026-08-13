# RenkKar Backend (FastAPI)

Peer-to-peer bike rental marketplace API.

## Quick start

```bash
uv sync                       # install deps into .venv (Python 3.12, pinned)
cp .env.example .env          # then edit JWT_SECRET
uv run alembic upgrade head   # create/upgrade the SQLite database
uv run uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs · Health: http://localhost:8000/health

## Tests & checks

```bash
uv run pytest
uv run ruff check .
uv run pip-audit
```

## Switching to PostgreSQL

Set `DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/renkkar` in `.env`
(a container is provided in the repo-root `docker-compose.yml`), then
`uv run alembic upgrade head`. No code changes required.
