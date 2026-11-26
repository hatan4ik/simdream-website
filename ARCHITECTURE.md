# SimDream LTD — Visual Architecture & System Design

Visual architecture documentation for **Sim Dream LTD** (`simdream.co.il`), Boeing 737 Flight Simulation Center, Tel Aviv.

---

## 1. High-Level System Architecture

### 1A. Executive System Landscape (Human-Readable Overview)

A high-level view of how customers, flight candidates, instructors, and operational staff interact with the SimDream platform and its connected services:

```mermaid
flowchart TD
    User["Customer / Flight Candidate"] --> Storefront["SimDream Storefront<br/>Next.js 16 • React 19 • 7 Languages"]

    subgraph ExperienceTracks["Experience Portals"]
        Storefront --> RecTrack["Recreational Flights<br/>Discovery, Captain & Ultimate 737 Experiences"]
        Storefront --> ProTrack["Professional Training<br/>Airline Assessment Prep & Screening"]
        Storefront --> SubTrack["Annual Subscriptions<br/>Multi-Session Flight Training Passes"]
        Storefront --> B2BTrack["Corporate & Groups<br/>CRM Leadership & Team Workshops"]
    end

    subgraph CorePlatform["Core Platform Engines"]
        RecTrack --> Engine["Kantorovich Scheduler<br/>Zero-Waste Tiled Slot Allocation"]
        ProTrack --> Engine
        Engine --> BookingEngine["Adaptive Booking Engine<br/>Smart Duration Switching & Upgrades"]
    end

    subgraph BusinessCheckout["Checkout & Commerce"]
        BookingEngine --> WixHeadless["Wix Headless Cloud<br/>Primary Booking, Calendar & Member Area"]
        BookingEngine -.-> LegacyStripe["Stripe Payments<br/>Self-Hosted Backup Payment Path"]
        SubTrack --> WixHeadless
    end

    subgraph Management["Operations & Command Center"]
        Dispatcher["Flight Dispatcher"] --> AdminDeck["Dispatch Command Center<br/>Slot Management, Vouchers & Analytics"]
        AdminDeck --> Engine
    end
```

---

### 1B. System Topology & Component Graph (Professional Technical Deep-Dive)

The complete engineering topology mapping client UI layers, App Router pages, domain business logic, API route handlers, and backend persistence boundaries:

