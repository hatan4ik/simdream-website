# SimDream Codebase Review — Source-Verified Snapshot (Historical) — 2026-10-27

> **Archived for traceability.** Its findings and evidence boundaries have been incorporated into the canonical [`GENESIS.md`](../../GENESIS.md).

**Reviewed:** 2026-10-27  
**Review basis:** the working tree captured on 2026-10-27, tracked project instructions, runtime source, schema and migrations, configuration, and automated-test contracts.

## Scope and confidence

This was a repository review, not a claim that the external providers are configured or live. The review covered:

- all local Markdown guidance and architecture/testing specifications;
- route inventory, API handlers, auth/security boundaries, checkout, scheduling, data store, SQL schema/migrations, seed catalogue, configuration, and scripts;
- all 100 runtime TypeScript/TSX modules at an architecture/control-flow level, with source-level review of the booking, scheduling, checkout, identity, persistence, provider, and major customer/admin UI modules;
- the 79 test-spec files as a coverage/contract map, including detailed review of scheduling, checkout/webhook, membership, i18n, reliability, accessibility, and browser-flow suites.

The 4,406-line translation catalogue and large content-only UI dictionaries were structurally audited through the i18n contracts and targeted source review; this is not a linguistic certification of every sentence. Likewise, local source cannot prove Stripe, Supabase OAuth, SendGrid, Google Places, or production database migrations are configured in their external dashboards.

## Verified system picture

### Product and route model

This is one Next.js 16 App Router application, not a separately deployed frontend and API. It serves the public marketing site, adaptive booking experience, member dashboard, protected staff console, and route-handler API.

| Area | Verified current behavior |
| --- | --- |
| Customer story | `/about` is a standalone, multilingual customer-story page. It links to Instagram, Facebook, and YouTube from `FACILITY_INFO.social`. It does **not** redirect to `/pro`. |
| Professional training | `/pro` contains the three airline-interview packages and a technical disclosure. `/simulator` and `/training` redirect permanently to it. |
| Booking | `/book` offers the one-page storefront and optional guided wizard. Recreational packages use the three-step add-on flow; training and fear-of-flying packages suppress add-ons and use the two-step flow. |
| Customer account | Email/password and Google, Facebook, and Apple OAuth are presented through Supabase Auth. Guest checkout remains available. Confirmed-email members can claim paid guest bookings with an exact normalized-email match, then view upcoming/history bookings and paid Stripe receipt links. |
| Payments | The server creates Stripe Checkout sessions with `payment_method_types: ['card']`. Do not describe Apple Pay as an implemented application payment method; any wallet availability is a Stripe-dashboard/runtime matter. A signed webhook alone confirms card payments. |
| Confirmation | SendGrid sends HTML booking/voucher emails; when unconfigured it reports simulated local delivery. The boarding pass is browser-rendered and the “download” action is `window.print()`—there is no generated or emailed PDF boarding pass. |
| Reviews | Google Places can refresh a process-memory/local snapshot with a 24-hour cache/revalidation policy. Without a usable key or after a provider error, the API returns a labelled checked-in fallback. |

### Scheduling and checkout authority

The source uses a deterministic, 15-minute tiled interval engine with dynamic-programming gap checks. “Kantorovich” is a historical name, not a linear-programming implementation.

- Reserved blocks are 20→45, 45→60, 60→75, 90→105, 120→150, and 240→255 minutes.
- Operating windows are Sunday–Thursday 10:00–23:00, Friday 09:00–16:00, and Saturday 19:00–24:00. The 45-minute daytime promo is unavailable from 18:00 and throughout Saturday.
- The calendar is locale-aware, defaults to month view, and keeps an ISO date internally. English/Hebrew/Arabic use Sunday-first weeks; Russian/French use Monday-first weeks.
- Client totals are advisory only. Checkout resolves package and add-on IDs from server registries, checks the slot again, recomputes duration/end time/price, and rejects add-ons that do not fit.
- Production persistence has a PostgreSQL exclusion constraint for overlapping reserved ranges; checkout maps a concurrent constraint conflict to a safe 409.
- The separate admin capacity optimiser is read-only, bounded branch-and-bound/exhaustive search for small draft batches. It does not create, move, or cancel bookings.

### Security and operational controls

