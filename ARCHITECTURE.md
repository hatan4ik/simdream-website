# SimDream LTD — Visual Architecture & System Design

Visual architecture documentation for **Sim Dream LTD** (`simdream.co.il`), Boeing 737 Flight Simulation Center, Tel Aviv.

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Client & User Interface Layer"]
        User["Visitor / Pilot Candidate"]
        ThemeEngine["Dual UX Engine<br/>🌙 Cockpit Night / ☀️ Brand Daylight<br/>Sim Dream cerulean #2096C7 + orange #FF5500"]
        I18nEngine["5-Language Engine (i18n)<br/>HE (RTL) • AR (RTL) • EN • RU • FR"]
        StorefrontUI["Dual Booking Storefront<br/>Amazon 1-Page Storefront / 3-Step Wizard"]
    end

    subgraph RoutingLayer["Edge Routing & Next.js 16 App Router"]
        CanonicalRedirects["Canonical 301 Permanent Redirects<br/>/about, /simulator, /training ➔ /pro"]
        PublicPages["Public Pages<br/>/ • /pro • /experiences • /book<br/>/workshops • /vouchers • /contact"]
        MemberPages["Member Dashboard<br/>/dashboard • /login • /auth"]
        AdminPages["Admin Dispatch Hub<br/>/admin (Bookings, Vouchers, CRM)"]
    end

    subgraph BusinessLogic["Core Business Logic & Engines"]
        NoiseFreeAdapter["Noise-Free Booking Adapter<br/>Suppresses recreational add-ons for PRO & Fear of Flying"]
        KantorovichEngine["Tiled Interval Scheduler Engine<br/>lib/scheduler/kantorovich-engine.ts"]
        MissionCalc["Mission Calculator<br/>Flight time + Addons + Voucher Manifest"]
        ReviewsCache["Google Reviews ISR Cache<br/>24h Revalidation & Length Sort"]
    end

    subgraph APILayer["Next.js Serverless API Routes"]
        SlotsAPI["GET /api/slots<br/>Capacity, Tiled Grid & Availability"]
        PackagesAPI["GET /api/packages<br/>Authoritative Catalog & Tariffs"]
        CheckoutAPI["POST /api/checkout<br/>Server Validation & Stripe Session"]
        StripeWebhook["POST /api/webhooks/stripe<br/>Cryptographic Signature Verification"]
        MemberAPI["GET /api/my-bookings<br/>Protected Member Bookings & Receipts"]
    end

    subgraph PersistenceLayer["Persistence & External Services"]
        SupabaseDB[("Supabase PostgreSQL<br/>Row-Level Security & Exclusion Constraints")]
        InMemoryFallback[("In-Memory Store Fallback<br/>Local Dev & Non-500 Demo Resilience")]
        StripeService["Stripe Hosted Checkout<br/>Credit Cards & Apple Pay"]
        GooglePlaces["Google Places API<br/>Live 4.9★ Reviews Ticker"]
    end

    User --> ThemeEngine --> I18nEngine --> StorefrontUI
    StorefrontUI --> CanonicalRedirects --> PublicPages
    PublicPages --> NoiseFreeAdapter
    PublicPages --> MemberPages
    PublicPages --> AdminPages

    StorefrontUI --> SlotsAPI
    StorefrontUI --> PackagesAPI
    StorefrontUI --> CheckoutAPI

    SlotsAPI --> KantorovichEngine
    CheckoutAPI --> MissionCalc
    PublicPages --> ReviewsCache --> GooglePlaces

    KantorovichEngine --> SupabaseDB
    KantorovichEngine -.->|If unconfigured| InMemoryFallback
    CheckoutAPI --> StripeService
    StripeService --> StripeWebhook --> SupabaseDB
    MemberPages --> MemberAPI --> SupabaseDB