```mermaid
flowchart TD
    subgraph ClientLayer["Client and UI Layer"]
        UserNode["Visitor or Pilot Candidate"]
        BrandSystem["Official Brand Identity<br/>BrandLogo.tsx - Orange Plane and Cerulean Wordmark"]
        ThemeEngine["Triple Theme Engine<br/>Brand Daylight - Cockpit Night - Clean Studio"]
        I18nEngine["7-Language Engine<br/>HE and AR RTL - EN, RU, FR, ES, DE LTR"]
        HomeRouteGate["Modular Home Intent Gate (components/home/)<br/>HomeHero • HomeRouteGate • HomeHowItWorks<br/>HomeWhyUs • HomeFeaturedPackages • HomeCtaRibbon"]
        StorefrontUI["Adaptive Booking Storefront<br/>Recreational 3-Step Flow or PRO 2-Step Flow"]
        SubPortalUI["Subscriptions Portal<br/>Dedicated /subscriptions and /pro Tracks"]
    end

    subgraph RoutingLayer["Edge Routing and Next.js 16 App Router"]
        EdgeProxy["Edge Security & Locale Proxy (proxy.ts)<br/>Strict CSP Nonce Injection • Locale Rewriting (/en, /fr)<br/>Admin HTTP Basic Guard (requireAdmin)"]
        CanonicalRedirects["Configured 301 Permanent Redirects<br/>/simulator and /training -> /pro<br/>/aerophobia -> /fear-of-flying<br/>/book-online -> /book<br/>/pricing-plans/list -> /subscriptions"]
        PublicPages["Public Pages (20 Routes)<br/>/ (Home Route Gate with 6 Intent Funnels) • /about • /pro • /experiences • /book • /book/success<br/>/offers • /subscriptions • /subscriptions/thank-you • /workshops<br/>/vouchers • /ground-school • /contact • /rules • /privacy-policy<br/>/refund • /fear-of-flying • /blog • /post/(segments)"]
        MemberPages["Member Area (5 Routes)<br/>/dashboard • /login • /wix/members/callback<br/>Legacy /auth/callback • /auth/reset-password"]
        AdminPages["Admin Dispatch Command Center (4 Routes)<br/>/admin • /admin/bookings • /admin/vouchers • /admin/workshops"]
    end

    subgraph BusinessLogic["Core Business Logic and Engines"]
        NoiseFreeAdapter["Noise-Free Booking Adapter<br/>Suppresses recreational add-ons for PRO and Fear of Flying"]
        KantorovichEngine["Tiled Interval Scheduler Engine<br/>lib/scheduler/kantorovich-engine.ts"]
        MissionCalc["Mission Duration and Upgrade Calculator<br/>lib/scheduler/mission-upgrade-promo.ts"]
        WixPlansResolver["Wix Pricing Plans Resolver<br/>lib/wix/plans.ts"]
        ReviewsCache["Google Reviews Snapshot Cache<br/>lib/reviews/ - Israel window refresh with fallback"]
    end

    subgraph APILayer["Next.js Route Handlers (24 Route Files)"]
        BookingAPIs["Booking and Capacity APIs<br/>GET /api/slots • GET /api/packages<br/>POST /api/checkout • POST /api/webhooks/stripe"]
        SubscriptionAPIs["Subscription Checkout API<br/>POST and GET /api/subscriptions/checkout"]
        MemberAPIs["Member Profile and Receipts<br/>GET /api/my-bookings • GET /api/my-bookings/(ref)/receipt<br/>POST /api/membership/bootstrap"]
        ContentAPIs["Content and Offers APIs<br/>GET /api/blog • GET /api/offers/capabilities"]
        OperationsAPIs["Operational and Customer APIs<br/>GET/POST/PATCH /api/bookings • GET/POST/PATCH /api/vouchers<br/>POST /api/contact • GET/POST/PATCH /api/ground-school/inquiries<br/>GET/POST /api/refund-requests • POST /api/refund-requests/lookup<br/>GET/POST /api/reviews • POST /api/reviews/refresh • POST /api/workshops"]
        AdminAPIs["Admin Optimization APIs<br/>GET /api/admin/schedule-efficiency<br/>POST /api/admin/schedule-optimization"]
        WixAPIs["Wix Pricing and Booking APIs<br/>POST /api/wix/bookings/checkout • POST /api/wix/birthday/claim<br/>POST /api/wix/birthday-pricing/v1/calculate-price"]
    end

    subgraph PersistenceLayer["Persistence and External Services"]
        SupabaseDB[("Supabase PostgreSQL Production<br/>Row-Level Security and Exclusion Constraints")]
        InMemoryFallback[("In-Memory Store Fallback<br/>Local Dev and Demo Resilience")]
        StripeService["Stripe Hosted Checkout<br/>Legacy card payment flow and webhooks"]
        WixHeadless["Wix Headless Platform SDK<br/>Members, Calendar, Bookings, Pricing Plans"]
        GooglePlaces["Google Places and Translation API<br/>Twice-daily snapshot refresh"]
    end

    UserNode --> ThemeEngine --> I18nEngine
    I18nEngine --> HomeRouteGate
    I18nEngine --> StorefrontUI
    I18nEngine --> SubPortalUI

    HomeRouteGate --> EdgeProxy
    StorefrontUI --> EdgeProxy
    SubPortalUI --> EdgeProxy
    EdgeProxy --> CanonicalRedirects
    EdgeProxy --> PublicPages
    EdgeProxy --> MemberPages
    EdgeProxy --> AdminPages

    StorefrontUI --> BookingAPIs
    SubPortalUI --> SubscriptionAPIs
    PublicPages --> ContentAPIs

    BookingAPIs --> KantorovichEngine
    BookingAPIs --> MissionCalc
    SubscriptionAPIs --> WixPlansResolver
    BookingAPIs -.->|Wix-authoritative mode| WixAPIs

    BookingAPIs --> SupabaseDB
    BookingAPIs --> StripeService
    SubscriptionAPIs --> WixHeadless
    MemberAPIs --> WixHeadless
    AdminAPIs --> SupabaseDB
    OperationsAPIs --> SupabaseDB
    WixAPIs --> WixHeadless
    ContentAPIs --> ReviewsCache
    ReviewsCache --> GooglePlaces
```