- Production storage fails closed when Supabase is unavailable unless `ALLOW_IN_MEMORY_STORE=true` is explicitly set. That flag must remain demo/test-only despite the code technically honoring it in production.
- Card checkout fails closed unless the Stripe secret and webhook secret are usable. A full-value voucher booking does not need Stripe because it is already paid tender.
- Supabase service-role access is server-only. Browser member access uses the public client plus bearer-token validation at server routes.
- Admin pages and admin APIs use interim HTTP Basic authentication with constant-time comparison and same-origin checks for mutations. The source correctly labels this as a migration target for role-based Supabase admin authorization and MFA.
- The narrow public boarding-pass lookup omits email and phone, but it does expose the pilot name to anyone with the high-entropy booking reference. Treat the reference as a capability URL and avoid sharing it.

## Material findings

These are source findings, not speculative defects.

| Priority | Finding | Evidence and impact |
| --- | --- | --- |
| High — documentation | Earlier Genesis/architecture drafts said `/about` redirects to `/pro`, listed Apple Pay and PDF boarding passes, and described a 14-day default calendar. All conflict with the current source. | Corrected/replaced documentation now points to this review and [`WEBSITE_GENESIS.md`](WEBSITE_GENESIS.md). |
| Medium — catalogue consistency | `/api/packages` reads the production `packages` table, while checkout resolves packages from static `SIMULATOR_PACKAGES`. | A DB catalogue edit can be visible in the API yet rejected or charged differently at checkout. Use one server-side catalogue authority before operational catalogue editing. |
| Medium — customer i18n completeness | The translation core has five-language parity and strong tests, but several customer-visible hard-coded English fragments remain in the navbar, success/boarding-pass page, reviews UI, and some legal/admin surfaces. | Hebrew/Arabic layout is supported, but “zero English fallback” is not true across the entire UI. Prioritize the success page and navbar because they sit on the main customer path. |
| Medium — design-system drift | A few customer components retain old sky hex values or non-brand blue/cyan utilities, notably success confetti and review-avatar gradients. | This conflicts with the project’s brand-token rule even though it is not a checkout correctness issue. Consolidate decorative colors under the documented Sim Dream token system. |
| Medium — production persistence drift | `flight_logs` exists in SQL and seed data, but the current production repository implementation of `getFlightLogs`/`addFlightLog` remains in-memory only and no customer dashboard path renders it. | Do not present a durable flight-log feature as active production behavior without completing its persistence/retrieval flow. |
| Medium — external configuration | OAuth buttons, real payment collection, email dispatch, live reviews, and durable persistence all require provider/dashboard configuration that cannot be proven from local code. | Production readiness needs an environment/provider verification run, not only a build/test result. |
| Low — type-system exceptions | The implementation is generally typed but retains limited `any` escapes (Stripe API-version typing and a few catch handlers). | The advertised “zero `any`” standard is aspirational, not presently literal. |
| Accepted/deferred security | Voucher verification and failed admin Basic-auth attempts have no rate limits; CSP uses `unsafe-inline`. | These are documented as `SEC-3`, `SEC-4`, and `SEC-8` in [`tests/KNOWN_DEFECTS.md`](tests/KNOWN_DEFECTS.md). |

## Documentation corrections made in this review

1. [`GENESIS_PROMPT.md`](GENESIS_PROMPT.md) is retained only as a historical draft and explicitly defers to the reviewed documents.
2. [`WEBSITE_GENESIS.md`](WEBSITE_GENESIS.md) is the current one-shot recreation prompt, bounded by this source review.
3. [`MASTER_GENESIS_PROMPT.md`](MASTER_GENESIS_PROMPT.md) is a working companion, not an independent source of truth.
4. [`ARCHITECTURE.md`](ARCHITECTURE.md) now describes the actual `/about` route, card Checkout integration, and non-realtime admin update model.

## Required live verification before launch

- Confirm Supabase database migrations 001–004 have been applied and `ALLOW_IN_MEMORY_STORE` is absent in production.
- Confirm Google, Facebook, and Apple are enabled in the Supabase Auth provider dashboard and their callback URLs match the deployed origin.
- Confirm `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the three documented checkout events in Stripe.
- Confirm SendGrid sender verification and production delivery behavior.
- Exercise a test booking, signed webhook, member claim, history read, and receipt retrieval in a non-production environment.
- Add rate limiting before exposing voucher verification or Basic-auth administration publicly.

## Test posture

The repository has broad Vitest and Playwright coverage: domain scheduling, checkout/webhooks, member ownership, i18n/routing, usability, accessibility, resilience, visual regression, load smoke, and Lighthouse. The documented test backlog still includes live-Postgres migration/constraint coverage, several signed-in/admin browser journeys, success-page polling, email rendering, storefront/wizard parity, `/pro` content, SEO, broad CSP coverage, and bundle budget coverage.

Run `npm run test:quick` for a fast source health check and `npm run test:all` for the full local quality framework. Neither command proves external provider configuration.
