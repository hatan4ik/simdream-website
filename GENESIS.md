# SimDream — Canonical Genesis

The **single canonical architecture and reconstruction document** for this repository. It has two parts:

- **Phase 1, codebase analysis**: what the system is, how it is built, and why.
- **Phase 2, the Genesis Prompt**: a self-contained prompt that instructs an AI coding agent to rebuild this exact system from scratch.

<!-- GENESIS-SOURCE-FINGERPRINT: sha256:6142a2cf28aeff38c0c02696bb09f91f656f5edb023b95ae73c5b5be8c262442 -->

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
| Booking, pricing, payments, webhooks | [`lib/booking/checkout-service.ts`](lib/booking/checkout-service.ts), [`lib/booking/checkout-ports.ts`](lib/booking/checkout-ports.ts), [`lib/booking/checkout-composition.ts`](lib/booking/checkout-composition.ts), [`lib/wix/checkout-shadow.ts`](lib/wix/checkout-shadow.ts), [`lib/stripe.ts`](lib/stripe.ts), [`app/api/`](app/api) | Code-verified; provider activation still external |
| Scheduling and calendar | [`lib/scheduler/`](lib/scheduler), [`components/scheduler/`](components/scheduler), [`lib/i18n/calendar-presentation.ts`](lib/i18n/calendar-presentation.ts) | Code-verified |
| Auth, membership, ownership | [`lib/auth/`](lib/auth), [`lib/wix/member-client.ts`](lib/wix/member-client.ts), [`lib/wix/member-profile.ts`](lib/wix/member-profile.ts), [`lib/wix/member-auth.ts`](lib/wix/member-auth.ts), [`lib/wix/member-bookings.ts`](lib/wix/member-bookings.ts), [`app/dashboard/page.tsx`](app/dashboard/page.tsx) | Code-verified; Wix member and Calendar permissions remain external configuration |
| Database and data integrity | [`lib/db/schema.sql`](lib/db/schema.sql), [`lib/db/migrations/`](lib/db/migrations), [`lib/db/store.ts`](lib/db/store.ts) | Code-verified; applied production migrations still external |
| Brand and customer UX | [`app/globals.css`](app/globals.css), [`components/brand/`](components/brand), [`components/about/`](components/about) | Code-verified |
| Test/CI quality gates and Wix delivery | [`tests/`](tests), [`scripts/test-all.ts`](scripts/test-all.ts), [`.github/workflows/ci.yml`](.github/workflows/ci.yml), [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml), [`.github/workflows/pr-mergeability.yml`](.github/workflows/pr-mergeability.yml), [`.github/workflows/enable-trusted-automerge.yml`](.github/workflows/enable-trusted-automerge.yml), [`.github/workflows/security-history-audit.yml`](.github/workflows/security-history-audit.yml), [`.github/workflows/release-please.yml`](.github/workflows/release-please.yml), [`.github/workflows/wix-release.yml`](.github/workflows/wix-release.yml), [`.github/workflows/wix-rollback.yml`](.github/workflows/wix-rollback.yml), [`docs/GITHUB_WIX_CICD.md`](docs/GITHUB_WIX_CICD.md), [`docs/GITHUB_PR_AUTOMATION.md`](docs/GITHUB_PR_AUTOMATION.md) | Code-verified; GitHub's environment secrets/approvals and a passing remote deployment are external state |

No repository review can prove Supabase OAuth providers, Stripe webhook delivery, SendGrid sender verification, Google Places access, or applied production migrations. Those must pass the live verification checklist in **Definition of Done** before launch.

---

## Phase 1: Codebase Analysis

### 1. Tech stack and dependencies

| Layer | Technology | Used for |
| --- | --- | --- |
| Framework | **Next.js 16.4** (App Router, Turbopack), **React 19.3**, **TypeScript 5.6** (strict) | Pages, route handlers, prerendering. `proxy.ts` is Next 16's replacement for middleware. |
| Styling | **Tailwind CSS 4.3** via `@tailwindcss/postcss`, plus a legacy `tailwind.config.ts` loaded with `@config`; `clsx` and `tailwind-merge` | Utility styling, brand tokens in `@theme`, three interface themes. |
| Icons and effects | `lucide-react`, `canvas-confetti` | Icons; the booking-success celebration (suppressed under reduced motion). |
| Validation | **zod 4** | Mutable API payloads and date/optimizer inputs (`lib/validation.ts`), with route-level validation for narrow path/query parameters. |
| Database and auth | **Supabase** (`@supabase/supabase-js` 2) plus **Wix Members** (`@wix/sdk`, `@wix/members`) | Supabase stores legacy/local bookings, vouchers, leads and profiles; Wix is the primary hosted-member login, subscription-order and native appointment identity boundary. |
| Payments | **Stripe** (`stripe` 17 on the server, `@stripe/stripe-js` 4) | Hosted Checkout; a signature-verified webhook is the only path to "paid". |
| Email | `@sendgrid/mail` 8 | Booking confirmations and voucher activation emails (simulated when unconfigured). |
| Customer contact | `components/layout/WhatsAppAction.tsx` | A persistent, high-visibility WhatsApp action to the official SimDream customer-support number; no Wix AI Site-Chat widget or visitor messaging API is present. |
| Reviews | Google Places API, browser-loaded carousel with 15 min shared freshness | Live rating and excerpts only when attributable Google data is available; otherwise the API serves no review claims. |
| Testing | Vitest 5 (+ v8 coverage), fast-check, Playwright 1.64, axe-core, autocannon, Lighthouse CI (via `npx`) | The four quality gates (see Phase 2). |
| Runtime | Node 24, deployed as a Wix-managed Worker through the Wix CLI (with the existing self-managed deployment path retained) | `@wix/cli` 1.2.9 requires Node 24.22.1 or newer; `@opennextjs/cloudflare` builds the Next.js server and static assets; Wrangler bundles the final ESM worker artifact Wix executes. |

**Local development origin:** Next 16's dev resource guard permits the explicit loopback hostname `127.0.0.1` in `next.config.mjs` in addition to Next's default `localhost`. This is deliberately local-only development configuration: it keeps HMR and client hydration working when a developer opens `http://127.0.0.1:3000`, without allowing tunnels or arbitrary network origins.

### 2. System architecture

```text
Browser (6 languages, 2 themes)

> **Current customer-contact boundary:** Wix AI Site-Chat has been removed from the frontend, package manifest, client wiring and smoke tooling. Any older migration prose below that mentions `WixSmartChat`, `@wix/ai-site-chat` or `wix:chat:smoke` is superseded. The only persistent conversational action is [`WhatsAppAction`](components/layout/WhatsAppAction.tsx), which opens the official SimDream WhatsApp channel.
  │
  ├─ Request-rendered pages ──── app/(public)/*, app/page.tsx, app/(auth)/login, app/dashboard, app/auth/*
  │     proxy.ts provides a per-request CSP nonce; clock-dependent text renders only in the browser
  │
  ├─ proxy.ts ─────────────────── strict nonce CSP on HTML; HTTP Basic auth for /admin/:path*
  │
  └─ Route handlers (app/api/*) ── zod validation → lib services → lib/db/store.ts (repository)
                                        │                     │
                                        │                     ├─ Supabase Postgres (production, service role)
                                        │                     └─ in-memory seed store (dev/test; explicit opt-in elsewhere)
                                        ├─ lib/scheduler/* (pure, deterministic scheduling and pricing)
                                        ├─ lib/security/rate-limit.ts (durable abuse controls)
                                        ├─ lib/stripe.ts ──── Stripe Checkout + webhook verification
                                        ├─ lib/sendgrid.ts ── transactional email
                                        └─ lib/reviews/* ──── Google Places with a 15 min browser feed cache
```