### Edge Security & Request Proxy boundary (`proxy.ts`)

Next.js 16 request routing, security enforcement, and locale handling are anchored in [`proxy.ts`](proxy.ts) at the repository root:
1. **Per-Request Content Security Policy (CSP)**: Generates a cryptographically strong UUID base64 nonce (`x-nonce`) for every HTML document request, binding `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'` while allowing necessary image hosts (`lh3.googleusercontent.com`, `static.wixstatic.com`), connect hosts (`*.supabase.co`, `www.wixapis.com`, `edge.wixapis.com`), and Google Maps frames.
2. **Wix Multilingual Locale Routing**: Normalizes secondary locale URL paths (`/en/...`, `/fr/...`, etc.) to the internal Next.js route tree while setting the `x-simdream-locale` request header, isolating directionality and page state without duplicate routing trees.
3. **Admin Shell Protection**: Matches the `/admin` route family (`/admin`, `/admin/*`, `/admin.rsc`, and Next.js data routes) and enforces server-side HTTP Basic authentication via `requireAdmin(request)` before any page or handler evaluates.

### Checkout dependency boundary

`POST /api/checkout` is the legacy local Next.js checkout path. It calls the provider-neutral business service in `lib/booking/checkout-service.ts`, whose server composition binds Supabase, Stripe, SendGrid, and Supabase Auth. It preserves server-authoritative schedule, pricing, voucher, guest-checkout, and Stripe webhook rules. Outbound idempotent fetches enforce strict deadlines (`lib/http/timeouts.ts`: 5s member-token check, 8s Wix catalog/availability/calendar/Google, 20s availability query). `POST /api/checkout` overlaps member identity verification and voucher lookup with slot checking (preserving hold precedence and error priority), and dispatches voucher-funded confirmation emails as a post-response task via Next.js `after()` (`lib/booking/after-response.ts`). When `WIX_AVAILABILITY_ADAPTER_ENABLED=true`, that local writer refuses mapped base-flight checkout so that Wix-native browser checkout is the only writer for the same slot. The frontend's Wix path switches `/api/slots` to the upgraded duration's own schedule grid when a promotional tier bump-up activates (`resolveScheduleDurationMinutes()` + `SlotAdjustmentBanner`), revalidates the live slot (re-anchored around live bookings via `lib/wix/wix-blocked-bookings.ts` when the pricing provider is off, lengthening via `customerChoices.addOnIds` for duration add-ons, and surfacing `409`/`503` failures through `WixDraftPrepareError`), creates a Wix booking carrying native `bookedAddOns` (`lib/wix/native-addons.ts`), builds Cart V2 (skipping Wix Stores products for add-ons already booked natively; `WIX_ADDON_PRODUCT_IDS` remains a fallback for unmapped add-ons), calculates the cart, and opens Wix-hosted checkout. The repository proves this integration code and its flags—not that any external Wix payment/provider configuration is active.

### Wix Member identity and Flight Deck boundary

Wix Members is the primary login for the managed frontend. `/login`, subscription purchase and the subscription panel share a PKCE launch routine in `lib/auth/auth-context.tsx`; the Wix-hosted page returns to `/wix/members/callback`, which stores a tab-scoped member session and refreshes the React profile. Guest checkout does not depend on this state.

For `/dashboard`, the browser sends its short-lived member access token to `GET /api/my-bookings`. `lib/auth/request-auth.ts` validates that token with Wix's current-member endpoint before `lib/wix/member-bookings.ts` queries Calendar using `memberId/me`. The result is a read-only Wix appointment projection: title, status, date, time and duration only. The UI deliberately hides price, invoice, Stripe receipt and local boarding-pass actions for it; Calendar is not payment proof. Active Pricing Plan orders remain in the shared `WixMemberSubscriptionPanel`; local Stripe receipts continue through the legacy verified Supabase ownership path.

