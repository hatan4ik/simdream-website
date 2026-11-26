# SimDream System Map — Who Owns What

**Start here when you need to understand the website.** This is a plain-English ownership map, not a second Genesis document. [`GENESIS.md`](../GENESIS.md) remains the canonical reconstruction blueprint; this page tells a human where a feature lives and which system is responsible for it.

**Source reviewed:** `origin/main` at `e6c66668326a` (2026-11-15), with this reconciliation cross-checking the same code baseline. It describes code in this repository. It does **not** prove that a Wix setting, payment provider, or database secret is enabled in a deployed environment.

## The 30-second answer

SimDream is a Next.js website with a Wix Headless integration. The website users see is built in this repository. Wix is intended to own native bookings, carts, checkout, memberships, gift cards and plans when the Wix mode is enabled. Supabase/Stripe are an older, separate booking path retained for local/legacy operation.

```text
Customer
   │
   ▼
NEXT.JS FRONTEND ── displays pages, calendar, package choices and forms
   │
   ├── SIM DREAM SERVER ── validates input, calculates mission rules, protects APIs
   │       │
   │       ├── LEGACY PATH: Supabase + Stripe
   │       │
   │       └── WIX BRIDGE: reads Wix availability and prepares Wix checkout
   │
   └── WIX BACKEND ── Bookings, Cart, hosted checkout, Members, Gift Cards, Plans
```

### The most important rule

There are **two booking systems**, but only one must sell slots at a time:

| Active mode | Who owns the appointment and payment? | When to use it |
| --- | --- | --- |
| **Legacy mode** | This repository's API + Supabase + Stripe | Local development or a legacy deployment with Stripe/Supabase configured. |
| **Wix mode** | Wix Bookings + Wix Cart + Wix hosted checkout | The intended Wix Headless production design. The Next.js site remains the frontend. |

When `WIX_AVAILABILITY_ADAPTER_ENABLED=true`, Wix is the appointment authority and the local `/api/checkout` writer refuses to create a competing reservation. This is deliberate double-booking protection.

## What belongs where

| Business capability | What the customer sees | Frontend in this repository | SimDream server in this repository | Wix backend | Status from code |
| --- | --- | --- | --- | --- | --- |
| Marketing pages | Home, About, Experiences, PRO, Ground School | Yes — pages and components | SEO/structured-data helpers | No | Built |
| Languages, themes and mobile UI | Language selector, RTL, Studio/Daylight/Cockpit themes | Yes | Locale redirects/safe policy | Wix locale URL compatibility only | Built; seven selectable locales: `he`, `en`, `ru`, `fr`, `ar`, `es`, `de` |
| Customer contact | Persistent WhatsApp action | `components/layout/WhatsAppAction.tsx` | Builds the official WhatsApp destination | No | Built; Wix AI Site-Chat/SmartChat is not in the frontend, dependencies or smoke tooling |
| Package catalogue | Flight durations, prices, add-ons and PRO tiers | Shows registry values | Validates IDs and calculates mission | Maps eligible packages to Wix services/products | Built; Wix mappings need live reconciliation |
| Calendar | Week/month picker and open departure slots | Yes | Applies opening hours, turnaround and zero-waste rules | Supplies live bookable availability in Wix mode | Built; Wix live availability needs staging proof |
| Recreational add-ons | Route, mission and cockpit choices | Yes | Prevents illegal/over-capacity selections | Books native Wix Bookings add-ons (`bookedAddOns`) on a Wix-extended slot; priced by Wix as booking modifiers | Built; staging booking verified; production services need the same add-on groups |
| Booking checkout | “Secure checkout” handoff | Starts Wix visitor session/cart or legacy redirect | Revalidates slot and blocks unsafe path | Creates native Booking, Cart and hosted checkout | Code built; successful paid Wix E2E test still needed |
| Card payment | Hosted payment page | Redirect only | Legacy Stripe session/webhook handling | Wix payment provider/hosted checkout | Configuration-dependent |
| Gift certificate/card | Voucher purchase and balance check | Gift selection UI | Legacy voucher validation/redemption | Native Wix Gift Card checkout in Wix mode | Both paths exist; choose one per deployment |
| Birthday discount | Birthday entry and congratulation copy | Yes | Legacy calculation; signs Wix pricing proof | Optional Wix pricing-provider enforcement | Code exists; live Wix extension/config unverified |
| Returning-customer discount | Intended 5/7/10% reward | Copy/claim types only | No purchase-union lookup or tier issuer yet | No completed Wix order/contact lookup implementation | **Not delivered** |
| Login and member area | Sign in, dashboard, own appointments | Yes | Verifies identity and legacy ownership | Wix Members identity and Calendar projection | Built, but Wix dashboard does not yet provide Wix order/invoice history |
| Subscriptions / flight tracks | Pass cards and plan checkout CTA | Yes | Resolves pass and redirects when available | Wix Pricing Plans and benefits | UI/code exists; plan IDs/benefits/payment must be configured |
| Admin tools | Bookings, voucher terminal, workshops, capacity diagnostics | Staff pages | Basic auth, rate limits and admin APIs | None | Built for legacy data; not Wix Operations Manager replacement |
| Leads and requests | Contact, Ground School, workshop, refund requests | Forms | Validation, rate limit, email/store submission | No | Built; these are requests, not confirmed purchases |
| Google reviews | Header rating/review dropdown | Displays reviewed snapshot | Refresh/cache/translation logic | No | Built; Google credentials/snapshot store are deployment work |

