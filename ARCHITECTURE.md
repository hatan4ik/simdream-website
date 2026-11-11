# SimDream LTD — Visual Architecture & System Design

Visual architecture documentation for **Sim Dream LTD** (`simdream.co.il`), Boeing 737 Flight Simulation Center, Tel Aviv.

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Client & User Interface Layer"]
        User["Visitor / Pilot Candidate"]
        BrandLogoSystem["Official Brand Identity<br/>BrandLogo.tsx (Orange Plane + Cerulean Wordmark)<br/>Header: logo alone, no tagline"]
        ThemeEngine["Triple UX Engine<br/>🌙 Cockpit Night (default) • ☀️ Brand Daylight • ✨ Clean Studio<br/>Sim Dream cerulean #2096C7 + orange #FF5500"]
        I18nEngine["5-Language Engine (i18n)<br/>HE (RTL) • AR (RTL) • EN (LTR) • RU (LTR) • FR (LTR)"]
        StorefrontUI["Dual Booking Storefront<br/>Amazon 1-Page Storefront / 3-Step Wizard"]
        SubPortalUI["Flight Subscription Portal<br/>Dedicated /subscriptions & /experiences category"]
    end

    subgraph RoutingLayer["Edge Routing & Next.js 16 App Router"]
        CanonicalRedirects["Canonical 301 Permanent Redirects<br/>/simulator, /training ➔ /pro"]
        PublicPages["Public Pages<br/>/ • /about • /pro • /experiences • /book • /book/success<br/>/subscriptions • /subscriptions/thank-you • /workshops • /vouchers<br/>/contact • /rules • /privacy-policy"]
        MemberPages["Member Area<br/>/dashboard • /login • /wix/members/callback<br/>legacy /auth/callback • /auth/reset-password"]
        AdminPages["Admin Dispatch Command Center<br/>/admin (Bookings, Vouchers, Workshops, Schedule Efficiency)"]
    end

    subgraph BusinessLogic["Core Business Logic & Engines"]
        NoiseFreeAdapter["Noise-Free Booking Adapter<br/>Suppresses recreational add-ons for PRO & Fear of Flying"]
        KantorovichEngine["Tiled Interval Scheduler Engine<br/>lib/scheduler/kantorovich-engine.ts"]
        MissionCalc["Mission Calculator<br/>Flight time + Addons + Voucher Manifest"]
        WixPlansResolver["Wix Pricing Plans Resolver<br/>lib/wix/plans.ts (Price & Pattern Matching)"]
        ReviewsCache["Google Reviews Snapshot<br/>stored twice a day (06:00/17:00 Israel); no Google call per page view; no local fallback claims"]
    end

    subgraph APILayer["Next.js Serverless API Routes (14 Handlers)"]
        BookingAPIs["Booking & Capacity APIs<br/>GET /api/slots • GET /api/packages<br/>POST /api/checkout • POST /api/webhooks/stripe"]
        SubscriptionAPIs["Subscription Checkout API<br/>POST & GET /api/subscriptions/checkout"]
        MemberAPIs["Member Profile & Receipts<br/>GET /api/my-bookings • GET /api/my-bookings/[ref]/receipt<br/>POST /api/membership/bootstrap"]
        OperationsAPIs["Operational Entities<br/>GET/PATCH /api/bookings • GET/POST/PATCH /api/vouchers<br/>GET/POST/PATCH /api/workshops • GET/POST /api/reviews • POST /api/reviews/refresh (token)"]
        AdminAPIs["Admin Optimization<br/>GET /api/admin/schedule-efficiency • POST /api/admin/schedule-optimization"]
    end

    subgraph PersistenceLayer["Persistence & External Services"]
        SupabaseDB[("Supabase PostgreSQL (Production)<br/>Row-Level Security & Exclusion Constraints")]
        InMemoryFallback[("In-Memory Store Fallback<br/>Local Dev & Non-500 Demo Resilience (ALLOW_IN_MEMORY_STORE)")]
        StripeService["Stripe Hosted Checkout<br/>Card payment flow & Webhooks"]
        WixHeadless["Wix Headless Platform (@wix/sdk)<br/>Members • Calendar sessions • Bookings • Pricing Plans • Hosted Checkout"]
        GooglePlaces["Google Places API<br/>15m cached data; empty when unavailable"]
    end

    User --> ThemeEngine --> I18nEngine
    I18nEngine --> StorefrontUI
    I18nEngine --> SubPortalUI

    StorefrontUI --> PublicPages
    SubPortalUI --> PublicPages
    CanonicalRedirects --> PublicPages
    PublicPages --> MemberPages
    PublicPages --> AdminPages

    StorefrontUI --> BookingAPIs
    SubPortalUI --> SubscriptionAPIs

    BookingAPIs --> KantorovichEngine
    BookingAPIs --> MissionCalc
    SubscriptionAPIs --> WixPlansResolver
    PublicPages --> ReviewsCache --> GooglePlaces

    KantorovichEngine --> SupabaseDB
    KantorovichEngine -.->|If unconfigured| InMemoryFallback
    BookingAPIs --> StripeService
    StripeService --> BookingAPIs
    SubscriptionAPIs --> WixHeadless
    BookingAPIs -.->|Shadow Reads| WixHeadless
    MemberPages --> MemberAPIs --> WixHeadless
    MemberAPIs -.->|legacy booking history & Stripe receipts| SupabaseDB
    AdminPages --> AdminAPIs --> SupabaseDB
    AdminPages --> OperationsAPIs --> SupabaseDB