- **Entry points**: `app/layout.tsx` (providers: language, theme, auth; one sticky site chrome wrapping the utility bar and navbar, skip link, single `<main>`, footer), `proxy.ts` (admin guard), `app/api/**/route.ts` (15 route modules), `app/sitemap.ts`, `app/robots.ts`.
- **Repository pattern**: `lib/db/store.ts` is the only data access layer. A `production` getter chooses Supabase when production is configured, the seeded in-memory store in development and tests, and **throws `PersistenceError` (answered as HTTP 503)** in production without a database, unless `ALLOW_IN_MEMORY_STORE=true` (demo servers only).
- **Checkout dependency boundary**: `lib/booking/checkout-service.ts` owns pricing, scheduling, guest identity and lifecycle rules while depending only on the narrow `CheckoutDependencies` ports in `lib/booking/checkout-ports.ts`. `lib/booking/checkout-composition.ts` adapts the current Supabase store, Stripe hosted checkout, SendGrid and verified member resolver; `lib/booking/checkout-runtime.ts` is the route-facing composition. A Wix adapter must implement those ports and pass the same contract tests before it can be selected—never bypass the service or write directly from the browser.
- **Wix Headless adapter** (`lib/wix/`, target architecture in `docs/WIX_HEADLESS_ARCHITECTURE.md`): `lib/wix/client.ts` is an anonymous visitor client for REST Bookings reads; `@wix/bookings` remains deliberately absent because of its React 18 peer conflict. With `WIX_AVAILABILITY_ADAPTER_ENABLED=true`, `lib/wix/availability-adapter.ts` intersects Wix's live bookable starts with the local **duration-aware** zero-waste grid and can fall back to that Wix-backed grid when staged hosting has no local persistence. The `/api/slots` response declares `wixBookingsAuthoritative: true` in this mode, and `POST /api/checkout` refuses the local writer so one simulator time can never be sold by two calendars. `lib/wix/member-client.ts` is a browser-only, tab-scoped Wix Member/visitor client built from the public OAuth app id; `/login`, subscription entry points and `/wix/members/callback` share its PKCE login path. `lib/wix/member-profile.ts` maps the authenticated Wix member by immutable member ID, taking the email from `loginEmail` or documented contact data; an absent display email never turns an authenticated member into a guest. `lib/wix/member-auth.ts` verifies an incoming member token through Wix's current-member endpoint before server code can use an id or email. `lib/wix/member-bookings.ts` then reads only the signed-in member's Calendar appointments through the documented `memberId/me` endpoint; the Flight Deck presents their timing and status but never invents price, payment, invoice, Stripe receipt or a local boarding-pass reference from a calendar event. [`components/wix/WixMemberSubscriptionPanel.tsx`](components/wix/WixMemberSubscriptionPanel.tsx) lists the member's own active Pricing Plan orders on `/subscriptions` and `/dashboard`. The same visitor identity powers [`components/layout/WixSmartChat.tsx`](components/layout/WixSmartChat.tsx), a five-language custom panel whose copy lives in [`lib/i18n/wix-smart-chat-copy.ts`](lib/i18n/wix-smart-chat-copy.ts), over the Wix AI Site-Chat `messages.listMessages()` and `messages.createMessageStream()` APIs. Wix's built-in Editor widget cannot be rendered on a Headless frontend, so the component is the supported UI layer; the Wix AI Site-Chat app/settings remain configured in Wix and `npm run wix:chat:smoke` performs a read-only visitor API check. [`components/layout/social-channels.ts`](components/layout/social-channels.ts) supplies the official social destinations and native third-party icon colours once for the persistent utility bar, desktop footer, and navigation. `lib/wix/booking-checkout.ts` resolves a mapped base-flight slot only when both the zero-waste grid and live Wix availability agree. `lib/wix/booking-checkout-client.ts` then keeps the same guest-or-member browser visitor session through Wix slot revalidation, booking creation, a Cart V2 `customerInfo` handoff from the already-completed manifest, Cart V2 calculation, optional native coupon application, and Wix-hosted checkout. The handoff lets Wix prefill name, email and normalized phone without React handling payment data. In Wix-authoritative mode only a one-service flight represented in Wix may proceed; add-ons and on-request routes are blocked with a localized explanation until native Wix catalog entities model them. When the adapter is disabled, those local-only concepts retain the existing Supabase/Stripe checkout. Subscription checkout resolves the plan server-side but creates the hosted `paidPlansCheckout` redirect in the signed-in member browser session, preventing a server-owned anonymous order. An active member may select a duration-matched covered flight; `lib/wix/subscription-booking.ts` reuses the same strict resolver and `POST /api/wix/bookings/checkout` returns the live slot, then the member browser opens Wix-hosted `bookingsCheckout`, where Wix verifies the Pricing Plan benefit and consumes the native credit. `lib/wix/catalog.ts` maps package and plan IDs; `reconcileCatalog()` asserts pricing/duration parity, while the Wix smoke/readiness gate verifies that every mapped duration shares the Boeing 737 physical capacity resource. `lib/wix/readiness.ts` and `checkout-shadow.ts` remain read-only safeguards. No server-side Wix booking writer, PayPlus credential, payment-confirmation adapter, native invoice adapter, or application-owned subscription-credit ledger is active; Wix is the native checkout owner for eligible base flights while Supabase/Stripe remains authoritative only where Wix availability authority is disabled. `npm run wix:smoke` exercises live reads, while Wix and adapter tests cover mapping, availability intersection, browser checkout sequencing, plans, redemption, readiness, shadow isolation, member-token verification and Calendar projection. Production builds use only the public app/site pair from `wix.config.json`, bound to **SimDream-Staging** (`317b0c6d-6608-499a-bb3c-b1c37650e460`), never the live Editor site.
- **Error taxonomy**: `PersistenceError` → 503 with a generic message; `BookingConflictError` → 409; `RecordNotFoundError` → 404. Clients never see stack traces or database messages.
- **Server authority**: the browser sends only IDs (package, date, start time, add-on IDs and, when applicable, a curated on-request World Trio ID) and pilot details. Prices, durations, end times and discounts are always recomputed on the server; an on-request route is registry-validated, requires a 60-minute or longer session and adds no surcharge.

### 3. Core business logic

Sim Dream LTD runs one full-size **Boeing 737 MAX 8 flight simulator** at Gershon Shatz St 36, Tel Aviv. The site sells and schedules sessions on that single simulator.

