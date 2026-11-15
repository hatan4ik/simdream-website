# Wix Bookings birthday pricing provider: staging activation

**Status: implementation ready, not active.** This guide enables the 15% birthday price on the dedicated
**SimDream-Staging** Headless site only. It must not be applied to the live Editor site or used as a payment-provider
substitute.

## What this changes

The customer keeps booking the original 30/60/90-minute Wix service. The Next.js frontend previews eligibility, but it
does not send a price to Wix. For an eligible customer it submits an opaque, short-lived claim, bound to the pilot's
email and phone, in a configured booking form field. Wix verifies a signed request to the provider endpoint, and the
provider returns the final ILS price.

This design avoids a second discounted service, preserves service duration/capacity/reporting, and never sends the full
birth date or birth year to Wix. A birthday price and a promo coupon are intentionally non-stackable; native Gift Card
credit remains allowed as tender.

## Grid enforcement

With `WIX_AVAILABILITY_ADAPTER_ENABLED=true` the server accepts a requested start only on the strict local zero-waste
grid (`resolveWixBookingCheckout()` in `lib/wix/booking-checkout.ts`), but the browser then calls Wix Create Booking
itself, so a caller can book any other start Wix offers. **The availability adapter alone does not bind Wix bookings to
the local grid; this provider does.**

- For every booking of a mapped service the provider reads `bookedEntity.slot.startDate` (Wix documents it as an
  RFC 3339 instant), converts it to the Israel wall clock and prices it only when that start is an open departure of
  the package's empty-day grid: `strictWixGridDepartureFor()` in `lib/wix/booking-grid-policy.ts`, which shares its
  lookup with `isOnStrictWixGrid()`, the function the server resolver uses. The same Israel reading gives the flight
  date that a claim must match and the tariff (Saturday or 18:00 onward is prime time, as the grid itself decides). The
  booking's `timezone` label is ignored for all three because the browser sets it. A start without an explicit UTC
  offset, or not on a whole minute, cannot be placed on the grid and is refused too.
- An off-grid start is refused with `off-grid-departure`, claim or no claim, through the same path as an altered claim:
  the endpoint answers 400 and returns no `calculatedPrice`. Wix's Bookings Pricing API documents that Calculate Price
  then fails with `ERROR_CONTACTING_PRICING_PROVIDER` ("the provider may be unavailable or returned an error"), so the
  booking cannot be priced at checkout. Confirm it with the off-grid row of the verification matrix below.
- An on-grid booking is priced exactly as before, and a service that maps to no SimDream package keeps
  `unsupported-service`. The provider has no clock: closing departures that have already left and the add-on fit checks
  stay in the server resolver, and Wix still guards its own capacity.
- `npm run wix:readiness` prints `Scheduling grid enforcement: provider` when the provider configuration is complete
  (`wixGridEnforcement()` in `lib/wix/booking-grid-enforcement.ts`, which is `getWixBirthdayPricingProviderConfig() !==
  null`) and `none` otherwise. With `none` while the adapter flag is on it adds a WARN line: off-grid Wix bookings are
  possible until the pricing provider is active or Wix service scheduling is configured to the same grid. The line
  reflects the environment of the shell that runs the command (including `.env.local`), never calls Wix and never
  changes the exit code; run it with the deployment's values to judge that deployment. `GET /api/offers/capabilities`
  does not report it.
- Before activating, check whether Wix prices staff-created dashboard bookings and bookings paid with a Pricing Plan
  through the provider. Staff bookings at an off-grid time would then be refused as well; Pricing Plan bookings that Wix
  does not price through the provider are not bound by this check.

## Identity binding and issuance limits

**What is still self-attested.** The birth date is whatever the visitor types, exactly as on the local Stripe checkout:
the server checks that it is a real date and that it qualifies for the flight date, not that it is true. The contact
email and phone are not verified either. Binding and limits make a claim non-transferable and bound how fast claims are
issued; they do not prove a birthday.

