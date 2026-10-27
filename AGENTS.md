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

The visual identity is the official **simdream.co.il** logo: an **orange airplane** and a **cerulean "SIM DREAM" wordmark**, with the tagline *מערכות סימולציה (ישראל)* ("Simulation Systems (Israel)").

| Token | Value | Use |
| :--- | :--- | :--- |
| Sim Dream cerulean | `#2096C7` (Tailwind `sky-500`) | Primary brand colour: wordmark, links, primary actions, accents. |
| Sim Dream orange | `#FF5500` (Tailwind `orange-500`) | Brand highlight: airplane mark, tagline, active navigation indicator, key highlights. |

1. **Logo assets only**: render the logo with [`components/brand/BrandLogo.tsx`](components/brand/BrandLogo.tsx) (`BrandLogo` = airplane + wordmark, `BrandMark` = airplane only), backed by `public/brand/simdream-logo.png` and `public/brand/simdream-plane.png`. The favicon is `app/icon.png`. Never rebuild the logo from text or icon fonts, never recolour it, and never mirror it in RTL layouts.
2. **Tagline is translated text**: the wordmark artwork carries no tagline; render `t.nav.brandSub` beside it so every language gets its own tagline (AGENTS.md §5).
3. **Colour tokens live in [`app/globals.css`](app/globals.css)** (`@theme`): Tailwind's `sky-*` scale *is* the Sim Dream cerulean scale and `orange-*` *is* the Sim Dream orange scale. Use those utilities; do not introduce other blues, cyans or oranges as brand colours, and never hard-code the old Tailwind sky values (`#0284c7`, `#0369a1`, `#38bdf8`).
4. **Contrast (WCAG 2.x AA, enforced by the axe suite with an empty baseline)**: `#FF5500` is 3.2:1 on white, so `orange-500` is for the logo, icons, borders/indicators and large text only; small orange text on light surfaces uses `orange-700` (5.3:1). White text on a cerulean fill needs `sky-700` or darker. Brand Daylight colour overrides live in `app/globals.css` under `html[data-ui="brand"]`.
5. **Both interface themes carry the brand**: 🌙 Cockpit Night (default: dark slate with cerulean and orange accents) and ☀️ Brand Daylight (cloud white with cerulean and orange).

---

## 2. Canonical Routing & URL Discipline

- **Canonical Professional Training Route**: [`app/(public)/pro/page.tsx`](app/(public)/pro/page.tsx) (`/pro`) is the single source of truth for commercial assessment training.
- **Canonical Customer Story Route**: [`app/(public)/about/page.tsx`](app/(public)/about/page.tsx) (`/about`) explains Sim Dream’s story, the consumer flight experience, and official social channels. It is intentionally separate from professional training.
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
| **Professional Training** (`training`) | Strictly the 3 PRO tiers (60 PRO, 90 PRO, 120 PRO). Consumer 20m & 45m suppressed. | **Zero add-on noise (`addons = []`)**. Tourist combos, extreme turbulence modules, and 4K video upsells are completely suppressed. | **2-Step Streamlined Flow**: `Date & Operational Slot` &rarr; `Pilot Manifest & Checkout`. (Step 2 Add-ons is completely bypassed). | `atpl` (Airline Transport Pilot) |
| **Fear of Flying** (`fear_of_flying`) | Strictly Fear of Flying Course (`pkg-fear-of-flying-90`). | **Zero add-on noise (`addons = []`)**. V1 engine failures, storms, and crosswind challenges are suppressed. | **2-Step Streamlined Flow**: `Date & Therapeutic Slot` &rarr; `Pilot Manifest & Checkout`. | `beginner` |
| **Recreational / Consumer** (`recreational`) | Full consumer catalog (20m Discovery, 45m Daytime Promo, 60m Captain, 90m Odyssey). | Full e-commerce catalog with curated 1-click combos, 7 world trios, Cold & Dark startup, and 4K recording. | **3-Step Flow**: `Date & Slot` &rarr; `Cockpit Add-ons` &rarr; `Pilot Manifest & Checkout`. | User choice |

---

## 4. Calendar & Scheduling Invariants (Tiled Interval Engine)

