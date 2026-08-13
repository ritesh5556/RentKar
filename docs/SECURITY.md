# RenkKar — Security & Safety

> This document explains the **threat model** and **why** each control exists. RenkKar handles money,
> personal data, and **physical vehicles handed between strangers**, so "security" here means two
> things: (A) classic application security, and (B) real-world **trust & safety**.

---

## 1. Threat model — what we're defending against

| Threat | Concrete example | Category |
|--------|------------------|----------|
| Account takeover | Brute-force / stuffing the login; stolen token | A |
| Broken authorization (IDOR) | User edits/cancels **someone else's** bike or booking | A |
| Injection | Malicious input reaching SQL / rendered HTML | A |
| Malicious upload | "Photo" that's actually a script/polyglot | A |
| Money tampering | Client sends a doctored total; double-charge on retry | A |
| Data leakage | Password hash, private address, or PII exposed via API | A |
| Fraud / unsafe rental | Fake listing; unlicensed/underage rider; theft of the bike | **B** |
| Abuse / harassment | Scraping contact details; spam listings | A + B |

Category **A** is fully addressed in the first pass. Category **B** is *partly* addressed now
(cheap, high-value controls) and *documented* for later where it needs third parties or real money
(§4) — because a marketplace **cannot legally scale** on mocked identity checks.

---

## 2. Application security (A) — built into the first pass, and why

| Area | Control | Why |
|------|---------|-----|
| **Password storage** | **Argon2** hashing (`pwdlib`) | Memory-hard, GPU-resistant; current best practice. Never store or log plaintext. |
| **Sessions** | Short-lived access JWT (in memory) + rotating, **revocable** refresh token in an **httpOnly/Secure/SameSite** cookie | Bounds damage of a stolen access token; keeps the long-lived credential out of JS (XSS) and revocable (logout/theft). |
| **Brute force** | `slowapi` rate limits, tight on `register`/`login`/`refresh` | The login form is the most-attacked endpoint; throttling defeats stuffing. |
| **Authorization** | Service-layer **object-level ownership checks** on every owned resource | Prevents **IDOR** — the most common and damaging marketplace bug. A 404/403 is returned for resources you don't own. |
| **Input validation** | Pydantic on every request; **whitelisted** update fields | Rejects malformed/oversized/unexpected input at the edge; blocks **mass-assignment** (e.g., a user setting `is_admin`). |
| **SQL injection** | SQLAlchemy parameterized queries only (no string-built SQL) | Structurally eliminates injection. |
| **File uploads** | Extension allowlist **+ magic-byte sniff (`filetype`) + Pillow re-encode** + size/count caps + **UUID filenames** + controlled serving | Defense-in-depth against CWE-434. See §3. |
| **Transport & headers** | HSTS (prod), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, CSP, strict CORS allowlist | Clickjacking, MIME-sniff, and cross-origin defenses at near-zero cost. CORS never uses `*` with credentials. |
| **Payments** | **Server-authoritative** amounts; **idempotency keys** | Client totals are never trusted; a retried/duplicated "pay" charges once. |
| **Privacy** | Hashes never serialized; PII-minimized public views; exact address only after a confirmed booking | Limits blast radius of any leak; reduces scraping/harassment. |
| **Abuse / DoS** | Pagination caps; request-body & upload size limits | Prevents a single request from exhausting memory or dumping the whole DB. |
| **Error handling** | Generic 500s (no stack traces); audit log for auth/booking/payment | Don't leak internals; keep a trail for disputes/incidents. Secrets are never logged. |
| **Supply chain** | Pinned `uv.lock` / `package-lock.json`; `pip-audit` + `npm audit` in CI-style checks | Reproducible installs; flags known-vulnerable dependencies. |
| **Secrets** | Loaded from `.env` (gitignored); strong `JWT_SECRET`; `.env.example` documents keys | No secrets in code or VCS. |

---

## 3. Secure file uploads — why the extra steps

An uploaded "image" is attacker-controlled bytes. Naively trusting the filename or `Content-Type`
header is CWE-434 (unrestricted upload). Our layered defense and the reason for each layer:

1. **Extension allowlist** (`.jpg/.jpeg/.png/.webp`) — cheap first filter.
2. **Magic-byte sniff** (`filetype`) — verifies the *actual* file signature, defeating a `.png` that
   is really a script.
3. **Re-encode through Pillow** — opens and re-saves the pixels, which **strips EXIF metadata,
   embedded scripts, and polyglot payloads**. The bytes we store are ones *we* generated.
4. **Size + count limits** — a photo isn't 2 GB; a listing isn't 500 images (DoS guard).
5. **UUID filenames** — never reuse the client's filename → no path traversal, no overwrites, no
   guessable URLs.
6. **Controlled serving** — served with a correct content-type and caching, not executed.

---

## 4. Trust & Safety (B) — real-world risk

### 4.1 Built / enforced now (cheap, high-value)
- **Email verification** gates listing and booking (no throwaway accounts transacting).
- **Age check** via `date_of_birth` (a rider must be old enough — legally required for motorized bikes).
- **Rental-terms acceptance** (timestamped) required to book — the liability record.
- **Security deposit** on every bike, held at (mock) payment and released on completion — the core
  anti-damage/anti-theft mechanism.
- **Protection plans + roadside assistance** (Riders Share model) — at checkout the renter picks a
  basic/standard/premium tier (daily insurance fee + damage deductible); roadside assistance is
  included on every rental. Mock coverage now; real underwriting is Phase 6+.
- **Rider screening** — booking a motorized category requires `license_verified` in addition to
  email verification (mock-toggled now; real license/ID/background checks in Phase 6+).
- **Two-way reviews** — bidirectional reputation is the long-term trust engine.
- **Location privacy** — exact address revealed only after a confirmed booking.
- **KYC status fields** (`id_verified`, `license_verified`) on the user, with bookings **gated** on
  them. In the first pass these are toggled manually/mock; the *enforcement path* is already wired.

### 4.2 Deferred to later phases — and **why they can't be faked**
| Later control | Why it needs more than a mock |
|---------------|------------------------------|
| Government-ID & **driver-license verification** (e.g., Stripe Identity / Persona / Veriff / ComplyCube) | Legally, you may not let someone ride a motorized vehicle without a valid license. This requires a real identity provider — it cannot be self-attested. |
| **Driving-history / background checks** (e.g., Checkr) | Screening out disqualified drivers requires authoritative DMV/records data. |
| **Real payments + deposit pre-authorization** | A deposit only deters damage if it can actually place a hold on real funds. |
| Condition/handover **photo documentation** & damage flow | Resolving "who dented it" needs before/after evidence and a dispute process. |
| **Insurance & liability** terms, admin **moderation**, disputes | Operating a real vehicle marketplace requires an ops function and legal coverage. |
| GPS / telematics | Theft recovery / usage verification needs hardware or connected-vehicle APIs. |

> **Honest statement of limits:** with mocked payments and self-attested verification, RenkKar is a
> complete, secure *demonstration* of the marketplace. It is **not** production-legal to operate for
> real money/vehicles until §4.2 is implemented. Keeping this explicit is itself a safety measure.

---

## 5. How security is verified

- **Automated tests** (`uv run pytest`) include a dedicated security suite:
  - IDOR — a non-owner editing/cancelling another's resource gets 403.
  - Auth required — protected endpoints reject unauthenticated calls.
  - Upload rejection — bad magic bytes / oversized / too many files are refused.
  - **Price-tampering** — a doctored client total is ignored; the server recomputes.
  - **Payment idempotency** — a repeated "pay" charges exactly once.
  - Rate-limit — rapid auth attempts get throttled.
- **Dependency audits** — `uv run pip-audit` and `npm audit`.
- **Manual spot-checks** — security headers present; CORS blocked from a foreign origin; a
  non-image upload and a cross-user edit are both rejected via `/docs`.

---

## 6. Reporting

For a real deployment, add a `SECURITY.txt` / disclosure contact so researchers can report issues
privately. (Placeholder — no public deployment yet.)
