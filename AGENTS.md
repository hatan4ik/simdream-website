<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# SimDream Architecture, Design & Code Instructions

Comprehensive source of truth and professional prompt instructions for all engineering, design, scheduling, routing, multilingual (i18n), and booking systems implemented for **Sim Dream LTD** (`simdream.co.il`), located at **Gershon Shatz St 36, Tel Aviv-Yafo, Israel**.

> 📐 **Visual Architecture Diagrams**: Visual system topology, adaptive booking workflows, scheduler engine pipelines, and payment sequence diagrams are maintained in [`ARCHITECTURE.md`](ARCHITECTURE.md).
> 🎛️ **Dashboard Reproduction Specification**: The complete master AI prompt and architectural blueprint for reproducing the Member Flight Deck (`/dashboard`) and Admin Dispatch Command Center (`/admin`) is documented in [`DASHBOARD_REPRODUCTION_SPEC.md`](DASHBOARD_REPRODUCTION_SPEC.md).
> 🧬 **Canonical Genesis & Reverse-Engineering Blueprint**: [`GENESIS.md`](GENESIS.md) is the only current system blueprint and one-shot prompt. Run `npm run docs:verify` after relevant source changes; archived drafts under [`docs/archive/`](docs/archive/README.md) are never authoritative.

---

## 1. Core Brand Architecture & Customer Value Pillars

Any customer-facing copy, landing page, or layout must reinforce the **5 Customer Value Pillars**:
1. **Full Captain's Command**: 70 tons of Boeing 737 LEAP-1B airliner power with authentic motorized control loading and sensory cockpit immersion — not an arcade game, amusement ride, or plastic toy.
2. **Active Airline Captain Mentorship**: 1-on-1 personal coaching with real commercial airline pilots; zero flight experience required for consumers.
3. **Unrestricted Global Freedom**: 24,000+ real-world airports (Ben Gurion LLBG, Hong Kong Kai Tak VHHX, Paro VQPR, Innsbruck LOWI) with live or custom extreme weather.
4. **Transformative Milestones & Fear of Flying**: Bucket-list birthday/anniversary gifts, corporate CRM leadership offsites, and therapeutic flight anxiety coaching.
5. **Authentic Aviation Integrity**: Strict fidelity to Boeing flight deck documentation, ICAO terminology, and official airline operating procedures.

### Brand Identity: Logo & Colour Tokens (mandatory)

The visual identity is the official **simdream.co.il** logo: an **orange airplane** and a **cerulean "SIM DREAM" wordmark**. The header shows that image alone; the translated tagline (*מערכות סימולציה (ישראל)*, "Simulation Systems (Israel)") appears only in the footer and the desktop flyout panel.

| Token | Value | Use |
| :--- | :--- | :--- |
| Sim Dream cerulean | `#2096C7` (Tailwind `sky-500`) | Primary brand colour: wordmark, links, primary actions, accents. |
| Sim Dream orange | `#FF5500` (Tailwind `orange-500`) | Brand highlight: airplane mark, tagline, active navigation indicator, key highlights. |

