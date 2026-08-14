# RenkKar — API Reference

Base path: **`/api`** · Interactive docs (when running): **`/docs`** (Swagger) · **`/redoc`**.

Status: **✅ all backend endpoints below are implemented** (Phases 0–5). The live source of truth is
the auto-generated OpenAPI at `/docs`.

---

## Conventions (and why)

- **Auth:** protected endpoints require `Authorization: Bearer <access_token>`. The refresh token is
  an httpOnly cookie set by the server; the browser sends it automatically to `/api/auth/refresh`.
  *Why:* see ARCHITECTURE §7 — short-lived bearer + revocable cookie balances safety and UX.
- **Errors:** consistent JSON `{"detail": "<message>"}`; validation errors use FastAPI's 422 shape.
  Servers never return stack traces. *Why:* predictable client handling; no internal leakage.
- **Pagination:** list endpoints take `page` (1-based) and `page_size` (**capped at 50**, default 20)
  and return `{ items, total, page, page_size }`. *Why:* an uncapped list is a DoS / data-dump risk.
- **Money:** USD; amounts are decimal strings computed by the **server** (clients display, never
  decide). **Timestamps** are UTC ISO-8601.
- **Ownership:** mutating another user's resource returns **403/404** by design (anti-IDOR).

---

## Auth — `/api/auth`
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | – | Create account (rate-limited); logs a verification link (dev) |
| POST | `/auth/verify-email` | – | Consume a single-use token, mark email verified |
| POST | `/auth/login` | – | Issue access token + set refresh cookie (rate-limited) |
| POST | `/auth/refresh` | cookie | Rotate refresh token, issue new access token |
| POST | `/auth/logout` | cookie | Revoke refresh token, clear cookie |
| GET | `/auth/me` | bearer | Current user profile |

## Users — `/api/users`
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/users/{id}` | – | **Public** profile (PII-minimized) |
| PATCH | `/users/me` | bearer | Update own profile (whitelisted fields only) |
| POST | `/users/me/verify-identity` | bearer | **Mock KYC** — sets id/license verified + DOB (stands in for Persona/Veriff) |

## Bikes — `/api/bikes`
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/bikes` | – | Search: `q, city, state, category, min_price, max_price, sort, start_date, end_date, page, page_size` (date range excludes unavailable bikes) |
| POST | `/bikes` | bearer (verified) | Create a listing |
| GET | `/bikes/{id}` | optional | Detail (exact address hidden unless owner); includes `avg_rating` |
| PATCH | `/bikes/{id}` | owner | Update listing |
| DELETE | `/bikes/{id}` | owner | Delete listing |
| GET | `/bikes/mine` | bearer | Current user's listings |
| POST | `/bikes/{id}/images` | owner | Upload photo(s) — hardened (SECURITY §3) |
| DELETE | `/bikes/{id}/images/{image_id}` | owner | Remove a photo |
| GET | `/bikes/{id}/availability?start=&end=` | – | Is the bike free for a range? |
| GET | `/bikes/{id}/reviews` | – | Bike reviews + average rating |

## Bookings — `/api/bookings`
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/bookings/plans` | – | Protection tiers (basic/standard/premium: daily fee + deductible) |
| POST | `/bookings/quote` | – | Server-computed price breakdown (no booking created) |
| POST | `/bookings` | renter (verified + screened) | Request a booking (server pricing; overlap-checked; terms required) |
| GET | `/bookings/mine` | bearer | Bookings I made (as renter) |
| GET | `/bookings/incoming` | bearer | Requests on my bikes (as owner) |
| GET | `/bookings/{id}` | participant | Booking detail |
| POST | `/bookings/{id}/confirm` | owner | Approve a pending request |
| POST | `/bookings/{id}/reject` | owner | Reject a pending request |
| POST | `/bookings/{id}/cancel` | participant | Cancel before start (refunds if paid) |
| POST | `/bookings/{id}/pay` | renter | **Mock** pay rental + deposit hold (idempotent via `Idempotency-Key` header) |
| POST | `/bookings/{id}/complete` | owner | Mark completed, release deposit |

## Reviews — `/api/reviews`
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/reviews` | participant | Review a **completed** booking (one per side; renter→bike, owner→renter) |

## System
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness probe |
| GET | `/uploads/{...}` | Serve a stored (re-encoded) image |

---

## Golden-path sequence

```
register (owner & renter) ─▶ verify-email ─▶ login
renter: POST /users/me/verify-identity        (mock KYC → license_verified)
owner:  POST /bikes  (+ POST /bikes/{id}/images)
renter: GET /bikes?city=Austin&start_date=…&end_date=…  ─▶  POST /bookings/quote  ─▶  POST /bookings
owner:  POST /bookings/{id}/confirm
renter: POST /bookings/{id}/pay   (Idempotency-Key: …)
owner:  POST /bookings/{id}/complete
renter: POST /reviews   ·   owner: POST /reviews
anyone: GET /bikes/{id}/reviews
```