### Wix availability and shadow-read boundaries

When `WIX_SHADOW_READS_ENABLED=true`, a successful local booking initialization schedules a post-response diagnostic through Next.js `after()`. [`lib/wix/checkout-shadow.ts`](lib/wix/checkout-shadow.ts) queries only Wix Bookings' public service catalog and the mapped appointment service's availability for the already-selected local departure. It emits a redacted correlation event containing package/date/time, catalog-drift fields and match/mismatch status—never customer identity, voucher, booking-record, payment or card data.

The observer is strictly optional and non-blocking: disabled is the default; Wix failure is reduced to a diagnostic event; no Wix booking, checkout session, payment, member, voucher, coupon or CMS writer is reachable from the shadow interface. This describes the shadow path only. With `WIX_AVAILABILITY_ADAPTER_ENABLED=true`, the separate Wix-authoritative browser flow is allowed to create the mapped Wix booking and Cart V2 checkout, while the local writer is blocked. Stripe's signed webhook remains the only payment authority for the local path. The documented Wix Bookings endpoints are paginated so a comparison never silently uses only a partial availability result.

### Wix Pricing Plans & flight subscriptions checkout boundary

Flight tracks are single-payment, 12-month commercial packages: four consumer tracks (`flight-foundations-5x60`, `advanced-captain-5x90`, `atpl-concepts-10x60`, `airline-readiness-10x90`, sold on `/subscriptions`) and two PRO tracks (`pro-interview-3x90`, `pro-interview-5x60`, sold on `/pro#pro-tracks` only). Checkout does not run through the one-off simulator slot booking engine:
1. `POST /api/subscriptions/checkout` receives the validated subscription pass ID.
2. `lib/wix/plans.ts` resolves the matching Wix Pricing Plan (checking the static `WIX_PLAN_IDS` map, populated by the six individual `WIX_PLAN_ID_*` environment variables, then dynamically scanning live public plans by price and title pattern).
3. `createPlanCheckoutUrl()` calls `@wix/redirects` `client.redirects.createRedirectSession({ paidPlansCheckout: { planId } })` with `thankYouPageUrl: /subscriptions/thank-you` and `postFlowUrl: /subscriptions`.
4. If a plan is not yet published in Wix, the API gracefully falls back to Captain Dispatch (`/contact?subject=subscription&plan=...&notice=dispatch_assisted`) rather than failing closed with HTTP 500.

---

## 2. Adaptive Booking Engine Architecture (Recreational vs Noise-Free PRO vs Subscriptions)

### 2A. The 3 Customer Booking Journeys (Human-Readable Overview)

```mermaid
flowchart TD
    Customer["Customer visits Booking Engine"] --> ChooseTrack{"Select Flight Track"}

    subgraph TrackA["Recreational Flights (3-Step Storefront)"]
        ChooseTrack -->|Recreational| Step1A["1. Select Date and Time<br/>Live capacity indicators"]
        Step1A --> Step2A["2. Add Cockpit Missions<br/>Cold and Dark, Crosswind, Extreme Airports"]
        Step2A --> UpgradeAlert{"Promotional Upgrade?"}
        UpgradeAlert -->|Yes| BumpNotice["Smart Tier Bump-up<br/>Auto-upgrades package and switches grid"]
        UpgradeAlert -->|No| Step3A
        BumpNotice --> Step3A["3. Pilot Manifest and Payment<br/>Wix Hosted Checkout"]
    end

    subgraph TrackB["Commercial PRO and Fear of Flying (Serene 2-Step)"]
        ChooseTrack -->|Professional or Therapy| Step1B["1. Operational Slot Selection<br/>Zero consumer add-on distractions"]
        Step1B --> Step2B["2. Pilot Manifest and Confirm<br/>Serene noise-free checkout"]
    end

    subgraph TrackC["Multi-Session Subscriptions (1-Click Portal)"]
        ChooseTrack -->|Annual Subscription| SubPick["Select Flight Pack<br/>5x60m, 5x90m, 10x60m, or 10x90m"]
        SubPick --> SubPay["Wix Pricing Plans Checkout<br/>Instant account credentialing"]
    end
```