**A claim is bound to the pilot's contact.** `POST /api/wix/birthday/claim` requires the pilot's email (a request
without a valid email is `invalid-request`, 400) and takes the phone when the form has one; the browser
(`lib/booking/client/wix-birthday-claim.ts`) sends the same email and phone that it then puts in the Wix booking's
`contactDetails`. The issued claim embeds keyed digests of them, never the contact itself: HMAC-SHA-256 with
`WIX_BIRTHDAY_CLAIM_SECRET`, base64url, of `email:<trimmed, lower-cased email>` and `phone:<digits>`
(`lib/wix/birthday-claim-identity.ts`). The provider recomputes every form of the booking's `contactDetails` (an Israeli
phone in its `972…` and its `0…` form) and applies the claim only when the email or the phone matches. When the booking
has no `contactDetails`, or they match neither, the booking is priced at the standard price with no discount: never
refused, never discounted. A claim issued before this change carries no identity keys and keeps working until it
expires (10 minutes). The issuer can no longer mint such a claim (`identityKeys` is required for a birthday claim, in
the types and at run time), so the provider's acceptance of key-less claims can be removed one release after this
change ships.

**Every claim carries an expiry and a purpose.** The signed payload always holds its expiry (`e`, 10 minutes after
issue) and its promotion kind (`k`; a birthday claim omits it and the absence means `birthday`, so the kind is covered
by the signature either way). The provider refuses (`invalid-birthday-claim`, the same 400 as any unpriceable booking) a
claim that has expired, whose payload was altered (relabelling its kind breaks the signature), or that is presented for
another service or another Israel flight date.

**Issuance is rate limited** (`lib/wix/birthday-claim-throttle.ts`), counted on every valid request before a claim is
issued, eligible or not. Over a limit the route answers 429 with `Retry-After` (the longest refused wait) and
`Cache-Control: no-store`; the booking page then shows its existing "Birthday pricing could not be verified" message.
The route reads at most 8 KiB of `application/json` (413 and 415 otherwise, `lib/http/read-json-body.ts`).

The booking page does not spend that budget per Wix draft. A claim depends only on the package, flight date, birthday
and contact, so `lib/booking/client/wix-birthday-claim.ts` keeps the last one in memory (never in browser storage or a
URL) and reuses it for every new draft (a changed departure on the same date, notes, an applied code) until one of those
inputs changes or the claim is 5 minutes old on the browser's clock, which leaves it at least 5 of its 10 minutes
whatever the clock skew. An email the route would refuse is caught before any request and shown as the page's existing
contact-details message.

| Rule | Durable limiter (`consumeRateLimit()`) | In-process fallback |
| --- | --- | --- |
| `birthday-claim-ip`, the client address from `rateLimitClientAddress()` | 10 per 10 minutes (60 for the shared `unknown-client` bucket) | 60 per 10 minutes |
| `birthday-claim-identity`, the normalized email | 5 per hour | 5 per hour |