```

---

## 2. Adaptive Booking Engine Architecture (Recreational vs Noise-Free PRO)

```mermaid
flowchart TD
    Start(["User Lands on Booking Engine (/book)"]) --> DetectPackage{"Package Category Check"}

    subgraph NoiseFreeFlow["Noise-Free 2-Step Flow (PRO & Fear of Flying)"]
        DetectPackage -->|category = 'training' (PRO)| ProConfig["Auto-Select: PRO Tiers (60/90/120 PRO)<br/>Pilot Level: ATPL"]
        DetectPackage -->|category = 'fear_of_flying'| FearConfig["Auto-Select: Fear of Flying Course<br/>Pilot Level: Beginner"]
        ProConfig --> Step1Pro["Step 1: Date & Operational Slot Selection"]
        FearConfig --> Step1Pro
        Step1Pro --> SuppressAddons["Step 2 Suppressed (Zero Recreational Add-ons)<br/>addons = []"]
        SuppressAddons --> Step3Pro["Step 2 (Direct): Pilot Manifest & Checkout"]
    end

    subgraph RecreationalFlow["Full 3-Step Storefront Flow (Recreational / Consumer)"]
        DetectPackage -->|category = 'recreational'| RecConfig["Display Full Catalog (20m, 45m, 60m, 90m)<br/>User Selects Pilot Level"]
        RecConfig --> Step1Rec["Step 1: Date & Slot Selection<br/>(Live Runway Capacity Bar)"]
        Step1Rec --> Step2Rec["Step 2: Cockpit Add-ons & Combos<br/>(Cold & Dark, 7 World Trios, 4K Video)"]
        Step2Rec --> Step3Rec["Step 3: Pilot Manifest & Checkout<br/>(Voucher Reapply & Manifest Summary)"]
    end

    Step3Pro --> SubmitCheckout(["POST /api/checkout"])
    Step3Rec --> SubmitCheckout
```

---

## 3. Kantorovich Tiled Interval Scheduler Architecture

```mermaid
flowchart LR
    subgraph Windows["1. Operating Windows"]
        SunThu["Sun–Thu: 10:00–23:00 (780m)"]
        Fri["Fri: 09:00–16:00 (420m)"]
        Sat["Sat: 19:00–24:00 (300m Prime-Time)"]
    end

    subgraph CapacityMap["2. Buffer Reservation Map"]
        B20["20 min Flight ➔ 45 min Block"]
        B45["45 min Flight ➔ 60 min Block (Daytime Only)"]
        B60["60 min Flight ➔ 75 min Block"]
        B90["90 min Flight ➔ 105 min Block"]
        B120["120 min Flight ➔ 150 min Block"]
    end

    subgraph ValidationEngine["3. Dynamic Programming Tile Engine"]
        Candidates["Generate 15-Minute Candidate Starts"]
        CollisionCheck{"Collides with Existing Booking?"}
        WindowCheck{"Exceeds Closing Time?"}
        PromoCheck{"45m Promo in Evening or Saturday?"}
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
    else Credit Card / Apple Pay Checkout
        Server->>DB: Create Pending Booking with UUID
        Server->>Stripe: Create Stripe Checkout Session (metadata: booking_id, slot_id)
        Stripe-->>Server: Checkout URL (stripe.com/pay/cs_test_...)
        Server-->>Browser: HTTP 200 { checkoutUrl: "https://checkout.stripe.com/..." }
        deactivate Server
        Browser-->>Customer: Redirect to Stripe Hosted Checkout
        Customer->>Stripe: Completes Card Payment
        Stripe-->>Customer: Redirects to /book/success?session_id=...

        Note over Stripe,Webhook: Asynchronous Secure Webhook
        Stripe->>Webhook: POST /api/webhooks/stripe (checkout.session.completed)
        activate Webhook
        Webhook->>Webhook: Verify Stripe-Signature header
        Webhook->>DB: UPDATE bookings SET status='confirmed', payment_status='paid'
        Webhook->>Admin: Live Realtime Broadcast to Dispatch Screen
        Webhook-->>Stripe: HTTP 200 { received: true }
        deactivate Webhook
    end
```
---

## 5. Bidirectional 5-Language Architecture (i18n)

```mermaid
flowchart TD
    subgraph LangContext["LanguageContext & Provider"]
        SelectedLang["Active Language State (stored in cookie/localStorage)"]
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