```

### Checkout dependency boundary

`POST /api/checkout` remains a Next.js Route Handler. It calls the provider-neutral business service in `lib/booking/checkout-service.ts`, which receives only the checkout repository, hosted-card gateway, authenticated-member lookup, confirmation notifier, origin resolver, and clock ports from `lib/booking/checkout-ports.ts`. The server-only `lib/booking/checkout-composition.ts` currently binds those ports to Supabase, Stripe, SendGrid, and Supabase Auth; `checkout-runtime.ts` is the route-facing composition. This preserves the server-authoritative schedule, pricing, voucher, guest-checkout, and webhook rules while allowing a Wix staging adapter to be introduced without changing the customer UI or the checkout policy.

### Wix Member identity and Flight Deck boundary

Wix Members is the primary login for the managed frontend. `/login`, subscription purchase and the subscription panel share a PKCE launch routine in `lib/auth/auth-context.tsx`; the Wix-hosted page returns to `/wix/members/callback`, which stores a tab-scoped member session and refreshes the React profile. Guest checkout does not depend on this state.

For `/dashboard`, the browser sends its short-lived member access token to `GET /api/my-bookings`. `lib/auth/request-auth.ts` validates that token with Wix's current-member endpoint before `lib/wix/member-bookings.ts` queries Calendar using `memberId/me`. The result is a read-only Wix appointment projection: title, status, date, time and duration only. The UI deliberately hides price, invoice, Stripe receipt and local boarding-pass actions for it; Calendar is not payment proof. Active Pricing Plan orders remain in the shared `WixMemberSubscriptionPanel`; local Stripe receipts continue through the legacy verified Supabase ownership path.

### Wix P3 shadow-read boundary

When `WIX_SHADOW_READS_ENABLED=true`, a successful local booking initialization schedules a post-response diagnostic through Next.js `after()`. [`lib/wix/checkout-shadow.ts`](lib/wix/checkout-shadow.ts) queries only Wix Bookings' public service catalog and the mapped appointment service's availability for the already-selected local departure. It emits a redacted correlation event containing package/date/time, catalog-drift fields and match/mismatch status—never customer identity, voucher, booking-record, payment or card data.

The observer is strictly optional and non-blocking: disabled is the default; Wix failure is reduced to a diagnostic event; no Wix booking, checkout session, payment, member, voucher, coupon or CMS writer is reachable from the shadow interface. Supabase/Stripe remains the only checkout writer and Stripe's signed webhook remains the only card-payment authority. The documented Wix Bookings endpoints are paginated so a comparison never silently uses only a partial availability result.

### Wix Pricing Plans & flight subscriptions checkout boundary

Flight tracks are single-payment, 12-month commercial packages: four consumer tracks (`flight-foundations-5x60`, `advanced-captain-5x90`, `atpl-concepts-10x60`, `airline-readiness-10x90`, sold on `/subscriptions`) and two PRO tracks (`pro-interview-3x90`, `pro-interview-5x60`, sold on `/pro#pro-tracks` only). Checkout does not run through the one-off simulator slot booking engine:
1. `POST /api/subscriptions/checkout` receives the validated subscription pass ID.
2. `lib/wix/plans.ts` resolves the matching Wix Pricing Plan (checking `WIX_PLAN_IDS` environment overrides first, followed by dynamic scanning of live public plans by price and title pattern).
3. `createPlanCheckoutUrl()` calls `@wix/redirects` `client.redirects.createRedirectSession({ paidPlansCheckout: { planId } })` with `thankYouPageUrl: /subscriptions/thank-you` and `postFlowUrl: /subscriptions`.
4. If a plan is not yet published in Wix, the API gracefully falls back to Captain Dispatch (`/contact?subject=subscription&plan=...&notice=dispatch_assisted`) rather than failing closed with HTTP 500.

