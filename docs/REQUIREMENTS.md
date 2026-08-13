# RenkKar — Product Requirements

> A peer-to-peer (P2P) marketplace where people rent out their bikes and others rent them by the day.
> This document captures **what** we're building and, importantly, **why** each decision was made.

---

## 1. Vision & why this product

People own bikes (scooters, motorcycles, e-bikes, bicycles) that sit idle most of the time. Others
need a bike for a day, a trip, or a trial before buying. RenkKar connects the two sides — like
"Turo for bikes."

**Why a marketplace (two-sided) and not a rental shop?** A shop owns inventory and carries capital
cost and risk. A marketplace instead *coordinates trust and money* between independent owners and
renters. That reframes the whole product: the hard problems are **trust** (is this person safe to
rent to? is this bike real?), **money** (correct pricing, deposits, payouts), and **coordination**
(availability, no double-booking). Those three concerns drive nearly every requirement below.

---

## 2. Actors

| Actor | Description |
|-------|-------------|
| **Owner** | Lists bikes, approves/rejects requests, gets paid. |
| **Renter** | Searches, books, pays, rides, reviews. |
| **Admin** | (Later) Moderates listings/users, handles disputes. |

**Why one account for both owner and renter (not separate signups)?** In real P2P marketplaces the
same person is often both (I rent out my scooter on weekdays and rent a motorcycle for a weekend
trip). Forcing two accounts doubles friction and splits reputation. We model a single `User` and let
role be *contextual* (you are the "owner" of bikes you listed, the "renter" of bookings you made).
An `is_admin` flag is reserved for future moderation.

---

## 3. Functional requirements (with rationale)

### 3.1 Accounts & identity
- **FR-1** Register with email + password; **verify email** before listing or booking.
  - *Why email verification gates actions:* a marketplace dealing with money and physical assets
    cannot let throwaway, unverified accounts transact. Verification is the cheapest first line of
    defense against spam listings and fraudulent bookings.
- **FR-2** Log in and stay logged in securely; log out everywhere.
- **FR-3** View/edit own profile; view another user's **public** profile (name, join date, ratings)
  — but **not** their private contact details.
  - *Why minimize public profile data:* exposing phone/email/address invites harassment and scraping.
    We reveal contact info only *after* a booking is confirmed and only to the counterparty.

### 3.2 Listing a bike
- **FR-4** Create/edit/delete listings with: title, description, brand/model/year, type, engine cc
  (for motorized), price/day, **security deposit**, city + address, optional coordinates.
- **FR-5** Upload multiple photos; mark one primary; reorder.
- **FR-6** Toggle a listing active/inactive.
- **FR-7** Owner dashboard listing all their bikes.
  - *Why a security deposit field on every bike:* the biggest owner fear is damage/theft. A deposit
    (held at payment, released on completion) is the standard trust mechanism in vehicle rental and
    must be first-class in the data model even while payments are mocked.
  - *Why hide the exact address until booking:* same privacy/safety reason as FR-3 — a public exact
    address is an invitation to theft. Public search shows **city / approximate area** only.

### 3.3 Discovery
- **FR-8** Browse/search with filters: keyword, city, bike type, price range, and **availability for
  a date range**; sort by price/recency; paginated.
  - *Why availability is a search filter, not just a detail-page check:* a renter searching "June
    3–5 in Pune" should never see bikes already booked then. Filtering early avoids dead-end clicks
    and reduces failed booking attempts.

### 3.4 Booking
- **FR-9** Pick start/end dates, see a **server-computed** total (days × price/day + deposit),
  accept rental terms, submit a request.
- **FR-10** The system **rejects overlapping** date ranges for the same bike.
  - *Why the server computes the total (never the client):* price is money. A client-supplied total
    can be tampered with. The server is the single source of truth (see ARCHITECTURE §Money).
  - *Why explicit terms acceptance:* liability. Renting a physical vehicle carries real-world risk;
    recording that the renter accepted terms (with a timestamp) is a basic legal/ops safeguard.