1. **Logo assets only**: render the logo with [`components/brand/BrandLogo.tsx`](components/brand/BrandLogo.tsx) (`BrandLogo` = airplane + wordmark, `BrandMark` = airplane only), backed by `public/brand/simdream-logo.png` and `public/brand/simdream-plane.png`. The favicon is `app/icon.png`. Never rebuild the logo from text or icon fonts, never recolour it, and never mirror it in RTL layouts.
2. **The header carries the logo alone**: nothing is printed under or beside the brand image in the header, in any of the six languages (`tests/usability/header-brand.spec.ts` enforces it). The wordmark artwork carries no tagline; wherever a tagline is still shown (footer, desktop flyout panel) it is the translated text `t.nav.brandSub`, never baked into the image (AGENTS.md §5).
3. **Colour tokens live in [`app/globals.css`](app/globals.css)** (`@theme`): Tailwind's `sky-*` scale *is* the Sim Dream cerulean scale and `orange-*` *is* the Sim Dream orange scale. Use those utilities; do not introduce other blues, cyans or oranges as brand colours, and never hard-code the old Tailwind sky values (`#0284c7`, `#0369a1`, `#38bdf8`).
4. **Contrast (WCAG 2.x AA, enforced by the axe suite with an empty baseline)**: `#FF5500` is 3.2:1 on white, so `orange-500` is for the logo, icons, borders/indicators and large text only; small orange text on light surfaces uses `orange-700` (5.3:1). White text on a cerulean fill needs `sky-700` or darker. Brand Daylight colour overrides live in `app/globals.css` under `html[data-ui="brand"]`.
5. **All three interface themes carry the brand**: 🌙 Cockpit Night (default: dark slate with cerulean and orange accents), ☀️ Brand Daylight (cloud white with cerulean and orange) and ✨ Clean Studio (the daylight palette restyled after apple.com's mobile site: white canvas, `#f5f5f7` wells, 17px system type with tight semibold headlines, sentence-case labels, pill buttons, slim translucent nav). The header switch cycles them in that order. Studio is layered on daylight — the document carries `data-ui="brand"` plus `data-look="studio"` — so daylight overrides keep applying and `app/globals.css` adds only the restyle under `html[data-look="studio"]`; never fork the palette.
6. **Action buttons replicate apple.com's store buttons in all themes and viewports**: [`components/ui/Button.tsx`](components/ui/Button.tsx) (and `buttonClassName()` for links) owns the geometry: a 980px pill, regular-weight 17px system type (21px `lg` on desktop), `-0.022em` tracking, 1px border on every variant, no shadow, no press scale. `primary` is the filled cerulean "Learn more"; `outline` is the "Buy" pill, the same cerulean as a 1px outline that fills on hover; `secondary` is the neutral grey pill; `ghost` is text-only. Hero pairs are text-only (no icons) and sit side by side on phones (`flex-row flex-wrap`). Never pass `font-bold`, `shadow-*` or padding overrides to a Button, and never style generic `button` or rounded utilities per theme; themes recolour only through `[data-ui-control="button"][data-button-variant="…"]` in `app/globals.css`.
7. **The header is one centred column, and the Google rating follows Google's own row**: the utility bar ([`components/layout/LiveMetarBar.tsx`](components/layout/LiveMetarBar.tsx)) and the navbar share one `max-w-7xl` column, and the reviews and the quick links form one centred cluster instead of sitting at opposite screen edges (`tests/usability/google-reviews-utility-bar.spec.ts` measures it at 1558px). With review data the bar shows a large score, five stars filled to the rating and a grey localized count (for example `4.9 ★★★★★ 127 reviews`), and a click opens a compact dropdown of three reviews, newest first, each with Google's author attribution (avatar, name, profile link), its publish date and relative time, Google's translation into the page language with a "Show original" switch and a "Translated by Google" notice (`/api/reviews?lang=`), plus the ordering notice and a link to Google's review policy that the Places policies require; the count is fetched on every page load and when a tab is shown again, never hard-coded. Without Google data (no `GOOGLE_PLACES_API_KEY`, or a failed refresh) the bar still shows five yellow stars filled to the grade (all five while it is 5.0), the grade and the count as a plain link to the Google profile, taken from the labelled last-known aggregate `LAST_KNOWN_GOOGLE_RATING` (exported by `lib/reviews/use-google-reviews.ts`, stored as two numbers in `lib/reviews/last-known-rating.json`; never add review texts to it). Do not edit those numbers by hand or pin them in a test: `.github/workflows/google-rating-refresh.yml` runs `scripts/refresh-google-rating.mjs` weekly, reads the official Places API (New) with field mask `rating,userRatingCount` (never a scrape of google.com/maps) and opens one rolling `automation/google-rating` pull request. It needs the `GOOGLE_PLACES_API_KEY` repository secret and only skips with a notice while that is missing; the owner merges the PR by hand, because a merge made by github-actions never starts Verify on `main` and Release Please would not see it. The JSON is excluded from the Genesis fingerprint (`VOLATILE_DATA` in `scripts/check-genesis-coverage.ts`), and the Playwright and Vitest specs read it instead of hard-coding it. Google's own numbers replace it on every load, and `/api/reviews` itself still reports only what Google returned (`tests/a11y/google-reviews-bar.spec.ts` holds both states to zero axe violations). On phones from 360px the WhatsApp action sits beside Book in the navbar (between the logo and the menu) so the top bar fits the rating, the social icons and the language selector on one row without overlap; below 360px it stays in the top bar, and from `md` up it is always in the top bar.

---

## 2. Canonical Routing & URL Discipline

- **Canonical Professional Training Route**: [`app/(public)/pro/page.tsx`](app/(public)/pro/page.tsx) (`/pro`) is the single source of truth for commercial assessment training.
- **Canonical Customer Story Route**: [`app/(public)/about/page.tsx`](app/(public)/about/page.tsx) (`/about`) explains Sim Dream’s story, the consumer flight experience, and official social channels. It is intentionally separate from professional training.
- **Experience Flights ("טיסות חוויה") Route Catalog**: `/experiences#world-routes` ([`components/experiences/WorldRoutesSection.tsx`](components/experiences/WorldRoutesSection.tsx)) is the only place that lists World Trio routes, sights and flight adventures. Its content lives in [`lib/data/experience-routes.ts`](lib/data/experience-routes.ts): every world-trio add-on appears exactly once and takes price and minutes from `FLIGHT_ADDONS` (never duplicate them); an on-request World Trio opens `/book?package=captains-command-60&route=<id>` in the calendar-first flow. The booking must retain only a registry-validated `requestedRouteId`, require a 60-minute or longer session, add no route surcharge, and plainly state that the captain confirms the final mission plan before the visit. Scenario adventures still use `/contact?subject=route&route=<id>` because they are a briefing inquiry, not a scheduled World Trio. Every airport must be a real Boeing 737 destination with a real ICAO code (§1 pillar 5), and all copy ships in the six languages (§5). `tests/unit/experience-routes.test.ts` enforces these rules.
- **Permanent Redirects (301)**:
  - `/simulator` and `/training` must permanently redirect (`permanent: true` in `next.config.mjs`) to `/pro`.
  - The server component [`app/(public)/simulator/page.tsx`](app/(public)/simulator/page.tsx) invokes Next.js `redirect('/pro')`.
  - Navigation pointers must route customer-story calls to `/about` and professional-training calls to `/pro`; the two routes must not be conflated.
- **Content on `/pro`**:
  - Highlights airline interview preparation (El Al, Arkia, Israir, Wizz Air, Ryanair).
  - Features the 3 official commercial tiers:
    - **Airline Interview Prep 60 PRO** (₪890) — [Official Service Page](https://www.simdream.co.il/service-page/airline-interview-prep-60-pro?referral=service_list_widget)
    - **Airline Interview Prep 90 PRO** (₪1,250) — [Official Service Page](https://www.simdream.co.il/service-page/airline-interview-prep-90-pro?referral=service_list_widget)
    - **Airline Interview Prep 120 PRO** (₪1,590) — [Official Service Page](https://www.simdream.co.il/service-page/airline-interview-prep-120-pro?referral=service_list_widget)
  - Technical simulator hardware specifications (CPflight avionics, Sismo CDU/FMC, motorized dual autothrottles) must remain inside a clean disclosure/specs drawer so as not to distract commercial pilot candidates.

---

## 3. Specialized "Noise-Free" Booking Engine Discipline (`/book`)

The booking engine adapts dynamically depending on the selected package category:

| Package Category | Allowed Packages | Add-ons & Combos | Booking Flow | Default Pilot Level |
| :--- | :--- | :--- | :--- | :--- |
| **Professional Training** (`training`) | Strictly the 3 PRO tiers (60 PRO, 90 PRO, 120 PRO). Consumer 30m & 45m suppressed. | **Zero add-on noise (`addons = []`)**. Tourist combos, extreme turbulence modules, and guest-experience upsells are completely suppressed. | **2-Step Streamlined Flow**: `Date & Operational Slot` &rarr; `Pilot Manifest & Checkout`. (Step 2 Add-ons is completely bypassed). | `atpl` (Airline Transport Pilot) |
| **Fear of Flying** (`fear_of_flying`) | Strictly Fear of Flying Course (`pkg-fear-of-flying-90`). | **Zero add-on noise (`addons = []`)**. V1 engine failures, storms, and crosswind challenges are suppressed. | **2-Step Streamlined Flow**: `Date & Therapeutic Slot` &rarr; `Pilot Manifest & Checkout`. | `beginner` |
| **Recreational / Consumer** (`recreational`) | Full consumer catalog (30m Discovery, 45m Daytime Promo, 60m Captain, 90m Odyssey). | Full e-commerce catalog with curated 1-click combos, 7 world trios, Cold & Dark startup, and optional guest seating. | **3-Step Flow**: `Date & Slot` &rarr; `Cockpit Add-ons` &rarr; `Pilot Manifest & Checkout`. | User choice |

---

## 4. Calendar & Scheduling Invariants (Tiled Interval Engine)

The scheduling system is defined in [`KANTOROVICH_SCHEDULER_SPEC.md`](KANTOROVICH_SCHEDULER_SPEC.md). Maintain these non-negotiable invariants:

### Capacity Buffer Map
Always reserve operating capacity via `getReservedMinutesForFlight()`:
- `30 min` flight &rarr; `45 min` reserved block
- `45 min` flight &rarr; `60 min` reserved block (Discounted Promotion, `< 18:00` Sunday–Tuesday only)
- `60 min` flight &rarr; `75 min` reserved block
- `90 min` flight &rarr; `105 min` reserved block
- `120 min` flight &rarr; `150 min` reserved block
- `240 min` workshop &rarr; `255 min` reserved block

### Operating Window
- **Sunday–Saturday**: `09:00–24:00` (900 min). This mirrors the Wix Bookings business schedule and the Nathanel S staff schedule.
- Saturday retains its Prime-Time pricing semantics; the 45m promotion remains Sunday–Tuesday only.

### Duration-Aware Cadence (product decision)
The calendar must follow each selected package's actual reserved duration from real capacity boundaries, never a fixed 60- or 75-minute display grid: 30m → 45m (`09:00`, `09:45`, `10:30` …), 45m → 60m, 60m → 75m, 90m → 105m, and 120m → 150m. A close-aligned final departure is valid when it prevents waste. The engine judges gaps only against operating-window and live-booking boundaries, then requires both remaining gaps to be tileable. `tests/unit/kantorovich-completeness.test.ts` pins exact zero-waste soundness and duration-aware availability.

### Frontend Calendar & Duration Rules
1. **Never Hide Available Durations / Packages**: When a package has 0 open slots on a selected date, **do not filter it out or remove it from the DOM**. It must remain visible with a status badge (`0 slots open today` / `0 מקומות היום`).
2. **Never Overwrite User Selection**: If a user selects a date where their current package is sold out, preserve their selected package.
3. **Actionable Zero-Slots Recovery**: If `openSlotCount === 0`, always display:
   - Clear feedback: `No open runway slots for [Package Title] on [Selected Date]`.
   - **`Check Next Day →`** button advancing the calendar by 1 day.
   - Quick-switch buttons to available alternative durations on the same date (e.g., `Try 60m`).
   - **Open slots only**: the departure grid lists bookable slots and nothing else. Booked, reserved or internally locked slots are never rendered (no strikethrough or disabled tiles), so the visitor chooses from what is actually available.
4. **Dual GUI Support**:
   - [`AmazonFlightStorefront.tsx`](components/scheduler/AmazonFlightStorefront.tsx): Amazon-style 1-page catalog view with sticky buy-box.
   - [`KantorovichCalendarScheduler.tsx`](components/scheduler/KantorovichCalendarScheduler.tsx): Guided 3-step wizard view.
   - Both components must share identical availability and zero-slots recovery logic.
5. **One-Year Booking Horizon**: a flight can be booked from today up to the same calendar date one year ahead (`maxBookableDate()` in [`lib/scheduler/booking-horizon.ts`](lib/scheduler/booking-horizon.ts), on the Israel date). The shared `BookingWeekPager` and `BookingMonthPager` disable "next" and every day past it (with the localized `horizonNote`), `/book` clamps any selected date, and the server is authoritative: `POST /api/checkout` and `GET /api/slots` answer 400 for a later date. Both pagers also show a **Today** button whenever the view has moved away from today (`data-calendar-today`); `tests/e2e/booking-horizon.spec.ts` covers both interfaces.

---

## 5. Multilingual & Bidirectional UI Discipline (6 Languages)

The platform supports 6 languages with zero cross-language contamination:
- **Hebrew (`he`)** — RTL
- **English (`en`)** — LTR
- **Russian (`ru`)** — LTR
- **French (`fr`)** — LTR
- **Arabic (`ar`)** — RTL
- **Spanish (`es`)** — LTR

### Critical Coding Rules
1. **No `isRTL ? he : en` Hacks**:
   - Arabic is an RTL language. Using `isRTL ? 'עברית' : 'English'` forces Hebrew text on Arabic-speaking users.
   - Always resolve strings through `translations.ts` or localized copy dictionaries: `t.booking[key] || CLEAN_COPY[language] || CLEAN_COPY.en`.
   - Reserve `isRTL` exclusively for CSS layout styling (`dir="rtl"`, chevron flips `rotate-180`, alignment).
2. **Zero Cross-Script Contamination**:
   - Never mix Hebrew unicode characters (`[\u0590-\u05FF]`) into Arabic text.
   - Never mix Arabic unicode characters (`[\u0600-\u06FF]`) into Hebrew text.
3. **Telemetry Isolation (`dir="ltr"`)**:
   - Aviation telemetry must strictly remain in LTR: METAR weather strings, radio frequencies, transponder squawks, booking references, and slot ranges (`10:00 - 11:15`).
4. **Key Parity**:
   - When adding a new translation key in [`lib/i18n/translations.ts`](lib/i18n/translations.ts), all 6 languages (`he`, `en`, `ru`, `fr`, `ar`, `es`) must be provided simultaneously.

---

## 6. Runtime Database & Security Architecture

1. **Fail-Closed in Production**:
   - Live checkout and persistence require valid Supabase and Stripe secrets.
   - Never fallback to in-memory orders in production.
2. **Graceful Local In-Memory Fallback**:
   - In [`lib/db/supabase-admin.ts`](lib/db/supabase-admin.ts) and [`lib/db/store.ts`](lib/db/store.ts), check `isProduction && Boolean(getSupabaseAdmin())`.
   - If Supabase environment variables are missing during local development or testing, fallback gracefully to in-memory store and demo seed data without crashing `/api/slots` with HTTP 500. Local dev server can run with `npm run start:local` (`ALLOW_IN_MEMORY_STORE=true`).
3. **Server-Authoritative Pricing & Durations**:
   - The client submits only IDs (`packageId`, `slotId`, `addonIds`).
   - The server resolves all prices, durations, end times, and discounts from authoritative registries.
4. **Stripe Webhook Authority**:
   - Only a signature-verified Stripe webhook (`checkout.session.completed`) marks bookings paid and confirms reservations. Client redirect to `/book/success` does not confirm payments.
5. **Verified Member Identity & Protected Data Ownership**:
   - A flight booking is attached to a member profile only when the checkout email matches that member's confirmed identity-provider email.
   - Guest checkouts remain permitted; an authenticated member may later claim matching **paid** guest bookings. Anonymous email lookups must never expose purchase history or Stripe receipts.
6. **Isolated Test Build Sandboxing**:
   - Sandboxed test runs and Playwright servers must use `.next-test` (`NEXT_DIST_DIR: '.next-test'`, see `tests/support/test-env.ts`), ensuring test builds never mutate or clobber the developer's working `.next` build.
7. **Wix Headless Backend Adapter (`lib/wix/`)**:
   - Target architecture: this Next.js frontend + Wix Headless business backend ([`docs/WIX_HEADLESS_ARCHITECTURE.md`](docs/WIX_HEADLESS_ARCHITECTURE.md)). The only writable Wix target is the **"SimDream-Staging"** Headless site (metasite `317b0c6d-6608-499a-bb3c-b1c37650e460`); the live Editor site on simdream.co.il and the retired `4c5e1c7a-163c-48ce-8278-cdc42e4deed4` site are never written to from this repo.
   - All Wix calls go through [`lib/wix/`](lib/wix/index.ts): one `@wix/sdk` client authenticated as an anonymous **visitor** with the public `NEXT_PUBLIC_WIX_CLIENT_ID`; Bookings is called over REST via `fetchWithAuth` (`@wix/bookings` is not installed — its React 18 peer dependency conflicts with React 19). `WIX_SITE_ID` is informational. No client secret, API key or PayPlus credential ever enters the repo or the browser.
   - [`lib/wix/catalog.ts`](lib/wix/catalog.ts) maps every `SIMULATOR_PACKAGES` id to its Wix Bookings service id; `reconcileCatalog()` must report 0 mismatches. Run `npm run wix:smoke` after touching the catalog or the Wix services (it lists services, reconciles, and reads tomorrow's bookable slots).
   - Agent know-how for Wix work comes from `npx skills add wix/skills` (installed under `.agents/skills/`, git-ignored) plus the Wix MCP connector; confirm every endpoint from the docs, never from memory.

---

## 7. Quality Assurance (QA) Checklist

Before completing any feature or code change:
1. Run `npm run build` — must compile with 0 TypeScript or build errors across all 35 routes.
2. Verify `/book` with consumer packages (30m, 45m, 60m, 90m) &rarr; 3-step flow with add-ons.
3. Verify `/book` with PRO packages (`/book?package=airline-interview-prep-90-pro`) &rarr; 2-step noise-free flow.
4. Verify calendar across Sunday through Saturday (09:00–24:00); retain Saturday Prime-Time price behavior and the Sunday–Tuesday-only 45m promotion.
5. Verify all 6 language switchers (`he`, `en`, `ru`, `fr`, `ar`, `es`) render correctly with zero mixed scripts or broken keys.
6. Verify the brand identity in both themes: official logo (orange airplane + cerulean wordmark) alone in the header with no tagline beneath it, and no off-brand blues or cyans (§1, Brand Identity).
7. Verify responsive header and UI fit across all viewports from 320px (iPhone SE) to 1920px desktop (`tests/usability/header-fit.spec.ts`), with 44x44px minimum tap targets.
8. Verify member authentication & dashboard localization across all 6 languages (`tests/usability/member-i18n.spec.ts`).
9. Verify iPhone/iPad behaviour (`tests/usability/apple-web-app.spec.ts`, the 320px test in `tests/e2e/mobile.spec.ts`): `viewport-fit=cover` with pinch zoom intact, safe-area utilities (`pb-safe-area-*`, `px-safe-area-*`, `bottom-safe-area-*`) on sticky bars, dialogs and the footer, `overflow-x: clip` (never `hidden`, which detaches the sticky navbar on iOS), the 48px coarse-pointer control floor with 8px calendar/slot gaps and a 12px phone text floor (Material and Lighthouse; Apple asks 44px), an opaque 180px `app/apple-icon.png` and the manifest icons regenerated with `node scripts/generate-app-icons.mjs` whenever the brand mark changes. Recipes: `npx skills add https://github.com/joe-bell/skills --skill apple-web-app`.
10. Run the automated quality framework ([`TESTING.md`](TESTING.md)): `npm run test:quick` for every change, `npm run test:all` before completing a feature. The accessibility baseline must stay empty (0 axe violations) and visual baselines change only on purpose.

---

## 8. Structured Data & SEO Facts

Search engines and AI assistants quote whatever the site publishes about itself, so every published fact must be the registry's fact:
1. **No hand-typed prices, hours or ratings**: JSON-LD, page metadata ([`lib/seo/seo-config.ts`](lib/seo/seo-config.ts)) and `public/llms.txt` take prices and durations from `SIMULATOR_PACKAGES` / `FLIGHT_ADDONS`, hours, address, contact and social URLs from [`lib/config/facility-info.ts`](lib/config/facility-info.ts) (operating window 09:00–24:00; schema.org `Time` writes an end-of-day close as `23:59`), and languages from `LANGUAGES`. Never retype a number a registry already owns.
2. **One site-wide graph**: [`lib/seo/structured-data.ts`](lib/seo/structured-data.ts) builds the `@graph` that [`components/seo/StructuredDataJsonLd.tsx`](components/seo/StructuredDataJsonLd.tsx) renders once in the root layout (LocalBusiness, offer catalogues including an `Offer` for each PRO tier, WebSite with all six `inLanguage` tags). `sameAs` lists Google Maps, the alternate domain, WhatsApp and the three social profiles from the facility config.
3. **FAQPage only beside a visible FAQ**: emit [`components/seo/FaqPageJsonLd.tsx`](components/seo/FaqPageJsonLd.tsx) inside the FAQ section of the route, passing the exact array that section maps over in the visitor's language. Never add FAQPage to the root layout or to a route without the same questions and answers on screen.
4. **Ratings are never hard-coded**: no `aggregateRating` or `review` in any schema; Google's own numbers reach the page only through the review bar (§1.7).
5. `tests/unit/seo-integrity.test.ts` renders the graph and enforces all of the above, and keeps the CSP `img-src` in step with the blog cover hosts.
