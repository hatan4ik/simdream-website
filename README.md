# Sim Dream LTD - Boeing 737 MAX Flight Simulation Center

[![Framework](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Styling](https://img.shields.io/badge/Tailwind-CSS-38BDF8)](https://tailwindcss.com/)
[![Payments](https://img.shields.io/badge/Stripe-Payments-635BFF)](https://stripe.com/)

Production-grade website, multi-step booking engine, Amazon-style flight storefront, gift-voucher terminal, corporate CRM workshop portal, member purchase dashboard, and flight-dispatch command system for **Sim Dream LTD** (`simdream.co.il`), located at **Gershon Shatz St 36, Tel Aviv-Yafo, Israel** (Yehudit Light Rail / HaShalom Train Station • `055-507-1307` • `desk@simdream.co.il`).

> 📐 **System Architecture & Visual Diagrams**: See [`ARCHITECTURE.md`](ARCHITECTURE.md) for full Mermaid sequence, workflow, topology, and interval-scheduling engine diagrams.

---

## Key Features

1. **"Why Fly with Sim Dream" Customer Value Pillars & Brand Experience**:
   - Emotional, customer-centric landing page answering "WHY":
     - **Full Captain's Command**: 70 tons of Boeing 737 LEAP-1B airliner power, authentic control loading, and cockpit sensory immersion (not an arcade game or ride).
     - **Active Airline Captain Mentorship**: 1-on-1 guidance with zero flight experience needed.
     - **Unrestricted Global Freedom**: 24,000+ airports (Kai Tak, Paro, Innsbruck, Ben Gurion) with custom extreme weather.
     - **Transformative Milestones & Fear of Flying**: Bucket-list gifts and therapeutic flight anxiety coaching.
   - Real-time **Ben Gurion Airport (LLBG)** METAR weather ticker and simulator operational status ribbon.
   - Dedicated **Professional Training Portal** ([`/pro`](app/(public)/pro/page.tsx), with automatic redirects from `/about`, `/simulator`, and `/training`) tailored for airline assessment preparation (El Al, Arkia, Israir, Wizz Air, Ryanair), raw data hand flying, single-engine ILS, and QRH abnormal checklists. Features the 3 official commercial tiers from `simdream.co.il`: **Airline Interview Prep 60 PRO** (₪890), **Airline Interview Prep 90 PRO** (₪1,250), and **Airline Interview Prep 120 PRO** (₪1,590), plus direct booking and links to official service pages. Technical hardware specifications (CPflight avionics, Sismo CDU/FMC, motorized autothrottles) are cleanly presented in a collapsible specs disclosure.
   - **Specialized Noise-Free Booking Engine**: When booking a Professional Training or Fear of Flying session, the booking flow automatically suppresses all recreational add-on clutter, combos, and tourist options. The candidate is presented with a serene, noise-free 2-step booking flow (`Date & Operational Slot` &rarr; `Pilot Manifest & Checkout`).

2. **Dual UX/UI Interface Engine (Cockpit Night & SimDream Brand Daylight)**:
   - **Official Sim Dream identity**: both interfaces use the **`simdream.co.il`** logo (orange airplane `#FF5500` and cerulean "SIM DREAM" wordmark `#2096C7`) with a translated tagline. The colours are design tokens in `app/globals.css`: Tailwind `sky-*` is the Sim Dream cerulean scale and `orange-*` the Sim Dream orange scale (rules in AGENTS.md §1, Brand Identity).
   - **🌙 Cockpit Night (`data-ui="cockpit"`, default)**: Titanium and dark slate aesthetic with Sim Dream cerulean HUD scanlines, orange brand highlights, autothrottle glowing green, and dark glassmorphic cockpit instrumentation.
   - **☀️ SimDream Brand Daylight (`data-ui="brand"`)**: High-contrast, clean daylight airline portal in the Sim Dream colours: cerulean (`#2096C7`) and orange (`#FF5500`) on crisp cloud white (`#ffffff`), with WCAG AA-safe darker shades for small text.
   - **Tactile UI Switcher**: Prominent button in the desktop header, mobile top-bar, mobile drawer, and footer to instantly toggle interfaces.
   - **Zero-Flicker Persistence**: Preserves theme selection via `localStorage` with an inline anti-flicker `<head>` bootstrap script.

3. **5-Language Internationalization & Bidirectional UI (i18n)**:
   - Full native localization across 5 languages: **Hebrew (`he`)**, **English (`en`)**, **Russian (`ru`)**, **French (`fr`)**, and **Arabic (`ar`)**.
   - Dynamic directionality with automatic `dir="rtl"` layout flipping for Hebrew and Arabic.
   - Telemetry isolation (`dir="ltr"`) for raw aviation data: live METAR strings, radio frequencies, transponder squawks, booking identifiers, and flight slot ranges.
   - Librarian-grade terminology audited against official airline, ICAO, and Boeing flight deck standards.

4. **Rules-Based Tiled Interval Calendar & Booking Engine (`/book`)**:
   - The legacy `kantorovich-engine.ts` module is a deterministic interval scheduler, not a linear-programming solver. It uses fixed reservation buffers, overlap checks, and dynamic-programming gap tiling. Its full specification is documented in [`KANTOROVICH_SCHEDULER_SPEC.md`](KANTOROVICH_SCHEDULER_SPEC.md).
   - **Zero-Duplication Calendar-First 3-Step Flow**:
     - Landing on `/book` (from the Navbar, Homepage, or `/experiences?package=...`) opens the **Smart Calendar immediately as Step 1** (`Step 1: Date, Duration & Departure Slot` &rarr; `Step 2: Cockpit Upgrades & Mission Add-Ons` &rarr; `Step 3: Pilot Manifest & Payment`).
   - **Core Reservation Mapping (Under the Hood)**: capacity is reserved through the server's canonical duration map (`20m -> 45m`, `45m -> 60m`, `60m -> 75m`, `90m -> 105m`, `120m -> 150m`); integrations must not infer the buffer themselves.
   - **Tariff Matrix & Peak-Time Rules**:
     - `20 min Basic Entry` (`45m` block): `₪250` (Single Airport Takeoff & Landing exercise — modular entry base customizable in Step 2).
     - `45 min Promo` (`60m` block): `₪490` (`₪8.17/min` — strictly Daytime `< 18:00`, automatically hidden in Evening Prime-Time & Saturdays).
     - `60 min Standard` (`75m` block): `₪690` (`₪9.20/min` — base anchor slot).
     - `90 min Long` (`105m` block): `₪850` Daytime (`₪8.10/min`) / `₪950` Evening Prime-Time (`>= 18:00` & Saturdays, `₪9.05/min`).
     - `120 min Pro` (`150m` double block): `₪1,590`.
   - **Step 2 Modular Flight Mission Add-Ons (`FLIGHT_ADDONS`)**:
     - **Boeing 737 Cold & Dark Cockpit Startup (`+20 min` • `+₪200`)**: Full flight deck power-up from dark state (battery, ground power, APU start, overhead bleed/fuel configuration, IRS alignment, and dual LEAP-1B engine start).
     - **X-Wind / Live METAR / IFR Instrument Conditions (`+15 min` • `+₪250`)**: Real-world live weather (`METAR`) flying under Instrument Flight Rules (`IFR`) in clouds/storms, rudder crab/de-crab crosswind landings, and precision `ILS` approaches.
     - **Extreme World Airports Trio (`+25 min` • `+₪450`)**: Captain-only visual mountain and terrain approaches at Paro Bhutan (`VQPR`), Hong Kong Kai Tak (`VHHX` 47° checkerboard turn), and Alpine Innsbruck (`LOWI`).
     - **7 Global 3-Airport Themed Route Bundles (`+40 min` • `+₪450` each)**:
       1. **Classical EU Hubs Trio**: London Heathrow (`EGLL`), Paris CDG (`LFPG`) & Amsterdam (`EHAM`).
       2. **Mediterranean Islands & Riviera Trio**: Corfu (`LGKR`), Skiathos (`LGSK`) & Nice Côte d'Azur (`LFMN`).
       3. **American Megacities Skyline Trio**: New York LaGuardia (`KLGA`), Washington Reagan (`KDCA`) & San Francisco (`KSFO`).
       4. **City-Center & Night Neon Trio**: London City (`EGLC` 5.5° steep approach), Tokyo Haneda (`RJTT`) & Las Vegas Strip (`KLAS`).
       5. **Alpine & Fjord Mountain Masters Trio**: Queenstown (`NZQN`), Geneva (`LSGG`) & Salzburg (`LOWS`).
       6. **Tropical Caribbean & Ocean Runways Trio**: St. Maarten Maho Beach (`TNCM`), Rio Santos Dumont (`SBRJ`) & Maldives (`VRMM`).
       7. **Aviation Legends & Iconic Hubs Trio**: Dubai (`OMDB`), Gibraltar Rock (`LXGB`) & Larnaca (`LCLK`).
   - **Availability-Driven Slot Selection (`store.getDurationAvailability`)**:
     - The slots API returns per-duration availability and daily-efficiency data for the selected date. The current package's slot list automatically selects the first available or smart-pairing recommendation when possible.
     - Every displayed choice remains server-validated at checkout; unavailable dates, changed inventory, or add-ons that no longer fit produce a clear in-context error rather than a stale reservation.
   - **Quiet UI & Mobile/iPhone Optimization (`KantorovichCalendarScheduler.tsx`)**:
     - **Zero Technical Clutter**: Capacity rules run silently in the backend; customer-facing date cells, duration pills, and slot buttons display clean, human-readable times, prices, and **`★ Best Match`** badges without internal jargon.
     - **iPhone & Modern Smartphone Ergonomics**: Horizontal touch-snap 14-day ribbon (`overflow-x-auto snap-x snap-mandatory`), 2-column generous mobile time-slot grid (`min-h-[64px]`), floating sticky bottom confirmation bar (`sticky bottom-3`), and `touch-action: manipulation` (zero 300ms tap delay).
     - **100% Browser-Blocker Immunity**: Built with semantic first-party `<button type="button">` elements and inline React state—zero iframes, popups, or ad-triggering class names.
   - **35-Day Pre-Populated QA Seed Dataset (`lib/db/seed-data.ts`)**:
     - `generateMonthAheadBookings()` pre-populates **105+ realistic flight bookings across the next 35 days** covering all 5 packages and rotating Sunday–Thursday, Friday (`09:00–16:00` with `15:15` 30m closer), and Saturday (`19:00–24:00` Prime-Time) schedules.

5. **Corporate CRM Leadership Workshops (`/workshops`)**:
   - Executive leadership & team offsite modules based on commercial aviation **Crew Resource Management (CRM)** and **Threat & Error Management (TEM)**.
   - Dynamic inquiry submission pipeline directly feeding the Admin Dispatch board.

6. **Gift Voucher System (`/vouchers`)**:
   - Customizable digital boarding pass gift certificates with live visual preview.
   - Cryptographically generated, high-entropy redeemable flight codes valid for 12 months with online and counter redemption.

7. **Member Flight Deck (`/dashboard`)**:
   - Displays future sessions, previous sessions, saved purchase records, payment state, and boarding-pass links for the authenticated member.
   - Historical guest bookings are attached only after sign-in with the exact same confirmed email and only after payment; an anonymous email cannot retrieve purchase history.
   - Paid Stripe bookings expose a protected Stripe payment-receipt link. Formal tax invoices remain an external accounting integration.

8. **Admin Dispatch Command Center & Tiled Capacity Monitor (`/admin`)**:
   - **Tiled Daily Efficiency Bar**: Displays live occupied vs. total capacity minutes (`Занято: X / 780 мин`), wasted tail minutes (`Потери («хвосты»): 0 мин`), booked revenue, and a rules-based capacity projection.
   - **Red Gap Collision Alert & Interactive Auto-Snap**: Detects orphan gaps if an admin manually shifts a slot to an unaligned time (e.g. `19:00`) and provides one-click **Auto-Snap** buttons (`18:00` or `19:15`) to restore Zero-Waste alignment.
   - **Exact dry-run draft allocator**: `POST /api/admin/schedule-optimization` evaluates up to eight flexible, 15-minute-aligned draft requests against existing immutable bookings. It maximizes declared value without increasing orphan capacity and never writes a booking. This is the safe integration boundary for a later OR-Tools CP-SAT service.
   - Full CRUD bookings manager, Corporate CRM leads pipeline, and counter voucher redemption terminal.

9. **Amazon.com Shop-Style Flight Storefront GUI (`/book`)**:
   - **Dual Storefront Mode**: Toggle seamlessly between the **Amazon-Style Single-Page Catalog** ([`AmazonFlightStorefront.tsx`](components/scheduler/AmazonFlightStorefront.tsx)) and the **Guided 3-Step Wizard** ([`KantorovichCalendarScheduler.tsx`](components/scheduler/KantorovichCalendarScheduler.tsx)).
   - **Sticky Flight Buy Box**: Right-hand column (desktop) / bottom sheet (mobile) tracking real-time basket calculations, capacity runway bar (`maxAvailableMinutes`), and 1-click Express Pilot Manifest checkout.
   - **Curated 1-Click Package Combos ("Frequently Flown Together")**: Instant bundling of popular add-ons (e.g. *Cold & Dark Startup + Classical EU Trio*, *Crosswind/IFR Storm + Paro/Kai Tak Extreme Approaches*, *Mediterranean Islands + 4K Multi-Cam Video*) with instant savings badges (`Save ₪100` / `Save ₪150`).
   - **Package Formula Badges**: Crystal-clear descriptions on every card eliminating customer uncertainty (e.g., `⭐ Takeoff/Landing + 1 World Trio (3 Airports Included)`, `⚡ Takeoff/Landing + 2 World Trios + Emergencies (1–2 Pilots)`).
   - **Accessible Mission Blueprint Modal**: Semantic `<dialog>` (`role="dialog"`, `aria-modal="true"`) breaking down the exact minute-by-minute flight profile, free observer jumpseat policy, and included world airport options.
   - **Fail-Closed Payment Feedback**: If card payments are not configured, the checkout API returns a safe error and the storefront displays it immediately beside the checkout button. It does not create a pending card reservation or redirect to an unconfigured payment provider.

10. **Google Reviews Snapshot & 24h Cache (`/api/reviews`)**:
    - When `GOOGLE_PLACES_API_KEY` is configured, the route refreshes rating, count, and available review excerpts from the listed Google Maps Place ID every 24 hours. Without the key it clearly identifies the checked-in local fallback snapshot.
    - **Descend-by-Length Sorting Algorithm**: Automatically floats the longest, most in-depth pilot and customer reviews to the top of the rotator for maximum credibility.
    - **24-Hour Server Cache (ISR)**: Cached via [`lib/reviews/google-reviews-cache.ts`](lib/reviews/google-reviews-cache.ts) and `/api/reviews` (`revalidate = 86400`) to ensure fast page loads with fallback resiliency.
    - **Direct Modal Link**: Deep-links straight to the Google Maps active reviews drawer (`https://search.google.com/local/reviews?placeid=...`).

11. **Voucher Management & 1-Click Session Cache Reapply**:
    - **Instant Removal & Price Reset**: Customers can remove applied gift vouchers or promo codes at any time to verify the original package price without page reloads.
    - **Session Storage Cache (`sessionStorage`)**: Cached as `simdream_cached_voucher`, providing an intuitive *«Saved in cache: [CODE] — 1-Click Reapply ↗»* chip to reapply discounts with zero typing.

12. **B2B / B2C Separation, Facility Hub & Regulatory Compliance**:
    - **Strict B2B / B2C Isolation**: Relocated "Corporate CRM Leadership Workshop" out of the consumer flight catalog, establishing an executive-tier B2B portal ([`/workshops`](app/(public)/workshops/page.tsx)) for corporate offsites.
    - **Operations & Facility Hub ([`/contact`](app/(public)/contact/page.tsx))**: Live transit directions (Yehudit Light Rail Red Line, HaShalom Train Station, paid parking), operating hours (Sun–Thu 10:00–23:00, Fri 09:00–16:00, Sat 19:00–24:00), minimum pilot age 10+, and verified contact lines (`055-507-1307`, `desk@simdream.co.il`).
    - **Legal Compliance Pages**: Integrated flight simulator safety regulations ([`/rules`](app/(public)/rules/page.tsx)) and privacy policies ([`/privacy-policy`](app/(public)/privacy-policy/page.tsx)).


---

## Runtime and security model

- **Production is fail-closed.** Supabase service credentials, `NEXT_PUBLIC_APP_URL`, Stripe webhook signing, and admin credentials must be configured before the related production features operate. The app never falls back to in-memory orders in production.
- **Local simulation is development-only.** It is intended for UX development and is never a production persistence substitute.
- **Server-authoritative checkout.** The browser submits a package, slot, add-on IDs, and pilot details; the server calculates duration and price, creates Stripe Checkout URLs, and confirms card payment only from a verified Stripe webhook.
- **Payment configuration is mandatory for cards.** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` must both be usable. Missing or invalid configuration returns a clear HTTP 503 at checkout; this is intentional, rather than a silent redirect failure.
- **Least-privilege database access.** Browser roles can read active package catalog data only. Bookings, voucher balances, workshop inquiries, and flight logs are accessed through server routes using the service role.
- **Verified member ownership.** A booking is linked to a member only when the checkout email exactly matches that member's confirmed identity-provider email. Guest checkout remains available without an account; a verified member may later claim matching **paid** guest bookings. Protected history and Stripe receipts are never returned by an anonymous email lookup.

---

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

If port 3000 is already in use, identify the listener before stopping it:
```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```
Use a different port for an additional local server:
```bash
npm run dev -- --port 3001
```

---

## Local demo accounts

Local demo controls appear only when Supabase is not configured and the app is not in production. They are not an authentication mechanism. Production login uses Supabase password authentication, and `/admin` additionally requires the configured server-side HTTP Basic credentials.

To run the production build on your machine without Supabase, use `npm run start:local` (after `npm run build`). It sets `ALLOW_IN_MEMORY_STORE=true`, so the calendar and catalog use the seeded demo data. A plain `npm run start` is production mode and fails closed without a database: availability and the catalog answer 503 rather than showing data that isn't real. Never set `ALLOW_IN_MEMORY_STORE` in a real deployment.

---

## Supabase Database Setup (Production)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. For a new project, apply [`lib/db/schema.sql`](lib/db/schema.sql). For an existing project, take a reviewed backup and apply [`lib/db/migrations/001_production_hardening.sql`](lib/db/migrations/001_production_hardening.sql), followed by [`lib/db/migrations/002_member_accounts.sql`](lib/db/migrations/002_member_accounts.sql). The first intentionally rejects unresolved overlapping bookings; the second adds member ownership and the `auth.users` profile trigger.
4. In **Project Settings &rarr; API**, copy your project URL, anon key, and service role key into `.env.local`.
5. To elevate an account to Administrator:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@simdream.co.il';
   ```

---

## Member authentication setup (Google, Facebook, Apple, and email)

The application includes the login UI, secure callback pages, password recovery, guest-to-member purchase linking, and protected booking/receipt APIs. Provider credentials cannot be created safely from source code, so complete these one-time dashboard steps before enabling the buttons in production:

1. In **Supabase Auth &rarr; URL Configuration**, set the production Site URL and explicitly allow each deployed callback URL, including:
   - `https://your-domain/auth/callback`
   - `https://your-domain/auth/reset-password`
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/reset-password`
   Add preview-domain variants only when those deployments need login.
2. In **Supabase Auth &rarr; Providers**, enable Email and choose the desired confirmation policy. For production delivery, configure a transactional SMTP provider and keep email confirmation enabled.
3. Configure Google OAuth in Google Cloud, Facebook Login in Meta for Developers, and Sign in with Apple in the Apple Developer portal. For each provider, register the Supabase callback URL shown by that provider's Supabase settings (normally `https://<project-ref>.supabase.co/auth/v1/callback`), then paste the provider's client credentials into Supabase. Keep every client secret out of `.env*` files and source control.
4. In Supabase, enable Google, Facebook, and Apple only after their credentials and scopes have been verified. A provider that does not return a verified email cannot claim historical guest purchases.
5. Run a real end-to-end test for each login method: create/sign in, confirm the email when applicable, make a guest booking, sign in with the exact same confirmed address, then verify the booking appears in `/dashboard` and the Stripe receipt is restricted to that member.

The dashboard exposes Stripe's payment receipt for paid card purchases. It does not create a statutory/tax invoice; connect the business's invoicing system if a formal invoice is required.

---

## Stripe Webhook Setup (Production)

To listen to local Stripe checkout events during development:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Add the outputted `whsec_...` secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`.

Set `STRIPE_SECRET_KEY` as well. Card checkout remains intentionally unavailable until both values are valid; the storefront will show the server's message directly above the checkout button. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not required by the current hosted Stripe Checkout redirect flow.

For production, register `https://your-domain/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.expired`, and `checkout.session.async_payment_failed`. A booking or voucher is not marked paid from the redirect page; only this signature-verified webhook activates it, and expired sessions release their pending inventory.

---

## Build & Quality Verification

To verify TypeScript types, generate the optimized production build, and preview it locally:
```bash
# Verify TypeScript strict type-checking
npm run typecheck

# Verify scheduling and checkout-domain contracts
npm test

# Generate optimized static & serverless production build
npm run build

# Preview the production build locally on http://localhost:3000 with demo data
npm run start:local   # plain `npm run start` needs Supabase (fails closed without it)

# Verify dependency advisories
npm audit --audit-level=high

# Full automated quality framework: unit/integration/security/reliability, e2e on 5 browsers,
# accessibility, usability, visual, load and Lighthouse (see TESTING.md)
npm run test:all
```

---

## Production Deployment (Vercel)

1. Push this repository to GitHub or GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. Under **Environment Variables**, add the production keys from `.env.example`.
4. Deploy! Next.js will build optimized static pages and serverless API endpoints.