## The customer booking journey, in simple terms

### In Wix mode — intended long-term design

```text
1. Customer chooses package/date/time on the Next.js website
2. Next.js asks Wix which slots are genuinely available
3. Customer chooses allowed add-ons on the Next.js website
4. Next.js verifies the exact selection with Wix
5. Browser creates Wix Booking + Wix Cart, then goes to Wix hosted checkout
6. Wix receives payment and owns the resulting Booking/Order
```

The customer should never need to know that Wix is behind the screen; it is the business backend.

### In legacy mode — existing fallback/older design

```text
1. Customer chooses package/date/time on the Next.js website
2. SimDream API calculates a valid slot and writes a pending Supabase booking
3. Customer pays through Stripe Checkout
4. Signed Stripe webhook marks the booking paid
```

The success page is never proof of payment. In legacy mode, the Stripe webhook is the payment authority.

## Wix: exactly what is implemented versus what still needs Wix setup

### Implemented in code

| Wix area | Repository bridge | What it does |
| --- | --- | --- |
| Headless site configuration | `wix.config.json`, `lib/wix/config.ts` | Targets the **SimDream-Staging** headless metasite `317b0c6d-6608-499a-bb3c-b1c37650e460`. This repo must not write to the live Editor site. |
| Service catalogue mapping | `lib/wix/catalog.ts` | Maps SimDream packages to Wix Bookings service IDs; `lib/wix/native-addons.ts` maps add-ons to native Wix Bookings add-on and group IDs (Stores products only for an add-on with no native mapping). |
| Live availability | `lib/wix/bookings.ts`, `lib/wix/availability-adapter.ts` | Reads Wix slot availability, then intersects it with the local safety scheduler. |
| Native booking/cart | `lib/wix/booking-checkout*.ts`, `lib/wix/booking-cart-create.ts` | Validates selection, creates a visitor-owned booking/cart and opens Wix hosted checkout. |
| Members | `lib/wix/member-*.ts` | Handles member identity and displays that member's Wix Calendar appointments. |
| Gift cards | `lib/wix/gift-cards.ts` | Locates/reconciles configured Wix gift-card variants and builds their checkout flow. |
| Pricing Plans | `lib/wix/plans.ts`, `subscription-*.ts` | Looks up plans and supports duration-matched subscription booking when Wix benefits are configured. |
| Birthday price provider | `lib/wix/birthday-pricing-*.ts` | Provides signed proof and server-side price calculation for a Wix pricing extension. |
| Operational checks | `readiness.ts`, `backend-blueprint.ts`, `npm run wix:smoke` | Reads mappings/readiness and keeps provisioning staging-scoped. |

