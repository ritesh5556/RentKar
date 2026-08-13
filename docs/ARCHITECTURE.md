# RenkKar — Architecture & Design Rationale

> **What** the system is made of and **why** each choice was made. If you only read one doc to
> understand the codebase, read this one.

---

## 1. Shape of the system

```
┌─────────────────────┐        HTTPS / JSON         ┌──────────────────────────┐
│   Frontend (SPA)     │  ───────────────────────▶   │      Backend (API)        │
│  Vite + React + TS   │   /api/... (+ cookie)        │        FastAPI            │
│  TanStack Query      │  ◀───────────────────────    │  routes → services →      │
│  Zustand (auth)      │        JSON + Set-Cookie      │  models (SQLAlchemy)      │
└─────────────────────┘                               └────────────┬─────────────┘
        browser only talks to Vite in dev                          │
        (Vite proxies /api + /uploads to :8000)          ┌─────────▼─────────┐
                                                          │  DB: SQLite (dev) │
                                                          │  → PostgreSQL     │
                                                          └───────────────────┘
```

**Why a decoupled SPA + JSON API (not server-rendered templates)?** The two sides of the marketplace
are highly interactive (search filters, date pickers, dashboards). A JSON API also keeps the door
open for a future mobile app with zero backend changes. The cost — you must design auth for a
browser SPA carefully — is addressed in §6.

---

## 2. Backend: why FastAPI + uv

- **FastAPI** — async-native (bookings/search are I/O-bound DB calls; async keeps throughput high),
  **Pydantic validation is built in** (every request body is validated and typed at the edge — a
  security win, not just ergonomics), and it **auto-generates OpenAPI/Swagger** (`/docs`) which
  doubles as living API documentation and a manual test harness.
- **uv** — a single, fast tool for Python version management, virtualenv, dependency resolution, and
  locking (`uv.lock`). **Why it matters:** reproducible installs (pinned lockfile = supply-chain
  hygiene) and it can fetch/pin the exact Python we need.

**Why pin Python 3.12 (when the system has 3.14)?** 3.14 is very new; several C-extension
dependencies (Pillow, Argon2 bindings, asyncpg) may not ship prebuilt wheels for it yet, forcing slow
and fragile source builds. Pinning 3.12 via uv guarantees fast, reliable wheel installs today.

---

## 3. Frontend: why React + Vite + TypeScript

- **Vite** — instant dev server + HMR and a simple **proxy** so the browser only talks to one origin
  in dev (no CORS headaches while developing).
- **React + TypeScript** — the largest component/library ecosystem and compile-time type safety
  across the many interactive pages a marketplace needs.
- **TanStack Query** for server state (caching, refetch, loading/error states) so we don't hand-roll
  fetch/loading logic on every page; **Zustand** for the small amount of *client* state (the current
  session); **React Hook Form + Zod** for forms with schema validation that mirrors the backend's.

**Why split "server state" (Query) from "client state" (Zustand)?** Most app data is really a cache
of the server. Treating it as such (Query) eliminates a whole class of stale-data bugs. Only truly
client-owned data (who am I, my access token) lives in Zustand.

---

## 4. Database: why SQLite-now / PostgreSQL-later on SQLAlchemy + Alembic

- **SQLAlchemy 2.0 (async)** ORM with **portable column types only** (no engine-specific types;
  enums stored as strings; money as `Numeric(10,2)`; UTC datetimes).
- **Alembic** migrations with **batch mode on SQLite** (so schema changes that SQLite can't `ALTER`
  in place are emitted as table rebuilds — the same migration scripts then run unchanged on Postgres).

**Why this specific approach?** It buys the best of both worlds:
- *Dev velocity now:* SQLite is a zero-config file — clone, `alembic upgrade head`, done.
- *Production readiness later:* switching to Postgres is a **config-only** change
  (`DATABASE_URL=postgresql+asyncpg://...` + `alembic upgrade head`), because we never leaned on
  SQLite-only behavior. A `docker-compose.yml` provides the Postgres container.

**Why async DB access?** Under load, a bike search or booking spends its time waiting on the DB.
Async lets one worker serve many concurrent waits instead of blocking a thread each.

**Why enforce SQLite foreign keys via PRAGMA?** SQLite ships with FK enforcement *off* by default —
without the `PRAGMA foreign_keys=ON` connect hook, referential integrity bugs would hide in dev and
only surface on Postgres. We turn it on so dev behaves like prod.

---

## 5. Backend layering: why routes → services → models

```
app/
  api/routes/   HTTP layer   — parse/validate (Pydantic), call a service, shape the response
  services/     domain layer — business rules, authorization, transactions (the real logic)
  models/       data layer   — SQLAlchemy ORM tables
  schemas/      Pydantic request/response contracts (what crosses the wire)
  core/         config, database, security, deps, middleware, rate limiting
```

**Why a distinct services layer (not logic in the routes)?**
- **Authorization lives in one place.** Ownership checks ("is this *your* bike/booking?") are the
  #1 marketplace vulnerability (IDOR). Centralizing them in services means every entry point is
  guarded, and they're unit-testable without HTTP.
- **Money/date rules are reused, not duplicated.** Pricing and overlap checks are called from more
  than one route; they belong in a service, computed once, correctly.
- **Schemas are the contract boundary.** Response schemas explicitly *omit* sensitive fields
  (password hashes, private addresses) — leaking is opt-*in*, never accidental.