---

## 2. Adaptive Booking Engine Architecture (Recreational vs Noise-Free PRO vs Subscriptions)

```mermaid
flowchart TD
    Start(["User Lands on Booking Engine (/book) or Portal (/subscriptions)"]) --> DetectPackage{"Package Category Check"}

    subgraph NoiseFreeFlow["Noise-Free 2-Step Flow (PRO & Fear of Flying)"]
        DetectPackage -->|category = 'training' (PRO)| ProConfig["Auto-Select: PRO Tiers (60/90/120 PRO)<br/>Pilot Level: ATPL"]
        DetectPackage -->|category = 'fear_of_flying'| FearConfig["Auto-Select: Fear of Flying Course<br/>Pilot Level: Beginner"]
        ProConfig --> Step1Pro["Step 1: Date & Operational Slot Selection"]
        FearConfig --> Step1Pro
        Step1Pro --> SuppressAddons["Step 2 Suppressed (Zero Recreational Add-ons)<br/>addons = []"]
        SuppressAddons --> Step3Pro["Step 2 (Direct): Pilot Manifest & Checkout"]
    end

    subgraph RecreationalFlow["Full 3-Step Storefront Flow (Recreational / Consumer)"]
        DetectPackage -->|category = 'recreational'| RecConfig["Display Full Catalog (30m, 45m, 60m, 90m)<br/>User Selects Pilot Level"]
        RecConfig --> Step1Rec["Step 1: Date & Slot Selection<br/>(Live Runway Capacity Bar)"]
        Step1Rec --> Step2Rec["Step 2: Cockpit Add-ons & Combos<br/>(Cold & Dark, 7 World Trios, Extra Cockpit Guest)"]
        Step2Rec --> Step3Rec["Step 3: Pilot Manifest & Checkout<br/>(Voucher Reapply & Manifest Summary)"]
    end

    subgraph SubscriptionFlow["Single-Payment Annual Subscriptions Flow (/subscriptions)"]
        DetectPackage -->|category = 'subscriptions'| SubConfig["Display 4 Annual Tracks (5x60, 5x90, 10x60, 10x90)<br/>12-Month Validity • Active Captain Coaching"]
        SubConfig --> SubAction["User clicks 'Buy Subscription' / 'רכישת מנוי'"]
        SubAction --> SubCheckout(["POST /api/subscriptions/checkout"])
    end

    Step3Pro --> SubmitCheckout(["POST /api/checkout (Stripe)"])
    Step3Rec --> SubmitCheckout
    SubCheckout --> WixRedirectFlow(["Wix Pricing Plans Hosted Checkout (@wix/redirects)"])
```

---

## 3. Kantorovich Tiled Interval Scheduler Architecture

