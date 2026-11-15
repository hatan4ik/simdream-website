# Checkout Awareness

Shared engineering record for checkout decisions, boundaries, and unresolved
commercial rules. This document is a design record: it does not claim that a
payment provider, Wix Custom App, or production discount is active.

> **Live-code reconciliation — 2026-11-15 (`main` at `8fe2981`):** Returning-customer loyalty is **not released, enabled, or connected to checkout**. The repository contains only part of Phase A2: `lib/wix/birthday-pricing-claim.ts` can represent `loyalty` and `prepaid` claims with optional identity keys, `lib/wix/birthday-pricing-server.ts` can validate such a supplied claim, and `lib/booking/client/loyalty-copy.ts` contains seven-language copy with unit coverage. No route performs Contacts/Orders history lookup, selects a loyalty tier, issues a loyalty claim, writes a loyalty ledger, handles loyalty webhooks, or renders this copy in checkout. The existing birthday-claim route remains birthday-only and fails closed until its separate Wix Pricing Integration configuration is installed. Treat the team sections below as architecture and verification records, not evidence of a live loyalty feature.

---

## Team Codex — Returning Customer Loyalty & Wix Checkout Integrity

**Date:** 2026-11-13  
**Status:** Proposed architecture; not implemented or enabled  
**Scope:** One-off Wix Bookings checkout, returning-customer pricing, gift
certificate redemption, and payment-confirmed purchase history.

### Goal requested

Deliver a real, low-friction returning-customer benefit without turning the
checkout into a dummy client-side price calculation:

1. Match prior customer purchases by **normalized email OR normalized phone**.
2. Union the two result sets and deduplicate by immutable Wix order/booking ID.
3. Apply the tier to the current paid flight order:

   | Previous qualifying paid purchases | Current purchase benefit |
   | ---: | ---: |
   | 0 | No returning-customer discount |
   | 1 | 5% — second purchase |
   | 2 | 7% — third purchase |
   | 3 or more | 10% — fourth and later purchases |

4. Select exactly one promotional discount: birthday, loyalty, coupon, or any
   future promotion. The winner is the largest eligible monetary reduction;
   discounts are never stacked.
5. A package already sold at a discounted promotional price is non-stackable.
   The localized checkout alert must explain that the package is already using
   its special price and cannot receive another discount.
6. Keep guest checkout open. Do not send OTP, magic-link, or validation emails
   merely to determine loyalty eligibility.
7. A Gift Certificate / full-flight Voucher redemption is a prepaid-flight
   checkout mode: it receives no birthday, loyalty, coupon, or additional
   package discount, and its redemption creates no new loyalty purchase.
8. Count only provider-confirmed paid purchases. Carts, `CREATED` bookings,
   failed payments, browser returns, cancellations, refunds, and chargebacks
   are not qualifying purchases.

Gift Card credit is a payment tender, not a promotion. It remains applicable to
the post-discount balance where the checkout policy permits it. A Gift
Certificate redemption is different: it represents an already-purchased flight
entitlement and bypasses all promotion logic.

### Recommended design — Wix authority with a private loyalty projection

```text
Customer supplies email + phone in the normal manifest
  -> trusted SimDream backend normalizes both values
  -> server finds all paid purchases for email OR phone
  -> server deduplicates by Wix order/booking ID and determines one promotion
  -> server issues an opaque, short-lived booking pricing claim
  -> visitor creates one Wix Booking and one visitor-owned Cart V2 draft
  -> the single Wix Pricing Integration provider returns the final price
  -> Wix-hosted checkout and PayPlus collect payment
  -> signed Wix payment/order event arrives at the trusted backend
  -> idempotent ledger records, reverses, or reconciles the purchase
```

Wix remains the authority for Contacts, Bookings, orders, payment state, and
hosted payment collection. A small server-only loyalty projection in Supabase
is an indexed, auditable read model rather than a competing checkout system.
It stores only the minimum required for safe matching and reconciliation:

- HMAC-protected normalized email and phone lookup keys;
- Wix Contact ID when Wix resolves one;
- paid Wix order and booking IDs, state, and timestamps;
- promotion decision and idempotency/event keys.

The browser receives only the final applicable benefit and Wix-calculated price,
such as *"Welcome back — your 7% Returning Captain benefit is applied."* It
never receives purchase count, raw history, contact records, identifiers, or
identity hashes.

### Identity and family-event rule

There is deliberately no single email-only or phone-only source of truth. The
lookup is inclusive:

```text
qualifying history =
  paid purchases matching email
  UNION paid purchases matching phone
  MINUS duplicate order/booking IDs and excluded states
```

This allows a returning customer with a changed email or phone to retain their
benefit and supports family bookings that use a shared contact method. The
loyalty benefit belongs to the purchaser contact, not the pilot, participant,
or gift recipient. A customer-facing flow stays silent when no benefit applies;
it never reveals whether an email or phone exists in the database.

### Discount and certificate decision table

| Checkout condition | Result |
| --- | --- |
| Regular eligible package; loyalty is highest benefit | Apply 5%, 7%, or 10% through the Wix pricing provider. |
| Birthday benefit is higher | Apply birthday only; no loyalty or coupon stacking. |
| Coupon is the highest permitted promotion | Apply coupon only; provider and UI must reject a second promotion. |
| Already discounted package | Keep its published package price and show the localized non-stackable alert. |
| Gift Card credit | Apply to the final permitted balance as tender, not as a promotion. |
| Gift Certificate / full-flight Voucher redemption | Redeem the prepaid entitlement only; bypass all discount and loyalty logic. |
| Failed, cancelled, refunded, or chargeback order | Do not count it, or void the prior ledger event. |

