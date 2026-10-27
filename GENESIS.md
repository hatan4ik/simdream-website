# SimDream — Canonical Genesis

The **single canonical architecture and reconstruction document** for this repository. It has two parts:

- **Phase 1, codebase analysis**: what the system is, how it is built, and why.
- **Phase 2, the Genesis Prompt**: a self-contained prompt that instructs an AI coding agent to rebuild this exact system from scratch.

<!-- GENESIS-SOURCE-FINGERPRINT: sha256:8ebcd3d77dffaf79ebbdd573af159c78acae79093d4454a1000510583fab7672 -->

## Verification contract

### Authority order

1. **Current runtime source, schema, migrations, and configuration** are authoritative for what the product does.
2. [`AGENTS.md`](AGENTS.md) is authoritative for the intended engineering, UX, brand, i18n, security, and QA constraints.
3. This document is the sole canonical explanation and reconstruction prompt. It must be updated when either authority changes.
4. Supporting references—[`ARCHITECTURE.md`](ARCHITECTURE.md), [`KANTOROVICH_SCHEDULER_SPEC.md`](KANTOROVICH_SCHEDULER_SPEC.md), [`CALENDAR_LOCALIZATION.md`](CALENDAR_LOCALIZATION.md), and [`TESTING.md`](TESTING.md)—supply diagrams and operational detail. Historical drafts are retained only in [`docs/archive/`](docs/archive/README.md); they are never authoritative.

### Mechanical completeness gate

Run `npm run docs:verify` (also run by `test:quick`, `test:all`, and CI). [`scripts/check-genesis-coverage.ts`](scripts/check-genesis-coverage.ts) derives a checklist from the repository and fails if this document omits any current page/API route, database table/function/migration, environment variable, catalog ID/price, exported domain function, library module, component, quality script/project/workflow, or AGENTS invariant. It also rejects known false claims such as `/about` redirecting to `/pro` or a 14-day default calendar.

The fingerprint above covers the reviewed source/configuration/test/docs surface. Any covered file change makes verification fail until a human reviews the diff and deliberately runs `npm run docs:genesis:stamp`. The hash is a **review ratchet**, not a claim that prose is automatically semantically correct.

### Evidence map and confidence boundaries

