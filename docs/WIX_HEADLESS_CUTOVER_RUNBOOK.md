# Wix Headless Cutover Runbook

This runbook prepares the current SimDream **self-managed Next.js frontend** to use the existing Wix Headless site as a business backend. It does not replace the frontend design or enable a payment provider by itself. On the confirmed staging site, Wix-native guest/member checkout is active for mapped one-service base flights.

With `WIX_AVAILABILITY_ADAPTER_ENABLED=true`, Wix Bookings is the calendar authority: `/api/slots` intersects the duration-aware zero-waste grid with Wix availability, the browser revalidates and creates the Wix booking before hosted checkout, and `POST /api/checkout` refuses a competing local booking. Local Supabase/Stripe checkout remains available only while that adapter is disabled or for domains not yet represented natively in Wix.

## 1. Safety boundary

- Keep the SimDream React/Next.js product, scheduling, five-language UX, and guest-first experience.
- Use Wix native Bookings, Members, Pricing Plans, dashboard operations, hosted checkout, and PayPlus configuration where they fit.
- Never put a Wix client secret, API key, PayPlus credential, or privileged Wix token in the browser, repository, `.env.example`, or application logs.
- A guest must always be able to start a one-off booking without registration. Member identity may grant access to the matching customer's orders; it must never expose purchases by an unauthenticated email lookup.
- A browser return from Wix checkout is not confirmation. The trusted server must verify the provider's confirmed booking/order state before showing a paid or confirmed result.
- Keep `WIX_SHADOW_READS_ENABLED=false` unless diagnostic traffic is explicitly desired. Shadow reads are anonymous, redacted, and never create a booking or payment.
- `WIX_AVAILABILITY_ADAPTER_ENABLED=true` is enabled on the staging Wix worker only. It makes Wix the sole calendar writer for mapped base-flight services: the browser revalidates and creates the native booking before Wix-hosted checkout, while the local checkout route rejects a duplicate writer. A separate member-only subscription redemption handoff resolves one strict-grid slot and opens Wix-hosted Bookings checkout, where Wix validates plan benefits and performs the reservation.

## 2. Automated read-only readiness gate

Run this command from the repository root after any Wix catalogue or plan change:

```bash
npm run wix:readiness
```

It uses the public Wix visitor client and exits non-zero when any of these gates fail:

| Gate | What is checked | Why it blocks activation |
| --- | --- | --- |
| Headless connection | `NEXT_PUBLIC_WIX_CLIENT_ID` is configured and public service reads succeed | The frontend cannot safely use Wix without a visitor session. |
| Bookings parity and capacity | Every local package is mapped, its Wix service name, base duration, and base price match, and every mapped service requires the same physical Boeing 737 resource type | A customer must never be shown one offer and reserve another, and a booking of one duration must block every other duration from using the physical simulator. |
| Subscription-plan resolvability | Each of the four local subscriptions resolves to one public Wix Pricing Plan | A checkout redirect must target an explicit, published plan. |

The command performs no write: it does not publish a service or plan, create a checkout session, charge a card, alter availability, or turn on a feature flag. A non-zero result is an intentional stop signal, not a runtime outage.

`npm run wix:smoke` remains a narrower diagnostic for services and next-day availability. The readiness command is the launch gate.

For Smart Chat, run the additional read-only visitor check:

```bash
npm run wix:chat:smoke
```

It verifies that the configured Headless client can call Wix AI Site-Chat's message API as an anonymous visitor. It creates no message and prints no customer data. A failure means the Wix AI Site-Chat app or its visitor permission/configuration is not ready; it must be corrected in Wix before the custom frontend panel is relied on.

## 3. Configuration ownership

Copy the names below into the appropriate deployment environment only. Values are intentionally not stored in the repository.