### Requires Wix dashboard/configuration or staging evidence

| Required action | Why it matters |
| --- | --- |
| Create/publish all Booking services and their native add-on groups with the exact mappings | Add-on booking and package selection cannot work against missing or unpublished Wix records. |
| Turn on Wix Cart and configure a real payment provider | Native cart code cannot collect a payment until Wix itself is configured to do so. |
| Configure Bookings business/staff calendar and test slot creation | This is how Wix knows capacity and prevents real-life conflicts. |
| Configure Wix Members and member-area permissions | Enables reliable identity and customer-specific history. |
| Create/publish Pricing Plans and attach clear service benefits | A “subscription” card is not usable until a Wix plan gives a bookable benefit/credit. |
| Install/configure the birthday pricing extension and secret | The frontend must not promise an enforceable Wix discount until this is active. |
| Run a real staging booking → cart → payment → order/appointment test | The only reliable proof that all pieces work together. |

## What is frontend-only?

These features are visible on the website and mostly live in React/UI. They do not by themselves create a business record:

- Home/About/Experiences/PRO/Fear-of-Flying/Ground-School page presentation.
- Navigation, social links, language switcher, themes, responsive design and accessibility behavior.
- Package cards, “what's included” panels, route storytelling and add-on selection display.
- Calendar display controls, including week/month view. The actual availability decision remains server/Wix-owned.
- Forms before submission: contact, workshop, Ground School, refund request, booking manifest.
- Offer explanation and discount messaging. A displayed discount becomes real only when the server or Wix pricing provider validates it.

## What is SimDream server-only?

Customers never call these rules directly. They protect the business:

| Server responsibility | Main files | Why it exists |
| --- | --- | --- |
| Scheduling maths | `lib/scheduler/kantorovich-engine.ts`, `mission-calculator.ts` | Calculates session duration, turnaround, valid slots, add-on fit and server-authoritative totals. |
| Checkout safety | `lib/booking/checkout-service.ts`, `checkout-ports.ts` | Prevents customer-supplied price, forged add-ons, invalid route requests and unsafe local booking writes. |
| Authentication/ownership | `lib/auth/request-auth.ts`, `member-ownership.ts` | Stops one customer reading another customer's orders or receipts. |
| Admin protection | `lib/auth/admin-guard.ts` | Protects staff routes with Basic auth, origin checks and rate limiting. |
| Database persistence | `lib/db/store.ts`, `schema.sql`, `migrations/` | Stores legacy bookings, vouchers, staff inquiries, refunds, consent and review snapshots. |
| Stripe and email | `lib/stripe.ts`, `lib/sendgrid.ts` | Legacy payments/webhooks and transactional messages. |
| Reviews and SEO | `lib/reviews/*`, `lib/seo/*` | Controlled Google review refresh/translation and one registry-backed public SEO graph. |
| Outbound deadlines & concurrency | `lib/http/timeouts.ts`, `lib/booking/after-response.ts` | Enforces deadlines on idempotent reads (5s member, 8s Wix/Google, 20s availability query), overlapped checkout/slot reads, and post-response email dispatch. |

## File map: where to start changing something

