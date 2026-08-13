# 🚲 RenkKar

A peer-to-peer **bike rental marketplace** — owners list their bikes, renters book them by the day.
Think "Turo for bikes." Built with **FastAPI** (backend) and **React + Vite** (frontend), with
security and real-world trust & safety designed in from the start.

> Why this exists, what it does, and the reasoning behind every technical choice are documented in
> [`docs/`](docs/). Start there:
> [Requirements](docs/REQUIREMENTS.md) · [Architecture](docs/ARCHITECTURE.md) ·
> [Security & Safety](docs/SECURITY.md) · [API](docs/API.md).

---

## Repository layout

```
RenkKar/
├── backend/      FastAPI + SQLAlchemy (async) + Alembic, managed by uv
├── frontend/     Vite + React + TypeScript (Tailwind, TanStack Query, Zustand)
├── docs/         Requirements, architecture, security, API — the "why"
└── docker-compose.yml   Optional PostgreSQL for production-like runs
```

## Tech stack (and why — see [Architecture](docs/ARCHITECTURE.md))

| Layer | Choice | One-line reason |
|-------|--------|-----------------|
| API | FastAPI + uv (Python 3.12) | Async, built-in validation, auto OpenAPI; reproducible installs |
| DB | SQLite → PostgreSQL via SQLAlchemy + Alembic | Zero-config dev now, config-only switch to prod DB |
| Auth | JWT access (in-memory) + revocable refresh cookie, Argon2 | Bounded token risk, XSS/CSRF resistant, modern hashing |
| Payments | Mock behind a swappable interface | Real money logic now, real provider later with no call-site changes |
| Frontend | React + TS + Vite, TanStack Query, Zustand | Big ecosystem, typed, clean server/client state split |

## Quick start

**Prerequisites:** [uv](https://docs.astral.sh/uv/), Node 20+.

### Backend
```bash
cd backend
uv sync
cp .env.example .env          # then set a strong JWT_SECRET
uv run alembic upgrade head
uv run uvicorn app.main:app --reload   # http://localhost:8000  (/docs for Swagger)
```

### Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173  (proxies /api to the backend)
```

## Tests & checks
```bash
cd backend && uv run pytest && uv run ruff check . && uv run pip-audit
cd frontend && npm run build && npm audit
```

## Roadmap (phased — see [Requirements §6](docs/REQUIREMENTS.md))

- **P0** Scaffolding, security middleware, docs ✅
- **P1** Auth & users + email verification
- **P2** Bike listings + hardened photo uploads
- **P3** Search & discovery
- **P4** Booking flow + mock payments
- **P5** Two-way reviews & ratings
- **P6+** Real KYC/payments, messaging, notifications, admin, geo — see [Security §4.2](docs/SECURITY.md)

## Status & limitations

This is a complete, secure **demonstration** of the marketplace loop. It uses **mocked payments** and
**self-attested verification**, so it is **not** production-legal to operate with real money/vehicles
until the Phase 6+ trust & safety items are implemented. See [Security §4.2](docs/SECURITY.md).