| Feature | Route(s) | Behaviour |
| --- | --- | --- |
| Marketing pages | `/`, `/experiences`, `/subscriptions`, `/subscriptions/thank-you`, `/about`, `/pro`, `/contact`, `/rules`, `/privacy-policy` | Five customer value pillars, live METAR ticker (LLBG) and facility open/closed status, Google reviews. `/about` is the customer story; `/pro` is professional airline-assessment training; `/subscriptions` is the dedicated six-language annual flight-subscription portal, with post-checkout order confirmation on `/subscriptions/thank-you`. |
| Booking engine | `/book`, `/book/success` | Two interfaces over identical availability logic: the guided 3-step wizard is the default; the one-page “Amazon-style” Express Shop remains an optional desktop-only view and is never rendered as a phone choice. The default calendar is week view (month is togglable), with slot selection, add-ons, pilot manifest and checkout. It does not serialize a fabricated server date: until the browser resolves the Israel date, it renders a localized initialization state. Each calendar option uses the selected package's reserved cadence (30m → 45m, 45m → 60m, 60m → 75m, 90m → 105m, 120m → 150m) and preserves zero-waste capacity. With Wix authority enabled, a mapped one-service base flight takes the Wix-native guest/member flow (fresh slot validation → booking → Cart V2 `customerInfo` → calculation → Wix hosted checkout), including Wix coupons; Wix receives the already-completed name, email and normalized phone so the payment page can prefill them. The local checkout endpoint refuses to create a competing reservation. Add-ons and on-request World Trio routes display a localized Wix-authority notice until their native catalog mapping is delivered; when Wix authority is disabled, they retain Supabase/Stripe checkout. An active Wix subscription member can enter `/book?subscription=wix` from the subscription flight deck; only the mapped 60m or 90m base session is eligible, and the browser opens Wix-hosted Bookings checkout with an exact server-resolved live slot. An on-request World Trio opens calendar-first, saves a validated request with the booking and explicitly awaits captain confirmation when local checkout is active. The success page shows a boarding pass from a narrow public projection looked up by booking reference. |
| Persistent mobile chrome | `app/layout.tsx`, `LiveMetarBar`, `Navbar`, `Footer` | The utility bar and navigation travel as one sticky header, so language selection, all three official native-colour social channels, and the prominent official WhatsApp action remain reachable while scrolling. On phones, the footer is deliberately removed from page flow; its customer-story, contact, rules and privacy links are reachable through the localized “About Us” disclosure in the mobile menu. |
| Noise-free flows | `/book?package=…` | Professional Training and Fear of Flying suppress all add-ons and combos (2-step flow), including in compact duration-picker labels; recreational uses the full 3-step flow. |
| Scheduling | `lib/scheduler/*` | Deterministic "tiled interval" engine: each flight reserves a fixed block (flight + turnaround), slots are generated per operating window, orphan gaps are prevented, departed slots close by the Israel clock, and a dynamic-programming optimizer previews zero-waste capacity for admins. |
| Gift vouchers and Gift Cards | `/vouchers`, `/book` | Legacy purchase uses high-entropy `SD-VOUCH-…` codes with local verification and atomic balance debit. The voucher preview starts with the approved realistic, editable fictional names Aviad Stern and Danielle Cohen. Flexible local gift cards offer seven Apple-style colour swatches through [`GiftCardDesignPicker`](components/vouchers/GiftCardDesignPicker.tsx), using the lightweight registry in [`lib/catalog/gift-card-designs.ts`](lib/catalog/gift-card-designs.ts); the closed, server-validated `gift_card_design_id` is persisted with the voucher and controls its post-payment email artwork. In Wix-authoritative base-flight checkout, a Wix-managed Gift Card is a separate stored-value payment method: the browser applies it to Cart V2, receives only an obfuscated code, and displays Wix-calculated credit and payable remainder. Native Gift Card purchase/issuance and media management remain separate, explicitly verified cutover tasks. |
| Corporate workshops | `/workshops` | B2B CRM/leadership lead form (`corporate_inquiries`), managed in admin. |
| Member area | `/login`, `/dashboard`, `/wix/members/callback` plus retained legacy `/auth/callback` and `/auth/reset-password` pages | Wix Members is the primary hosted sign-in/register path. The dashboard verifies the Wix member token server-side and lists only that member's Calendar sessions and active Pricing Plan orders; Wix Calendar entries intentionally do not display a price, invoice, Stripe receipt or local boarding pass. The retained Supabase path continues to protect legacy local booking history and Stripe receipts. Paid guest bookings attach to a confirmed legacy member only when the checkout email **exactly** matches. Guest checkout is always available. |
| Admin dispatch | `/admin`, `/admin/bookings`, `/admin/vouchers`, `/admin/workshops` | Daily efficiency report and gap-collision tester, booking manifest (reschedule, cancel), voucher terminal (verify, redeem), workshop CRM pipeline. Basic auth plus same-origin checks on mutations. |
| Payments | `POST /api/checkout`, `POST /api/webhooks/stripe`, Wix Cart V2 | Local card bookings stay `pending` until a verified `checkout.session.completed`; expiry or failure cancels. Eligible simple Wix Bookings flights are paid and confirmed by native Wix checkout and use the Wix order/calendar instead of a local booking reference. Webhook-delivered local confirmations use a claimed/sent outbox for retry-safe delivery. |

**Wix-native Gift Card boundary:** In an eligible Wix-authoritative booking, the manifest exposes separate Coupon and Gift Card choices. A Gift Card is applied to the visitor-owned Cart V2 draft through Wix, its applied amount and final payable remainder come from `Calculate Cart`, and the raw bearer code is immediately cleared in favour of Wix's obfuscated display value. It is not a local `SD-VOUCH-*` voucher or a promotion. Native customer purchase/issuance is intentionally not represented as complete until its headless contract and paid-order lifecycle are verified.

### 4. Data models

TypeScript types in `types/index.ts` mirror the Postgres tables in `lib/db/schema.sql` (plus migrations 001–007):

| Type | Table | Key fields |
| --- | --- | --- |
| `SimulatorPackage` | `packages` | id, category, durationMinutes (30/45/60/90/120/240), priceIls, primeTimePriceIls, daytimeOnly, kantorovichVar |
| `Booking` | `bookings` or read-only Wix Calendar projection | bookingReference `SD-737-[A-Z2-9]{16}` for local rows; a Wix projection carries `source: 'wix'`, appointment timing/status and a display reference only. Calendar records never synthesize payment, price, receipt or invoice fields. |
| `GiftVoucher` | `gift_vouchers` | code `SD-VOUCH-[A-Z2-9]{18}`, initial value, current balance, sender/recipient, expiry, paymentStatus, Stripe session |
| `CorporateInquiry` | `corporate_inquiries` | company, contact, team size 1–500, goal, status pipeline |
| `UserProfile` | `profiles` | id = `auth.users.id`, email, role (`user`/`admin`) |
| `SecurityRateLimit` | `security_rate_limits` | hashed subject, fixed window, atomic attempt counter; no raw IP, username, or voucher code is stored |
| `FlightLog` | `flight_logs` | Declared in the schema and seed data, but not currently a durable production repository/dashboard flow. |
| `FlightSlot`, `DailyEfficiencyReport`, `PublicCapacityReport`, `MissionManifestCalculation` | computed | Scheduler outputs; the public report omits customer data. |

### 5. Observations from the analysis