| Subject | Source evidence | Confidence |
| --- | --- | --- |
| Route map and protection | [`app/`](app), [`proxy.ts`](proxy.ts), [`next.config.mjs`](next.config.mjs) | Code-verified |
| Booking, pricing, payments, webhooks | [`lib/booking/checkout-service.ts`](lib/booking/checkout-service.ts), [`lib/stripe.ts`](lib/stripe.ts), [`app/api/`](app/api) | Code-verified; provider activation still external |
| Scheduling and calendar | [`lib/scheduler/`](lib/scheduler), [`components/scheduler/`](components/scheduler), [`lib/i18n/calendar-presentation.ts`](lib/i18n/calendar-presentation.ts) | Code-verified |
| Auth, membership, ownership | [`lib/auth/`](lib/auth), [`lib/supabaseClient.ts`](lib/supabaseClient.ts), [`app/dashboard/page.tsx`](app/dashboard/page.tsx) | Code-verified; OAuth provider setup still external |
| Database and data integrity | [`lib/db/schema.sql`](lib/db/schema.sql), [`lib/db/migrations/`](lib/db/migrations), [`lib/db/store.ts`](lib/db/store.ts) | Code-verified; applied production migrations still external |
| Brand and customer UX | [`app/globals.css`](app/globals.css), [`components/brand/`](components/brand), [`components/about/`](components/about) | Code-verified |
| Test/CI quality gates | [`tests/`](tests), [`scripts/test-all.ts`](scripts/test-all.ts), [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Code-verified; a passing remote CI run is external state |

No repository review can prove Supabase OAuth providers, Stripe webhook delivery, SendGrid sender verification, Google Places access, or applied production migrations. Those must pass the live verification checklist in **Definition of Done** before launch.

---

## Phase 1: Codebase Analysis

### 1. Tech stack and dependencies

| Layer | Technology | Used for |
| --- | --- | --- |
| Framework | **Next.js 16.4** (App Router, Turbopack), **React 19.3**, **TypeScript 5.6** (strict) | Pages, route handlers, prerendering. `proxy.ts` is Next 16's replacement for middleware. |
| Styling | **Tailwind CSS 4.3** via `@tailwindcss/postcss`, plus a legacy `tailwind.config.ts` loaded with `@config`; `clsx` and `tailwind-merge` | Utility styling, brand tokens in `@theme`, two interface themes. |
| Icons and effects | `lucide-react`, `canvas-confetti` | Icons; the booking-success celebration (suppressed under reduced motion). |
| Validation | **zod 4** | Mutable API payloads and date/optimizer inputs (`lib/validation.ts`), with route-level validation for narrow path/query parameters. |
| Database and auth | **Supabase** (`@supabase/supabase-js` 2): Postgres plus Supabase Auth | Bookings, vouchers, leads, profiles; member login (email/password, Google, Facebook, Apple). |
| Payments | **Stripe** (`stripe` 17 on the server, `@stripe/stripe-js` 4) | Hosted Checkout; a signature-verified webhook is the only path to "paid". |
| Email | `@sendgrid/mail` 8 | Booking confirmations and voucher activation emails (simulated when unconfigured). |
| Reviews | Google Places API, cached 24 h with ISR | Live rating and review excerpts with a checked-in fallback snapshot. |
| Testing | Vitest 5 (+ v8 coverage), fast-check, Playwright 1.64, axe-core, autocannon, Lighthouse CI (via `npx`) | The four quality gates (see Phase 2). |
| Runtime | Node 22, hosted on Vercel (serverless functions and static prerender) | |

**Local development origin:** Next 16's dev resource guard permits the explicit loopback hostname `127.0.0.1` in `next.config.mjs` in addition to Next's default `localhost`. This is deliberately local-only development configuration: it keeps HMR and client hydration working when a developer opens `http://127.0.0.1:3000`, without allowing tunnels or arbitrary network origins.

### 2. System architecture

```text
Browser (5 languages, 2 themes)
  │
  ├─ Static/prerendered pages ── app/(public)/*, app/page.tsx, app/(auth)/login, app/dashboard, app/auth/*
  │     client components fetch live data from the API; clock-dependent text renders only in the browser
  │
  ├─ proxy.ts ─────────────────── matcher /admin/:path* → HTTP Basic auth (ADMIN_USER / ADMIN_PASSWORD)
  │
  └─ Route handlers (app/api/*) ── zod validation → lib services → lib/db/store.ts (repository)
                                        │                     │
                                        │                     ├─ Supabase Postgres (production, service role)
                                        │                     └─ in-memory seed store (dev/test; explicit opt-in elsewhere)
                                        ├─ lib/scheduler/* (pure, deterministic scheduling and pricing)
                                        ├─ lib/stripe.ts ──── Stripe Checkout + webhook verification
                                        ├─ lib/sendgrid.ts ── transactional email
                                        └─ lib/reviews/* ──── Google Places with 24 h ISR cache
```

- **Entry points**: `app/layout.tsx` (providers: language, theme, auth; navbar, skip link, single `<main>`, footer), `proxy.ts` (admin guard), `app/api/**/route.ts` (13 route modules), `app/sitemap.ts`, `app/robots.ts`.
- **Repository pattern**: `lib/db/store.ts` is the only data access layer. A `production` getter chooses Supabase when production is configured, the seeded in-memory store in development and tests, and **throws `PersistenceError` (answered as HTTP 503)** in production without a database, unless `ALLOW_IN_MEMORY_STORE=true` (demo servers only).
- **Error taxonomy**: `PersistenceError` → 503 with a generic message; `BookingConflictError` → 409; `RecordNotFoundError` → 404. Clients never see stack traces or database messages.
- **Server authority**: the browser sends only IDs (package, date, start time, add-on IDs) and pilot details. Prices, durations, end times and discounts are always recomputed on the server.

### 3. Core business logic

Sim Dream LTD runs one full-size **Boeing 737 MAX 8 flight simulator** at Gershon Shatz St 36, Tel Aviv. The site sells and schedules sessions on that single simulator.

| Feature | Route(s) | Behaviour |
| --- | --- | --- |
| Marketing pages | `/`, `/experiences`, `/about`, `/pro`, `/contact`, `/rules`, `/privacy-policy` | Five customer value pillars, live METAR ticker (LLBG) and facility open/closed status, Google reviews. `/about` is the customer story; `/pro` is professional airline-assessment training. |
| Booking engine | `/book`, `/book/success` | Two interfaces over identical availability logic: a one-page "Amazon-style" storefront and a guided 3-step wizard. Localized month calendar (week view optional), slot selection, add-ons, pilot manifest, checkout. The success page shows a boarding pass from a narrow public projection looked up by booking reference. |
| Noise-free flows | `/book?package=…` | Professional Training and Fear of Flying suppress all add-ons and combos (2-step flow); recreational uses the full 3-step flow. |
| Scheduling | `lib/scheduler/*` | Deterministic "tiled interval" engine: each flight reserves a fixed block (flight + turnaround), slots are generated per operating window, orphan gaps are prevented, departed slots close by the Israel clock, and a dynamic-programming optimizer previews zero-waste capacity for admins. |
| Gift vouchers | `/vouchers` | Purchase via Stripe (high-entropy `SD-VOUCH-…` codes, valid 12 months), verification, partial redemption at checkout or the desk, atomic balance debit. |
| Corporate workshops | `/workshops` | B2B CRM/leadership lead form (`corporate_inquiries`), managed in admin. |
| Member area | `/login`, `/dashboard`, `/auth/callback`, `/auth/reset-password` | Supabase Auth; the dashboard lists future and past sessions and Stripe receipts. Paid guest bookings attach to a member only when the checkout email **exactly** matches the member's confirmed email. Guest checkout is always available. |
| Admin dispatch | `/admin`, `/admin/bookings`, `/admin/vouchers`, `/admin/workshops` | Daily efficiency report and gap-collision tester, booking manifest (reschedule, cancel), voucher terminal (verify, redeem), workshop CRM pipeline. Basic auth plus same-origin checks on mutations. |
| Payments | `POST /api/checkout`, `POST /api/webhooks/stripe` | Card bookings stay `pending` until a verified `checkout.session.completed`; expiry or failure cancels. Webhook-delivered confirmations use a claimed/sent outbox for retry-safe delivery. |

### 4. Data models

TypeScript types in `types/index.ts` mirror the Postgres tables in `lib/db/schema.sql` (plus migrations 001–004):

| Type | Table | Key fields |
| --- | --- | --- |
| `SimulatorPackage` | `packages` | id, category, durationMinutes (20/45/60/90/120/240), priceIls, primeTimePriceIls, daytimeOnly, kantorovichVar |
| `Booking` | `bookings` | bookingReference `SD-737-[A-Z2-9]{16}`, date, start/end, pilot details, addons, subtotal/discount/total, status, paymentStatus, paymentMethod, Stripe intent, confirmation outbox timestamps |
| `GiftVoucher` | `gift_vouchers` | code `SD-VOUCH-[A-Z2-9]{18}`, initial value, current balance, sender/recipient, expiry, paymentStatus, Stripe session |
| `CorporateInquiry` | `corporate_inquiries` | company, contact, team size 1–500, goal, status pipeline |
| `UserProfile` | `profiles` | id = `auth.users.id`, email, role (`user`/`admin`) |
| `FlightLog` | `flight_logs` | Declared in the schema and seed data, but not currently a durable production repository/dashboard flow. |
| `FlightSlot`, `DailyEfficiencyReport`, `PublicCapacityReport`, `MissionManifestCalculation` | computed | Scheduler outputs; the public report omits customer data. |

### 5. Observations from the analysis

- The Fear of Flying package id is `pkg-fear-of-flying-90`, but the product is a **60-minute** session (₪690). Keep the id for compatibility; do not trust the suffix.
- Admin authentication is interim HTTP Basic auth; the documented target is Supabase Auth with server-side roles and MFA.
- Open, tracked risks (see [`tests/KNOWN_DEFECTS.md`](tests/KNOWN_DEFECTS.md)): no rate limiting on voucher verification or admin login (SEC-3, SEC-4, deferred by the owner); the CSP allows inline scripts because App Router streams inline RSC payloads (SEC-8, accepted risk).
- Production requires migrations **001–004** applied in order on an existing database (or `schema.sql` plus 003–004 on a new one).
- Only `/login` sets `noindex`. `/dashboard` and `/auth/*` are indexable (they hold no private data when signed out), so consider `noindex` there too.
- **Catalog authority is split**: `GET /api/packages` reads the production `packages` table, while checkout prices from the static `SIMULATOR_PACKAGES` in `lib/db/seed-data.ts`. A database price edit can show one price and charge another. A rebuild must use one server-side catalog authority.
- **i18n is not yet total**: the dictionary has five-language parity and tests, but hard-coded English remains in the navbar user menu, the booking-success page, the reviews UI, and some legal and admin surfaces.
- **Brand drift**: the success-page confetti and review-avatar gradients still use colours outside the Sim Dream tokens.
- **Flight logs are not a live feature**: `flight_logs` exists in SQL and seed data, but production reads and writes stay in memory and no dashboard renders them.
- **Types**: a few `any` escapes remain (Stripe API-version typing, some catch handlers).
- **Provider configuration cannot be proven from code**: OAuth providers, Stripe events, SendGrid sender verification and live reviews need the verification run in **Definition of Done** before launch.

---

## Phase 2: The Genesis Prompt

Copy everything between the markers into an AI coding agent that can create files and run commands.

<!-- BEGIN GENESIS PROMPT -->

### ROLE

You are a senior full-stack engineer building a production website end to end. Build exactly what this prompt specifies, verify every requirement with automated tests, and stop only when all four quality gates pass. Where a detail is unspecified, choose the simplest secure option and document it.

### PROJECT TYPE & CONTEXT

Build **simdream.co.il**, the booking and marketing platform for **Sim Dream LTD**, which operates one full-size **Boeing 737 MAX 8 flight simulator** at Gershon Shatz St 36, Tel Aviv-Yafo, Israel. Customers are recreational flyers and gift buyers, airline pilot candidates preparing for assessments, fearful flyers, and corporate teams. The platform sells timed simulator sessions, gift vouchers and corporate workshops, schedules them on the single simulator without double booking, takes card payments through Stripe, gives members a purchase history, and gives staff a dispatch back office. It must run in **five languages** (Hebrew and Arabic right-to-left; English, Russian and French left-to-right) and offer **two visual themes**.

### TECH STACK DIRECTIVES

- **Next.js 16** App Router with Turbopack, **React 19**, **TypeScript** strict. Use `proxy.ts` (not middleware) for request guards. Read `node_modules/next/dist/docs/` before using any Next.js API, because version 16 has breaking changes.
- **Tailwind CSS 4** with brand colour tokens in an `@theme` block in `app/globals.css`.
- **zod 4** for all request validation.
- **Supabase** (Postgres + Auth) as the production database and member identity provider, accessed server-side with the service-role key only.
- **Stripe** Checkout (hosted) and a signature-verified webhook. **SendGrid** for email. **Google Places API** for reviews, cached 24 h with ISR.
- Testing: **Vitest** (+ coverage, **fast-check**), **Playwright** (+ **axe-core**), **autocannon**, **Lighthouse CI**.
- Node 22. Deploy to **Vercel**. CI on **GitHub Actions**.
- Environment variables (document them in `.env.example`, never commit values): `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USER`, `ADMIN_PASSWORD` (≥16 chars in production), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SENDGRID_API_KEY`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `GOOGLE_PLACES_API_KEY`, and the demo-only opt-in `ALLOW_IN_MEMORY_STORE`.

### NON-NEGOTIABLE INVARIANTS (the five pillars of this build)

1. **Brand pillars and identity.**
   - All copy reinforces five customer value pillars:
     - Full Captain's Command: a real 737 cockpit, not an arcade ride.
     - Active airline-captain mentorship.
     - Unrestricted global freedom: 24,000+ airports and custom weather.
     - Transformative milestones and fear-of-flying coaching.
     - Authentic aviation integrity.
   - The visual identity is the official logo: an **orange airplane `#FF5500`** and a **cerulean "SIM DREAM" wordmark `#2096C7`**, with the tagline "Simulation Systems (Israel)" ("מערכות סימולציה (ישראל)") rendered as translated text.
   - Remap Tailwind's `sky-*` scale to a cerulean scale (500 = `#2096C7`) and `orange-*` to an orange scale (500 = `#FF5500`).
   - Render the logo only from the official image assets. Never recolour it, rebuild it from text, or mirror it in RTL.
   - Decorative colours (confetti, avatars, gradients) also come from the brand tokens.
2. **Canonical URL discipline.**
   - `/pro` is the single page for professional airline-assessment training.
   - `/about` is the customer story, kept separate from `/pro`.
   - `/simulator` and `/training` redirect permanently (301) to `/pro`.
   - Navigation, footer and sitemap point at canonical routes only.
3. **Noise-free flow suppression.**
   - Professional Training and Fear of Flying bookings show zero add-ons and zero combos, in a 2-step flow: *Date & Slot → Pilot Manifest & Checkout*.
   - The default pilot level is `atpl` for training and `beginner` for fear of flying.
   - Recreational bookings use the full 3-step flow with add-ons.
4. **Unicode purity and RTL isolation.**
   - Resolve every user-visible string through `lib/i18n/translations.ts`, with identical key trees in all five languages.
   - Never choose display text with an `isRTL` ternary; `isRTL` is for layout only.
   - No Hebrew letters in non-Hebrew copy and no Arabic letters in non-Arabic copy.
   - Telemetry stays `dir="ltr"` inside RTL text: METAR, frequencies, booking references, times, slot ranges, prices, emails.
   - Dates and numbers come from `Intl`. Arabic uses Latin digits (`ar-IL` with the `latn` numbering system). Keep ISO `YYYY-MM-DD` dates internally; localize only at display. Wrap telemetry in `<bdi>` or `dir="ltr"`.
   - No hard-coded English anywhere a customer or operator can see it: navbar menus, the success page, reviews, legal pages and admin included.
5. **Fail-closed production integrity.**
   - Production never falls back to in-memory data. Without a database, availability, catalog and checkout answer 503.
   - Without Stripe keys, card checkout answers 503.
   - Only a signature-verified Stripe webhook marks anything paid.
   - The server recomputes every price.
   - Admin access fails closed (503) when credentials are not configured.

### CORE REQUIREMENTS

#### Catalog (seed exactly; prices in ILS)

| id | Category | Flight | Price | Notes |
| --- | --- | --- | --- | --- |
| `pkg-discovery-30` | recreational | 20 min | 250 | Basic session |
| `pkg-promo-45` | recreational | 45 min | 490 | Daytime promo: Sun–Fri, starts before 18:00 only |
| `pkg-captain-60` | recreational | 60 min | 690 | Most popular |
| `pkg-ultimate-90` | recreational | 90 min | 850 | Saturday prime-time price 950 |
| `pkg-pro-60` | training | 60 min | 890 | Airline Interview Prep 60 PRO |
| `pkg-pro-90` | training | 90 min | 1,250 | Airline Interview Prep 90 PRO |
| `pkg-assessment-prep-120` | training | 120 min | 1,590 | Airline Interview Prep 120 PRO |
| `pkg-fear-of-flying-90` | fear_of_flying | 60 min | 690 | Legacy id; the session is 60 minutes |
| `pkg-corporate-crm` | corporate | 240 min | 4,500 | Workshop |

Seed 13 add-ons in three groups:

- procedure and weather modules, such as Cold & Dark startup (+20 min, ₪200) and Crosswind/IFR (+15 min, ₪250);
- 3-airport "world trio" route modules (+40 min, ₪450 each), each naming its three airports with ICAO codes;
- media and guest upgrades: 4K multi-camera recording, signed logbook, extra jumpseat passenger.

Add 3 curated one-click combos. Localize every package and add-on in all five languages. Keep **one server-side catalog authority**: the catalog API and checkout must read prices and durations from the same source.

#### Scheduling engine (`lib/scheduler/`, pure functions, fully unit-tested)

- **Capacity buffer map**: `getReservedMinutesForFlight()` maps each flight to a reserved block (flight plus turnaround):

  | Flight | Reserved block |
  | --- | --- |
  | 20 min | 45 min |
  | 45 min | 60 min |
  | 60 min | 75 min |
  | 90 min | 105 min |
  | 120 min | 150 min |
  | 240 min | 255 min |

  The turnaround constant is 15 minutes.
- **Operating windows** (Israel time):

  | Day | Window | Minutes | Notes |
  | --- | --- | --- | --- |
  | Sunday–Thursday | 10:00–23:00 | 780 | |
  | Friday | 09:00–16:00 | 420 | Includes a 15:15 closer |
  | Saturday | 19:00–24:00 | 300 | Prime time only; the 45-minute promo is forbidden |
- **Slot generation**: `generateKantorovichSlots(date, duration, bookings)` returns every departure on a grid derived from the reserved blocks. Saturday 60-minute departures are 19:00, 20:15, 21:30 and 22:45. Each slot carries:
  - `available`;
  - a `disabledReason`: booked, orphan_gap, daytime_only_promo, friday closer rule, exceeds window, or departed;
  - a smart recommendation: optimal 150-minute pair, zero-waste fit, and so on.

  Never offer a departure that would leave an unsellable gap ("anti-gap"/zero-waste tiling).
- **Departed slots**: `closeDepartedSlots()` closes any departure at or before the current **Israel** minute (`lib/scheduler/israel-clock.ts`, using `Intl` with `Asia/Jerusalem`, DST-correct), whatever the server time zone.
- **Pricing**: `packagePriceForSlot()` applies prime-time pricing. `calculateMissionManifest()` totals the package and add-ons and rejects add-ons that would run past the next booking or the window close.
- **Building blocks** (keep these as small, separately tested functions):
  - time: `timeToMinutes()`, `minutesToTime()`, `addMinutesToTime()`, and the Israel clock's `israelToday()`, `israelMinutesNow()`, `hasDeparted()`;
  - days and capacity: `getDayOperatingConfig()`, `longestMissionWithin()`, `canTileIntervalZeroWaste()`, `getKantorovichPricing()`;
  - packages and add-ons: `packageAllowsAddons()`, `packageFromPriceIls()`, `sanitizePackageTitle()`, `canAddonFitInSlot()`, `pruneAddonsExceedingSlot()`;
  - checkout orchestration (`lib/booking/checkout-service.ts`): `startBookingCheckout()` and `startVoucherCheckout()`.
- **Efficiency and optimization**: `evaluateDailyEfficiency()` builds the admin day report (blocks, gap collisions, revenue). `toPublicCapacityReport()` strips all customer data for public use. `optimizeTiledCapacity()` is a dynamic-programming dry-run that recommends a zero-waste tiling for the remaining capacity.

#### Booking UI (`/book`)

- Two interfaces over **identical** availability and recovery logic:
  - `AmazonFlightStorefront` (one page, sticky buy box);
  - `KantorovichCalendarScheduler` (guided wizard).
- The calendar defaults to a **localized month grid**, with an optional week view. Weeks start on Sunday for he, ar and en, and on Monday for ru and fr. RTL arrows are flipped.
- **Never hide packages or durations** with zero open slots. Show them with a "0 slots open today" badge and keep the user's selection.
- When a package has zero slots, show:
  - "No open runway slots for [Package] on [Date]";
  - a **Check Next Day →** button;
  - quick-switch buttons to durations that are available;
  - a strikethrough list of booked slots.
- Handle loading, failure ("departures could not be loaded" with retry, never a fake sold-out day) and offline states. Ignore out-of-order responses so the latest selected day wins.
- The pilot manifest collects name, email, phone and experience level (beginner, enthusiast, student_pilot, atpl), plus an optional voucher code.

#### Checkout and payments

- `POST /api/checkout` takes a zod discriminated union (`kind: 'booking' | 'voucher'`). For bookings the server:
  1. re-validates date, package, slot, add-ons and capacity;
  2. recomputes the price;
  3. applies any voucher atomically;
  4. creates a `pending` booking;
  5. creates a Stripe Checkout session, or confirms immediately when a voucher covers the total.

  Stripe or persistence failure answers 503 and leaves no orphaned hold or voucher debit. Success answers 201.
- `POST /api/webhooks/stripe` verifies the signature, then:
  - on `checkout.session.completed` with `paid`: conditional `pending→paid`;
  - on `expired` or `async_payment_failed`: cancel.

  Late payment for a cancelled booking or voided voucher is recorded and flagged for refund, never revived. Webhook-delivered confirmation emails use an outbox (`claimed`/`sent` timestamps, 10-minute claim TTL). A delivery that finds the claim busy answers 503 so Stripe retries. Every payment state transition is idempotent.
- Public responses carry no personal data: the capacity report has no customer or revenue fields, the success-page lookup by booking reference returns a narrow projection, and voucher verification returns balance and validity only.
- Booking references are `SD-737-` plus 16 characters from `A-Z2-9`; voucher codes are `SD-VOUCH-` plus 18. Generate both with a CSPRNG.

#### Members (Supabase Auth)

- `/login` offers email and password, Google, Facebook and Apple, sign-up (password ≥ 12), password recovery (`/auth/reset-password`), the OAuth return (`/auth/callback`, with a safe same-origin redirect) and **"Continue as a guest"**.
- When auth is not configured, show a clear "not configured" message rather than failing silently.
- Show local demo shortcuts only in development without Supabase.
- `POST /api/membership/bootstrap` creates the profile and attaches **paid** guest bookings whose email exactly matches the confirmed member email. Do not use ILIKE or wildcards; store emails normalized lowercase.
- `/dashboard` and `GET /api/my-bookings` (bearer token) show future and past sessions. `GET /api/my-bookings/[ref]/receipt` returns the Stripe receipt for the owner only.

#### Admin

- `proxy.ts` guards `/admin/:path*` with HTTP Basic auth, compared in constant time. Answer 503 if unconfigured and 401 with `WWW-Authenticate` if wrong.
- Admin mutations require a same-origin `Origin`. Compare canonical origins: request URL, `NEXT_PUBLIC_APP_URL`, and Host or X-Forwarded-Host/Proto, lowercased with default ports stripped. Reject hosts containing userinfo or a path.
- Pages:
  - dispatch board with KPIs, date picker, day blocks and the gap-collision tester;
  - bookings manifest with reschedule and cancel;
  - voucher terminal with verify and redeem in agorot precision;
  - workshop CRM with status pipeline.

#### API surface

| Endpoint | Methods | Access | Purpose |
| --- | --- | --- | --- |
| `/api/packages` | GET | public | Catalog |
| `/api/slots?date&duration` | GET | public | Slots and public capacity report; 400 on impossible dates |
| `/api/checkout` | POST | public | Booking or voucher checkout |
| `/api/webhooks/stripe` | POST | Stripe signature | Payment state machine |
| `/api/bookings` | GET / POST / PATCH | GET `?ref=` public narrow projection, else admin; POST 405 | Booking lookup and admin changes |
| `/api/vouchers` | GET / POST / PATCH | GET admin; POST public verify; PATCH admin redeem | Vouchers |
| `/api/workshops` | GET / POST / PATCH | POST public; else admin | Corporate leads |
| `/api/reviews` | GET / POST | GET public (ISR 24 h); POST admin refresh | Google reviews |
| `/api/my-bookings`, `/api/my-bookings/[ref]/receipt` | GET | member | History and receipts |
| `/api/membership/bootstrap` | POST | member | Profile and guest-booking linking |
| `/api/admin/schedule-efficiency` | GET | admin | Full day report |
| `/api/admin/schedule-optimization` | POST | admin | Dry-run optimization preview |

#### Frontend platform

- **Themes**:
  - 🌙 *Cockpit Night* is the default: dark slate, cerulean HUD accents and orange highlights.
  - ☀️ *Brand Daylight*: cloud white with cerulean and orange, implemented as `html[data-ui="brand"]` overrides.
  - A no-flicker bootstrap script sets the theme before first paint.
  - The header switch shows an icon and state pill whose knob never leaves its track.
- **Header**:
  - logo, translated orange tagline, theme switch, language selector, icon-only login, and a **Book a Flight** call to action that never wraps;
  - inline links from 1536 px, a drawer below;
  - no horizontal overflow in any language.
- **Hydration**: pages are prerendered, so never read the clock during render. Read it in the browser (`useSyncExternalStore` with a `null` server snapshot, or effects), so hydration never breaks on a later day than the build.
- **Accessibility**: WCAG 2.2 AA in both themes and all languages.
  - Skip link and one `<main>`.
  - Labelled controls, named buttons and announced errors.
  - Dialogs open from the keyboard and close on Escape.
  - Reduced motion is honoured.
  - Contrast ≥ 4.5:1. Use `orange-500` only for the logo, icons, borders and large text, and `orange-700` for small orange text on light surfaces.
  - Touch targets at least 24 × 24 px (WCAG 2.2 AA, enforced by the tests); aim for 44 × 44 px on primary mobile controls.
- **SEO**:
  - per-page metadata and canonical URLs;
  - a sitemap of canonical routes, and `robots.txt` disallowing `/admin` and `/api`;
  - JSON-LD: WebSite, the local business (address, geo coordinates, opening hours, aggregate rating), an offer catalog, and an FAQ;
  - `noindex` on `/login`.

#### Security headers and hygiene

- Configure in `next.config.mjs`: `poweredByHeader: false`, the 301 redirects, and the headers below.
- Headers: HSTS (`max-age=63072000; includeSubDomains`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera, microphone and geolocation.
- A static CSP (`script-src 'self' 'unsafe-inline'`, required by App Router's inline RSC payloads).
- Escape all user content in pages and emails. Never log secrets or payment metadata.

#### Quality gates (automated; all must be green)

1. **TypeScript strict check.**
2. **Vitest**:
   - unit tests for the scheduler, validation, auth, the Israel clock and the i18n audit;
   - integration tests for every route contract;
   - security tests: authorization matrix, IDOR, webhook authenticity, payment integrity, fuzzing, error disclosure, host-header redirects, secrets hygiene;
   - reliability tests: concurrency without double booking, idempotency, persistence outage, failure injection, DST and midnight edges.

   Freeze the test clock and blank every real secret in a test sandbox. Track open defects as expected-failure tests (`it.fails`) that turn red when fixed, and enforce coverage thresholds as a ratchet.
3. **Playwright**:
   - journeys on Chromium, Firefox, WebKit, Pixel 7 and iPhone 15;
   - axe scans with a ratcheting baseline (target empty);
   - usability: hydration on a later day than the build, i18n and RTL in all five languages, header fit, theme switch, CLS, reduced motion, responsive layouts from 320 to 1920 px;
   - security-web: headers, access control, stored XSS;
   - resilience: slow, failing and offline networks;
   - visual baselines per platform.

   Run against a sandboxed production build in a separate build folder.
4. **Load and performance**: autocannon p99 budgets on hot endpoints. Lighthouse budgets: accessibility ≥ 0.95, SEO ≥ 0.95, performance ≥ 0.8, best practices ≥ 0.9, LCP ≤ 2.5 s, CLS ≤ 0.1.

Playwright projects: `chromium`, `firefox`, `webkit`, `mobile-chrome` (Pixel 7), `mobile-safari` (iPhone 15), `a11y`, `usability`, `security-web`, `resilience`, `visual`.

Wire all four gates into one command (`npm run test:all`) and into CI jobs that merge their results into a quality report. Provide these scripts:

| Script | Runs |
| --- | --- |
| `test:all` / `test:quick` / `test:full` / `test:report` | Orchestrator: everything / typecheck + Vitest / all browsers + Lighthouse / rebuild the report |
| `test:unit`, `test:integration`, `test:security`, `test:reliability`, `test:coverage` | Vitest projects (security and reliability add their browser projects) |
| `test:build` | Sandboxed production build into `.next-test` |
| `test:e2e`, `test:a11y`, `test:a11y:baseline`, `test:usability`, `test:visual`, `test:visual:update` | Playwright projects; baseline and screenshot re-recording (Linux baselines in Docker) |
| `test:load`, `test:lighthouse` | autocannon smoke and Lighthouse against a sandboxed server |
| `start:local` | `next start` with the demo store opt-in, for laptops without Supabase |
| `docs:genesis` | Fails unless this blueprint still covers the codebase |

### CLOSE THESE KNOWN GAPS (do not reproduce them)

The current system tracks these as open. A rebuild should fix them:

1. Rate-limit voucher verification per IP and per code, and failed admin logins per client and username, answering `429` with `Retry-After`.
2. Replace interim admin Basic auth with Supabase Auth, server-side roles and MFA.
3. Decide the CSP explicitly: static pages with `'unsafe-inline'` for RSC payloads, or a per-request nonce with dynamic rendering, and document the trade-off.
4. Run integration tests against real Postgres to prove the exclusion constraint, `redeem_gift_voucher`, the `23P01` → 409 mapping and every migration.
5. Extend browser coverage to admin mutations, signed-in receipts, success-page polling, booked-slot transparency, every day's slot grid, SEO metadata and email rendering.
6. Use one catalog authority; remove the remaining hard-coded English; keep decorative colours on the brand tokens; either finish flight-log persistence or leave the feature out.

### DATABASE SCHEMA

Postgres (Supabase). Enable `pgcrypto` and `btree_gist`. Enable RLS on every table: only active packages are publicly readable, and all other access goes through server routes with the service role.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  total_flight_hours NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (total_flight_hours >= 0),
  total_flights INTEGER NOT NULL DEFAULT 0 CHECK (total_flights >= 0),
  pilot_license TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- handle_new_auth_user(): SECURITY DEFINER trigger on auth.users insert that creates the profile
-- (lowercased email, name from metadata) via on_auth_user_created.

CREATE TABLE public.packages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('recreational','training','corporate','fear_of_flying')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (20,45,60,90,120,240)),
  price_ils NUMERIC(10,2) NOT NULL CHECK (price_ils >= 0),
  prime_time_price_ils NUMERIC(10,2) CHECK (prime_time_price_ils >= 0),
  price_usd NUMERIC(10,2) NOT NULL CHECK (price_usd >= 0),
  short_desc TEXT NOT NULL,
  description TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  daytime_only BOOLEAN NOT NULL DEFAULT false,
  kantorovich_var TEXT CHECK (kantorovich_var IN ('x1','x2','x3','x4','pro')),
  yield_per_min_ils NUMERIC(10,2) CHECK (yield_per_min_ils >= 0),
  features JSONB NOT NULL DEFAULT '[]',
  includes_briefing BOOLEAN NOT NULL DEFAULT true,
  instructor_included BOOLEAN NOT NULL DEFAULT true,
  guest_seats INTEGER NOT NULL DEFAULT 2 CHECK (guest_seats >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE CHECK (booking_reference ~ '^SD-737-[A-Z2-9]{16}$'),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  package_id TEXT NOT NULL,
  package_title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 20 AND 240),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  pilot_name TEXT NOT NULL,
  pilot_email TEXT NOT NULL CONSTRAINT bookings_pilot_email_normalized CHECK (pilot_email = lower(btrim(pilot_email))),
  pilot_phone TEXT NOT NULL,
  experience_level TEXT NOT NULL CHECK (experience_level IN ('beginner','enthusiast','student_pilot','atpl')),
  addons JSONB NOT NULL DEFAULT '[]',
  subtotal_ils NUMERIC(10,2) NOT NULL CHECK (subtotal_ils >= 0),
  discount_ils NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_ils >= 0),
  total_ils NUMERIC(10,2) NOT NULL CHECK (total_ils >= 0),
  voucher_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded')),
  payment_method TEXT NOT NULL DEFAULT 'stripe' CHECK (payment_method IN ('stripe','voucher','desk')),
  stripe_payment_intent TEXT UNIQUE,
  notes TEXT,
  confirmation_claimed_at TIMESTAMPTZ,   -- email outbox
  confirmation_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (discount_ils <= subtotal_ils),
  CHECK (total_ils = subtotal_ils - discount_ils),
  CHECK ((payment_method = 'voucher' AND payment_status = 'paid') OR payment_method <> 'voucher'),
  -- The database itself forbids overlapping reserved blocks on the single simulator.
  EXCLUDE USING gist (
    tsrange(
      booking_date + start_time,
      booking_date + start_time + (CASE
        WHEN duration_minutes <= 30 THEN 45
        WHEN duration_minutes = 120 THEN 150
        WHEN duration_minutes = 240 THEN 255
        ELSE duration_minutes + 15 END * interval '1 minute'),
      '[)'
    ) WITH &&
  ) WHERE (status <> 'cancelled')
);
CREATE INDEX ON public.bookings (lower(pilot_email));
CREATE INDEX ON public.bookings (booking_date, start_time);
CREATE INDEX ON public.bookings (user_id);
-- Map Postgres error 23P01 (exclusion violation) to HTTP 409.