---

### 2B. Adaptive Booking Pipeline & Upgrade State Machine (Professional Deep-Dive)

```mermaid
flowchart TD
    Start["User Lands on /book or /subscriptions"] --> DetectPackage{"Package Category Check"}

    subgraph NoiseFreeFlow["Noise-Free 2-Step Flow (PRO and Fear of Flying)"]
        DetectPackage -->|category = training| ProConfig["Auto-Select: PRO Tiers (60/90/120 PRO)<br/>Pilot Level: ATPL"]
        DetectPackage -->|category = fear_of_flying| FearConfig["Auto-Select: Fear of Flying Course<br/>Pilot Level: Beginner"]
        ProConfig --> Step1Pro["Step 1: Date and Operational Slot Selection"]
        FearConfig --> Step1Pro
        Step1Pro --> SuppressAddons["Step 2 Suppressed: Zero Recreational Add-ons<br/>Addon array forced empty"]
        SuppressAddons --> Step3Pro["Step 2 Direct: Pilot Manifest and Checkout"]
    end

    subgraph RecreationalFlow["Full 3-Step Storefront Flow (Recreational Consumer)"]
        DetectPackage -->|category = recreational| RecConfig["Display Full Catalog: 30m, 45m, 60m, 90m, 120m"]
        RecConfig --> Step1Rec["Step 1: Date and Slot Selection<br/>Live Runway Capacity Bar"]
        Step1Rec --> Step2Rec["Step 2: Cockpit Add-ons and Upgrades<br/>Max 2 mission add-ons via mission-upgrade-promo.ts"]
        Step2Rec --> GridSwitchCheck{"Promotional Bump-Up Triggered?"}
        GridSwitchCheck -->|30m+1 to 60m, 45m/60m+1 to 90m, any+2 to 120m| ResolveGrid["Option A Grid Duration Switching<br/>resolveScheduleDurationMinutes and SlotAdjustmentBanner"]
        GridSwitchCheck -->|No add-on upgrade| Step3Rec["Step 3: Pilot Manifest and Checkout"]
        ResolveGrid --> Step3Rec
    end

    subgraph SubscriptionFlow["Annual Subscriptions Flow (/subscriptions)"]
        DetectPackage -->|category = subscriptions| SubConfig["Display 4 Consumer and 2 PRO Tracks<br/>12-Month Validity - Airline Pilot Coaching"]
        SubConfig --> SubAction["User clicks Buy Subscription"]
        SubAction --> SubCheckout["POST /api/subscriptions/checkout"]
    end

    Step3Pro --> SubmitCheckout["Checkout Handoff<br/>Wix native when enabled - legacy /api/checkout otherwise"]
    Step3Rec --> SubmitCheckout
    SubCheckout --> WixRedirectFlow["Wix Pricing Plans Hosted Checkout via redirects API"]
```

---

## 3. Kantorovich Tiled Interval Scheduler Architecture

### 3A. Zero-Waste Scheduling Principle (Human-Readable Overview)

```mermaid
flowchart LR
    subgraph DailyHours["Operating Window"]
        DailyTime["09:00 to 24:00 Daily<br/>15 Hours (900 Minutes) Continuous Cockpit Availability"]
    end

    subgraph BufferMath["Turnaround Buffer Math"]
        FlightDuration["Flight Session<br/>30m, 45m, 60m, 90m, 120m"] --> AddBuffer["Turnaround Buffer<br/>+15m standard, +30m for 120m Grand Tour"]
        AddBuffer --> TotalBlock["Total Reserved Block<br/>45m, 60m, 75m, 105m, 150m"]
    end

    subgraph ZeroWaste["Zero-Waste Slot Optimization"]
        TotalBlock --> Algorithm["Dynamic Programming Tiling<br/>Validates that remaining time slots stay sellable"]
        Algorithm --> Outcome1["Perfect Slot Fit -> Green Instant Booking"]
        Algorithm --> Outcome2["Orphan Gap Avoided -> Refuses Fragmentation"]
    end
```

---

### 3B. Dynamic Programming Tiling Engine Pipeline (Professional Deep-Dive)

