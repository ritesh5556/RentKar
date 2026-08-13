# RenkKar — API Reference

Base path: **`/api`** · Interactive docs (when running): **`/docs`** (Swagger) · **`/redoc`**.

Status legend: ✅ implemented · 🔜 planned (by phase). This file is the design spec; it's updated as
phases land. The live truth is always the auto-generated OpenAPI at `/docs`.

---

## Conventions (and why)

- **Auth:** protected endpoints require `Authorization: Bearer <access_token>`. The refresh token is
  an httpOnly cookie set by the server; the browser sends it automatically to `/api/auth/refresh`.
  *Why:* see ARCHITECTURE §7 — short-lived bearer + revocable cookie balances safety and UX.
- **Errors:** consistent JSON `{"detail": "<message>"}`; validation errors use FastAPI's 422 shape.
  Servers never return stack traces. *Why:* predictable client handling; no internal leakage.
- **Pagination:** list endpoints take `page` (1-based) and `page_size` (**capped**, default 20) and
  return `{ items, total, page, page_size }`. *Why:* an uncapped list is a DoS and data-dump risk.
- **Money:** amounts are decimal strings/numbers computed by the **server**; clients display, never
  decide. **Timestamps** are UTC ISO-8601.
- **Ownership:** mutating another user's resource returns **403/404** by design (anti-IDOR).

---

## Auth — `/api/auth`
| Method | Path | Auth | Purpose | Status |
|--------|------|------|---------|--------|
| POST | `/auth/register` | – | Create account (rate-limited); sends verification email | 🔜 P1 |
| POST | `/auth/verify-email` | – | Consume a single-use token, mark email verified | 🔜 P1 |
| POST | `/auth/login` | – | Issue access token + set refresh cookie (rate-limited) | 🔜 P1 |
| POST | `/auth/refresh` | cookie | Rotate refresh token, issue new access token | 🔜 P1 |
| POST | `/auth/logout` | cookie | Revoke refresh token, clear cookie | 🔜 P1 |
| GET | `/auth/me` | bearer | Current user profile | 🔜 P1 |

## Users — `/api/users`
| Method | Path | Auth | Purpose | Status |
|--------|------|------|---------|--------|
| GET | `/users/{id}` | – | **Public** profile (PII-minimized: name, join date, ratings) | 🔜 P1 |
| PATCH | `/users/me` | bearer | Update own profile (whitelisted fields only) | 🔜 P1 |

## Bikes — `/api/bikes`
| Method | Path | Auth | Purpose | Status |
|--------|------|------|---------|--------|
| GET | `/bikes` | – | Search/filter/sort/paginate (`q, city, type, min_price, max_price, start_date, end_date, sort, page, page_size`) | 🔜 P3 |
| POST | `/bikes` | bearer (verified) | Create a listing | 🔜 P2 |
| GET | `/bikes/{id}` | – | Listing detail (exact address hidden unless a confirmed booking exists) | 🔜 P2 |
| PATCH | `/bikes/{id}` | owner | Update listing | 🔜 P2 |
| DELETE | `/bikes/{id}` | owner | Delete listing | 🔜 P2 |
| GET | `/bikes/mine` | bearer | Current user's listings (owner dashboard) | 🔜 P2 |
| POST | `/bikes/{id}/images` | owner | Upload photo(s) — hardened (see SECURITY §3) | 🔜 P2 |
| DELETE | `/bikes/{id}/images/{image_id}` | owner | Remove a photo | 🔜 P2 |
| GET | `/bikes/{id}/availability?start=&end=` | – | Is the bike free for a range? | 🔜 P4 |
| GET | `/bikes/{id}/reviews` | – | Reviews + average rating for a bike | 🔜 P5 |

## Bookings — `/api/bookings`
| Method | Path | Auth | Purpose | Status |
|--------|------|------|---------|--------|
| POST | `/bookings` | renter (verified) | Request a booking (server computes total; overlap-checked; terms required) | 🔜 P4 |
| GET | `/bookings/mine` | bearer | Bookings I made (as renter) | 🔜 P4 |
| GET | `/bookings/incoming` | bearer | Requests on my bikes (as owner) | 🔜 P4 |
| GET | `/bookings/{id}` | participant | Booking detail | 🔜 P4 |
| POST | `/bookings/{id}/confirm` | owner | Approve a pending request | 🔜 P4 |
| POST | `/bookings/{id}/reject` | owner | Reject a pending request | 🔜 P4 |
| POST | `/bookings/{id}/cancel` | participant | Cancel before start | 🔜 P4 |
| POST | `/bookings/{id}/pay` | renter | **Mock** pay rental + deposit hold (idempotent) | 🔜 P4 |
| POST | `/bookings/{id}/complete` | owner | Mark completed, release deposit | 🔜 P4 |

## Reviews — `/api/reviews`
| Method | Path | Auth | Purpose | Status |
|--------|------|------|---------|--------|
| POST | `/reviews` | participant | Review a **completed** booking (one per booking+target; two-way) | 🔜 P5 |

## System
| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| GET | `/health` | Liveness probe | ✅ |
| GET | `/uploads/{file}` | Serve a stored image (controlled) | 🔜 P2 |

---

## Auth flow (sequence)

```
register ─▶ (email link) ─▶ verify-email ─▶ login ──▶ 200 { access_token }  + Set-Cookie: refresh=…; HttpOnly
                                                        │
   access token expires (~30m) ─▶ 401 ─▶ POST /auth/refresh (cookie) ─▶ new access_token (+ rotated cookie)
                                                        │
                                          logout ─▶ refresh token revoked, cookie cleared
```
