# Wix Headless Cutover Runbook

This runbook prepares the current SimDream **self-managed Next.js frontend** to use the existing Wix Headless site as a business backend. It does not replace the frontend design or enable a payment provider by itself. On the confirmed staging site, Wix-native guest/member checkout is active for mapped one-service base flights.

With `WIX_AVAILABILITY_ADAPTER_ENABLED=true`, Wix Bookings is the calendar authority: `/api/slots` intersects the duration-aware zero-waste grid with Wix availability, the browser revalidates and creates the Wix booking before hosted checkout, and `POST /api/checkout` refuses a competing local booking. Local Supabase/Stripe checkout remains available only while that adapter is disabled or for domains not yet represented natively in Wix.

## 1. Safety boundary

- Keep the SimDream React/Next.js product, scheduling, six-language UX, and guest-first experience.
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
| Gift Card variant parity | The live Wix Gift Card product (`07209324-1536-4ca3-aad2-d8782d04398a`) carries all 7 signature design tiers (`50`, `100`, `200`, `300`, `500`, `700`, `1000` ILS) with their mapped variant UUIDs | Voucher checkout (`POST /api/checkout`) relies on exact preset variant UUIDs to display the buyer's chosen card artwork on Wix Checkout. |

The command performs no write: it does not publish a service or plan, create a checkout session, charge a card, alter availability, or turn on a feature flag. A non-zero result is an intentional stop signal, not a runtime outage.

`npm run wix:smoke` remains a narrower diagnostic for services and next-day availability. The readiness command is the launch gate.

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

For every plan, publish the six-language customer terms and make these limitations explicit: simulator education is not logged flight time, a licence, type rating, airline assessment credit, or employment guarantee. Training topics may include Cold & Dark, Crosswind/IFR, and Extreme Airports only as instructor-led themes until an entitlement decision states whether they consume time or price separately.

`npm run wix:readiness` currently resolves all four plans. Before production, set the four immutable plan IDs in the trusted server environment rather than relying on dynamic title/price lookup, then re-run the readiness gate.

### Headless redirect and payment settings

1. The staging OAuth app now allow-lists the exact hosted callback and preview wildcard for `/wix/members/callback`. For a new production origin, add its exact HTTPS callback before enabling member login; origin allow-listing alone is insufficient.
2. Permit the hosted-checkout return domain for the current frontend. Use the deployed origin—not a path, wildcard, unrelated domain, or development URL in production.
3. **Required blocker:** Configure an approved PayPlus provider inside Wix using merchant sandbox/test configuration. The staging site currently has no connected provider, and no published PayPlus App Market listing was discoverable through Wix's supported search API. Complete a non-charging or test-card payment, cancellation, and failure recovery path before live credentials are considered.
4. Wix Members is installed and the hosted callback is registered. Subscription purchase and usage are member-gated; active plans now link to a duration-matched `/book?subscription=wix` flow. It resolves a live strict-grid slot and opens member-bound Wix-hosted Bookings checkout; Wix verifies the benefit and consumes the credit. One-off booking remains guest-first. Verify hosted sign-in/register, plan purchase, covered-session checkout, cancellation, and member-order updates after each release.
5. The Wix availability adapter is implemented and enabled for staging. It can operate without copying a Supabase secret into the worker; it marks Wix as the authoritative calendar and blocks the local booking writer. Mapped base flights use native Wix reservation and hosted checkout. Map add-ons and on-request routes natively before enabling them in this mode.
6. The Headless frontend intentionally has no Wix AI Site-Chat integration. Its persistent contact route is the official WhatsApp action (`+972 55 507 1307`), rendered from `FACILITY_INFO.contact.whatsappHref`. Do not install or configure a separate chat widget for this customer journey.

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

## 8. Pre-payment release gate

The following is deliverable before a payment provider is attached. It separates
customer-trust and migration work from the later paid-order proof; a missing
PayPlus provider must never become an excuse to publish misleading content or
unverifiable customer flows.

### Customer-facing correctness

- The server-rendered default is Hebrew with `lang="he"` and `dir="rtl"`. A
  customer's explicit `simdream_lang` choice remains the only override and is
  persisted in browser local storage, not a public cookie. A bounded
  pre-hydration guard keeps the Hebrew server fallback off-screen until a saved
  language commits. Verify all six languages after every release.
- `/book` must never render a fabricated date. The calendar waits for the
  browser's Israel clock and shows its localized initializing state until the
  date is known; the raw page HTML must not contain `2099`.