```mermaid
flowchart LR
    subgraph Windows["1. Operating Windows"]
        AllDays["Sun-Sat: 09:00-24:00 (900 min capacity)"]
    end

    subgraph CapacityMap["2. Buffer Reservation Map"]
        B30["30 min Flight -> 45 min Block"]
        B45["45 min Flight -> 60 min Block (Daytime Only)"]
        B60["60 min Flight -> 75 min Block"]
        B90["90 min Flight -> 105 min Block (Flat ₪850 Tariff)"]
        B120["120 min Flight -> 150 min Block"]
        B240["240 min Workshop -> 255 min Block"]
    end

    subgraph ValidationEngine["3. Dynamic Programming Tile Engine"]
        Candidates["Generate 15-Minute Raster Candidate Starts<br/>Reconnected at booking boundaries via wixBlockedBookings"]
        CollisionCheck{"Collides with Existing Booking?"}
        WindowCheck{"Exceeds Closing Time?"}
        PromoCheck{"45m Promo outside Sun-Tue daytime?"}
        ZeroWasteDP{"canTileIntervalZeroWaste and minSellableGaps<br/>Can free space stay sellable? Allows flush closing tail"}
    end

    subgraph FrontendState["4. Resilient Frontend UI"]
        SlotsAvailable["Slots Available -> Green Pills with Smart Pairing Badge"]
        SoldOutState["0 Slots Today -> Amber Badge in DOM<br/>Actionable Recovery: Check Next Day"]
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

## 4. Payment & Checkout Lifecycle Sequence Diagrams

### 4A. Primary Wix Headless Checkout Flow (Sequence Diagram)

When `WIX_AVAILABILITY_ADAPTER_ENABLED=true` (the production-standard configuration), booking checkout delegates to Wix Bookings, native duration-extending add-ons, and Wix Hosted Checkout:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Pilot
    participant Browser as Booking Front-End (/book)
    participant NextAPI as Next.js API (/api/wix/bookings/checkout)
    participant WixEngine as Wix Bookings and Cart V2
    participant HostedCheckout as Wix Hosted Checkout

    Customer->>Browser: Selects Package, Date, Slot and Add-ons
    Browser->>NextAPI: POST /api/wix/bookings/checkout (validate slot with upgraded duration)
    NextAPI->>WixEngine: Check live time slots and availability
    WixEngine-->>NextAPI: Confirms slot is unreserved and valid
    NextAPI-->>Browser: HTTP 200 { valid: true, slot, businessLocation }

    Browser->>WixEngine: Create draft Booking with native bookedAddOns
    Browser->>WixEngine: Create Cart V2 containing booking line item
    opt Wix Coupon or Gift Card entered
        Browser->>WixEngine: Apply Coupon or Gift Card to Cart V2
    end
    WixEngine-->>Browser: Calculated Cart total with server discounts
    Browser->>HostedCheckout: Redirect customer to secure Wix Hosted Checkout
    Customer->>HostedCheckout: Completes payment
    HostedCheckout-->>Browser: Redirects to /book/success with confirmed booking
```

---

### 4B. Legacy Supabase / Stripe Checkout Flow (Sequence Diagram)