### 3.5 Managing bookings
- **FR-11** Owner sees incoming requests; approves or rejects.
- **FR-12** Renter sees their bookings; cancels before start.
- **FR-13** Both see status transitions and history.
  - *Why owner approval (not instant auto-book):* trust. Owners want a say in who rides their bike.
    (Auto-approve can be an owner setting later.)

### 3.6 Payments (mocked in first pass)
- **FR-14** After approval, renter "pays" (rental + deposit hold); booking becomes confirmed/paid.
  - *Why mock now:* real payment integration (Stripe/Razorpay) adds keys, webhooks, and PCI scope
    that would slow the first end-to-end loop. We build a **clean payment interface** and a mock
    implementation so the *business logic* (pricing, idempotency, deposit hold/release) is real and
    the provider is swappable with zero call-site changes.

### 3.7 Completion & reviews
- **FR-15** After the end date, mark completed; deposit is "released."
- **FR-16** Renter rates the bike; owner rates the renter (**two-way**). Listings show average rating.
  - *Why two-way reviews:* trust is bidirectional. Owners need renter reputation as much as renters
    need bike/owner reputation. This is the marketplace's long-term trust engine.

---

## 4. Non-functional requirements (with rationale)

| NFR | Requirement | Why |
|-----|-------------|-----|
| **Security** | Hardened auth, authorization, uploads, payments (see SECURITY.md). | Money + PII + physical assets = high stakes. Security is not a phase; it's woven into every phase. |
| **Portability** | Same code runs on SQLite (dev) and PostgreSQL (prod). | Zero-friction local dev now; production-grade DB later with **config-only** change. |
| **Correctness of money/dates** | Server-authoritative pricing; no double-booking. | These are the two ways a marketplace loses user trust fastest. |
| **Maintainability** | Layered backend (routes → services → models); typed frontend. | Clear seams make features and audits tractable as the app grows. |
| **Observability** | Audit logs for auth/booking/payment; no secrets in logs. | Disputes and incidents require a trustworthy trail. |

---

## 5. Booking lifecycle & why these states

```
pending ──(owner approves)──▶ confirmed ──(renter pays)──▶ confirmed+paid ──(end date)──▶ completed
   │                              │
   │(owner rejects)               │(either cancels before start)
   ▼                              ▼
rejected                       cancelled
```

- **Why `pending` first:** captures intent + blocks the dates, but commits neither party until the
  owner decides.
- **Why `confirmed` and `paid` are distinct:** approval (owner's decision) and payment (renter's
  action) are different events by different actors; separating them keeps the state machine honest.
- **Why only `pending`/`confirmed` block availability:** rejected/cancelled/completed bookings must
  free the dates back up immediately.

---

## 6. Scope — and why it's phased

**First pass (Phases 0–5):** foundation, auth, listings + photos, search, booking + mock payments,
reviews. This is the smallest slice that lets a real owner and a real renter complete the *entire*
loop. **Why this cut:** an end-to-end loop is the only honest proof the architecture works;
half-features that don't connect prove nothing.

**Later (Phase 6+):** real KYC/license verification, background checks, real payments + deposit
pre-auth, messaging, notifications, geo/map search, admin moderation, disputes, insurance, telematics.
**Why deferred:** each needs a third party, real money, or an ops team, and none is required to prove
the core loop. They are documented in SECURITY.md §Later so the path to a *legally operable*
marketplace is explicit.

---

## 7. Success criteria (Definition of Done, first pass)
1. An owner and a renter can complete: register → verify → list → search → book → approve → pay →
   complete → review, through the UI.
2. Backend tests pass, including security tests (IDOR, upload rejection, price-tampering, payment
   idempotency).
3. Frontend builds with no type errors.
4. Docs explain how to run, the security posture, and the Postgres switch.