- The Fear of Flying package id is `pkg-fear-of-flying-90`, but the product is a **60-minute** session (₪690). Keep the id for compatibility; do not trust the suffix.
- Admin authentication is interim HTTP Basic auth; the documented target is Supabase Auth with server-side roles and MFA.
- Voucher-code verification and failed admin Basic-auth attempts are rate-limited by a privacy-preserving, atomic database function (migration `005`); development and unit tests use an equivalent in-process limiter. The browser harness has a triple-gated `.next-test` isolation marker so parallel synthetic attackers cannot throttle unrelated authenticated journeys. Production fails closed when rate-limit persistence is unavailable.
- HTML responses use a per-request CSP nonce from `proxy.ts`; this removes script-src `'unsafe-inline'`, but makes rendered pages dynamic rather than statically prerendered.
- Production requires migrations **001–008** applied in order on an existing database (or `schema.sql` plus 003–008 on a new one).
- Only `/login` sets `noindex`. `/dashboard` and `/auth/*` are indexable (they hold no private data when signed out), so consider `noindex` there too.
- **Catalog authority is unified**: `GET /api/packages` and checkout resolve package names, prices and durations from the same immutable server-side `SIMULATOR_PACKAGES` registry. The optional legacy `packages` table is not a public-catalog dependency, so an absent table cannot take `/api/packages` offline on a Wix-hosted deployment.
- **i18n is not yet total**: the dictionary has six-language parity and tests, but hard-coded English remains in some legal and admin surfaces, while specialist catalogue records use an explicit English fallback until their Spanish editorial review is complete.
- **Brand drift**: the success-page confetti and review-avatar gradients still use colours outside the Sim Dream tokens.
- **Flight logs are not a live feature**: `flight_logs` exists in SQL and seed data, but production reads and writes stay in memory and no dashboard renders them.
- **Types**: TypeScript strict mode, typed external-boundary schemas and `unknown` error handling are used; production code has no `any` escape. `npm run lint` runs `tsc --noEmit` plus [`scripts/check-type-hygiene.ts`](scripts/check-type-hygiene.ts), which rejects `as any`, typed `any`, and TypeScript suppression directives in application source.
- **Provider configuration cannot be proven from code**: OAuth providers, Stripe events, SendGrid sender verification and live reviews need the verification run in **Definition of Done** before launch.

---

## Phase 2: The Genesis Prompt

Copy everything between the markers into an AI coding agent that can create files and run commands.

<!-- BEGIN GENESIS PROMPT -->

### ROLE

You are a senior full-stack engineer building a production website end to end. Build exactly what this prompt specifies, verify every requirement with automated tests, and stop only when all four quality gates pass. Where a detail is unspecified, choose the simplest secure option and document it.

### PROJECT TYPE & CONTEXT

Build **simdream.co.il**, the booking and marketing platform for **Sim Dream LTD**, which operates one full-size **Boeing 737 MAX 8 flight simulator** at Gershon Shatz St 36, Tel Aviv-Yafo, Israel. Customers are recreational flyers and gift buyers, airline pilot candidates preparing for assessments, fearful flyers, and corporate teams. The platform sells timed simulator sessions, gift vouchers and corporate workshops, schedules them on the single simulator without double booking, takes card payments through Stripe, gives members a purchase history, and gives staff a dispatch back office. It must run in **six languages** (Hebrew and Arabic right-to-left; English, Russian, French and Spanish left-to-right) and offer **two visual themes**.

### TECH STACK DIRECTIVES

- **Next.js 16** App Router with Turbopack, **React 19**, **TypeScript** strict. Use `proxy.ts` (not middleware) for request guards. Read `node_modules/next/dist/docs/` before using any Next.js API, because version 16 has breaking changes.
- **Tailwind CSS 4** with brand colour tokens in an `@theme` block in `app/globals.css`.
- **zod 4** for all request validation.
- **Supabase** (Postgres + Auth) as the production database and member identity provider, accessed server-side with the service-role key only.
- **WhatsApp** is the persistent human contact route (`+972 55 507 1307`). Do not add a second chat widget to the Headless frontend without an approved customer-support ownership and data-retention decision.
- **Stripe** Checkout (hosted) and a signature-verified webhook. **SendGrid** for email. **Google Places API** for attributable reviews: the browser calls the same-origin review route, while the server protects the key and refreshes the feed at most every 15 minutes; the carousel is blank when unavailable.
- Testing: **Vitest** (+ coverage, **fast-check**), **Playwright** (+ **axe-core**), **autocannon**, **Lighthouse CI**.
- Node 24.22.1 or newer. Build the existing self-managed target normally, or use `npm run wix:build` followed by `npm run wix:release` to host the Next.js frontend on Wix-managed Headless. CI on **GitHub Actions**.
- Environment variables (document them in `.env.example`, never commit values): `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USER`, `ADMIN_PASSWORD` (≥16 chars in production), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SENDGRID_API_KEY`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `GOOGLE_PLACES_API_KEY`, the demo-only opt-in `ALLOW_IN_MEMORY_STORE`, the two public Wix Headless identifiers `NEXT_PUBLIC_WIX_CLIENT_ID` and `WIX_SITE_ID`, server-only Wix plan mappings `WIX_PLAN_ID_FOUNDATIONS_5X60`, `WIX_PLAN_ID_ADVANCED_5X90`, `WIX_PLAN_ID_ATPL_10X60`, and `WIX_PLAN_ID_AIRLINE_10X90`, plus default-off `WIX_SHADOW_READS_ENABLED` and `WIX_AVAILABILITY_ADAPTER_ENABLED` flags. The availability flag permits only a Wix availability read/intersection; native simple-flight checkout relies on the public Wix OAuth app id and always creates the booking/cart in the browser visitor session, never with a server credential. Public identifiers may be in `wix.config.json`; secrets never are.

### NON-NEGOTIABLE INVARIANTS (the five pillars of this build)

1. **Brand pillars and identity.**
   - All copy reinforces five customer value pillars:
     - Full Captain's Command: a real 737 cockpit, not an arcade ride.
     - Active airline-captain mentorship.
     - Unrestricted global freedom: 24,000+ airports and custom weather.
     - Transformative milestones and fear-of-flying coaching.
     - Authentic aviation integrity.
   - The visual identity is the official logo: an **orange airplane `#FF5500`** and a **cerulean "SIM DREAM" wordmark `#2096C7`**, shown alone in the header with no tagline beneath it in any language; the tagline "Simulation Systems (Israel)" ("מערכות סימולציה (ישראל)") remains as translated text in the footer and the desktop flyout panel only.
   - Remap Tailwind's `sky-*` scale to a cerulean scale (500 = `#2096C7`) and `orange-*` to an orange scale (500 = `#FF5500`).
   - Render the logo only from the official image assets. Never recolour it, rebuild it from text, or mirror it in RTL.
   - Decorative colours (confetti, avatars, gradients) also come from the brand tokens.
2. **Canonical URL discipline.**
   - `/pro` is the single page for professional airline-assessment training.
   - `/about` is the customer story, kept separate from `/pro`.
  - `/simulator` and `/training` redirect permanently to `/pro`; `/book-online`, `/לקנות-כמתנה`, `/cooperation`, and `/pricing-plans/list` preserve their exact intent through permanent redirects to `/book`, `/vouchers`, `/workshops`, and `/subscriptions` respectively. Do not add broad legacy redirects until each legacy offering has an approved content/SKU mapping.
   - Navigation, footer and sitemap point at canonical routes only.