This fallback flow applies only while `WIX_AVAILABILITY_ADAPTER_ENABLED` is disabled. When Wix authority is enabled, the local `POST /api/checkout` writer returns `409` rather than creating a competing reservation:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Pilot
    participant Browser as Storefront (/book)
    participant Server as Next.js API (/api/checkout)
    participant DB as Supabase PostgreSQL Database
    participant Stripe as Stripe Payment Gateway
    participant Webhook as Next.js Webhook (/api/webhooks/stripe)
    actor Admin as Admin Dispatch Board

    Customer->>Browser: Selects Package, Slot, Manifest and Clicks Checkout
    Browser->>Server: POST /api/checkout (manifest and choices without price authority)

    activate Server
    Server->>DB: Fetch authoritative price, slot capacity and existing bookings
    Server->>Server: Recalculate duration, end time and price on server

    alt Fully Funded Voucher Applied
        Server->>DB: Mark Voucher Redeemed and Create Confirmed Booking
        Server-->>Browser: HTTP 201 { success: true, bookingReference: "SD-..." }
        Browser-->>Customer: Redirect to /book/success
    else Card Payment Required
        Server->>DB: Create Pending Booking with UUID
        Server->>Stripe: Create Stripe Checkout Session (metadata: booking_id, slot_id)
        Stripe-->>Server: Checkout URL
        Server-->>Browser: HTTP 201 { checkoutUrl: "https://checkout.stripe.com/..." }
        deactivate Server
        Browser-->>Customer: Redirect to Stripe Hosted Checkout
        Customer->>Stripe: Completes Card Payment
        Stripe-->>Customer: Redirects to /book/success with session parameters

        Note over Stripe,Webhook: Asynchronous Secure Webhook
        Stripe->>Webhook: POST /api/webhooks/stripe (checkout.session.completed)
        activate Webhook
        Webhook->>Webhook: Verify Stripe-Signature header
        Webhook->>DB: Update booking to confirmed and payment to paid
        Admin->>Server: Refreshes dispatch board through protected APIs
        Webhook-->>Stripe: HTTP 200 { received: true }
        deactivate Webhook
    end
```

---

### 4C. Wix Pricing Plans & Subscriptions Checkout Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Pilot
    participant Browser as Storefront (/subscriptions or /pro)
    participant API as Next.js API (/api/subscriptions/checkout)
    participant WixClient as Wix Client (lib/wix/plans.ts)
    participant Wix as Wix Headless (Pricing Plans V3)
    participant Payment as Wix Hosted Checkout
    participant Return as Browser (/subscriptions/thank-you)

    Customer->>Browser: Selects Subscription (e.g. 5x90 Advanced Captain) and Clicks Buy
    Browser->>API: POST /api/subscriptions/checkout { planId: "advanced-captain-5x90" }
    activate API
    API->>WixClient: resolveWixPlanId("advanced-captain-5x90")
    WixClient->>Wix: Query Public Plans (matching price ₪3,390 or title)
    Wix-->>WixClient: Returns Plan GUID or matches static WIX_PLAN_IDS
    WixClient->>Wix: client.redirects.createRedirectSession({ paidPlansCheckout: { planId } })
    Wix-->>WixClient: Returns redirect session with full URL
    WixClient-->>API: Returns hosted checkout URL
    API-->>Browser: HTTP 200 { checkoutUrl: "https://...wix-site-host.com/..." }
    deactivate API
    Browser-->>Customer: Redirects customer to hosted payment page
    Customer->>Payment: Completes payment with configured provider
    Payment-->>Return: Redirects to /subscriptions/thank-you with planOrderId
    Return-->>Customer: Renders confetti and session scheduling instructions
```

---

## 5. Bidirectional 7-Language Architecture (i18n)

### 5A. Multilingual User Experience (Human-Readable Overview)

```mermaid
flowchart TD
    UserLang["Visitor selects preferred language"] --> LangSwitch["Instant Client Language Switcher"]

    subgraph RTLGroup["Right-to-Left (RTL) Layouts"]
        LangSwitch --> HE["Hebrew (Default)<br/>Natural right-to-left layout and typography"]
        LangSwitch --> AR["Arabic<br/>Natural right-to-left layout and typography"]
    end

    subgraph LTRGroup["Left-to-Right (LTR) Layouts"]
        LangSwitch --> EN["English"]
        LangSwitch --> RU["Russian"]
        LangSwitch --> FR["French"]
        LangSwitch --> ES["Spanish"]
        LangSwitch --> DE["German"]
    end

    subgraph TelemetryRule["Aviation Telemetry Exception"]
        HE -.-> CockpitData["Aviation METAR Weather, Radio Frequencies and Slots<br/>Always strictly rendered in LTR for international aviation compliance"]
        AR -.-> CockpitData
    end
```

---

### 5B. Technical i18n Engine & Directionality Isolation (Professional Deep-Dive)