| You want to change… | Start here | Do not forget |
| --- | --- | --- |
| Price, duration, allowed add-on | `lib/db/seed-data.ts` | Also reconcile `lib/wix/catalog.ts`; the UI must not hard-code prices. |
| Open hours, turnaround or calendar behavior | `lib/config/facility-info.ts` → `lib/scheduler/kantorovich-engine.ts` | Run scheduler and booking-horizon tests. |
| Book button or Wix checkout/cart | `components/booking/` → `lib/booking/client/` → `lib/wix/booking-checkout*.ts` | Test one real staging checkout before release. |
| A Wix Booking/Store/Plan identifier | `lib/wix/catalog.ts` | Run `npm run wix:smoke`; never point this repo at the live Editor site. |
| Membership/dashboard/receipt | `lib/auth/` and `app/api/my-bookings/` | Keep guest checkout and verified ownership rules. |
| Discount | `lib/discounts/birthday/` or `lib/wix/birthday-pricing-*.ts` | One winning discount only; do not trust browser arithmetic. |
| Customer copy or language | `lib/i18n/`, feature component | Supply all seven locales where the module requires parity and test RTL. Specialist catalog records may use the documented controlled English fallback for Spanish until authored Spanish copy is supplied. |
| Legal/refund rule | `lib/legal/`, `lib/refund/` | The UI and eligibility calculation must say the same thing. |
| Staff/admin operation | `app/api/admin/`, `lib/auth/admin-guard.ts` | Do not expose personal or revenue data from a public endpoint. |

## Business modules: short index

| Module group | Business question it answers |
| --- | --- |
| `components/booking/`, `components/scheduler/`, `lib/booking/client/` | “How does a visitor choose a flight?” |
| `lib/scheduler/` | “Which flight can start when, for how long, and at what valid price?” |
| `lib/booking/` | “Can this selection become an order safely?” |
| `lib/wix/` | “How does this frontend read/write the Wix business backend?” |
| `lib/db/`, `lib/stripe.ts` | “How does the legacy system store and confirm a purchase?” |
| `lib/auth/` | “Who is this customer or staff member, and what may they access?” |
| `components/vouchers/`, `lib/catalog/`, `lib/wix/gift-cards.ts` | “How are gifts selected, bought and redeemed?” |
| `components/offers/`, `lib/discounts/` | “When may a promotion be shown and enforced?” |
| `components/pro/`, `ground-school/`, `fear-of-flying/`, `workshops/` | “Which product lane is the customer considering?” |
| `lib/refund/`, `components/refund/`, `lib/legal/` | “What happens after a customer asks for a refund?” |
| `lib/reviews/`, `lib/seo/`, `components/blog/` | “How is SimDream discovered and trusted publicly?” |

## Straight answer: what is not yet complete

1. **Returning-customer loyalty discount:** the 5%/7%/10% UI vocabulary and Wix claim structure exist, but there is no authoritative paid-order lookup by email-or-phone, no tier counter, and no durable paid-order ledger.
2. **Wix order/invoice history:** Wix Member Calendar appointments are displayed, but there is no Wix Orders/invoice adapter for the dashboard yet.
3. **Production proof:** source shows how Wix checkout should work. It does not prove the live Wix dashboard has every service, product, plan, payment setting and pricing extension configured.
4. **Admin maturity:** current staff protection is Basic auth and rate limiting, not role-based access with MFA/audit history.
5. **Editorial completeness:** the platform supports seven selectable languages and three UI themes. Specialist World Route and subscription catalog records are currently authored in six locales and use the controlled English fallback for Spanish; this is an editorial copy gap, not a missing language selector or routing capability.

## How to read the repository without getting lost

1. Start with the customer page in `app/(public)/`.
2. Find its feature components in `components/<feature>/`.
3. Follow its browser logic into `lib/booking/client/` or the relevant feature library.
4. Find the server endpoint in `app/api/`.
5. From the route handler, follow the business rule into `lib/scheduler/`, `lib/booking/`, `lib/auth/`, `lib/db/` or `lib/wix/`.
6. If the feature calls Wix, the exact integration boundary is always under `lib/wix/`.

## Review evidence

- `npm run docs:verify` passed: 547/547 source-derived items, zero known-false claims and a current Genesis fingerprint.
- `npm run lint` and `npm run test:quick` passed during the 2026-11-15 documentation sync. Expected failure-injection logs exercise fail-closed persistence, rate-limit and webhook paths; they are assertions, not test failures.
- No application behavior was changed while creating this map. The pre-existing `.wix/topology.json` working-tree edit remains intentionally untouched and is not part of this documentation change.
- No application behavior was changed while creating this map. The existing `.wix/topology.json` working-tree edit remains untouched.