3. **Noise-free flow suppression.**
   - Professional Training and Fear of Flying bookings show zero add-ons and zero combos, in a 2-step flow: *Date & Slot → Pilot Manifest & Checkout*.
   - The default pilot level is `atpl` for training and `beginner` for fear of flying.
   - Recreational bookings use the full 3-step flow with add-ons.
   - The guided wizard is the default. Keep the optional Express Shop on desktop only; do not expose it at phone breakpoints, where localized labels must remain single-line and touch-safe.
4. **Unicode purity and RTL isolation.**
   - Resolve every user-visible string through `lib/i18n/translations.ts`, with identical key trees in all six languages.
   - Hebrew is the first-visit default. `lib/i18n/language-preference.ts` validates the six supported codes and derives direction. An explicit `simdream_lang` preference stays in browser local storage; public browsing neither reads nor writes a language cookie. `LanguageProvider` restores the choice after hydration, while a bounded inline bootstrap prevents a returning visitor from seeing the Hebrew fallback before their saved language commits.
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
| `pkg-discovery-30` | recreational | 30 min | 450 | Guided Discovery Flight |
| `pkg-promo-45` | recreational | 45 min | 490 | Discounted Promotion: Sunday–Tuesday, starts before 18:00 only |
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
- guest upgrades: extra jumpseat passenger.

Add 3 curated one-click combos. Localize every package and add-on in all six languages. Keep **one server-side catalog authority**: the catalog API and checkout must read prices and durations from the same source.

**Named gift certificates** use the same registry, in this fixed order: Discovery 30 (₪450), Captain 60 (₪690), Ultimate 90 (₪950, including the prime-time tariff), and Airline Interview Prep 120 PRO (₪1,590). The browser sends only a package id; checkout resolves its amount and title server-side. The legacy flexible monetary offering remains an open-balance `SD-VOUCH-*` voucher until its purchase issuance is deliberately migrated. Its live card preview has seven local, optimized visual directions selected by accessible Apple-style swatches. The browser sends only a closed `giftCardDesignId`, the server validates it against the registry, persistence stores it as `gift_card_design_id`, and post-payment mail resolves the image from that registry; a browser never submits a URL or arbitrary design markup. A Wix-native Gift Card is distinct: it is redeemed only through the Wix Cart V2 Gift Card endpoints, has a Wix-managed balance and can be partially applied to a native Wix booking cart. Never treat a Wix Gift Card as a coupon, and never retain its raw bearer code after Wix has accepted it.

**Experience Flights route catalog** (`lib/data/experience-routes.ts`, rendered by `components/experiences/WorldRoutesSection.tsx` on `/experiences#world-routes`): the "טיסות חוויה" section written in the captain's voice. It lists every world-trio add-on (price and minutes resolved from `FLIGHT_ADDONS`, never duplicated) plus proposed on-request trios (Israel home skies, Atlantic outposts, Arctic lights, Himalaya, Africa, Pacific, Andes, North American wilderness) and scenario adventures (Dead Sea low pass, ETOPS crossing, Everest mountain flight, storm diversion, round-the-world, fly-home). Each trio names three real airports by ICAO and IATA code (ICAO rendered LTR), a 1–5 captain's handling rating, a first-person captain's note and "best for" tags, all in six languages. Bookable trios link to `/book` with their priced add-on selected. On-request World Trios link to `/book?package=captains-command-60&route=<id>`, open the calendar-first flow, restrict packages to 60 minutes or longer, retain only a server-validated route ID, add no route charge and clearly state that the captain confirms the final plan. Scenario adventures remain `/contact?subject=route&route=<id>` briefing inquiries. Every airport is a real Boeing 737 destination (pillar 5). Pinned by `tests/unit/experience-routes.test.ts`.

**Flight Subscription catalog** (`lib/data/subscription-passes.ts` and `lib/data/subscription-page-copy.ts`, rendered on `/subscriptions` and in the `/experiences` Flight Subscriptions tab): four 12-month, single-payment programmes—Flight Foundations `5 × 60` (₪2,750), Advanced Captain `5 × 90` (₪3,390), ATPL Concepts `10 × 60` (₪4,850), and Airline Readiness `10 × 90` (₪5,950). Each subscription is tied to exactly one base package (`pkg-captain-60` or `pkg-ultimate-90`); standard-value and savings figures are calculated from that base catalog price, never duplicated. Its six-language captain-led curriculum can reference existing Cold & Dark, Crosswind/IFR, and Extreme Airports add-on themes, but must never silently add their separately priced cockpit minutes to a reservation. ATPL-level explanations are education only: no flight hours, licence, type rating, airline assessment credit, or job guarantee. The primary CTA ('Buy Subscription' / 'רכישת מנוי') connects via `POST /api/subscriptions/checkout` to Wix Pricing Plans (`lib/wix/plans.ts`) for hosted checkout redirect (`createRedirectSession` with `paidPlansCheckout`), while maintaining a graceful fallback to a validated Dispatch enrolment inquiry if the Wix plan is not yet configured or published. An active member sees a duration-matched covered-session link; the booking page resolves an exact live slot through `POST /api/wix/bookings/checkout` and opens Wix-hosted Bookings checkout in that member session, so Wix evaluates and consumes the native benefit. Subscriptions represent single-payment 12-month packages with no recurring billing claims.

#### Scheduling engine (`lib/scheduler/`, pure functions, fully unit-tested)

- **Capacity buffer map**: `getReservedMinutesForFlight()` maps each flight to a reserved block (flight plus turnaround):

  | Flight | Reserved block |
  | --- | --- |
  | 30 min | 45 min |
  | 45 min | 60 min |
  | 60 min | 75 min |
  | 90 min | 105 min |
  | 120 min | 150 min |
  | 240 min | 255 min |

  The turnaround constant is 15 minutes.
- **Operating windows** (Israel time):

  | Day | Window | Minutes | Notes |
  | --- | --- | --- | --- |
  | Sunday–Saturday | 09:00–24:00 | 900 | Saturday retains prime-time pricing; the 45-minute promotion is forbidden on Saturday and remains Sunday–Tuesday only |
- **Slot generation**: `generateKantorovichSlots(date, duration, bookings)` returns every departure on a grid derived from the reserved blocks. The ₪490 45-minute Discounted Promotion is sellable Sunday–Tuesday before 18:00 only; the zero-waste solver also removes its 60-minute block on every other day so it never classifies an unsellable gap as capacity. Saturday 60-minute departures follow the full 09:00–24:00 duration-aware cadence and retain prime-time pricing. Each slot carries:
  - `available`;
  - a `disabledReason`: booked, orphan_gap, promo day/time restriction, exceeds window, or departed;
  - a smart recommendation: optimal 150-minute pair, zero-waste fit, and so on.

  Never offer a departure that would leave an unsellable gap ("anti-gap"/zero-waste tiling).
