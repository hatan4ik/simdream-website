# Sim Dream LTD - Boeing 737 MAX Flight Simulation Center

[![Framework](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Styling](https://img.shields.io/badge/Tailwind-CSS-38BDF8)](https://tailwindcss.com/)
[![Payments](https://img.shields.io/badge/Stripe-Payments-635BFF)](https://stripe.com/)

Production-grade website, multi-step booking engine, Amazon-style 1-page flight storefront, gift voucher terminal, corporate CRM leadership workshop portal, pilot logbook dashboard, and flight dispatch command system for **Sim Dream LTD** (`simdream.co.il`), located at **Gershon Shatz St 36, Tel Aviv-Yafo, Israel** (Yehudit Light Rail / HaShalom Train Station • `055-507-1307` • `desk@simdream.co.il`).

---

## Key Features

1. **"Why Fly with Sim Dream" Customer Value Pillars & Brand Experience**:
   - Emotional, customer-centric landing page answering "WHY":
     - **Full Captain's Command**: 70 tons of Boeing 737 LEAP-1B airliner power, authentic control loading, and cockpit sensory immersion (not an arcade game or ride).
     - **Active Airline Captain Mentorship**: 1-on-1 guidance with zero flight experience needed.
     - **Unrestricted Global Freedom**: 24,000+ airports (Kai Tak, Paro, Innsbruck, Ben Gurion) with custom extreme weather.
     - **Transformative Milestones & Fear of Flying**: Bucket-list gifts and therapeutic flight anxiety coaching.
   - Real-time **Ben Gurion Airport (LLBG)** METAR weather ticker and simulator operational status ribbon.
   - Dedicated [`/simulator`](app/(public)/simulator/page.tsx) **PRO Flight Sessions Portal** tailored for airline assessment preparation (El Al, Arkia, Israir, Wizz Air, Ryanair), raw data hand flying, and QRH emergency abnormal checklists. Technical hardware specifications (CPflight avionics, Sismo CDU/FMC, motorized autothrottles) have been cleanly relocated to a collapsible specs disclosure on [`/about`](app/(public)/about/page.tsx) to maximize high-conversion commercial space.

2. **Dual UX/UI Interface Engine (Cockpit Night & SimDream Brand Daylight)**:
   - **🌙 Cockpit Night (`data-ui="cockpit"`)**: Titanium and dark slate aesthetic with instrument cyan HUD scanlines, autothrottle glowing green, and dark glassmorphic cockpit instrumentation.
   - **☀️ SimDream Brand Daylight (`data-ui="brand"`)**: High-contrast, clean daylight airline portal styled directly in the authentic colors of the **`simdream.co.il`** logo: Royal Aviation Blue (`#0284c7`), horizon sky, and crisp cloud white (`#ffffff`).
   - **Tactile UI Switcher**: Prominent button in the desktop header, mobile top-bar, mobile drawer, and footer to instantly toggle interfaces.
   - **Zero-Flicker Persistence**: Preserves theme selection via `localStorage` with an inline anti-flicker `<head>` bootstrap script.

3. **5-Language Internationalization & Bidirectional UI (i18n)**:
   - Full native localization across 5 languages: **Hebrew (`he`)**, **English (`en`)**, **Russian (`ru`)**, **French (`fr`)**, and **Arabic (`ar`)**.
   - Dynamic directionality with automatic `dir="rtl"` layout flipping for Hebrew and Arabic.
   - Telemetry isolation (`dir="ltr"`) for raw aviation data: live METAR strings, radio frequencies, transponder squawks, booking identifiers, and flight slot ranges.
   - Librarian-grade terminology audited against official airline, ICAO, and Boeing flight deck standards.

4. **Kantorovich Linear Programming Smart Calendar & Booking Engine (`/book`)**:
   - Full mathematical specification and engineering prompts documented in [`KANTOROVICH_SCHEDULER_SPEC.md`](KANTOROVICH_SCHEDULER_SPEC.md) and powered by [`lib/scheduler/kantorovich-engine.ts`](lib/scheduler/kantorovich-engine.ts).
   - **Zero-Duplication Calendar-First 3-Step Flow**:
     - Landing on `/book` (from the Navbar, Homepage, or `/experiences?package=...`) opens the **Smart Calendar immediately as Step 1** (`Step 1: Date, Duration & Departure Slot` &rarr; `Step 2: Cockpit Upgrades & Mission Add-Ons` &rarr; `Step 3: Pilot Manifest & Payment`).
   - **Core Reservation Law (Under the Hood)**: $T_{\text{reserved}} = T_{\text{play}} + 15\text{ min}$ mandatory cockpit turnaround & briefing buffer (`20m -> 45m`, `45m -> 60m`, `60m -> 75m`, `90m -> 105m`, `120m -> 150m`).
   - **Tariff Matrix & Shadow Pricing**:
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
   - **Dynamic Time-Fit Duration Filtering (`store.getDurationAvailability`)**:
     - Section `2. Available Flight Durations` evaluates the selected date's remaining time windows and renders **only** the durations that have at least one valid open slot on that date (`availableCount > 0`).
     - If a user switches to a date (e.g. Saturday) where their previously active duration (`45m` or `120m`) cannot fit, the scheduler automatically switches to an available duration on that day (`60m` or `90m`) so the customer never hits an empty dead-end state.
   - **FAANG Whisper-Quiet UI & Mobile/iPhone Optimization (`KantorovichCalendarScheduler.tsx`)**:
     - **Zero Technical Clutter**: All Kantorovich LP math runs silently in the backend; customer-facing date cells, duration pills, and slot buttons display clean, human-readable times, prices, and **`★ Best Match`** badges without internal jargon.
     - **iPhone & Modern Smartphone Ergonomics**: Horizontal touch-snap 14-day ribbon (`overflow-x-auto snap-x snap-mandatory`), 2-column generous mobile time-slot grid (`min-h-[64px]`), floating sticky bottom confirmation bar (`sticky bottom-3`), and `touch-action: manipulation` (zero 300ms tap delay).
     - **100% Browser-Blocker Immunity**: Built with semantic first-party `<button type="button">` elements and inline React state—zero iframes, popups, or ad-triggering class names.
   - **35-Day Pre-Populated QA Seed Dataset (`lib/db/seed-data.ts`)**:
     - `generateMonthAheadBookings()` pre-populates **105+ realistic flight bookings across the next 35 days** covering all 5 packages and rotating Sunday–Thursday, Friday (`09:00–16:00` with `15:15` 30m closer), and Saturday (`19:00–24:00` Prime-Time) schedules.

5. **Corporate CRM Leadership Workshops (`/workshops`)**:
   - Executive leadership & team offsite modules based on commercial aviation **Crew Resource Management (CRM)** and **Threat & Error Management (TEM)**.
   - Dynamic inquiry submission pipeline directly feeding the Admin Dispatch board.

6. **Gift Voucher System (`/vouchers`)**:
   - Customizable digital boarding pass gift certificates with live visual preview.
   - Unique redeemable flight codes (`SD-VOUCH-XXXX`) valid for 12 months with online and counter redemption.

7. **Pilot & User Dashboard (`/dashboard`)**:
   - Dual-control flight hours logbook odometer (Hours, Takeoffs, Landings, CAT III ILS approaches).
   - Active reservations list with boarding pass download.
   - Verified mission history with instructor captain signatures.

8. **Admin Dispatch Command Center & Kantorovich Efficiency Monitor (`/admin`)**:
   - **Kantorovich Daily Efficiency Bar**: Displays live occupied vs. total fund minutes (`Занято: X / 780 мин`), wasted tail minutes (`Потери («хвосты»): 0 мин`), booked revenue, and LP optimal revenue projection.
   - **Red Gap Collision Alert & Interactive Auto-Snap**: Detects orphan gaps if an admin manually shifts a slot to an unaligned time (e.g. `19:00`) and provides one-click **Auto-Snap** buttons (`18:00` or `19:15`) to restore Zero-Waste alignment.
   - Full CRUD bookings manager, Corporate CRM leads pipeline, and counter voucher redemption terminal.

9. **Amazon.com Shop-Style Flight Storefront GUI (`/book`)**:
   - **Dual Storefront Mode**: Toggle seamlessly between the **Amazon-Style Single-Page Catalog** ([`AmazonFlightStorefront.tsx`](components/scheduler/AmazonFlightStorefront.tsx)) and the **Guided 3-Step Wizard** ([`KantorovichCalendarScheduler.tsx`](components/scheduler/KantorovichCalendarScheduler.tsx)).
   - **Sticky Flight Buy Box**: Right-hand column (desktop) / bottom sheet (mobile) tracking real-time basket calculations, capacity runway bar (`maxAvailableMinutes`), and 1-click Express Pilot Manifest checkout.
   - **Curated 1-Click Package Combos ("Frequently Flown Together")**: Instant bundling of popular add-ons (e.g. *Cold & Dark Startup + Classical EU Trio*, *Crosswind/IFR Storm + Paro/Kai Tak Extreme Approaches*, *Mediterranean Islands + 4K Multi-Cam Video*) with instant savings badges (`Save ₪100` / `Save ₪150`).
   - **Package Formula Badges**: Crystal-clear descriptions on every card eliminating customer uncertainty (e.g., `⭐ Takeoff/Landing + 1 World Trio (3 Airports Included)`, `⚡ Takeoff/Landing + 2 World Trios + Emergencies (1–2 Pilots)`).
   - **Accessible Mission Blueprint Modal**: Semantic `<dialog>` (`role="dialog"`, `aria-modal="true"`) breaking down the exact minute-by-minute flight profile, free observer jumpseat policy, and included world airport options.

10. **Verified Google Reviews 5.0★ Engine & 24h Daily Cache (`/api/reviews`)**:
    - Synchronized with verified Google Maps profile ([Place ID `ChIJAyYTsyJLHRURRrWPGuNnmn4`](https://maps.app.goo.gl/DDvRhUhyPgnR8Pmc9)), featuring a **perfect 5.0 ★ rating with 390+ authentic reviews**.
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

## Dual-Mode Architecture

The application runs in **automatic dual-mode**:
- **Production Mode**: Connects directly to Supabase PostgreSQL, Stripe API, and SendGrid API when environment variables are supplied.
- **Local Simulation Mode**: If keys are omitted in `.env.local`, the system automatically falls back to an in-memory/browser-persistent store pre-seeded with realistic Boeing 737 MAX flight sessions, active vouchers, and test accounts. You can run and test all user and admin flows immediately!

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

---

## Test Accounts & Demo Roles

You can switch roles instantly in the navigation bar dropdown, or log in with:
- **Pilot Account**: `pilot@simdream.co.il` (Password: any) &rarr; Opens Pilot Dashboard (`/dashboard`)
- **Admin Dispatcher**: `admin@simdream.co.il` (Password: any) &rarr; Opens Admin Dispatch (`/admin`)

Sample Gift Voucher codes for testing checkout discount:
- `SD-VOUCH-737X` (Balance: ₪400)
- `SIMDREAM-MAX8` (Balance: ₪890)

---

## Supabase Database Setup (Production)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and execute the contents of [`lib/db/schema.sql`](file:///Users/nathanels/simdream-ai-website/lib/db/schema.sql).
4. In **Project Settings &rarr; API**, copy your project URL, anon key, and service role key into `.env.local`.
5. To elevate an account to Administrator:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@simdream.co.il';
   ```

---

## Stripe Webhook Setup (Production)

To listen to local Stripe checkout events during development:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Add the outputted `whsec_...` secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`.

---

## Build & Quality Verification

To verify TypeScript types, generate the optimized production build, and preview it locally:
```bash
# Verify TypeScript strict type-checking
npx tsc --noEmit

# Generate optimized static & serverless production build
npm run build

# Preview the production build locally on http://localhost:3000
npm run preview   # or: npm run start
```

---

## Production Deployment (Vercel)

1. Push this repository to GitHub or GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. Under **Environment Variables**, add the production keys from `.env.example`.
4. Deploy! Next.js will build optimized static pages and serverless API endpoints.