- Gift recipient and sender fields retain the deliberately realistic preview
  defaults **Aviad Stern** and **Danielle Cohen**. They are editable before
  checkout and make the boarding-pass concept immediately understandable; they
  must never be presented as real customer data.
- A Wix Gift Card and a legacy `SD-VOUCH-*` voucher are different instruments.
  Do not promise native Gift Card issuance, partial redemption, expiry, refund,
  or balance transfer until the paid native issuance contract is tested. The
  browser may redeem an already-issued native card only through the Wix Cart V2
  calculation path, which returns the authoritative price and masks the code.
- The local flexible-voucher preview offers seven compact colour swatches. Its
  selected design is a closed server-validated ID, persisted as
  `gift_card_design_id` only after the local payment lifecycle starts, and is
  used in the signed webhook's activation email. This cannot be described as a
  Wix-native Gift Card design or issuance flow. Native media/product updates
  require a management key with **Manage eCommerce** and **Manage Media
  Manager** permission and the current Wix Gift Card product revision.

### Search and migration safety

- `*.wix-site-host.com` is a staging/preview delivery host. It is explicitly
  `noindex, nofollow, noarchive`; `simdream.co.il` remains the sole canonical
  production host.
- Do not publish hreflang declarations until every language has a distinct,
  crawlable URL and equivalent localized content. Five identical URLs are not
  five localized pages.
- The only legacy redirects safe to activate without losing intent are below.
  They are implemented in `next.config.mjs` and must retain a permanent status
  after the custom domain cutover.

| Legacy path | Destination | Status | Why it is safe |
| --- | --- | --- | --- |
| `/simulator`, `/training` | `/pro` | Active | Canonical professional-training route. |
| `/book-online` | `/book` | Active | Same appointment intent. |
| `/לקנות-כמתנה` | `/vouchers` | Active | Same gift-purchase intent. |
| `/cooperation` | `/workshops` | Active | Same B2B inquiry intent. |
| `/pricing-plans/list` | `/subscriptions` | Active | Dedicated subscription destination. |
| `/promotion` | Hold | Not implemented | Preserve until birthday/promotion terms, eligibility and automation are approved. |
| `/aerophobia` | Hold | Not implemented | Needs a dedicated, clinically safe fear-of-flying route; do not dilute it into a generic catalog. |
| `/blog`, `/post/:slug` | Hold | Not implemented | Export, publish, and map every article before redirecting traffic. |
| `/service-page/:slug` | Hold | Not implemented | Map each real legacy SKU one-to-one; never send an unknown paid offer to a default package. |
| `/en/*` and other legacy locale paths | Hold | Not implemented | Requires stable locale-prefixed routing, not a client-storage guess. |
| `gift.simdream.co.il/*` | Separate decision | Not implemented | It is an independent business/system migration, not a main-site catch-all. |

### Measurement contract

Instrumentation is not permission to label a click as a sale. The revenue event
is emitted **once**, only from a server-verified, settled order with the
provider's immutable order ID. All pre-payment funnel events are observational:

`landing_view` → `intent_lane_selected` → `package_selected` →
`availability_viewed` → `slot_selected` → `addon_viewed` → `addon_selected` →
`checkout_started` → `checkout_returned` → `booking_confirmed`.

For gifts add `gift_format_selected`, `gift_personalization_started`,
`gift_checkout_started`, and `gift_issued`. For subscriptions add
`subscription_selected`, `member_sign_in_started`, `plan_checkout_started`,
and `covered_session_requested`. Capture only the minimum non-identifying
context: route, locale, offer ID, amount/currency, and provider order ID after
settlement. Never send names, emails, telephone numbers, raw coupon codes, or
Gift Card bearer codes to analytics.

Before enabling GA4, Google Ads, or Meta conversion destinations, record the
provider, owner, consent basis, event identifier, deduplication rule and
reconciliation report. The acceptance criterion is exactly one settled-order
purchase conversion whose ILS value equals the authoritative ledger—not a
checkout button click or a Calendar appointment.

### Evidence checklist

Run these checks against the exact deployment candidate and save the output with
the release record:

```bash
npm run wix:readiness
npm run lint
npm run test:quick
npm run build
```

Then check the rendered deployment in a clean browser:

1. New visitor starts in Hebrew; switching to HE/EN/RU/FR/AR updates both
   document `lang` and `dir`, and survives a reload.
2. `/book` has no `2099` in its initial HTML, uses Israel dates, provides only
   open slots, and does not overwrite a package chosen on an unavailable date.
3. Each package duration uses its own reservation cadence; Friday/Saturday and
   promotion-day restrictions remain correct; no double-booking can be created.