| Variable or setting | Owner | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WIX_CLIENT_ID` | Headless client configuration / frontend environment | Public Wix OAuth client identifier for anonymous visitor calls. |
| `WIX_SITE_ID` | Frontend environment | Informational identifier for the dedicated **SimDream-Staging** Headless site (`317b0c6d-6608-499a-bb3c-b1c37650e460`). |
| `WIX_PLAN_ID_FOUNDATIONS_5X60` | Trusted server environment | Immutable Wix plan ID for Flight Foundations. |
| `WIX_PLAN_ID_ADVANCED_5X90` | Trusted server environment | Immutable Wix plan ID for Advanced Captain. |
| `WIX_PLAN_ID_ATPL_10X60` | Trusted server environment | Immutable Wix plan ID for ATPL Concepts. |
| `WIX_PLAN_ID_AIRLINE_10X90` | Trusted server environment | Immutable Wix plan ID for Airline Readiness. |
| `WIX_SHADOW_READS_ENABLED` | Frontend/server environment | Optional diagnostic switch. Default is `false`. |
| `WIX_AVAILABILITY_ADAPTER_ENABLED` | Frontend/server environment | Optional calendar-read switch. It intersects Kantorovich slots with Wix Bookings availability; default is `false` outside staging. |
| Wix client secret, API key, privileged token | Wix or server-side secret manager only | Required only for approved privileged operations; never a browser value. |
| PayPlus credentials | Wix payment settings only | Wix-hosted checkout payment-provider configuration; never this app. |

Plan IDs are not treated as credentials, but they remain server-side so checkout mapping is managed with the trusted deployment configuration. Dynamic public-plan lookup is retained as a convenience; an explicit immutable mapping is the production preference.

## 4. Wix Dashboard preparation checklist

Complete these steps in a **staging Headless site** first. Do not test against production customer capacity or live payment details.

### Bookings catalogue — provisioned in staging

1. All nine services already exist on **SimDream-Staging**, and their IDs are mapped in `lib/wix/catalog.ts`. Do not create duplicates.
2. A single native Boeing 737 simulator resource type is required by every service. The 45-minute ₪490 Discounted Promotion is enforced by the headless availability and checkout resolver on Sunday–Tuesday before 18:00, then intersected with Wix's live availability; this restriction never creates a second hardware capacity pool or changes shared staff hours.
3. The operational hours, ILS price, base duration and turnaround buffer are configured and live-checked. `npm run wix:smoke` reports future bookable 60-minute slots and the shared capacity resource; `npm run wix:readiness` blocks a pilot if the shared capacity pool or catalog alignment drifts.
4. Correct any subsequent mismatch through an approved product decision. The known simulator offers remain defined locally; never silently change price or duration only in Wix.
5. Keep the duration-aware adapter aligned with the package reservation map: 30m → 45m, 45m → 60m, 60m → 75m, 90m → 105m, 120m → 150m. Wix may return a broader appointment raster, but it may only veto—not invent—customer-visible starts. Do not enable an unmapped add-on or route through a local fallback while Wix owns the calendar.

### Pricing Plans subscriptions

The four public, purchasable **single-payment, 12-month** plans below are already configured in staging and linked to their eligible native Bookings service. Do not describe a plan as recurring unless its renewal, price, cancellation policy, and PayPlus recurring-payment support have separately been approved.

| Local ID | Customer-facing plan | Sessions | Price (ILS) | Base package |
| --- | --- | ---:| ---:| --- |
| `flight-foundations-5x60` | Flight Foundations Subscription | 5 × 60 min | 2,750 | Captain's Command 60 |
| `advanced-captain-5x90` | Advanced Captain Subscription | 5 × 90 min | 3,390 | Ultimate 90 |
| `atpl-concepts-10x60` | ATPL Concepts Subscription | 10 × 60 min | 4,850 | Captain's Command 60 |
| `airline-readiness-10x90` | Airline Readiness Subscription | 10 × 90 min | 5,950 | Ultimate 90 |

For every plan, publish the five-language customer terms and make these limitations explicit: simulator education is not logged flight time, a licence, type rating, airline assessment credit, or employment guarantee. Training topics may include Cold & Dark, Crosswind/IFR, and Extreme Airports only as instructor-led themes until an entitlement decision states whether they consume time or price separately.

`npm run wix:readiness` currently resolves all four plans. Before production, set the four immutable plan IDs in the trusted server environment rather than relying on dynamic title/price lookup, then re-run the readiness gate.

### Headless redirect and payment settings

1. The staging OAuth app now allow-lists the exact hosted callback and preview wildcard for `/wix/members/callback`. For a new production origin, add its exact HTTPS callback before enabling member login; origin allow-listing alone is insufficient.
2. Permit the hosted-checkout return domain for the current frontend. Use the deployed origin—not a path, wildcard, unrelated domain, or development URL in production.
3. **Required blocker:** Configure an approved PayPlus provider inside Wix using merchant sandbox/test configuration. The staging site currently has no connected provider, and no published PayPlus App Market listing was discoverable through Wix's supported search API. Complete a non-charging or test-card payment, cancellation, and failure recovery path before live credentials are considered.
4. Wix Members is installed and the hosted callback is registered. Subscription purchase and usage are member-gated; active plans now link to a duration-matched `/book?subscription=wix` flow. It resolves a live strict-grid slot and opens member-bound Wix-hosted Bookings checkout; Wix verifies the benefit and consumes the credit. One-off booking remains guest-first. Verify hosted sign-in/register, plan purchase, covered-session checkout, cancellation, and member-order updates after each release.
5. The Wix availability adapter is implemented and enabled for staging. It can operate without copying a Supabase secret into the worker; it marks Wix as the authoritative calendar and blocks the local booking writer. Mapped base flights use native Wix reservation and hosted checkout. Map add-ons and on-request routes natively before enabling them in this mode.
6. Install and configure **Wix AI Site-Chat** in the Wix Editor control plane for the corresponding site. Configure its assistant source/content, business-hours handoff, contact form/escalation, welcome message, and any permitted suggested questions there. The stock Editor widget does not render on the Headless frontend; its supported visitor Messages APIs power the custom `WixSmartChat` panel instead. Run `npm run wix:chat:smoke` after every new environment or client-id change.

## 5. Staged cutover sequence

| Stage | Change | Required proof | Rollback |
| --- | --- | --- | --- |
| 0 — Baseline | No operational Wix writes | Current Supabase/Stripe checkout succeeds and existing tests pass | No action. |
| 1 — Read-only parity | Run readiness and, if approved, enable shadow reads in staging | `npm run wix:readiness` reports catalog alignment; no PII in observer logs | Set `WIX_SHADOW_READS_ENABLED=false`. |
| 2 — Booking pilot | Implement a Wix `CheckoutGateway` through `lib/booking/checkout-ports.ts` for one aligned non-production service | Guest happy path, failure, duplicate callback, staff-dashboard visibility, and trusted confirmation tests | Route the pilot back to the current Stripe gateway; do not delete Wix records. |
| 3 — Subscription redirect | Allow the existing subscription endpoint to redirect only to four resolved published plans | Hosted checkout success/cancel return plus server-side verified plan/order state | Keep Dispatch fallback; remove plan ID mapping or disable the pilot selection. |
| 4 — Entitlement ledger | Add an idempotent, server-side credit and expiry ledger before reservation | Each eligible reservation consumes exactly one approved credit; cancellation/expiry/duplicate events do not double-credit | Stop consumption, reconcile confirmed Wix orders, then repair with audited adjustments. |
| 5 — Production cutover | Make Wix the declared canonical writer for explicitly approved domains only | Staging acceptance, monitoring owner, backup, data map, and business sign-off | Route traffic to the last verified frontend release and reconcile records; never delete live orders. |

No stage authorises a permanent dual write. One booking domain has one canonical writer at a time.

## 6. Required proof before an active payment launch

- `npm run wix:readiness` passes against staging for the exact deployed configuration.
- `npm run lint`, `npm run test:quick`, and `npm run build` pass for the deployment commit.
- One guest booking and one member booking are tested end-to-end without using live customer data.
- Staff can find the booking/order in the Wix Dashboard and the frontend renders the correct authoritative pending, paid, cancelled, or failed state.
- The booking flow is verified in Hebrew, English, Russian, French, and Arabic; Hebrew/Arabic remain RTL while telemetry stays LTR.
- A documented failure, cancellation, timeout, duplicated-event, and rollback path exists.
- A business owner confirms payment settings, plan terms, refunds/cancellation policy, support ownership, and monitoring response.

## 7. What remains intentionally inactive

- The staging Bookings, resources, operating hours, Pricing Plans, and plan-to-service benefits are configured; no production-site Wix data was changed.
- It does not add a Wix booking writer, migrate historical Supabase/Stripe records, or change the current checkout authority.
- It does not activate PayPlus or hold its credentials, because no payment provider is currently connected.
- It does not claim that a plan purchase automatically creates usable flight credits. That requires the entitlement ledger in Stage 4.

For the long-form architecture, data-migration principles, and system diagrams, see [WIX_HEADLESS_ARCHITECTURE.md](WIX_HEADLESS_ARCHITECTURE.md). The current codebase blueprint remains [GENESIS.md](../GENESIS.md).
