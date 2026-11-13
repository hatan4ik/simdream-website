# Wix Bookings birthday pricing provider: staging activation

**Status: implementation ready, not active.** This guide enables the 15% birthday price on the dedicated
**SimDream-Staging** Headless site only. It must not be applied to the live Editor site or used as a payment-provider
substitute.

## What this changes

The customer keeps booking the original 30/60/90-minute Wix service. The Next.js frontend previews eligibility, but it
does not send a price to Wix. For an eligible customer it submits an opaque, short-lived claim in a configured booking
form field. Wix verifies a signed request to the provider endpoint, and the provider returns the final ILS price.

This design avoids a second discounted service, preserves service duration/capacity/reporting, and never sends the full
birth date or birth year to Wix. A birthday price and a promo coupon are intentionally non-stackable; native Gift Card
credit remains allowed as tender.

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
field GUID. The frontend sends an opaque signed token in this field only for a qualifying birthday booking.

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

The standard checkout remains available; no duplicate services, catalogue mutation, or customer-data cleanup is needed.

## Sources

- [Wix Bookings Pricing Integration service plugin](https://dev.wix.com/docs/api-reference/business-solutions/bookings/pricing/pricing-integration-service-plugin/introduction)
- [Calculate Price external endpoint contract](https://dev.wix.com/docs/api-reference/business-solutions/bookings/pricing/pricing-integration-service-plugin/calculate-price)
- [Wix self-managed service-plugin request signing](https://dev.wix.com/docs/build-apps/develop-your-app/develop-a-self-managed-app/supported-extensions/backend-extensions/service-plugins/add-self-managed-service-plugin-extensions-with-rest)