```mermaid
flowchart LR
    subgraph Windows["1. Operating Windows"]
        AllDays["Sun–Sat: 09:00–24:00 (900m)"]
    end

    subgraph CapacityMap["2. Buffer Reservation Map"]
        B30["30 min Flight ➔ 45 min Block"]
        B45["45 min Flight ➔ 60 min Block (Daytime Only)"]
        B60["60 min Flight ➔ 75 min Block"]
        B90["90 min Flight ➔ 105 min Block"]
        B120["120 min Flight ➔ 150 min Block"]
    end

    subgraph ValidationEngine["3. Dynamic Programming Tile Engine"]
        Candidates["Generate 15-Minute Candidate Starts"]
        CollisionCheck{"Collides with Existing Booking?"}
        WindowCheck{"Exceeds Closing Time?"}
        PromoCheck{"45m Discounted Promotion outside Sun–Tue daytime?"}
        ZeroWasteDP{"canTileIntervalZeroWaste()<br/>Can free space before & after be tiled?"}
    end

    subgraph FrontendState["4. Resilient Frontend UI"]
        SlotsAvailable["Slots Available ➔ Green Pills + Smart Pairing Badge"]
        SoldOutState["0 Slots Today ➔ Amber Badge (Kept in DOM)<br/>Actionable Recovery: 'Check Next Day →'"]
    end

    Windows --> Candidates
    CapacityMap --> Candidates
    Candidates --> CollisionCheck
    CollisionCheck -->|No| WindowCheck
    WindowCheck -->|No| PromoCheck
    PromoCheck -->|No| ZeroWasteDP
    ZeroWasteDP -->|Valid| SlotsAvailable
    CollisionCheck -->|Yes| SoldOutState
    WindowCheck -->|Yes| SoldOutState
    PromoCheck -->|Yes| SoldOutState
    ZeroWasteDP -->|Leaves Fragment Gap| SoldOutState
```

---

## 4. Payment & Checkout Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Pilot
    participant Browser as Storefront (/book)
    participant Server as Next.js API (/api/checkout)
    participant DB as Supabase PostgreSQL / Store
    participant Stripe as Stripe Payment Gateway
    participant Webhook as Next.js Webhook (/api/webhooks/stripe)
    actor Admin as Admin Dispatch Board

    Customer->>Browser: Selects Package, Slot, Pilot Manifest & Clicks Checkout
    Browser->>Server: POST /api/checkout (IDs only: packageId, slotId, addonIds)

    activate Server
    Server->>DB: Fetch authoritative package price, slot capacity & existing bookings
    Server->>Server: Recalculate duration, end time, and total price (Server-Authoritative)

    alt Fully Funded Voucher Applied
        Server->>DB: Mark Voucher Redeemed & Create Confirmed Booking
        Server-->>Browser: HTTP 200 { success: true, bookingReference: "SD-..." }
        Browser-->>Customer: Redirect to /book/success
    else Card Checkout
        Server->>DB: Create Pending Booking with UUID
        Server->>Stripe: Create Stripe Checkout Session (metadata: booking_id, slot_id)
        Stripe-->>Server: Checkout URL (stripe.com/pay/cs_test_...)
        Server-->>Browser: HTTP 200 { checkoutUrl: "https://checkout.stripe.com/..." }
        deactivate Server
        Browser-->>Customer: Redirect to Stripe Hosted Checkout
        Customer->>Stripe: Completes Card Payment
        Stripe-->>Customer: Redirects to /book/success?ref=...&session_id=...

        Note over Stripe,Webhook: Asynchronous Secure Webhook
        Stripe->>Webhook: POST /api/webhooks/stripe (checkout.session.completed)
        activate Webhook
        Webhook->>Webhook: Verify Stripe-Signature header
        Webhook->>DB: UPDATE bookings SET status='confirmed', payment_status='paid'
        Admin->>Server: Refreshes dispatch data through protected APIs
        Webhook-->>Stripe: HTTP 200 { received: true }
        deactivate Webhook
    end
```

### 4B. Wix Pricing Plans & Subscriptions Checkout Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Pilot
    participant Browser as Storefront (/subscriptions or /experiences)
    participant API as Next.js API (/api/subscriptions/checkout)
    participant WixClient as Wix Client (lib/wix/plans.ts)
    participant Wix as Wix Headless (Pricing Plans V3)
    participant PayPlus as Hosted Payment / PayPlus
    participant Return as Browser (/subscriptions/thank-you)

    Customer->>Browser: Selects Subscription (e.g. 5x90 Advanced Captain) & Clicks "Buy Subscription"
    Browser->>API: POST /api/subscriptions/checkout { planId: "advanced-captain-5x90" }
    activate API
    API->>WixClient: resolveWixPlanId("advanced-captain-5x90")
    WixClient->>Wix: Query Public Plans (price ₪3,390 or name match)
    Wix-->>WixClient: Returns Plan GUID (or matches static WIX_PLAN_IDS)
    WixClient->>Wix: client.redirects.createRedirectSession({ paidPlansCheckout: { planId } })
    Wix-->>WixClient: Returns { redirectSession: { fullUrl } }
    WixClient-->>API: Returns hosted checkout URL
    API-->>Browser: HTTP 200 { checkoutUrl: "https://...wix-site-host.com/..." }
    deactivate API
    Browser-->>Customer: Redirects customer to hosted payment page
    Customer->>PayPlus: Completes subscription payment
    PayPlus-->>Return: Redirects to /subscriptions/thank-you?planOrderId=...
    Return-->>Customer: Renders confetti & next steps to schedule sessions
```
---

