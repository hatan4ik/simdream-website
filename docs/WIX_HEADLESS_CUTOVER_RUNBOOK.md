# Wix Headless Cutover Runbook

This runbook prepares the current SimDream **self-managed Next.js frontend** to use the existing Wix Headless site as a business backend. It does not replace the frontend design, modify Wix data, enable a payment provider, or make Wix the booking writer by itself.

The current live authority remains the Next.js, Supabase, and Stripe flow. Wix activity stays read-only until the explicit pilot steps below are approved and implemented through the existing checkout ports.

## 1. Safety boundary

- Keep the SimDream React/Next.js product, scheduling, five-language UX, and guest-first experience.
- Use Wix native Bookings, Members, Pricing Plans, dashboard operations, hosted checkout, and PayPlus configuration where they fit.
- Never put a Wix client secret, API key, PayPlus credential, or privileged Wix token in the browser, repository, `.env.example`, or application logs.
- A guest must always be able to start a one-off booking without registration. Member identity may grant access to the matching customer's orders; it must never expose purchases by an unauthenticated email lookup.
- A browser return from Wix checkout is not confirmation. The trusted server must verify the provider's confirmed booking/order state before showing a paid or confirmed result.
- Keep `WIX_SHADOW_READS_ENABLED=false` unless diagnostic traffic is explicitly desired. Shadow reads are anonymous, redacted, and never create a booking or payment.

## 2. Automated read-only readiness gate

Run this command from the repository root after any Wix catalogue or plan change:

```bash
npm run wix:readiness
```

It uses the public Wix visitor client and exits non-zero when any of these gates fail:

| Gate | What is checked | Why it blocks activation |
| --- | --- | --- |
| Headless connection | `NEXT_PUBLIC_WIX_CLIENT_ID` is configured and public service reads succeed | The frontend cannot safely use Wix without a visitor session. |
| Bookings parity | Every local package is mapped and its Wix service name, base duration, and base price match | A customer must never be shown one offer and reserve another. |
| Subscription-plan resolvability | Each of the four local subscriptions resolves to one public Wix Pricing Plan | A checkout redirect must target an explicit, published plan. |

The command performs no write: it does not publish a service or plan, create a checkout session, charge a card, alter availability, or turn on a feature flag. A non-zero result is an intentional stop signal, not a runtime outage.

`npm run wix:smoke` remains a narrower diagnostic for services and next-day availability. The readiness command is the launch gate.

## 3. Configuration ownership

Copy the names below into the appropriate deployment environment only. Values are intentionally not stored in the repository.

| Variable or setting | Owner | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WIX_CLIENT_ID` | Headless client configuration / frontend environment | Public Wix OAuth client identifier for anonymous visitor calls. |
| `WIX_SITE_ID` | Frontend environment | Informational identifier for the dedicated Sim Dream Israel Headless site. |
| `WIX_PLAN_ID_FOUNDATIONS_5X60` | Trusted server environment | Immutable Wix plan ID for Flight Foundations. |
| `WIX_PLAN_ID_ADVANCED_5X90` | Trusted server environment | Immutable Wix plan ID for Advanced Captain. |
| `WIX_PLAN_ID_ATPL_10X60` | Trusted server environment | Immutable Wix plan ID for ATPL Concepts. |
| `WIX_PLAN_ID_AIRLINE_10X90` | Trusted server environment | Immutable Wix plan ID for Airline Readiness. |
| `WIX_SHADOW_READS_ENABLED` | Frontend/server environment | Optional diagnostic switch. Default is `false`. |
| Wix client secret, API key, privileged token | Wix or server-side secret manager only | Required only for approved privileged operations; never a browser value. |
| PayPlus credentials | Wix payment settings only | Wix-hosted checkout payment-provider configuration; never this app. |

Plan IDs are not treated as credentials, but they remain server-side so checkout mapping is managed with the trusted deployment configuration. Dynamic public-plan lookup is retained as a convenience; an explicit immutable mapping is the production preference.

## 4. Wix Dashboard preparation checklist

Complete these steps in a **staging Headless site** first. Do not test against production customer capacity or live payment details.

### Bookings catalogue

1. Open the dedicated Headless site's Bookings services.
2. Keep the service IDs already mapped in `lib/wix/catalog.ts`; do not create duplicate services for the same local package.
3. Correct any readiness mismatch in the Wix service or in the server-authoritative local catalogue through an approved product decision. The known simulator offers are defined locally; never silently change price or duration only in Wix.
4. Set each pilot service to a publicly bookable appointment configuration with the approved staff/resource, operating hours, buffers, cancellation policy, currency, and ILS price.
5. Re-run `npm run wix:readiness` and save the output in the change record. It must report catalog alignment before a Bookings pilot.

### Pricing Plans subscriptions

Create one public, purchasable **single-payment, 12-month** plan per approved offer. Do not describe a plan as recurring unless its renewal, price, cancellation policy, and PayPlus recurring-payment support have separately been approved.

| Local ID | Customer-facing plan | Sessions | Price (ILS) | Base package |
| --- | --- | ---:| ---:| --- |
| `flight-foundations-5x60` | Flight Foundations Subscription | 5 × 60 min | 2,750 | Captain's Command 60 |
| `advanced-captain-5x90` | Advanced Captain Subscription | 5 × 90 min | 3,390 | Ultimate 90 |
| `atpl-concepts-10x60` | ATPL Concepts Subscription | 10 × 60 min | 4,850 | Captain's Command 60 |
| `airline-readiness-10x90` | Airline Readiness Subscription | 10 × 90 min | 5,950 | Ultimate 90 |

For every plan, publish the five-language customer terms and make these limitations explicit: simulator education is not logged flight time, a licence, type rating, airline assessment credit, or employment guarantee. Training topics may include Cold & Dark, Crosswind/IFR, and Extreme Airports only as instructor-led themes until an entitlement decision states whether they consume time or price separately.

After publication, copy each immutable Wix plan ID into the matching trusted server environment variable. Do not infer a paid plan only from a price match in production. Re-run `npm run wix:readiness`; all four plans must resolve.

### Headless redirect and payment settings

1. In the Headless client's authentication settings, add the exact HTTPS frontend origins for staging and production. Add exact login callback URLs only for routes the app actually owns.
2. Permit the hosted-checkout return domain for the current frontend. Use the deployed origin—not a path, wildcard, unrelated domain, or development URL in production.
3. Configure PayPlus within Wix using its sandbox/test configuration in staging. Complete a non-charging or test-card payment, cancellation, and failure recovery path before live credentials are considered.
4. Verify Wix Members behavior: optional sign-in must not prevent a guest from starting a one-off Bookings checkout. The member view must only reveal that member's authorised history.

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

## 7. What this preparation deliberately does not do

- It does not write, seed, delete, publish, or alter data in Wix.
- It does not add a Wix booking writer, migrate historical Supabase/Stripe records, or change the current checkout authority.
- It does not activate PayPlus or hold its credentials.
- It does not claim that a plan purchase automatically creates usable flight credits. That requires the entitlement ledger in Stage 4.

For the long-form architecture, data-migration principles, and system diagrams, see [WIX_HEADLESS_ARCHITECTURE.md](WIX_HEADLESS_ARCHITECTURE.md). The current codebase blueprint remains [GENESIS.md](../GENESIS.md).