- **Departed slots**: `closeDepartedSlots()` closes any departure at or before the current **Israel** minute (`lib/scheduler/israel-clock.ts`, using `Intl` with `Asia/Jerusalem`, DST-correct), whatever the server time zone.
- **Pricing**: `packagePriceForSlot()` applies prime-time pricing. `calculateMissionManifest()` totals the package and add-ons and rejects add-ons that would run past the next booking or the window close.
- **Building blocks** (keep these as small, separately tested functions):
  - time: `timeToMinutes()`, `minutesToTime()`, `addMinutesToTime()`, and the Israel clock's `israelToday()`, `israelMinutesNow()`, `hasDeparted()`;
  - days and capacity: `getDayOperatingConfig()`, `is45MinutePromoDay()`, `longestMissionWithin()`, `canTileIntervalZeroWaste()`, `getKantorovichPricing()`;
  - packages and add-ons: `packageAllowsAddons()`, `packageFromPriceIls()`, `sanitizePackageTitle()`, `canAddonFitInSlot()`, `pruneAddonsExceedingSlot()`;
  - shared customer presentation: `getPackageFormulaBadge()` supplies identical, localized formula labels to both booking interfaces;
  - checkout orchestration (`lib/booking/checkout-service.ts`): `createCheckoutService()` applies the business rules; `checkout-ports.ts` holds provider-neutral contracts, and `checkout-runtime.ts` exposes the current Supabase/Stripe composition's `startBookingCheckout()` and `startVoucherCheckout()` route functions.
- **Efficiency and optimization**: `evaluateDailyEfficiency()` builds the admin day report (blocks, gap collisions, revenue). `toPublicCapacityReport()` strips all customer data for public use. `optimizeTiledCapacity()` is a dynamic-programming dry-run that recommends a zero-waste tiling for the remaining capacity.

#### Booking UI (`/book`)

- Two interfaces over **identical** availability and recovery logic:
  - `AmazonFlightStorefront` (one page, sticky buy box);
  - `KantorovichCalendarScheduler` (guided wizard).
- `BookingWeekPager` is their shared, six-language week-navigation boundary. It shifts the selected Israel date by exactly seven days, prevents travel before today, and flips only directional chevrons for RTL (not text).
- The calendar defaults to a **localized week view**, with the month grid retained as an explicit toggle. Weeks start on Sunday for he, ar and en, and on Monday for ru and fr. RTL arrows are flipped.
- `/book` renders a localized initialization state until the browser supplies the live **Israel** date; it never places a fictional date in server HTML. Do not read the device clock in calendar render paths: a visitor west of UTC must never get a date-shift or React hydration mismatch.
- **Never hide packages or durations** with zero open slots. Show them with a "0 slots open today" badge and keep the user's selection.
- When a package has zero slots, show:
  - "No open runway slots for [Package] on [Date]";
  - a **Check Next Day →** button;
  - quick-switch buttons to durations that are available.
- The departure grid lists **open slots only**: booked, reserved or internally locked slots are never rendered (no strikethrough or disabled tiles), so the visitor chooses from what is actually available.
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
- The checkout service has no direct import of the concrete store, Stripe, SendGrid, Supabase authentication, or origin configuration. Those integrations live in the server-only `checkout-composition.ts`; `tests/unit/checkout-service-ports.test.ts` proves that a substitute hosted-payment gateway and repository preserve the same redirect and 409 conflict contracts.
- When the strict `WIX_SHADOW_READS_ENABLED=true` flag is present, a successful booking initialization schedules a non-blocking `after()` task. The Wix shadow observer receives only package/date/time/base duration, compares the mapped service and selected base-package slot, and emits a generated correlation event with no customer, voucher, booking, payment or card data. Wix is not a checkout writer at this stage; a failed shadow read cannot change the response.
- `POST /api/webhooks/stripe` verifies the signature, then:
  - on `checkout.session.completed` with `paid`: conditional `pending→paid`;
  - on `expired` or `async_payment_failed`: cancel.

  Late payment for a cancelled booking or voided voucher is recorded and flagged for refund, never revived. Webhook-delivered confirmation emails use an outbox (`claimed`/`sent` timestamps, 10-minute claim TTL). A delivery that finds the claim busy answers 503 so Stripe retries. Every payment state transition is idempotent.
- Public responses carry no personal data: the capacity report has no customer or revenue fields, the success-page lookup by booking reference returns a narrow projection, and voucher verification returns balance and validity only.
- Booking references are `SD-737-` plus 16 characters from `A-Z2-9`; voucher codes are `SD-VOUCH-` plus 18. Generate both with a CSPRNG.

#### Members (Wix primary; Supabase legacy)

- `/login` has one Wix-hosted sign-in/register CTA. Email, recovery and enabled social providers are configured and rendered by Wix; guest customers can always leave for `/book` without authenticating.
- The shared browser client keeps Wix OAuth tokens only in tab-scoped `sessionStorage`. `/wix/members/callback` validates PKCE state, exchanges the code and refreshes the shared React auth context before best-effort Wix-page cookie sync; that optional sync never blocks Member UI identity. The shared member profile treats the immutable Wix member ID as the identity source and falls back from `loginEmail` to documented contact email for display and safe server-side ownership checks.
- `GET /api/my-bookings` accepts a same-origin `Bearer` member token only after `lib/wix/member-auth.ts` resolves it through Wix's current-member endpoint. For a Wix identity, it queries Calendar as `memberId/me`, so a caller cannot select another member by id or email. The dashboard shows session timing/status and active Pricing Plan orders, but hides price, receipt and boarding-pass controls because Calendar does not prove payment.
- Retained Supabase/local behavior is a compatibility path for local booking history: `POST /api/membership/bootstrap` attaches **paid** guest bookings only when the confirmed legacy email exactly matches (normalized lowercase, never ILIKE/wildcards); `GET /api/my-bookings/[ref]/receipt` returns a Stripe receipt only for that confirmed owner.

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
| `/api/subscriptions/checkout` | POST / GET | public | Wix Pricing Plans hosted checkout redirect with Dispatch fallback |
| `/api/wix/bookings/checkout` | POST | public slot lookup | Validates every mapped base-service slot against the strict grid and current Wix availability, returning only the exact slot, payment capability and business location needed by the browser visitor checkout; subscription redemption opens Wix-hosted Bookings checkout, while a standard base flight creates one native Wix booking and Cart V2 draft. The browser writes only its already-collected manifest identity to that same cart's `customerInfo` before checkout; a submitted Wix coupon is added to the same visitor cart, then **Calculate Cart** supplies the only displayed discount/total; the same cart opens hosted checkout. |
| `/api/webhooks/stripe` | POST | Stripe signature | Payment state machine |
| `/api/bookings` | GET / POST / PATCH | GET `?ref=` public narrow projection, else admin; POST 405 | Booking lookup and admin changes |
| `/api/vouchers` | GET / POST / PATCH | GET admin; POST public verify; PATCH admin redeem | Vouchers |
| `/api/workshops` | GET / POST / PATCH | POST public; else admin | Corporate leads |
| `/api/reviews` | GET / POST | GET public (15 min shared freshness); POST admin refresh | Google reviews |
| `/api/my-bookings`, `/api/my-bookings/[ref]/receipt` | GET | member | History and receipts |
| `/api/membership/bootstrap` | POST | member | Profile and guest-booking linking |
| `/api/admin/schedule-efficiency` | GET | admin | Full day report |
| `/api/admin/schedule-optimization` | POST | admin | Dry-run optimization preview |

#### Frontend platform