---

## 6. Data model & why each entity

| Entity | Key fields | Why it exists / notable choices |
|--------|-----------|--------------------------------|
| **User** | email, hashed_password, `date_of_birth`, `is_email_verified`, `id_verified`, `license_verified` | One account, both roles. DOB enables an **age check** for motorized bikes; verification flags gate risky actions. |
| **RefreshToken** | user_id, token_hash, expires_at, revoked_at | Refresh tokens are stored **server-side (hashed)** so they can be **revoked** (logout / theft response). Access tokens can't be revoked, so we keep them short-lived. |
| **EmailVerificationToken** | user_id, token_hash, expires_at, used_at | Single-use, expiring email verification. Stored hashed so a DB leak can't be replayed. |
| **Bike** | owner_id, type, price_per_day, `security_deposit`, city, **address (private)** | Deposit is first-class (trust). Address separated so search can expose city while hiding the exact location until a booking is confirmed. |
| **BikeImage** | bike_id, path, is_primary, sort_order | Images stored on disk with **random (UUID) filenames**; only the path is in the DB. |
| **Booking** | bike_id, renter_id, owner_id, dates, `unit_price` (snapshot), total_price, `deposit_amount`, status, payment_status, `terms_accepted_at` | `unit_price` is **snapshotted** so a later price change on the bike never rewrites history. Terms timestamp is the liability record. |
| **Payment** | booking_id, amount, kind (rental/deposit_hold/deposit_release), status, provider, `idempotency_key` (unique) | Models a real payment ledger even while mocked. The unique idempotency key makes "pay" safe to retry (no double-charge). |
| **Review** | booking_id, target (bike/renter), rating, comment | Two-way; one review per (booking, target). Tied to a *completed* booking so reviews reflect real transactions. |

**Availability** is computed by an overlap query rather than a separate calendar table — simpler and
always consistent with actual bookings. Overlap rule: `existing.start ≤ new.end AND existing.end ≥
new.start` over `pending`/`confirmed` bookings.

---

## 7. Auth design & why

- **Access token:** short-lived JWT (~30 min), sent as a `Bearer` header, kept **in memory** on the
  client.
- **Refresh token:** opaque, stored server-side (hashed), delivered in an **httpOnly, Secure,
  SameSite=Lax cookie**, **rotated** on every refresh, revocable on logout.

**Why this split?**
- JWTs are fast to verify statelessly but **cannot be revoked** — so we keep them short-lived to
  bound the damage of a stolen token.
- Long-lived power lives in the refresh token, which **can** be revoked (it's in the DB) and is kept
  out of JavaScript's reach (httpOnly cookie) to blunt XSS token theft.
- **Why the access token in memory, not localStorage?** localStorage is readable by any injected
  script (XSS). In-memory tokens vanish on refresh and are re-obtained via the refresh cookie.
- **Why `SameSite=Lax` + bearer header for the API?** SameSite stops other sites from silently
  sending the refresh cookie (CSRF), and because the API authenticates via the `Authorization`
  header (not the cookie), a cross-site request can't forge an authenticated API call.
- **Why Argon2 (via `pwdlib`) for passwords?** Argon2 is the current password-hashing recommendation
  (memory-hard, GPU-resistant). `pwdlib` is the modern, maintained library (avoids long-standing
  passlib/bcrypt version friction).

---

## 8. Payments: why a mock behind an interface

`payment_service` exposes `charge(booking, kind, idempotency_key)`, `release()`, `refund()` returning
a result object. The mock always succeeds and writes a `Payment` row. **Why:** the *business logic*
around money — server-authoritative amounts, deposit hold/release, idempotent retries — is real and
tested now. Swapping in Stripe/Razorpay later means implementing the same interface; **no call site
changes.** This is the classic "port/adapter" boundary applied to the riskiest integration.

---

## 9. Cross-cutting choices

- **Rate limiting (`slowapi`)** — global cap + tight limits on auth endpoints. *Why:* brute-force
  and credential-stuffing are the most common attacks on a login form.
- **Security headers middleware** — every response gets `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, a CSP, etc. *Why:* defense-in-depth against clickjacking/MIME sniffing at
  near-zero cost.
- **Generic error handler** — unhandled exceptions return a plain 500, never a stack trace. *Why:*
  stack traces leak internals (paths, library versions, query fragments) useful to an attacker.
- **`filetype` + Pillow for uploads** — see SECURITY.md §Uploads. *Why `filetype` over `python-magic`?*
  it's pure-Python (no libmagic DLL), so it works identically on Windows dev and Linux prod.

---

## 10. Dev workflow

- Backend: `uv run uvicorn app.main:app --reload` → `http://localhost:8000` (`/docs` for Swagger).
- Frontend: `npm run dev` → `http://localhost:5173`; Vite proxies `/api` and `/uploads` to the
  backend, so the browser sees a single origin (no CORS in dev). CORS is still configured on the API
  for real cross-origin (prod) use.

## 11. Deployment notes (future)

Serve the built SPA (`npm run build` → static files) via a CDN/static host; run the API behind a
reverse proxy that terminates TLS (enabling HSTS). Point `DATABASE_URL` at managed Postgres and run
`alembic upgrade head` on deploy. Move uploads to object storage (S3) behind the same
`upload_service` seam used for local disk today.