The fallback is an exception to the fail-closed rule, on purpose. The Wix deployment has no durable limiter store, so
when `consumeRateLimit()` throws `RateLimitUnavailableError` the route counts in a bounded in-process fixed-window map
(`lib/wix/birthday-claim-fallback-limiter.ts`, at most 5,000 subjects, hashed; a full map drops closed windows first,
then the oldest bucket) instead of answering 503, so the discount keeps working there. The fallback's address rule is
the loose one because the Worker cannot trust the client address yet (SECURITY.md, "Client address for rate
limiting"): the address may be spoofable, or every visitor may share one, and a tight shared bucket would deny the
discount site-wide. The per-email rule carries the bound. The fallback counts per process: every Worker instance keeps
its own counts, so it bounds a burst against one instance, not the whole site. Any other limiter failure answers 503.

**Known limits, by decision:**

- **No one-time nonce.** Wix may call the pricing provider more than once for the same booking (preview, creation,
  checkout), so a consume-once claim would refuse legitimate re-pricing, and the Wix deployment has no durable store to
  record consumption anyway. Within its 10 minutes a claim can therefore be re-presented, but only for the same service,
  Israel flight date and contact identity.
- **No "one promotion claim per identity per year".** That needs a durable store and an owner decision on the rule
  itself; it is not implemented. Until the owner decides, the same email can earn a birthday price on more than one
  booking, bounded only by the issuance limits above.
- **Rotating contacts.** Someone willing to type a different email for every request is bounded only by the address
  rule, and on the fallback that rule is loose and per instance.
- **Someone else can use up a customer's claims.** Issuance is unauthenticated, so anyone who knows a person's email can
  spend that email's 5 claims per hour and block that person's Wix birthday checkout for up to an hour: per Worker
  instance on the in-process fallback, everywhere on the durable limiter. Today a 429 fails the Wix checkout with the
  "could not be verified" message. The owner may decide instead that a refused claim books at the standard price; that
  is a product decision, not made here.

## Preconditions

- The active target is **SimDream-Staging**, metasite `317b0c6d-6608-499a-bb3c-b1c37650e460`.
- The deployed frontend has the provider route at
  `https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com/api/wix/birthday-pricing/v1/calculate-price`.
  Use the current immutable staging hostname when testing; replace the hostname only after a verified Wix release.
- Confirm in Wix Developer Center that an external **Bookings Pricing Integration service plugin** can be installed on
  this Editorless Headless site. Wix documentation requires a separate Custom App/service-plugin extension; the existing
  Headless OAuth app in `wix.config.json` is not that app. Stop and get Wix support confirmation if the staging site
  cannot install backend extensions.
- Confirm no other Bookings pricing provider is active. Wix allows only one and returns
  `MULTIPLE_PRICING_PROVIDERS_FOUND` otherwise.
- The Bookings services must use numeric ILS prices, as the provider returns `calculatedPrice`.

## 1. Create and configure the Custom App

1. In the Wix Developer Center, create a **separate private Custom App** named `SimDream Birthday Pricing`.
   Do not reuse the public visitor OAuth app ID.
2. On the app's **Extensions** page, create the Bookings Pricing Integration service-plugin extension. Configure its
   deployment URI as:

   ```text
   https://<current-staging-host>/api/wix/birthday-pricing
   ```

   Wix appends `/v1/calculate-price`; do not include that suffix twice.
3. Add the app's public key to the trusted staging environment. The endpoint accepts Wix's signed RS256 JWT only after
   verifying this key, the app ID audience, issuer, issued-at, and expiry.
4. Install/authorize the Custom App only on SimDream-Staging. Do not enable it on the live customer site.

## 2. Configure the single custom booking field

Create one `SHORT_TEXT` Bookings custom form field shared by every mapped SimDream booking service. A suitable internal
label is `Birthday pricing claim`; it must not be visible to customers in the headless frontend. Record its immutable
field GUID. The frontend sends an opaque signed token in this field only for a qualifying birthday booking. A token
bound to an email and a phone is about 330 characters (measured 2026-11-15), so the field must accept at least 400.

Never label this field as a request for date of birth, and do not use a regular form-submission key: Wix's pricing
provider receives the Booking `additionalFields` array, which uses the form-field GUID.

## 3. Set the staging-only environment values

Set values in the deployed Wix environment or its server-side secret store. Never commit them, expose them through a
`NEXT_PUBLIC_` variable, or put them in browser code.

| Variable | Value / purpose |
| --- | --- |
| `WIX_BIRTHDAY_PRICING_PROVIDER_ENABLED` | Literal `true` only after all other values and Custom App installation are ready. |
| `WIX_BIRTHDAY_CLAIM_FIELD_ID` | GUID of the shared `SHORT_TEXT` booking form field. |
| `WIX_BIRTHDAY_CLAIM_SECRET` | Fresh random secret of at least 32 bytes; signs 10-minute claim tokens. |
| `WIX_BIRTHDAY_PRICING_PROVIDER_APP_ID` | The separate Custom App ID from step 1. |
| `WIX_BIRTHDAY_PRICING_PROVIDER_PUBLIC_KEY` | PEM public key from that app's dashboard, including `BEGIN PUBLIC KEY` markers. |

Keep `WIX_AVAILABILITY_ADAPTER_ENABLED=true` only on staging as it is today. The birthday provider does not turn on
availability, booking writes, payment providers, or PayPlus.

## 4. Verification matrix (staging only)

Before advertising this offer or connecting live payments, execute and record each result:

| Case | Expected final Wix cart total |
| --- | --- |
| Eligible 30-minute daytime flight | registry price minus exactly 15%, whole-shekel half-up rounding |
| Eligible 60-minute flight | registry price minus exactly 15% |
| Eligible 90-minute daytime / evening / Saturday | 15% off the correct registry tariff (including ₪950 prime time) |
| 45-minute discounted promotion | standard price; no claim/no birthday reduction |
| PRO, Fear of Flying, corporate, subscription redemption | standard price; no birthday reduction |
| Missing claim | standard price |
| Altered/expired claim | booking cannot be priced; it must not receive a discount |
| Claim issued for one email and phone, booking created with another email and phone | standard price; no birthday reduction |
| Claim issued for the pilot, booking created with the same email (any letter case) | registry price minus exactly 15% (confirms Wix passes `contactDetails` to the provider) |
| Sixth claim request for one email within an hour (on the Wix Worker the fallback counts per instance) | the claim request answers 429; the booking page shows the "could not be verified" message |
| Off-grid start (5 minutes after a grid departure, booked straight through Wix Create Booking), with and without a claim | booking cannot be priced (`off-grid-departure`); it never reaches payment; afterwards the refused booking no longer holds the Wix slot: Wix availability offers the off-grid start and the grid departure it overlaps again, without a staff action. If the slot stays held, record for how long, because an unpriceable booking then blocks real customers |
| Birthday price with a native Gift Card | gift-card credit applies to the reduced balance |
| Birthday price with a promo coupon | UI refuses combination; Wix service coupon scope must also prevent it |
| Non-birthday normal booking | original price, duration and email service name unchanged |

Run `npm run wix:smoke`, `npm run wix:readiness`, and the local test suite before this manual matrix. Inspect the Wix
order/booking: it must contain only the opaque claim in the custom field, never a full birth date. Confirm that the
calculated cart price matches the hosted checkout and that no session is marked paid merely by a browser return.

## Rollback

1. Set `WIX_BIRTHDAY_PRICING_PROVIDER_ENABLED=false` (or remove it) in the staging environment.
2. Disable/uninstall the Custom App's pricing extension from SimDream-Staging.
3. Redeploy/restart the worker and verify `/api/offers/capabilities` returns
   `wixBirthdayPricingProviderEnabled: false`.
4. Re-run a normal base-flight checkout. It must use the standard service price and show the existing Wix birthday notice.
   Grid enforcement goes back to `none` with the provider: off-grid Wix bookings are possible again.

The standard checkout remains available; no duplicate services, catalogue mutation, or customer-data cleanup is needed.

## Sources

- [Wix Bookings Pricing Integration service plugin](https://dev.wix.com/docs/api-reference/business-solutions/bookings/pricing/pricing-integration-service-plugin/introduction)
- [Calculate Price external endpoint contract](https://dev.wix.com/docs/api-reference/business-solutions/bookings/pricing/pricing-integration-service-plugin/calculate-price)
- [Wix self-managed service-plugin request signing](https://dev.wix.com/docs/build-apps/develop-your-app/develop-a-self-managed-app/supported-extensions/backend-extensions/service-plugins/add-self-managed-service-plugin-extensions-with-rest)