- **Themes**:
  - 🌙 *Cockpit Night* is the default: dark slate, cerulean HUD accents and orange highlights.
  - ☀️ *Brand Daylight*: cloud white with cerulean and orange, implemented as `html[data-ui="brand"]` overrides.
  - ✨ *Clean Studio*: the daylight palette restyled after apple.com's mobile site (white canvas, `#f5f5f7` wells, 17px root type with tight semibold headlines, sentence-case labels, pill buttons, slim translucent nav). Layered on daylight: the document carries `data-ui="brand"` **and** `data-look="studio"`, and `html[data-look="studio"]` rules add only the restyle. Telemetry (elements with their own `dir="ltr"`) keeps its capitals and mono face.
  - A no-flicker bootstrap script (`public/theme-bootstrap.js`) sets the theme before first paint; the provider cycles cockpit → brand → studio and retints `<meta name="theme-color">` (`#070b14`, `#f8fafc`, `#ffffff`).
  - The header switch shows an icon and a px-sized state pill whose knob rests at the start, middle or end of its track and never leaves it.
  - **Action buttons replicate apple.com's store buttons in every theme and viewport** (`components/ui/Button.tsx`, `buttonClassName()` for links): a 980px pill with a 1px border on every variant, regular-weight system type at 17px (`lg` grows to 21px from the `lg` breakpoint, like `.button-elevated`), `-0.022em` tracking, 8px/16px padding, no shadow, no press scale, and no icons inside hero pairs. `primary` uses the exact sky-400 cerulean at the edges of the home-page “Boeing 737 MAX” gradient, with a dark accessible label; `outline` uses the same sky-400 border and fills with it on hover (the Daylight outline label remains sky-700 for AA contrast). `secondary` is Apple's neutral grey pill; `ghost` is a text-only action. Hero pairs sit side by side on phones too (`flex-row flex-wrap`, auto width). Call sites never override weight, shadow or padding; themes only recolour via `[data-ui-control="button"][data-button-variant]`, never generic `button` or rounded utilities.
- **Phones and tablets** (iPhone/iPad in Safari and installed, Android Chrome): `viewport-fit=cover` with pinch zoom intact; safe-area utilities (`pt/pb/px/ps/pe-safe-area-*`, `bottom-safe-area-*`, `standalone:` variant) on sticky checkout bars, dialogs and the footer; `overflow-x: clip` on `html` and `body` (never `hidden`, which detaches the sticky navbar on iOS); `fieldset { min-width: 0 }`; on coarse pointers a 48px control floor, 8px calendar/slot gaps, native `<select>` appearance dropped with a chevron, and a 12px floor for the smallest labels below 640px; `appleWebApp` metadata, an opaque 180px `app/apple-icon.png`, and `app/manifest.ts` with 192/512/maskable PNGs generated by `scripts/generate-app-icons.mjs`.
- **Header**:
  - the logo image alone (no tagline beneath it in any language), theme switch, language selector, icon-only login, and a **Book a Flight** call to action that never wraps;
  - inline links from 1536 px, a drawer below;
  - no horizontal overflow in any language.
- **Hydration**: request rendering is required for the CSP nonce, but time still must not be read during render. Read it in the browser (`useSyncExternalStore` with a `null` server snapshot, or effects), so hydration stays deterministic.
- **Accessibility**: WCAG 2.2 AA in all three themes and all languages.
  - Skip link and one `<main>`.
  - Labelled controls, named buttons and announced errors.
  - Dialogs open from the keyboard and close on Escape.
  - Reduced motion is honoured.
  - Contrast ≥ 4.5:1. Use `orange-500` only for the logo, icons, borders and large text, and `orange-700` for small orange text on light surfaces.
  - Touch targets at least 24 × 24 px (WCAG 2.2 AA, enforced by the tests); aim for 44 × 44 px on primary mobile controls.
- **SEO**:
  - per-page metadata and canonical URLs;
  - a sitemap of canonical routes, `robots.txt` disallowing `/admin` and `/api`, and an explicit `noindex, nofollow, noarchive` meta directive for every `*.wix-site-host.com` preview host;
  - JSON-LD: WebSite, the local business (address, geo coordinates, opening hours, aggregate rating), an offer catalog, and an FAQ;
  - `noindex` on `/login`.

#### Security headers and hygiene

- Configure in `next.config.mjs`: `poweredByHeader: false`, the 301 redirects, and the headers below.
- Headers: HSTS (`max-age=63072000; includeSubDomains`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera, microphone and geolocation.
- `proxy.ts` generates a unique CSP nonce for every HTML response, forwards it through `x-nonce`, and emits `script-src 'self' 'nonce-…' 'strict-dynamic'`. Root-layout and JSON-LD scripts carry that nonce. This deliberately makes rendered pages dynamic; monitor the caching and latency trade-off.
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
   - usability: hydration on a later day than the build, i18n and RTL in all six languages, header fit, theme switch, CLS, reduced motion, responsive layouts from 320 to 1920 px;
   - security-web: headers, access control, stored XSS;
   - resilience: slow, failing and offline networks;
   - visual baselines per platform.

   Run against a sandboxed production build in a separate build folder.
4. **Supply-chain and secret security**: `npm audit --audit-level=high`, Dependabot, CodeQL and an event-scope Gitleaks scan (including a custom Wix API-key rule) run before a Wix preview or release. A separately owner-triggered full-history audit surfaces legacy findings for rotation and a reviewed remediation; it is not broad-allowlisted to make routine PRs pass. GitHub native secret scanning and push protection remain enabled for the public repository.
5. **Load and performance**: autocannon p99 budgets on hot endpoints. Lighthouse budgets: accessibility ≥ 0.95, SEO ≥ 0.95, performance ≥ 0.8, best practices ≥ 0.9, LCP ≤ 2.5 s, CLS ≤ 0.1.

Playwright projects: `chromium`, `firefox`, `webkit`, `mobile-chrome` (Pixel 7), `mobile-safari` (iPhone 15), `a11y`, `usability`, `security-web`, `resilience`, `visual`.

Wire all four gates into one command (`npm run test:all`) and into CI jobs that merge their results into a quality report. Provide these scripts:

| Script | Runs |
| --- | --- |
| `lint` | Strict TypeScript check plus the deterministic type-hygiene guard. |
| `test:all` / `test:quick` / `test:full` / `test:report` | Orchestrator: everything / typecheck + type hygiene + Vitest / all browsers + Lighthouse / rebuild the report |
| `test:unit`, `test:integration`, `test:security`, `test:reliability`, `test:coverage` | Vitest projects (security and reliability add their browser projects) |
| `test:build` | Sandboxed production build into `.next-test` |
| `test:e2e`, `test:a11y`, `test:a11y:baseline`, `test:usability`, `test:visual`, `test:visual:update` | Playwright projects; baseline and screenshot re-recording (Linux baselines in Docker) |
| `test:load`, `test:lighthouse` | autocannon smoke and Lighthouse against a sandboxed server |
| `start:local` | `next start` with the demo store opt-in, for laptops without Supabase |
| `docs:genesis` | Fails unless this blueprint still covers the codebase |

**Continuous delivery:** GitHub Actions never receives a Wix credential in a pull-request job. After the owner enables the non-secret `WIX_PREVIEW_CI_ENABLED=true` repository variable, a passing application-source push to `main` builds an immutable Wix preview using the `wix-preview` environment secret. `release-please.yml` evaluates only a passing current `main` commit and maintains a Conventional-Commit-based release PR. GitHub currently leaves the bot-generated pull-request event `action_required`, so Release Please approves that one PR-attached candidate Verify rather than dispatching a detached duplicate. Its `release-integrity` gate accepts only the generated version/changelog files and proves that its exact `main` parent passed Verify; fresh lint, unit/security/audit and production-build guards run, while browser, accessibility, visual, load and Lighthouse suites are inherited rather than replayed. The five browser check names remain as inherited-success contexts for branch protection. The resulting version-only merge receives the same constrained fast path and does not make a redundant Wix preview. Merging the candidate writes the changelog, version, GitHub Release and immutable SemVer tag (`vX.Y.Z`). It dispatches `wix-release.yml`, which verifies the SemVer/provenance and requires the completed successful `Verify` run for that exact `main` SHA before rerunning deterministic source and production-build checks on the tag. Only then may the separately protected `wix-production` environment invoke `wix release`; a separately enabled `WIX_PRODUCTION_CI_ENABLED=true` remains required. Wix's release comment records the tag and commit SHA. This allows a staging-only credential to automate previews without enabling production. [`docs/GITHUB_WIX_CICD.md`](docs/GITHUB_WIX_CICD.md) defines the environment secret/approval configuration and the historical-tag rollback workflow. Wix business data, payment settings, coupons and customer records are intentionally outside source-delivery automation.

### CLOSE THESE KNOWN GAPS (do not reproduce them)

The current system tracks these as open. A rebuild should fix them:

1. Replace interim admin Basic auth with Supabase Auth, server-side roles and MFA.
2. Run integration tests against real Postgres to prove the exclusion constraint, `redeem_gift_voucher`, the `23P01` → 409 mapping and every migration.
3. Extend browser coverage to admin mutations, signed-in receipts, success-page polling, booked-slot transparency, every day's slot grid, SEO metadata and email rendering.
4. Preserve the unified server-side catalog authority; remove the remaining hard-coded English; keep decorative colours on the brand tokens; either finish flight-log persistence or leave the feature out.

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
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (30,45,60,90,120,240)),
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
  requested_route_id TEXT CHECK (requested_route_id IS NULL OR requested_route_id ~ '^route-[a-z0-9-]{1,80}$'),
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