4. Guest can reach a booking checkout without login; a member sees their own
   name and only their own sessions/plan data. Test two separate members and
   direct URLs to prove ownership isolation.
5. Voucher and Gift Card UI distinguish the instruments, retain the approved
   realistic preview names, and preserve form input after a declined or
   unavailable checkout.
6. Preview HTML has a production canonical only on the custom production domain,
   staging is noindex, the production sitemap contains every public canonical
   route, and each active redirect returns a permanent response.
7. Real-device iPhone Safari covers a 320px booking and voucher journey,
   including keyboard, RTL labels and 48px touch targets.

Items 3–5 that create or settle an order become payment-launch tests once the
provider is enabled. Until then, use only Wix sandbox/test data and immediately
cancel any temporary operational booking; never occupy real customer capacity
to prove a pre-production flow.

## 9. Disaster Recovery & Protected Wix-as-Code Provisioning (`npm run wix:provision`)

All Wix backend definitions (9 Bookings services, turnaround buffers, shared Boeing 737 simulator resource pool, 4 Pricing Plans, and 17 Gift Card preset variants including the 7 signature design media bindings) are codified in [`lib/wix/backend-blueprint.ts`](../lib/wix/backend-blueprint.ts) and audited by [`scripts/wix-provision.ts`](../scripts/wix-provision.ts).

### Why Accidental Backend Recreation Is Dangerous (Risks of Running a Restore by Mistake)

1. **Duplicate Services & Orphaned Bookings / Plan Benefits**: Calling `POST /_api/bookings/v2/services` or `POST /pricing-plans/v3/plans` against an already-populated Wix site creates duplicate services and plans with new UUIDs. Existing customer bookings stay bound to the old service IDs, active Pricing Plan benefit links break, and staff calendars split across duplicate services.
2. **Physical Simulator Capacity Desynchronization**: If a newly created service is not bound to the exact same shared `Boeing 737 Flight Simulator` resource type ID, a 60-minute booking and a 90-minute booking can double-book the physical simulator at the same time.
3. **Gift Card Variant UUID Churn**: Recreating or overwriting `presetVariants` on the Wix Gift Card product without preserving existing variant UUIDs invalidates `WIX_GIFT_CARD_VARIANT_IDS` in [`lib/wix/catalog.ts`](../lib/wix/catalog.ts), breaking signature card design selection in `/vouchers`.
4. **Cross-Site Contamination**: Running mutations against the live Wix Editor site (`simdream.co.il`) or the retired Headless site (`4c5e1c7a-163c-48ce-8278-cdc42e4deed4`) violates [`AGENTS.md` §6.7](../AGENTS.md).

### 5-Layer Safety Gate Built into `lib/wix/backend-blueprint.ts` & `scripts/wix-provision.ts`

To prevent any accidental backend recreation, `evaluateWixProvisionSafetyGate()` enforces five sequential locks:

1. **Lock 1 — Read-Only Default (`--dry-run`)**: Running `npm run wix:provision` (or `npm run wix:provision -- --dry-run`) performs **zero writes**. It queries the public visitor APIs and prints the reconciliation diff (`in_sync`, `create`, `update`).
2. **Lock 2 — Forbidden Site Denylist (`forbidden-site-id`)**: Hard-blocks the retired site ID `4c5e1c7a-163c-48ce-8278-cdc42e4deed4` and any missing `WIX_SITE_ID`.
3. **Lock 3 — Already-Provisioned Circuit Breaker (`already-provisioned`)**: If `planWixBackendProvisioning()` finds that the target Wix site already has all 9 services, the shared simulator resource pool, all 4 Pricing Plans, and all 7 signature Gift Card variants in sync (`alreadyFullyProvisioned === true`), `--apply` is **unconditionally blocked** even if all flags and keys are supplied.
4. **Lock 4 — Explicit Site Confirmation (`missing-site-confirmation`)**: Requires `--confirm-site-id=<exact-WIX_SITE_ID>` on the command line.
5. **Lock 5 — Environment Interlock & Ephemeral Admin Key (`missing-apply-interlock` / `missing-admin-api-key`)**: Requires both `WIX_PROVISION_ALLOW_APPLY=true` and an ephemeral `WIX_ADMIN_API_KEY` in the shell environment (never stored in `.env*` or committed to Git).

### Safe Audit Command (Read-Only)

```bash
npm run wix:provision
```

For the long-form architecture, data-migration principles, and system diagrams, see [WIX_HEADLESS_ARCHITECTURE.md](WIX_HEADLESS_ARCHITECTURE.md). The current codebase blueprint remains [GENESIS.md](../GENESIS.md).