CREATE TABLE public.gift_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^SD-VOUCH-[A-Z2-9]{18}$'),
  initial_value_ils NUMERIC(10,2) NOT NULL CHECK (initial_value_ils > 0),
  current_balance_ils NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_balance_ils >= 0),
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  personal_message TEXT,
  package_id TEXT,
  package_title TEXT,
  expiry_date TIMESTAMPTZ NOT NULL,
  is_redeemed BOOLEAN NOT NULL DEFAULT false,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded')),
  stripe_checkout_session_id TEXT UNIQUE,
  activated_at TIMESTAMPTZ,
  confirmation_claimed_at TIMESTAMPTZ,
  confirmation_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (current_balance_ils <= initial_value_ils),
  CHECK (payment_status <> 'pending' OR current_balance_ils = 0)
);
-- redeem_gift_voucher(p_code, p_amount): SECURITY DEFINER; SELECT ... FOR UPDATE a paid,
-- unexpired, unredeemed voucher with enough balance; debit atomically; set is_redeemed at zero.

CREATE TABLE public.corporate_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  team_size INTEGER NOT NULL CHECK (team_size BETWEEN 1 AND 500),
  target_date DATE,
  primary_goal TEXT NOT NULL CHECK (primary_goal IN ('leadership','team_communication','high_stress_decision_making','vip_incentive')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.flight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  flight_date DATE NOT NULL,
  aircraft_type TEXT NOT NULL DEFAULT 'B737-MAX8',
  flight_time_hours NUMERIC(4,2) NOT NULL CHECK (flight_time_hours >= 0),
  departure_icao TEXT NOT NULL DEFAULT 'LLBG',
  arrival_icao TEXT NOT NULL,
  landings_count INTEGER NOT NULL DEFAULT 1 CHECK (landings_count >= 0),
  approach_type TEXT NOT NULL CHECK (approach_type IN ('CAT_III_ILS','RNP_AR','VISUAL','RNAV')),
  weather_scenario TEXT,
  instructor_signature TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Ship the schema as `lib/db/schema.sql` for new projects and as ordered, reviewed migrations for existing ones: `001_production_hardening.sql`, `002_member_accounts.sql`, `003_exact_pilot_email_matching.sql`, `004_confirmation_outbox.sql`.

### FILE STRUCTURE

```text
app/
  layout.tsx, page.tsx, globals.css, icon.png, apple-icon.png, robots.ts, sitemap.ts
  (public)/  about/ pro/ experiences/ book/ book/success/ vouchers/ workshops/ contact/ rules/ privacy-policy/ simulator/ (redirect)
  (auth)/login/
  auth/callback/  auth/reset-password/
  dashboard/  (layout + page)
  admin/      (layout + page, bookings/, vouchers/, workshops/)
  api/        packages/ slots/ checkout/ webhooks/stripe/ bookings/ vouchers/ workshops/ reviews/
              my-bookings/ my-bookings/[bookingReference]/receipt/ membership/bootstrap/
              admin/schedule-efficiency/ admin/schedule-optimization/
components/
  brand/BrandLogo.tsx            # BrandLogo (airplane + wordmark), BrandMark (airplane)
  layout/  Navbar Footer LanguageSelector UiThemeSwitcher LiveMetarBar SkipLink
  scheduler/ AmazonFlightStorefront KantorovichCalendarScheduler
  about/AboutExperienceView  pro/ProSessionsView  legal/ PrivacyPolicyContentView RulesContentView
  reviews/GoogleReviewsRotator  seo/StructuredDataJsonLd  ui/ Button Card Badge
lib/
  scheduler/ kantorovich-engine mission-calculator tiled-interval-optimizer israel-clock
  booking/checkout-service       db/ store schema.sql seed-data supabase-admin migrations/
  auth/ admin-guard request-auth member-ownership safe-redirect auth-context
  i18n/ translations language-context calendar-presentation
  config/ facility-info server-env use-live-facility-status
  theme/ui-theme-context  ui/ use-client-value use-modal-focus  seo/seo-config
  reviews/google-reviews-cache  data/google-reviews-data (fallback snapshot)
  stripe.ts  sendgrid.ts  validation.ts  utils.ts  supabaseClient.ts
types/index.ts
proxy.ts                          # /admin guard
public/brand/                     # official logo assets; theme-bootstrap.js
tests/  unit/ integration/ security/ reliability/ e2e/ a11y/ usability/ security-web/ resilience/ visual/ load/ perf/ support/
scripts/ test-all.ts run-sandboxed.ts with-server.ts update-visual-baselines.sh check-genesis-coverage.ts
.github/workflows/ ci.yml nightly.yml (OWASP ZAP baseline)
AGENTS.md  ARCHITECTURE.md  README.md  TESTING.md  KANTOROVICH_SCHEDULER_SPEC.md
```

### DEFINITION OF DONE

- `npm run build` compiles every route with zero TypeScript or build errors.
- `npm run test:all -- --full --lighthouse` is green: typecheck, Vitest with coverage thresholds, e2e on five browsers, accessibility with an empty baseline, usability, security-web, resilience, visual, load and Lighthouse.
- Verify manually:
  - a recreational booking (3 steps with add-ons) and `/book?package=airline-interview-prep-90-pro` (2 steps, no add-ons);
  - Sunday, Friday and Saturday calendars;
  - all five languages with no mixed scripts or missing keys;
  - both themes with the official logo and no off-brand colours.
- Production without Supabase or Stripe fails closed (503), never with fake data.
- Before launch, verify the providers, which no build or test can prove:
  - migrations 001–004 are applied and `ALLOW_IN_MEMORY_STORE` is absent in production;
  - Google, Facebook and Apple are enabled in Supabase Auth with callback URLs for the deployed origin;
  - the Stripe keys are set and the webhook receives `checkout.session.completed`, `checkout.session.expired` and `checkout.session.async_payment_failed`;
  - the SendGrid sender is verified;
  - a test booking, signed webhook, member claim, history read and receipt all work in a non-production environment.

<!-- END GENESIS PROMPT -->