## 5. Bidirectional 5-Language Architecture (i18n)

```mermaid
flowchart TD
    subgraph LangContext["LanguageContext & Provider"]
        SelectedLang["Active Language State (stored in browser local storage)"]
    end

    subgraph Languages["Supported 5 Languages"]
        HE["Hebrew ('he')<br/>RTL • dir='rtl'"]
        AR["Arabic ('ar')<br/>RTL • dir='rtl'"]
        EN["English ('en')<br/>LTR • dir='ltr'"]
        RU["Russian ('ru')<br/>LTR • dir='ltr'"]
        FR["French ('fr')<br/>LTR • dir='ltr'"]
    end

    subgraph StrictRules["Architectural & Isolation Rules"]
        Rule1["No isRTL Text Hacks: Always query translations[lang]"]
        Rule2["Zero Unicode Contamination: Automated Regex Scan"]
        Rule3["Telemetry Isolation: Aviation METAR, Frequencies, Slots in dir='ltr'"]
    end

    subgraph Output["Localized View"]
        DOM["Clean DOM Render with Precise Typography & Correct Directionality"]
    end

    SelectedLang --> HE
    SelectedLang --> AR
    SelectedLang --> EN
    SelectedLang --> RU
    SelectedLang --> FR

    HE --> StrictRules
    AR --> StrictRules
    EN --> StrictRules
    RU --> StrictRules
    FR --> StrictRules

    StrictRules --> DOM
```

---

## 6. Automated Quality Framework & Testing Pipeline (TESTING.md)

```mermaid
flowchart TD
    Trigger(["npm run test:quick / npm run test:all"]) --> EnvCheck["Sandboxed Test Environment<br/>NEXT_DIST_DIR = '.next-test'<br/>ALLOW_IN_MEMORY_STORE = 'true'"]

    subgraph Stage1["1. Static & Fast Unit Verification (Vitest)"]
        Typecheck["TypeScript Strict Check<br/>(tsc --noEmit)"]
        UnitTests["Vitest Unit Projects (53 Suites, 1460+ Tests)<br/>- Scheduling math & mission manifests<br/>- i18n key parity & unicode purity<br/>- Member auth ownership contracts<br/>- Wix catalog & plans resolution"]
    end

    subgraph Stage2["2. Build & Artifact Verification"]
        SandboxedBuild["Next.js Sandboxed Build<br/>Output to .next-test (Never touches dev .next)"]
        ServerLaunch["Ephemeral Test Server Launch<br/>Isolated port with clean mock state"]
    end

    subgraph Stage3["3. Browser, Usability & Accessibility Suites (Playwright 10 Projects)"]
        BrowserProjects["5 Cross-Browser Projects<br/>Chromium • Firefox • WebKit<br/>Mobile Chrome • Mobile Safari"]
        QualityProjects["5 Quality Dimension Projects<br/>- a11y (Axe-Core automated audit, 0 violations)<br/>- usability (header-fit, member-i18n, apple-web-app)<br/>- security-web (CSP nonce, headers)<br/>- resilience (network/timeout fallbacks)<br/>- visual (cross-platform snapshots)"]
    end

    subgraph Stage4["4. Performance & Reliability Smoke"]
        LoadSmoke["Autocannon Load Smoke<br/>100 concurrency slot hammering"]
        LighthouseAudit["Lighthouse CWV Budgets<br/>Performance, A11y, Best Practices, SEO"]
    end

    EnvCheck --> Stage1
    Stage1 --> Stage2
    Stage2 --> Stage3
    Stage3 --> Stage4
    Stage4 --> QualityReport(["Comprehensive Quality Report<br/>test-results/quality-report.md"])
```