**Open commercial decision:** the rule above excludes Gift Certificate
*redemption*. The owner must decide whether the original purchaser of a Gift
Certificate earns one future loyalty purchase at issuance, or whether Gift
Certificate issuance is excluded from loyalty entirely.

### Alternatives considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Query Wix Contacts, Bookings, and orders for every checkout | Wix is the only data source; no local projection. | Adds remote-call latency, complicates refund/event recovery, and is less resilient during provider outage. | Not sufficient alone. |
| Download customer hashes or purchase data to the browser | Fast client-side lookup. | Exposes an identity oracle, becomes stale, can be tampered with, and leaks customer data. | Rejected. |
| Server-side loyalty projection, updated from signed Wix events | Fast private lookups, auditable history, idempotent reconciliation, and resilient checkout. | Requires a small database schema, event handler, monitoring, and an initial historical backfill. | **Recommended.** |

Redis is not required for the first release. Indexed Supabase tables plus a
short server-side cache are sufficient. Redis should be considered only after
measured production latency or concurrency warrants an additional cache layer.

### Wix capability and supportability assessment

| Capability | Wix support | Use in this design | Important boundary |
| --- | --- | --- | --- |
| Contacts | Contacts v5 supports server-side search by primary email and phone. | Resolve either submitted identifier to existing contact data. | Never expose this query or its result to the browser. |
| Visitor Bookings | Bookings supports visitor-token service/slot reads, booking creation, Cart V2 handoff, and hosted checkout. | Preserve guest-first booking and payment flow. | Owner credentials are for operations/back office, not a visitor's checkout. |
| Personalized price | Bookings Pricing Integration service plugin returns a calculated booking price. | Extend the birthday provider into one unified Discount Engine. | Wix permits **one** active pricing provider, and the custom calculator runs only after a Booking exists. |
| Cart price | Cart V2 `calculate` returns the checkout price Wix will use. | Show the final amount before redirect. | React and a local formula are never the final price authority. |
| Orders and payments | Wix provides order/booking/payment events and signed custom-app webhooks. | Create/void loyalty ledger events and perform reconciliation. | Verify JWT signatures and store processed event IDs; never count a browser return as payment. |

Relevant official documentation:

- [Wix Bookings end-to-end booking flow](https://dev.wix.com/docs/api-reference/business-solutions/bookings/skills/end-to-end-booking-flow)
- [Wix Contacts search](https://dev.wix.com/docs/api-reference/crm/members-contacts/contacts/skills/find-contacts)
- [Wix Bookings Pricing Integration](https://dev.wix.com/docs/api-reference/business-solutions/bookings/pricing/pricing-integration-service-plugin/introduction)
- [Wix payments, transactions, and orders](https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/payments/working-with-payments-transactions-and-orders)
- [Wix self-hosted custom-app webhooks](https://dev.wix.com/docs/build-apps/develop-your-app/develop-a-self-managed-app/webhooks/handle-events-with-webhooks-for-self-hosting-using-the-java-script-sdk)

### Current repository state and implementation path

`origin/main` contains the Birthday Pricing Provider work, but it remains
documented as implementation-ready and inactive until the separate private Wix
Custom App, secrets, and staging installation are configured. There is no
returning-customer loyalty implementation yet.

Because Wix allows only one Bookings Pricing Integration provider, the loyalty
logic must extend the existing provider. It must not be a second competing
provider, duplicate discounted services, or a browser-generated coupon.

Delivery sequence:

1. Define the ledger schema, purchase-state rules, Gift Certificate issuance
   policy, and historical backfill/reconciliation plan.
2. Configure the private Custom App with Contacts/Bookings/orders/webhook
   permissions on **SimDream-Staging** only; no privileged credential belongs
   in client code.
3. Implement server-side email-or-phone union lookup, de-duplication, and a
   generic signed pricing claim.
4. Extend the existing birthday provider to select exactly one valid benefit
   and return Wix's calculated ILS price.
5. Receive and verify signed payment/order/booking webhooks; make ledger
   writes idempotent and reverse them on refund/cancellation/chargeback.
6. Add localized checkout copy for applied benefit, discounted-package warning,
   and Gift Certificate redemption mode.
7. Prove the full staging flow: first, second, third, fourth-plus purchase;
   email-only and phone-only match; union/deduplication; birthday versus
   loyalty; discounted package; Gift Certificate; refund; duplicate event; and
   failed payment.

### Acceptance criteria

- No customer database, hashes, purchase count, or privileged Wix token reaches
  the browser.
- Email-or-phone history union is correct, deterministic, and deduplicated.
- A Gift Certificate redemption never receives or creates a loyalty discount.
- Discounted packages always show the non-stackable explanation and keep their
  configured price.
- Exactly one promotion is reflected in both the visible Cart V2 calculation
  and Wix-hosted checkout.
- Only verified Wix payment/order state changes loyalty history.
- Webhook replay, duplicate order events, refunds, cancellation, and
  chargebacks cannot inflate the purchase count.
- Guest checkout remains available without signup, login, or verification email.

---

## Antigravity Team — Unified Promotion & Returning-Customer Loyalty Architecture

**Date:** 2026-11-13  
**Status:** Proposed engineering architecture (aligned with `lib/wix/birthday-pricing-*` and `app/api/wix/birthday-pricing/v1/calculate-price/route.ts`)  
**Scope:** Guest-first returning-customer tiers (`5%` / `7%` / `10%`), `email OR phone` union/deduplication, single-winner promotion arbitration, Gift Certificate isolation, and authoritative Wix payment confirmation.

### 1. Architectural Alignment with Existing Codebase

Because Wix allows **only one** Bookings Pricing Integration service plugin per site (`MULTIPLE_PRICING_PROVIDERS_FOUND`), returning-customer loyalty must **extend** the existing birthday pricing pipeline rather than adding a second provider or a client-side discount:

- **Existing Pricing Endpoint**: `app/api/wix/birthday-pricing/v1/calculate-price/route.ts` + `lib/wix/birthday-pricing-server.ts` (RS256 JWT verification via `lib/wix/birthday-pricing-provider-auth.ts`).
- **Existing Claim Mechanism**: `lib/wix/birthday-pricing-claim.ts` (HMAC-signed, short-lived opaque claim carried in the hidden `SHORT_TEXT` booking custom field `WIX_BIRTHDAY_CLAIM_FIELD_ID`).
- **Extension Strategy**: Generalize the claim payload from birthday-only to a **Single-Winner Promotion Claim** (`promoKind: 'birthday' | 'loyalty' | 'none'`, `tierPercent`, `packageId`, `flightDate`, `issuedAt`, `exp`) so the exact same Wix Pricing Integration endpoint computes the authoritative final ILS price (`calculatedPrice`) for Cart V2 and Wix-hosted checkout.

### 2. Identity Normalization, Union & Deduplication (`email OR phone`)

A returning customer may change their email or phone between visits, or book for family members from either identifier.

1. **Canonical Normalization (server-only)**:
   - **Email**: trim, lowercase, normalize Unicode (`NFKC`); reject malformed values before hashing.
   - **Phone**: normalize Israeli and international numbers to E.164 (e.g., `05X-XXXXXXX` → `+9725XXXXXXXX`) before hashing.
2. **Privacy-Preserving Blind Lookup**:
   - Store keyed HMAC-SHA256 digests (`email_hmac`, `phone_hmac`) in a server-only Supabase loyalty ledger (`loyalty_orders` + `loyalty_webhook_events`), never raw PII in lookup indexes and never exposed to the browser.
3. **Deterministic Union & Deduplication**:
   ```text
   qualifying_orders =
     SELECT DISTINCT wix_order_id, wix_booking_id
     FROM loyalty_orders
     WHERE status = 'PAID'
       AND is_gift_certificate_redemption = FALSE
       AND (
         (email_hmac IS NOT NULL AND email_hmac = $emailHmac)
         OR
         (phone_hmac IS NOT NULL AND phone_hmac = $phoneHmac)
       )
   ```
   - Deduplicating by immutable `wix_order_id` (with `wix_booking_id` fallback when order ID is absent) guarantees that an order matching **both** email and phone is counted **once**, never twice.
   - **Anti-enumeration**: The browser preview endpoint returns only `{ eligible: boolean, discountPercent: 0 | 5 | 7 | 10, benefitKind }` — never purchase counts, raw order IDs, or whether an email/phone exists in the system.

### 3. Tier Calculation & Single-Winner Arbitration (No Stacking)

| Qualifying Paid Purchases (`N`) | Current Order Loyalty Tier |
| ---: | ---: |
| `0` | `0%` (first purchase) |
| `1` | `5%` (second purchase) |
| `2` | `7%` (third purchase) |
| `>= 3` | `10%` (fourth and subsequent purchases) |

**Arbitration Rule (Strict Single Winner)**:
1. **Gift Certificate / Full-Flight Voucher Redemption**: Bypass all promotional evaluation (`discountPercent = 0`, no claim issued) and mark the checkout as prepaid redemption so it **neither receives a discount nor increments `N`**. *(Gift Card monetary credit remains a payment tender applied to the balance, separate from promotional discounts.)*
2. **Already-Discounted Packages** (e.g., 45m promotional tariff or pre-discounted package): Non-stackable; keep the published package price, issue no promotional claim, and display a clear localized notice explaining the package already carries a special price.
3. **Standard Eligible Packages**: Evaluate candidate reductions in whole-shekel ILS:
   - Birthday (`15%`, subject to `lib/discounts/birthday` civil-date rules)
   - Returning-Customer Loyalty (`5%` / `7%` / `10%`)
   - Promo Coupon (if entered)
   - Select **strictly one winner**: the candidate with the **highest ILS reduction**. If a coupon is entered alongside an eligible birthday/loyalty benefit, UI and server enforce single-selection (no stacking).

### 4. Guest-First Frictionless Checkout

- **Zero Auth / Zero OTP Gate**: Customers stay in the standard guest manifest (`email` + `phone`). No account creation, login redirect, or verification email is required to preview or apply the loyalty tier.
- **Rate-Limited Silent Preview**: Debounced server preview (`POST /api/loyalty/preview` or unified pricing preview) with IP/session rate limiting prevents email/phone probing while updating the order summary seamlessly as the guest fills their manifest.

### 5. Authoritative Wix Payment Confirmation & Idempotent Ledger

Checkout is never trusted on client return URLs or unconfirmed `CREATED` bookings:

- **Qualifying State Machine**:
  - `CREATED` / pending Cart V2 / abandoned checkout → **0** (does not count)
  - Signed Wix order/payment **PAID** webhook (verified RS256/JWT + `event_id` idempotency key) → **+1** qualifying order in `loyalty_orders`
  - Signed Wix **REFUNDED / CANCELLED / CHARGEBACK** event → transitions `wix_order_id` out of `PAID` (`VOIDED`/`REFUNDED`), immediately revoking its contribution to future tiers
- **Concurrency & Replay Safety**:
  - `UNIQUE (wix_order_id)` on `loyalty_orders` and `UNIQUE (wix_event_id)` on `loyalty_webhook_events` guarantee idempotent webhook processing under retries, out-of-order delivery, or parallel checkouts.
  - On first launch, run a one-time backfill script from Wix Orders/Bookings (`PAID`, non-refunded, non-gift-certificate-redemption) so existing returning SimDream customers immediately receive their earned 5%/7%/10% tier.

### 6. Implementation & Verification Checklist

1. **Database & Normalization**: Add Supabase migration for `loyalty_orders` and `loyalty_webhook_events`, plus E.164 phone + email HMAC helpers with unit tests for email-only, phone-only, and dual-match deduplication.
2. **Unified Claim & Pricing Provider**: Extend `lib/wix/birthday-pricing-claim.ts` and `app/api/wix/birthday-pricing/v1/calculate-price/route.ts` to arbitrate Birthday vs. Loyalty vs. Coupon vs. Discounted Package vs. Gift Certificate redemption cleanly.
3. **Authoritative Webhook Handler**: Add signed Wix order/payment webhook endpoint with `UNIQUE (wix_event_id)` idempotency and refund/chargeback reversal tests.
4. **7-Language UI Copy**: Add localized tier badges and non-stackable discounted-package alerts across all 7 supported languages (`he`, `en`, `ru`, `fr`, `ar`, `es`, `de`).
5. **Staging E2E Matrix**: Verify 1st/2nd/3rd/4th+ orders, email-changed + phone-matched, phone-changed + email-matched, Birthday (`15%`) beating Loyalty (`10%`), Gift Certificate isolation, and refund reversal on `SimDream-Staging` (`317b0c6d-6608-499a-bb3c-b1c37650e460`).

---

## Team Claude — Verification, Security and QA Review: Returning-Customer Discount

**Date:** 2026-11-13  
**Status:** Review and build proposal. Nothing implemented, no Wix write made, no flag or secret changed.  
**Evidence:** `origin/main` at `9f39257` (release 1.26.0); the live host read with GET requests only; Wix documentation read on 2026-11-13 by a research agent. Wix facts below come from documentation and are **not yet confirmed by a live call**; every open one is a probe in section 7. Inferences are labelled as such.  
**Role:** staging-spike lead, verification tooling, security audit and cutover sign-off (board assignment). This section tests the Team Codex and Antigravity designs against the code and the Wix contracts, then says how we would build the feature and what we would require before signing it off.

### 1. Verdict

Both earlier sections choose the right shape and we adopt it: Wix stays the authority for order, payment and price; the single Bookings Pricing Integration provider is extended instead of adding a second one; the browser learns only the benefit; guest checkout stays open; Gift Card credit is tender, not a promotion.

The documentation changes five things about how that shape can be built (detail in section 4):

1. **Phone cannot be filtered in Wix Orders or Bookings.** "Email OR phone" has no native phone query. It needs Contacts, or a ledger fed with the phone from booking events.
2. **Reading orders needs an admin identity.** That is the credential question the board already raised (ruling 9), not a detail of this feature.
3. **A purchase has two ids and the booking does not carry the order id.** "Dedupe by order or booking id" double counts unless one id is canonical.
4. **The provider cannot reject a coupon the customer adds later.** Wix offers one lock, `lockCouponCode` on the cart, and the design should use it.
5. **There is no single "paid" event, the Wix host has no Supabase, and the plugin's timeout is undocumented.** This decides what the first release can safely depend on.

One disagreement on sequencing: the first release should read Wix directly when the claim is issued, and the ledger should follow (4.4).

### 2. Verified starting point

| Item | State | Evidence |
| --- | --- | --- |
| Provider | Implemented, inactive. Needs the Custom App, the claim field and four secrets. | `lib/wix/birthday-pricing-server.ts`; live `/api/offers/capabilities` returns `{"birthdayDiscountEnforceable":false,"wixBirthdayPricingProviderEnabled":false}` |
| Provider input | Reads the slot and the claim field only. It ignores `contactDetails`. | `WixPricingProviderBooking` type |
| Claim | HMAC, 10 minutes, bound to package, Wix service and flight date. One custom field means one claim, so one promotion by construction. | `lib/wix/birthday-pricing-claim.ts` |
| Loyalty code | None: no module, table, test, or email and phone normalizer. | `git grep` on main |
| Eligibility | Blocks the Discounted Promotion (`daytimeOnly`, the 45-minute package), subscription redemption, gift-voucher purchase and non-recreational categories. | `lib/discounts/birthday/eligibility.ts` |
| Coupon entry | The SimDream code box adds the code with the visitor token through Cart V2 `add-coupon`. | `lib/booking/client/wix-checkout-cart.ts` |
| Certificates | Wix Gift Card variants in fixed amounts equal to a package price. To Wix, paying with one is ordinary tender. | `lib/catalog/gift-voucher-packages.ts`, `lib/wix/gift-cards.ts` |
| Persistence on the Wix host | None. The live reviews endpoint reports "no snapshot store". | live GET 2026-11-13 |
| Worker bundle | 13.81 of 14.00 MiB at the last measurement (PR #115), under 0.2 MiB of headroom, so no phone-number library. | Verify budget gate |
| Languages | `Language` has seven members including `de`; AGENTS.md still says six. Copy must cover every member. | `lib/i18n/translations.ts` on main |
| Payment provider | None connected. | `docs/WIX_HEADLESS_ARCHITECTURE.md` |

### 3. The seven requirements: how we meet each

| # | Requirement | How we build it | How we prove it |
| --- | --- | --- | --- |
| 1 | Email OR phone | `lib/loyalty/identity` normalizes both on the server (3.1). Email leg: Search Orders on `buyerInfo.email`. Phone leg: Contacts on `phone.e164` (or `phone.phone`), then Search Orders on `buyerInfo.contactId`. Both legs run in parallel with a 2 second budget. If one fails we use the other. | Normalizer vectors; each leg alone; both legs; a failed leg gives a lower tier, never a higher one |
| 2 | Union and dedupe | The canonical key is the **Wix order id**. A Bookings line item holds the booking id as `catalogItemId`, so each booking maps to its order. Count only orders with a Bookings line item (`appId 13d21c63-b5ec-5912-8397-c3a5ddb27a97`), so gift-card and plan orders never count. | One purchase found by email and by phone counts once; one purchase seen as a booking id and as an order id counts once |
| 3 | Tier | One pure function: prior paid count 0, 1, 2, 3 or more gives 0, 5, 7, 10 percent. | Table test at 0, 1, 2, 3, 4, 99 |
| 4 | Highest only | One pure `selectPromotion`. Candidates: birthday (15), loyalty (5, 7, 10) and a coupon the guest entered. Whole-shekel reduction, highest wins, ties go birthday, then loyalty, then coupon. The server issues one claim, so the provider can apply at most one. The cart is created with `lockCouponCode: true` whenever a claim applies. A package already at a special price gets no claim and the localized notice. | Birthday (15) always beats loyalty (10), so only a coupon can ever outrank them; matrix in section 6 |
| 5 | Guest first | The lookup keys are the email and phone the guest already types for the booking, which Wix stores as `contactDetails`. No OTP, link or account. | Playwright: complete a purchase with no login and no waiting for an email |
| 6 | Certificate | The guest declares "paying with a gift certificate" before the booking exists. The server issues a `prepaid` claim and the provider returns the registry price. Orders paid by gift card never count, and an undeclared one is flagged for review (4.7). | Declared redemption: no discount and no count. Undeclared: flagged |
| 7 | Wix authoritative | The price is the provider's price, shown from Cart V2 `calculate`. The tier comes from Wix orders read when the claim is issued. The success page confirms by reading the order from Wix on the server, never from the return URL. A signed webhook feeds an audit trail once the Custom App exists. | A staging order paid through Wix checkout with a real provider; a browser return alone never confirms anything |

**3.1 Identity rules.** Hand-written and dependency-free, with test vectors.

- Email: trim, NFKC, lowercase, exactly one `@`. No dot or plus folding (decision D5).
- Phone: strip spaces, dashes, dots and brackets. `+972`, `972` and `00972` become `+972` followed by the number without its leading 0. Israeli national forms (`05X-XXXXXXX`, `0[2-4,8,9]-XXXXXXX`) become `+972...`. Other countries only with an explicit `+` or `00`. After normalizing, 8 to 15 digits or the phone leg is skipped.
- Lookups use the keyed HMAC of each value (server secret, never in the browser). Claims and logs carry only that key, never the raw value.
- Wix stores `phone.phone` as free text and generates `phone.e164` only for a valid E.164 number, so probe P1 decides which field the phone leg queries.

### 4. Review of the Team Codex and Antigravity designs

**4.1 Phone has no native query.** *Evidence:* Search Orders filters `buyerInfo.email`, `buyerInfo.contactId` and `buyerInfo.memberId`, not phone. Query Extended Bookings filters `booking.contactDetails.email` and `contactId`, not phone. Contacts v5 filters `phone.phone` and `phone.e164`. *Effect:* the phone leg must go through Contacts to a `contactId`, then to orders. In the ledger designs, `phone_hmac` has no documented source: order events carry no phone in `buyerInfo`, while booking events carry `contactDetails.phone`. A ledger would have to join booking events and order events. *Position:* design for the Contacts path first; the ledger needs the join.

**4.2 Reading orders needs an admin identity.** Search Orders requires `ECOM.READ_ORDERS`. The Wix headless docs list "query all orders" as an admin operation (client credentials, API key, or `auth.elevate()` in the Astro integration only). The repo's adapter is visitor-only by design. *Position:* one least-privilege server credential (read orders and contacts) is unavoidable for any design here, including the ledger backfill. It belongs to the same decision as the Custom App credential (board ruling 9, decision D6), and it must be provisioned as a server secret only.

**4.3 Canonical id.** The Booking entity has no order id; the link is the order line item's `catalogItemId`. Antigravity's `wix_order_id` with a `wix_booking_id` fallback can count one purchase twice: first as a booking id while the order is absent, then again as an order id. *Position:* the order id is the key; the booking id is a unique alias on the same row; refuse a booking-only row when that booking already has an order. Filter by the Bookings `appId`, otherwise gift-card product orders count as flights.

**4.4 Live read first, ledger later.** Both sections propose a Supabase ledger. Four facts argue for reading Wix at claim time in release 1:

- Reading current state needs no refund, cancellation or chargeback reversal logic. A refunded order simply stops being `PAID`.
- The Wix host has no Supabase today, so a ledger needs a new service-role secret on the Wix site plus migration 013.
- Both queries are documented, and a lookup failure means the standard price, which is the safe direction.
- It removes the webhook as a correctness dependency. Webhooks need a Custom App and have no single "paid" event (4.9).

The costs are real and measurable: two admin calls per claim and search-index lag, so a customer who paid seconds ago may be missed by one count. Probe P9 measures latency. *Position:* the ledger stays the right tool for the audit trail and stack detection (section 5, phase D), and becomes the lookup source if probes show 95th-percentile latency or rate limits that a checkout cannot absorb.

**4.5 Identity binding and the tier oracle.** The provider receives `contactDetails` (email and phone), which the current code ignores. *Position:*

- The claim carries the identity key of the email or phone used for the lookup. The provider recomputes the keys from the booking's `contactDetails` and applies the claim only if one matches; otherwise it returns the registry price. This stops a claim obtained with someone else's details from pricing a different customer's booking.
- Typing another person's email or phone reveals, through the discount, whether they have two or more paid purchases. That oracle cannot be removed without verification, which requirement 5 rules out. We limit it: lookup only when the slot is chosen and both fields are valid, on continue and not on keystrokes; uniform response shape and minimum latency; proposed limits of 5 lookups per session per 10 minutes, 20 per IP per hour and 3 per identity key per hour; counts never returned; identity keys only in logs. Antigravity's debounced "silent preview as the guest types" is the opposite of this and should not ship. Accepting the residual risk (a 5 to 10 percent benefit) is decision D4.

**4.6 Coupons.** The provider runs after Create Booking, so it cannot see or reject a coupon added later, and Wix hosted checkout has its own code field. *Evidence:* Cart V2 holds one coupon and one gift card; `settings.lockCouponCode` blocks coupons and is set only when the cart is created; automatic discount rules still stack; documentation does not say whether a coupon applies to a provider-priced booking. *Position:* create the cart with `lockCouponCode: true` whenever a claim applies, and let the SimDream code box compete in `selectPromotion` before the cart exists. A visitor can still call Wix directly, so non-stacking is also **detected** after payment by comparing the order's applied discounts with the expected price. Probe P5 decides whether a coupon can stack on a provider price at all.

**4.7 Certificates.** The code is typed in Wix hosted checkout, after the provider has priced the booking, so the provider cannot know a certificate will pay. *Evidence:* an order's payments carry `giftcardPaymentDetails` (read through payments `list-by-ids`) with an obfuscated code and no origin; the Gift Card object has no service restriction; the Help Center says up to five gift cards per checkout while Cart V2 says one (probe P12). Checking a balance by code needs `MANAGE-ECOM`, a scope too broad to hold in a Worker. *Position:* a certificate is whatever the guest declares before the booking exists. Declared: `prepaid` claim, registry price, no count. Undeclared gift-card tender is flagged, not blocked (decision D8). The design never needs the broad scope.

**4.8 The provider is a hot path on the live host.** Wix calls it after Create Booking and before checkout. Documentation does not state its timeout, retry rule, or whether it runs again at payment or on Cart calculate; a provider outage surfaces as `ERROR_CONTACTING_PRICING_PROVIDER` (428). SimDream-Staging also serves the live headless host, so enabling the provider affects live checkout. *Position:* the provider does no network I/O. It verifies the JWT and the claim and answers in milliseconds. No claim or an identity mismatch returns the registry price. A bad signature fails, as today. Probe P6 decides how an expired claim behaves, because an error at payment time would break a customer mid-checkout. The existing feature flag and rollback stay.

**4.9 "Paid" and webhooks.** There is no order-paid event. Orders emit `payment_status_updated` (with `previousPaymentStatus`); transactions emit Details Updated, Refund Completed and Chargeback Approved or Reversed. Webhooks run in a Custom App; a plain headless OAuth client subscribing is not documented. Delivery needs a 200 within 1250 ms, retries up to 12 times, and the documentation warns of duplicates and out-of-order events. The JWT algorithm is not named (Antigravity assumes RS256: probe P11). Search Orders omits `PENDING` and `REJECTED` by default, never returns `INITIALIZED`, and lags after payment. *Position:* the handler stores event ids, re-reads the order from Wix before acting, and never trusts the event body alone. Order status and payment status enums are in the sources.

### 5. Build sequence (Team Claude proposal)

| Phase | Work | Gate |
| --- | --- | --- |
| A. Pure modules, no Wix access | `lib/loyalty/` with `identity`, `tier`, `select-promotion` and `purchase-key`; generalize the claim (`kind`, `percent`, identity keys, expiry) and the eligibility check; copy file covering every `Language` member; unit and property tests; `docs/modules/loyalty.md`. Under 400 lines per file. | Owner scope approval only |
| B. Probes P1 to P14 | Run on SimDream-Staging, which also serves live traffic. Test services are unpublished and tagged, but the board document is right that hidden is not access control (`todo/booking-rmodel-rethinking.md`, rejected options table), so the protection is that bookings stay unpaid and far in the future, customer notifications are off, every object is tagged, and everything is removed afterwards. No payment provider is connected, so no visitor can complete a purchase of a test object. | Staging-write approval; Custom App install attempt (P8) |
| C. Wix adapter and provider | Contacts and Orders lookup, claim endpoint with the limits in 4.5, provider identity binding, `lockCouponCode` in cart creation, success-page verification, capability flags, UI. | Probes P1 to P8 settled; credential decision; plugin approved by Wix |
| D. Webhooks, audit ledger, stack detector | Custom App webhooks with idempotent events; reconciliation job comparing applied discounts with the expected price; migration 013 only if the ledger is approved and Supabase secrets exist on the host. | Custom App; Supabase on the host |
| E. Cutover QA and sign-off | Staging E2E with real paid orders, flag on, rollback rehearsed. | Payment provider connected |

Phase A is unblocked, testable and touches no Wix site; Team Claude offers to build it if the owner assigns it, and no other phase starts from it without the gates above.

### 6. Test and sign-off matrix

#### Counting and tiers

| Case | Expected |
| --- | --- |
| Prior paid count 0, 1, 2, 3, 4, 99 | 0, 5, 7, 10, 10, 10 percent |
| Email only, phone only | each leg alone finds the history |
| Same orders found by both | counted once |
| Email changed, phone same; phone changed, email same | history kept |
| One purchase seen as booking id and as order id | counted once |
| Two contacts share one phone | union of both, documented over-match |
| `CREATED`, `INITIALIZED`, `NOT_PAID`, `PENDING`, `DECLINED`, `CANCELED`, `FULLY_REFUNDED`, chargeback | not counted |
| `PARTIALLY_REFUNDED` | counted (D3) |
| Gift-card sale, plan sale, plan redemption, certificate redemption | not counted |

#### Arbitration

| Case | Expected |
| --- | --- |
| Birthday and loyalty eligible | birthday (15) only |
| Loyalty and a larger coupon | coupon only, claim not issued |
| Discounted Promotion package | registry price, localized notice, no claim |
| PRO, Fear of Flying, subscription redemption | no claim |
| Coupon at Wix checkout after a claim | refused by `lockCouponCode` |
| Gift Card tender after a loyalty price | applies to the reduced balance |
| Declared certificate | registry price, no claim, not counted |

#### Security and abuse

| Case | Expected |
| --- | --- |
| Lookups beyond the limits in 4.5 | 429, uniform shape, no count anywhere |
| Claim altered, expired, other service, other date, other identity, replayed after use | no discount, never a wrong discount |
| Booking `contactDetails` differ from the claim identity | registry price |
| Client bundles | no HMAC secret, app key, Wix credential or its variable name (extends the bundle-leak test) |
| Logs and the Wix custom field | no raw email, phone or birth date; opaque claim only |
| Webhook bad signature, stale JWT, duplicate id, refund before paid | rejected, ignored, or reconciled; count never inflated |

#### Failure and quality

| Case | Expected |
| --- | --- |
| Contacts leg or Orders leg down | other leg used, lower tier at worst |
| Both down or over the 2 second budget | registry price, checkout continues |
| Provider slow or erroring | behavior recorded by P3, no customer left mid-checkout |
| Every `Language` member, RTL (`he`, `ar`) | localized benefit line and alerts; telemetry stays `dir="ltr"`; axe 0 violations |
| Staging E2E with real paid orders | first, second, third and fourth purchase; Wix checkout total equals Cart V2 `calculate`; no stacking |

**Sign-off.** Team Claude signs only when: probes P1 to P8 are recorded; the matrix is green including staging; the bundle-leak and PII-log tests pass; the rollback is rehearsed; and the owner decisions are recorded. Until then the flag stays off.

### 7. Staging probes this feature adds

All from documentation gaps. Each uses test data on a site that serves live traffic.

| # | Probe | Blocks |
| --- | --- | --- |
| P1 | After a booking with email A and phone P, does Query Contacts find the contact by `phone.e164` or `phone.phone`? | Requirement 1, phone leg |
| P2 | Does a visitor token get 403 or own-orders-only from Search Orders? | Credential decision |
| P3 | Stub provider with a 15 second delay and a 500: does booking or checkout fail or fall back? What are the timeout and retry rules? | Provider enablement |
| P4 | Does the plugin run again at payment or on Cart V2 `calculate`? | Claim lifetime |
| P5 | Does a coupon stack on a provider price? Does `lockCouponCode` block it at hosted checkout? | Requirement 4 |
| P6 | Expired claim at re-invocation: error or registry price? | 4.8 |
| P7 | Does the customer see a discount line or only a new price? | UI copy |
| P8 | Can a Custom App with the plugin and webhooks be installed on this Editorless site? Is Wix's plugin approval needed? | Everything in phase C and D |
| P9 | Latency and lag of Contacts, Search Orders and Get Order after a payment | Decision 4.4 |
| P10 | Contacts duplicates: same phone with two emails | Requirement 2 |
| P11 | Status values of a cancelled, refunded and zero-total order; webhook JWT algorithm | Section 4.9 |
| P12 | Gift card in a Bookings checkout: how many cards, and does `list-by-ids` show it | Requirement 6 |
| P13 | Does Cart V2 accept a booking and show the provider price? | Requirement 7 |
| P14 | Do Discount Rules apply to Bookings services at all? | Requirement 4 |

### 8. Owner decisions

| # | Decision | Team Claude default |
| --- | --- | --- |
| D1 | What counts as a purchase | A fully paid order with a Bookings flight line item, any category. The discount applies only to categories that can carry a promotion (today `recreational`). |
| D2 | Do gift-certificate sales count? | No. Counting the sale and not the redemption lets a ₪50 gift card bought three times climb the tier. Rule 6 already excludes the redemption. |
| D3 | Refunds | `PARTIALLY_REFUNDED` counts; `FULLY_REFUNDED`, `CANCELED` and a chargeback do not. No clawback of a discount already given. |
| D4 | Accept the tier oracle with the limits in 4.5, or add verification later | Accept. |
| D5 | Email folding | None. Case-insensitive only; the phone leg covers variants. |
| D6 | Credential and ledger | One least-privilege Wix credential, server only, tied to ruling 9. Read Wix at claim time in release 1; ledger in phase D if probes require it. |
| D7 | Coupon policy | Lock coupons whenever a claim applies; the SimDream code box competes first. |
| D8 | Gift Card versus certificate | The guest's declaration defines certificate mode. Undeclared gift-card tender is flagged, not blocked. |
| D9 | Payment provider timeline | Gates all paid-order proof and cutover. |
| D10 | Wix approval of the pricing plugin | Status needed before phase C. |

### 9. Sources

Read by the research agent on 2026-11-13 and **reconstructed from its notes**, so confirm each link before quoting it. Base `https://dev.wix.com/docs/api-reference/business-solutions/`.

- Orders: `e-commerce/orders/orders/search-orders`; `e-commerce/skills/find-and-report-on-orders`
- Bookings reader: `bookings/bookings/bookings-reader-v2/query-extended-bookings`
- Contacts v5 filters: `https://dev.wix.com/docs/api-reference/crm/members-contacts/contacts/contacts-v5/supported-filters`
- Pricing plugin: `bookings/pricing/pricing-integration-service-plugin/introduction`
- Coupons: `coupons/coupons/create-a-coupon`
- Cart V2: `e-commerce/purchase-flow/cart-v2`
- Admin operations: `https://dev.wix.com/docs/go-headless/authentication/admin/about-admin-operations`
- Gift cards: `https://support.wix.com/en/article/about-wix-gift-cards` (Help Center, not API reference)
- Earlier repo evidence: `docs/modules/birthday-offers.md` section 4

*Team Claude changed no code, Wix site, secret or flag. This section is its only artifact.*

---

## Board Coordination Addendum — Reconciled Plan (Codex + Antigravity + Claude)

**Date:** 2026-11-13  
**Status:** Historical execution blueprint. Phase A2 contract primitives and seven-language copy are merged, but the feature remains incomplete: no loyalty lookup, issuer, checkout wiring, ledger, webhook, or staging cutover has been implemented.

### 1. Reconciled Rules & Technical Corrections

1. **Direct Wix Read First (Release 1), Ledger in Phase D**: Release 1 reads Wix directly at submit time (`Orders.search` by `buyerInfo.email` in parallel with `Contacts v5` phone → `Orders.search` by `buyerInfo.contactId`, `SCOPE.DC-STORES.READ-ORDERS`, 2 s timeout). The Supabase ledger and signed webhooks move to **Phase D** for auditability, replay protection, and historical backfill.
2. **Canonical Key = `wix_order_id` Only**: Deduplicate strictly by `wix_order_id` and filter to orders containing a Wix Bookings line item (`appId 13d21c63-b5ec-5912-8397-c3a5ddb27a97`) so one purchase is never double-counted and gift-card/plan sales never inflate tiers.
3. **Identity-Bound Claim & Rate-Limited Submit-Time Lookup**: No keystroke/debounced preview. Issue the single opaque claim on submit/continue (rate-limited per session, IP, and identity key), and bind the caller's HMAC identity keys inside the claim so the Pricing Integration provider verifies `contactDetails` match.
4. **Safe Release 1 Precedence (before Coupon Probe `P5` settles)**:
   - **Discounted package**: keep published price + localized non-stackable alert; no claim.
   - **Declared Gift Certificate**: explicit prepaid checkout mode (`prepaid` claim, registry price, no discount, not counted toward future loyalty). Undeclared Gift Card tender at hosted checkout is either locked on promotional carts (verify in `P12`) or flagged post-payment.
   - **Customer-entered coupon**: coupon path only (no birthday/loyalty claim).
   - **Otherwise**: apply the higher ILS reduction of **Birthday (15%)** vs. **Loyalty (5% / 7% / 10%)**, and create the Cart with `lockCouponCode: true`.
   *(Once Probe `P5` proves Cart/provider coupon behavior, upgrade to true highest-across-coupon-birthday-loyalty quoting if supported.)*

### 2. Phase Ownership & Execution Sequence

| Phase | Scope | Lead / Support | Gate |
| :--- | :--- | :--- | :--- |
| **A1. Pure Loyalty Core** | Fresh branch from `origin/main`: `lib/loyalty/` (`identity`, `tier`, `select-promotion`, `purchase-key`), unit/property tests, `docs/modules/loyalty.md` | **Team Claude** | **Unblocked now** |
| **A2. Claim Contract & 7-Lang Copy** | Fresh branch from `origin/main`: generalize `lib/wix/birthday-pricing-claim.ts` + `birthday-pricing-server.ts` (`promoKind`, `prepaid`, HMAC `identityKeys`), 7-language copy (`he/en/ru/fr/ar/es/de`), unit tests | **Antigravity Team** | **Unblocked now** |
| **B. Staging Probes (`P1`–`P14`)** | Validate `SimDream-Staging` (`317b0c6d-6608-499a-bb3c-b1c37650e460`): Custom App installability (`P8`), Contacts phone filter (`P1`), Orders scope (`P2`), provider timeout/expiry (`P3`/`P6`), coupon & gift-card lock (`P5`/`P12`) | **Team Claude** (lead) + **Antigravity** (provider checks) | Staging-write approval + Custom App attempt |
| **C. Wix Adapter, Provider & Cart** | Parallel Contacts/Orders lookup, rate-limited claim endpoint, provider `contactDetails` verification, `lockCouponCode: true` on Cart V2, server-side success-page order check, feature flags | **Antigravity Team** + **Team Claude** (QA) | `P1`–`P8` settled, `D6` credential, `D10` plugin approval |
| **D. Webhooks & Audit Ledger** | Signed webhooks (`event_id` idempotency, order re-read), Supabase `loyalty_orders` ledger (`migration 013`), post-payment stack detector, historical backfill (`D11`) | **Team Codex** | Custom App webhooks + Supabase env on Wix host |
| **E. Cutover QA & Sign-Off** | Staging E2E matrix with real paid orders (`0/1/2/3+`, union/dedup, birthday vs. loyalty vs. coupon, certificate mode, refund reversal, bundle-leak & PII-log checks) | **Team Claude** (sign-off) | Payment provider connected (`D9`) |

### 3. Additional Owner Decision (`D11`)

| # | Decision | Default / Impact |
| :--- | :--- | :--- |
| **D11** | **Historic Supabase/Stripe purchases** | Release 1's live Wix lookup sees **Wix Orders only**. Counting pre-cutover Supabase/Stripe purchases requires a separate controlled migration/backfill into Wix or the Phase D ledger; it will not happen automatically in Release 1. |