Ship the schema as `lib/db/schema.sql` for new projects and as ordered, reviewed migrations for existing ones: `001_production_hardening.sql`, `002_member_accounts.sql`, `003_exact_pilot_email_matching.sql`, `004_confirmation_outbox.sql`, `005_security_rate_limits.sql`, `006_discovery_flight_30_minutes.sql`, `007_requested_route_intent.sql`.

### FILE STRUCTURE

```text
app/
  layout.tsx, page.tsx, globals.css, icon.png, apple-icon.png, robots.ts, sitemap.ts
  (public)/  about/ pro/ experiences/ subscriptions/ (layout + page, thank-you/) book/ book/success/ vouchers/ workshops/ contact/ rules/ privacy-policy/ simulator/ (redirect)
  (auth)/login/
  auth/callback/  auth/reset-password/
  dashboard/  (layout + page)
  admin/      (layout + page, bookings/, vouchers/, workshops/)
  api/        packages/ slots/ checkout/ subscriptions/checkout/ wix/bookings/checkout/ webhooks/stripe/ bookings/ vouchers/ workshops/ reviews/
              my-bookings/ my-bookings/[bookingReference]/receipt/ membership/bootstrap/
              admin/schedule-efficiency/ admin/schedule-optimization/
components/
  brand/BrandLogo.tsx            # BrandLogo (airplane + wordmark), BrandMark (airplane)
  layout/  Navbar Footer LanguageSelector UiThemeSwitcher LiveMetarBar SkipLink
  scheduler/ AmazonFlightStorefront KantorovichCalendarScheduler
  reviews/GoogleReviewsCarousel
  about/AboutExperienceView  pro/ProSessionsView  legal/ PrivacyPolicyContentView RulesContentView
  seo/StructuredDataJsonLd  ui/ Button Card Badge
lib/
  scheduler/ kantorovich-engine mission-calculator package-presentation tiled-interval-optimizer israel-clock
  booking/checkout-service checkout-ports checkout-composition checkout-runtime
  wix/ client config catalog bookings availability-adapter booking-checkout booking-checkout-client subscription-redemption subscription-booking checkout-shadow member-client
  catalog/gift-voucher-packages  data/experience-routes subscription-passes subscription-page-copy  db/ store schema.sql seed-data supabase-admin migrations/
  auth/ admin-guard request-auth member-ownership safe-redirect auth-context
  security/rate-limit
  i18n/ translations language-context language-preference calendar-presentation booking-blueprint-copy wix-subscription-booking-copy
  config/ facility-info server-env use-live-facility-status
  theme/ui-theme-context  ui/ use-client-value use-modal-focus  seo/seo-config
  reviews/google-reviews-cache  i18n/booking-blueprint-copy
  stripe.ts  sendgrid.ts  validation.ts  utils.ts  supabaseClient.ts
types/index.ts
proxy.ts                          # /admin guard
public/brand/                     # official logo assets; theme-bootstrap.js
tests/  unit/ integration/ security/ reliability/ e2e/ a11y/ usability/ security-web/ resilience/ visual/ load/ perf/ support/
scripts/ test-all.ts run-sandboxed.ts with-server.ts update-visual-baselines.sh check-genesis-coverage.ts
.github/workflows/ ci.yml codeql.yml pr-mergeability.yml enable-trusted-automerge.yml security-history-audit.yml release-please.yml wix-release.yml wix-rollback.yml nightly.yml (OWASP ZAP baseline)
AGENTS.md  ARCHITECTURE.md  README.md  TESTING.md  KANTOROVICH_SCHEDULER_SPEC.md
```

### DEFINITION OF DONE

- `npm run build` compiles every route with zero TypeScript or build errors.
- `npm run test:all -- --full --lighthouse` is green: typecheck, Vitest with coverage thresholds, e2e on five browsers, accessibility with an empty baseline, usability, security-web, resilience, visual, load and Lighthouse.
- Verify manually:
  - a recreational booking (3 steps with add-ons), an on-request World Trio at `/book?package=captains-command-60&route=route-israel-home-skies` (calendar first, no route surcharge, captain-confirmation notice) and `/book?package=airline-interview-prep-90-pro` (2 steps, no add-ons);
  - Sunday through Saturday calendars (09:00–24:00);
  - all six languages with no mixed scripts or missing keys;
  - all three themes with the official logo and no off-brand colours;
  - iPhone SE (320 px) to iPad landscape and Android phones/tablets with no horizontal overflow, 48 px controls and ≥12 px text.
- Production without Supabase or Stripe fails closed (503), never with fake data.
- Before launch, verify the providers, which no build or test can prove:
  - migrations 001–007 are applied and `ALLOW_IN_MEMORY_STORE` is absent in production;
  - Google, Facebook and Apple are enabled in Supabase Auth with callback URLs for the deployed origin;
  - the Stripe keys are set and the webhook receives `checkout.session.completed`, `checkout.session.expired` and `checkout.session.async_payment_failed`;
  - the SendGrid sender is verified;
  - a test booking, signed webhook, member claim, history read and receipt all work in a non-production environment.

<!-- END GENESIS PROMPT -->