The scheduling system is defined in [`KANTOROVICH_SCHEDULER_SPEC.md`](KANTOROVICH_SCHEDULER_SPEC.md). Maintain these non-negotiable invariants:

### Capacity Buffer Map
Always reserve operating capacity via `getReservedMinutesForFlight()`:
- `20 min` flight &rarr; `45 min` reserved block
- `45 min` flight &rarr; `60 min` reserved block (Daytime Promo, `< 18:00` Sun–Fri only)
- `60 min` flight &rarr; `75 min` reserved block
- `90 min` flight &rarr; `105 min` reserved block
- `120 min` flight &rarr; `150 min` reserved block
- `240 min` workshop &rarr; `255 min` reserved block

### Operating Windows
- **Sunday–Thursday**: `10:00–23:00` (780 min)
- **Friday**: `09:00–16:00` (420 min, includes `15:15` closer)
- **Saturday**: `19:00–24:00` (300 min Prime-Time only; 45m promo strictly forbidden)

### Frontend Calendar & Duration Rules
1. **Never Hide Available Durations / Packages**: When a package has 0 open slots on a selected date, **do not filter it out or remove it from the DOM**. It must remain visible with a status badge (`0 slots open today` / `0 מקומות היום`).
2. **Never Overwrite User Selection**: If a user selects a date where their current package is sold out, preserve their selected package.
3. **Actionable Zero-Slots Recovery**: If `openSlotCount === 0`, always display:
   - Clear feedback: `No open runway slots for [Package Title] on [Selected Date]`.
   - **`Check Next Day →`** button advancing the calendar by 1 day.
   - Quick-switch buttons to available alternative durations on the same date (e.g., `Try 60m`).
   - Strikethrough list of booked slots for transparency.
4. **Dual GUI Support**:
   - [`AmazonFlightStorefront.tsx`](components/scheduler/AmazonFlightStorefront.tsx): Amazon-style 1-page catalog view with sticky buy-box.
   - [`KantorovichCalendarScheduler.tsx`](components/scheduler/KantorovichCalendarScheduler.tsx): Guided 3-step wizard view.
   - Both components must share identical availability and zero-slots recovery logic.

---

## 5. Multilingual & Bidirectional UI Discipline (5 Languages)

The platform supports 5 languages with zero cross-language contamination:
- **Hebrew (`he`)** — RTL
- **English (`en`)** — LTR
- **Russian (`ru`)** — LTR
- **French (`fr`)** — LTR
- **Arabic (`ar`)** — RTL

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
   - When adding a new translation key in [`lib/i18n/translations.ts`](lib/i18n/translations.ts), all 5 languages (`he`, `en`, `ru`, `fr`, `ar`) must be provided simultaneously.

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

---

## 7. Quality Assurance (QA) Checklist

Before completing any feature or code change:
1. Run `npm run build` — must compile with 0 TypeScript or build errors across all 35 routes.
2. Verify `/book` with consumer packages (20m, 45m, 60m, 90m) &rarr; 3-step flow with add-ons.
3. Verify `/book` with PRO packages (`/book?package=airline-interview-prep-90-pro`) &rarr; 2-step noise-free flow.
4. Verify calendar across Sunday (10:00–23:00), Friday (09:00–16:00), and Saturday (19:00–24:00 Prime-Time).
5. Verify all 5 language switchers (`he`, `en`, `ru`, `fr`, `ar`) render correctly with zero mixed scripts or broken keys.
6. Verify the brand identity in both themes: official logo (orange airplane + cerulean wordmark), translated tagline, and no off-brand blues or cyans (§1, Brand Identity).
7. Verify responsive header and UI fit across all viewports from 320px (iPhone SE) to 1920px desktop (`tests/usability/header-fit.spec.ts`), with 44x44px minimum tap targets.
8. Verify member authentication & dashboard localization across all 5 languages (`tests/usability/member-i18n.spec.ts`).
9. Run the automated quality framework ([`TESTING.md`](TESTING.md)): `npm run test:quick` for every change, `npm run test:all` before completing a feature. The accessibility baseline must stay empty (0 axe violations) and visual baselines change only on purpose.