```mermaid
flowchart TD
    subgraph LangContext["LanguageContext and Provider"]
        SelectedLang["Active Language State stored in localStorage"]
    end

    subgraph Languages["Supported 7 Languages"]
        HE["Hebrew: he - RTL - dir=rtl"]
        AR["Arabic: ar - RTL - dir=rtl"]
        EN["English: en - LTR - dir=ltr"]
        RU["Russian: ru - LTR - dir=ltr"]
        FR["French: fr - LTR - dir=ltr"]
        ES["Spanish: es - LTR - dir=ltr"]
        DE["German: de - LTR - dir=ltr"]
    end

    subgraph StrictRules["Architectural and Isolation Rules"]
        Rule1["No isRTL text hacks: Always query translations dictionary"]
        Rule2["Zero Unicode Contamination: Verified via automated regex scan"]
        Rule3["Telemetry Isolation: Aviation METAR, Frequencies and Slots in dir=ltr"]
    end

    subgraph Output["Localized View"]
        DOM["Clean DOM Render with Precise Typography and Directionality"]
    end

    SelectedLang --> HE
    SelectedLang --> AR
    SelectedLang --> EN
    SelectedLang --> RU
    SelectedLang --> FR
    SelectedLang --> ES
    SelectedLang --> DE

    HE --> StrictRules
    AR --> StrictRules
    EN --> StrictRules
    RU --> StrictRules
    FR --> StrictRules
    ES --> StrictRules
    DE --> StrictRules

    StrictRules --> DOM
```

---

## 6. Automated Quality Framework & Testing Pipeline (TESTING.md)

### 6A. From Commit to Release Quality Gates (Human-Readable Overview)

```mermaid
flowchart LR
    DevCommit["Code Commit"] --> Gate1["1. Fast Math and Typecheck<br/>Vitest 175 suites and TypeScript strict"]
    Gate1 --> Gate2["2. Sandboxed Production Build<br/>Isolated build to .next-test directory"]
    Gate2 --> Gate3["3. Real Browser Validation<br/>Playwright across 5 browsers and Axe-Core A11y"]
    Gate3 --> Gate4["4. Load and Web Vitals<br/>Autocannon concurrency and Lighthouse CWV"]
    Gate4 --> DeployProd["Safe Production Tag and Deployment"]
```

---

### 6B. Comprehensive Testing Topology (Professional Deep-Dive)

```mermaid
flowchart TD
    Trigger["npm run test:quick or npm run test:all"] --> EnvCheck["Sandboxed Test Environment<br/>NEXT_DIST_DIR=.next-test<br/>ALLOW_IN_MEMORY_STORE=true"]

    subgraph Stage1["1. Static and Fast Unit Verification (Vitest)"]
        Typecheck["TypeScript Strict Check via tsc --noEmit"]
        UnitTests["Vitest Projects (175 Suites, 3500+ Tests)<br/>Scheduling math and mission manifests<br/>i18n key parity and unicode purity<br/>Member auth ownership contracts<br/>Wix catalog and plans resolution"]
    end

    subgraph Stage2["2. Build and Artifact Verification"]
        SandboxedBuild["Next.js Sandboxed Build<br/>Output to .next-test (Never touches dev .next)"]
        ServerLaunch["Ephemeral Test Server Launch<br/>Isolated port with clean mock state"]
    end

    subgraph Stage3["3. Browser, Usability and Accessibility Suites (Playwright 10 Projects)"]
        BrowserProjects["5 Cross-Browser Projects<br/>Chromium • Firefox • WebKit • Mobile Chrome • Mobile Safari"]
        QualityProjects["5 Quality Dimension Projects<br/>a11y (Axe-Core automated audit, 0 violations)<br/>usability (header-fit, member-i18n, apple-web-app)<br/>security-web (CSP nonce, headers)<br/>resilience (network and timeout fallbacks)<br/>visual (cross-platform snapshots)"]
    end

    subgraph Stage4["4. Performance and Reliability Smoke"]
        LoadSmoke["Autocannon Load Smoke with 100 concurrency slot hammering"]
        LighthouseAudit["Lighthouse CWV Budgets: Performance, A11y, Best Practices, SEO"]
    end

    EnvCheck --> Stage1
    Stage1 --> Stage2
    Stage2 --> Stage3
    Stage3 --> Stage4
    Stage4 --> QualityReport["Comprehensive Quality Report<br/>test-results/quality-report.md"]
```
