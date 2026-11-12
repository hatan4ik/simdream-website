# Module handoff: checkout consent and birthday (workstream A6)

Branch `feat/checkout-consent-birthday` (on top of the four merged workstreams). It wires the mandatory
consent block and the mandatory Pilot in Command birthday, with its 15 percent discount, into the booking
checkout, using the seams of `docs/modules/modular-booking.md`, the copy and records of
`docs/modules/legal-content.md` and the engine of `docs/modules/birthday-offers.md`.

## 1. What the owner asked for, and where it lives

| Requirement | Where |
| --- | --- |
| Two separate, unchecked-by-default, required confirmations: (1) rules + refund-by-form rule + privacy, (2) media release and waiver | `components/booking/ConsentBlock.tsx` (+ `ConsentAgreement`, `ConsentRulesLabel`, `MediaReleaseDisclosure`), state in `hooks/use-booking-consent.ts`, copy only from `CONSENT_COPY` |
| Plain one-sentence summary, full clause expandable, loaded lazily per language | `MediaReleaseDisclosure` calls `loadMediaReleaseSection(language)` on first open (dynamic `import()` of the small extras module), rendered with `LegalClauseList` |
| Links open in a new tab, the draft is kept | `ConsentRulesLabel` (`target="_blank" rel="noopener noreferrer"`, screen-reader suffix "opens in a new tab") |
| Booker is 18+ (and the minor's guardian) | `copy.media.guardianNote`, linked to the checkbox with `aria-describedby` |
| Blocked submit with a focused, announced error | `useBookingExtras().validate()` is the `extraValidation` seam: first invalid control takes focus, the first failure goes to the page's alert (`BookingErrorAlert`, or the buy box alert in the Express Shop), each control also carries its inline error |
| Server rejects a booking without both (400) and stores `buildConsentRecord()` | `bookingCheckoutSchema.consent` (literal `true` for both) and `lib/booking/checkout-extras.ts`; the client sends only the two booleans and the page language |
| Birthday is mandatory in "Pilot in Command Details" | `components/booking/BirthdayField.tsx` through the `extraFields` seam, `hooks/use-booking-birthday.ts` |
| 15 percent in the flight month, with the congratulations slogan | `BirthdayBanner`, `BirthdayDiscountLine`, copy from `lib/discounts/birthday/copy.ts` |
| Honoured up to 14 days back | the existing engine (`BIRTHDAY_LOOKBACK_DAYS`), reused, not re-implemented |
| `<BirthdayOfferLink />` near the field | inside `BirthdayField` |
| Computed server-side from the slot's flight date, the client only previews | `lib/discounts/birthday/booking-discount.ts` (`resolveBookingBirthday`), called by the server (`checkout-extras.ts`) and by the browser preview (`lib/booking/client/birthday-field.ts`) |
| Own line in the summary, total updates everywhere | `extraDiscountLines` seam; the discount is added to the manifest's discount, so summary, buy box, sticky bar, button, Stripe amount and the confirmation email agree |
| Only month and day persisted | migration 011, `toBirthdayMonthDay()` |
| Both pilot forms | `bookingExtraSlots(extras, variant)` builds the same three nodes for `PilotManifestStep` and for `AmazonFlightStorefront` |

## 2. Files

New (source bytes about 56 KB, comments included; no new dependency):

```
lib/discounts/birthday/booking-discount.ts   resolveBookingBirthday(): validate + decide + price, pure
lib/booking/checkout-extras.ts               resolveCheckoutExtras(): consent record + birthday for the server, pure
lib/booking/client/birthday-field.ts         path mode, min/max of the date control, field state, status kind (pure)
lib/booking/client/consent-state.ts          first missing confirmation, request payload (pure)
lib/booking/client/wix-consent-note.ts       the Wix cart note (pure)
lib/booking/client/extras-copy.ts            4 strings x 6 languages that no other module owns
lib/wix/cart-note.ts                         setWixCartNote(): Cart V2 Update Cart, note only
lib/db/migrations/011_booking_consent_birthday.sql   (mirrored in lib/db/schema.sql)
components/booking/{ConsentBlock,ConsentAgreement,ConsentRulesLabel,MediaReleaseDisclosure,
  BirthdayField,BirthdayStatus,BirthdayBanner,BirthdayDiscountLine,StorefrontVoucherBox,
  booking-extra-slots}.tsx, pilot-field-styles.ts
components/booking/hooks/{use-booking-consent,use-booking-birthday,use-booking-extras,use-booking-pricing}.ts
tests/unit/{birthday/booking-discount,checkout-extras,booking-extras-client,wix-cart-note}.test.ts
tests/integration/checkout-consent-birthday.test.ts
tests/e2e/booking-consent-birthday.spec.ts, tests/a11y/booking-consent-states.spec.ts, tests/support/booking-extras.ts
```

Changed: `types/index.ts` (4 optional `Booking` fields), `lib/validation.ts`, `lib/booking/checkout-service.ts`,
`lib/db/store.ts` (row mapping; the file got shorter), `lib/sendgrid.ts` (one conditional "Birthday Discount" row),
no API route changed, `app/(public)/book/page.tsx` (still 249 lines), `app/admin/bookings/page.tsx` (shows the
birthday day/month and the amount to staff), `components/booking/{BookingStorefrontView,PilotManifestForm,
hooks/use-booking-checkout,hooks/use-booking-voucher,hooks/index,index}`, `components/scheduler/AmazonFlightStorefront.tsx`
(three optional slot props; the voucher box moved out; 1,992 to 1,924 lines), `lib/booking/client/{index,wix-checkout-cart}.ts`,
`lib/discounts/birthday/index.ts`, `tests/unit/module-size.test.ts` (two recorded sizes lowered: storefront 1,924,
`lib/db/store.ts` 927), `tests/a11y/support/scan-keys.ts` and `a11y-baseline.json` (15 empty scans), and the test
helpers and specs that post a booking checkout (section 8).

## 3. Data flow, path by path

### 3.1 Local checkout (Supabase + Stripe, `WIX_AVAILABILITY_ADAPTER_ENABLED` off)

1. The pilot step keeps two booleans (consent) and the typed date (`YYYY-MM-DD`) in React state. The date is
   previewed with `resolveBookingBirthday` (flight date of the chosen slot, registry subtotal, package eligibility).
   The manifest receives `voucher discount + birthday discount`, so every total on the page is the discounted one.
   A local voucher must cover the subtotal less the birthday discount (`useBookingPricing`); the voucher hook re-checks
   its balance when that amount changes.
2. Submit: `findBookingBlocker` runs `extras.validate()` after the contact fields. Birthday, then rules, then media; the
   first failure takes focus and its text goes to the page alert. Nothing is sent.
3. `POST /api/checkout` body: the existing core fields plus `pilotBirthDate` and
   `consent { rulesRefundsAndPrivacy, mediaReleaseAndWaiver, language }`. No version, time or amount.
4. The route validates the schema (400 with `fields` when a box is missing, not literally `true`, or the date is not a
   calendar date), then the existing guards (Wix authority 409, payments 503). The service resolves package, add-ons and
   slot, prices the registry manifest (the slot's own tariff), then `resolveCheckoutExtras`: `buildConsentRecord()` with
   the server clock, and `resolveBookingBirthday()` (age 10 to 110 on the flight date, not in the future, the engine on
   the slot's Israel date, `getBirthdayPackageEligibility`). Failures are 400 with the message in the page language.
5. `payable = subtotal - birthdayDiscount`. A voucher must cover `payable` and is debited `payable`. The booking is
   created with `discountIls = birthdayDiscount + voucher cover`, `totalIls = payable` (or 0 when a voucher pays),
   `pilotBirthdayMonth/Day`, `birthdayDiscountIls` and `consentRecord`.
6. Stripe: `createHostedCheckout({ amountIls: booking.totalIls })`, `unit_amount = round(amountIls * 100)`, which equals the
   engine's `totalAgorot`. Only the signed webhook confirms payment, as before. The confirmation email has a
   "Birthday Discount" row and "Total Paid" is the discounted total.

### 3.2 Wix-hosted checkout (`WIX_AVAILABILITY_ADAPTER_ENABLED=true`)

The browser creates the booking and the cart in Wix and opens Wix's hosted checkout; `POST /api/checkout` answers 409 for
bookings there, so the server never sees them and cannot enforce anything.

- Consent: enforced in the client before anything is launched (`extraValidation` runs before `ensureDraft`).
  Recorded: `buildWixConsentNote()` builds an English staff line (both confirmations, `CONSENT_VERSION`,
  `LEGAL_DOCUMENT_VERSION`, page language, browser time) and `recordNoteOnWixDraft()` PATCHes it into the visitor-owned
  cart's `note` right before `get-checkout-url`. If Wix refuses, the checkout stops with the localized
  `paymentStartFailed` message.
- Birthday: still mandatory and validated (age, not in the future). **No banner, no discount line, no total change.** The
  field carries the honest notice `birthdayWixNotice` from the first paint ("cannot be applied automatically ... your day
  and month are passed to our team with the order"). The day and month (never the year) go into the same cart note so
  staff can honour the owner's manual process.
- Not stored in our database. The browser time in the note is not authoritative; Wix's own cart and order timestamps are.

Documentation behind the choice (read 2026-11-11):

| Claim | Source |
| --- | --- |
| Update Cart is `PATCH https://www.wixapis.com/ecom/v2/carts/{cart.id}`, body `cart` with `id`; `note` is "Optional message left by the customer. Usually intended for the merchant", maxLength 1000; scope `SCOPE.ECOM.WRITE-CARTS-V2_LIMITED`. The repo already PATCHes the same URL with the visitor session for `customerInfo` | https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/cart-v2/update-cart |
| Cart V1 `buyerNote` is Cart V2 `note` | https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/cart-v2/migration-mapping |
| A booking form submission key that is not a field's `target` fails the whole submission, so adding a custom key to `formSubmission` of Create Booking would break the booking unless the Wix form is edited first | https://dev.wix.com/docs/api-reference/crm/forms/form-submissions/about-submission-values |
| `redirects.createRedirectSession({ bookingsCheckout })` takes `slotAvailability` and `timezone` (plus callbacks): no free-text field | https://dev.wix.com/docs/api-reference/business-management/headless/redirects/create-redirect-session |

Not verified, say so to the owner: (a) that a visitor token is accepted by that PATCH for `note` (very likely, same endpoint
and scope as `customerInfo`, but not run against SimDream-Staging); (b) that the cart note reaches the order as the buyer
note staff read in the Wix dashboard (the V1 to V2 mapping suggests it, no page I read says so); (c) whether the hosted
checkout shows the note to the buyer in its note box. Run one staging booking and look at the order before relying on it.

### 3.3 Wix flight-track redemption (`/book?subscription=wix`)

Both confirmations and the birth date are required and checked in the browser before the redirect (the owner asked for
every flow). **Nothing is recorded**: the redirect session has no free-text carrier (table above), the booking is created by
Wix and our server never sees it. The field's hint says so ("this date of birth is only checked and is not stored"), and no
discount ever applies (no stacking). If the owner wants no pointless mandatory field there, hide it for this path
(one condition in `BirthdayField`); I kept it because the brief says every flow.

### 3.4 Voucher-funded booking (local)

Same as 3.1. The voucher is a way to pay, not a promotion (birthday handoff): the discount comes off first and the voucher
covers the rest. A voucher of exactly the discounted total now works where it would have been refused before
(`tests/integration/checkout-consent-birthday.test.ts`). `discount_ils` then equals the whole subtotal (birthday part plus
voucher part) and `birthday_discount_ils` keeps the birthday part.

### What is stored where

| Data | Local checkout | Wix-hosted | Subscription redemption |
| --- | --- | --- | --- |
| Full date of birth | request body and React state only, never stored or logged | React state only | React state only |
| Birthday month and day | `bookings.pilot_birthday_month/day` | in the Wix cart note (staff) | nowhere |
| Birthday discount | `bookings.birthday_discount_ils` (inside `discount_ils`) | none | none |
| Consent record | `bookings.consent_record` (server time, versions, language) | Wix cart note (browser time, versions, language) | nowhere |

The "discount applied" flag of the birthday handoff is `birthday_discount_ils > 0`; a separate boolean could only disagree
with it, so none was added (veto: one more column).

## 4. Migration 011 and data model

`lib/db/migrations/011_booking_consent_birthday.sql` (idempotent, also in `schema.sql`): `pilot_birthday_month SMALLINT`,
`pilot_birthday_day SMALLINT` (both null or both set, 1..12 and 1..31), `birthday_discount_ils NUMERIC(10,2) NOT NULL
DEFAULT 0` (0 .. `discount_ils`), `consent_record JSONB` (an object with `acceptedAt`, `consentVersion`,
`legalDocumentVersion`). The existing `total_ils = subtotal_ils - discount_ils` check keeps holding. Bookings made before the
migration have NULL consent. Apply after 010 and a backup. Anything else that takes the number 011 must renumber.

## 5. Decisions and assumptions (veto any of them)

1. **Birth date control: native `<input type="date">`**, not three selects. One control with the platform's own picker and
   keyboard entry, a single `autocomplete="bday"` (the three-select form would need `bday-day/month/year` and a 100-entry year
   list), native localization, good screen-reader support on current browsers; `dir="ltr"` keeps the value left to right on
   RTL pages. `min`/`max` come from the engine's age bounds on the flight date and never pass today, each loosened by one day
   so the native control never blocks a date the engine accepts (29 February). The engine's localized message is the verdict.
   It is never natively `required` and never `setCustomValidity`: the page validates on submit so the error is localized,
   announced and focused.
2. The discount base is the whole subtotal (package plus add-ons), as the engine decides; vouchers cover what remains.
3. Eligibility is the engine's: consumer flights only, not the Discounted Promotion, not PRO, not Fear of Flying. The date is
   still required and validated for those (the brief says every flow); a neutral note says why nothing was taken off.
4. Errors: the first failure is announced once by the page alert; the inline texts are tied to the controls with
   `aria-describedby` and are not second `role="alert"`s. The birthday error sits in an always-present polite region so a date
   rejected on blur is announced. Checkboxes are never natively `required`.
5. The banner sits **below** the date control, so the field never moves. In the Express Shop the discount row sits above the
   pilot fields, so an empty row of the same height is kept while the discount is still possible (`reserveSpace`): no shift
   there either (`tests/e2e/booking-consent-birthday.spec.ts` measures it).
6. The Express Shop buy box is sticky; with the new blocks it is taller than a laptop screen, so it now scrolls inside
   itself (`lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto`). Without it the submit button was unreachable until the page end.
   This is the one visible change to the old layout.
7. The consent record is an object in a JSONB column rather than separate columns, as `buildConsentRecord()` returns it.
8. Language of the consent record is the page language at submit; the wording the booker saw is `CONSENT_VERSION`.

## 6. Open questions for the owner

1. Wix path: is the cart note enough for staff, or should a Wix Automation or a real booking-form field (needs the Wix form
   edited first, then a custom `formSubmission` key) carry it? And one staging booking to confirm points (a) to (c) above.
2. Subscription redemption: keep a mandatory birthday that is checked and thrown away, or drop it there?
3. Retention and legal basis for `consent_record` and the birthday day/month (personal data in `bookings`).
4. Privacy policy section 7 still says generically that "we keep only what is needed". Now that the engine keeps month and day
   plus a discount amount, the legal handoff suggests the precise sentence; changing it bumps `LEGAL_DOCUMENT_VERSION` and
   needs counsel, so it was left alone.
5. Should the Stripe line item description mention the birthday discount? Today the customer sees one discounted amount.
6. The rules text (clause 15.2) says the consent record holds version and time; it matches.

## 7. Lines for GENESIS.md and AGENTS.md

`npm run docs:verify` (not stamped here) lists the new names to add: library modules `lib/booking/checkout-extras.ts`,
`lib/booking/client/{birthday-field,consent-state,extras-copy,wix-consent-note}.ts`,
`lib/discounts/birthday/booking-discount.ts`, `lib/wix/cart-note.ts`; components `BirthdayBanner`, `BirthdayDiscountLine`,
`BirthdayField`, `BirthdayStatus`, `ConsentAgreement`, `ConsentBlock`, `ConsentRulesLabel`, `MediaReleaseDisclosure`,
`StorefrontVoucherBox`, `booking-extra-slots`; database `migration 011_booking_consent_birthday.sql` (and "001-011").

AGENTS.md section 3 (booking engine), add:

> **Mandatory extras in every booking flow.** The pilot step carries two separate, unchecked confirmations (rules, refund-by-form rule and privacy; media release and waiver, with the full clause loaded on demand) and the pilot's date of birth, in both the guided steps and the Express Shop, from the same modules (`bookingExtraSlots()` in `components/booking`). The submit is blocked with a focused, announced error until they are given. `POST /api/checkout` answers 400 without both confirmations or with an unusable birth date, stamps `buildConsentRecord()` with the server clock and the versions, and prices the 15 percent birthday discount from the slot's flight date with the engine in `lib/discounts/birthday` (`resolveBookingBirthday`); the Stripe amount is the discounted total, a voucher covers what remains, and only the birthday month and day, the discount amount and the consent record are stored (migration 011). The Wix-hosted checkout cannot enforce the discount: it shows no reduction, an honest notice instead, and records the consent stamp and the birthday day and month in the Wix cart `note` (`lib/wix/cart-note.ts`); a Wix subscription redemption requires the same inputs but stores nothing.

## 8. Callers of the booking checkout that were updated

`tests/support/app.ts` (`bookingCheckoutBody()` now carries a consent and a June birth date; every vitest suite that posts
a booking goes through it), `tests/integration/contracts.ts` (the admin booking contract), `tests/unit/{validation,
checkout-service-ports,booking-contracts}.test.ts`, `tests/e2e/pages/booking-page.ts` (`fillPilot` ticks both boxes and fills a
date that earns no discount unless told not to), `tests/usability/support/booking.ts` (`fillStorefrontManifest`,
`completeExtrasByKeyboard`), `tests/resilience/helpers.ts`, `tests/e2e/{booking-recreational,mobile}.spec.ts`,
`tests/a11y/keyboard.spec.ts` (the keyboard journeys now tab to the date control, type it and press Space on each
confirmation). Nothing under `scripts/`, `tests/load` or `tests/perf` posted a booking.

## 9. Verification

See the handoff message of the workstream for the commands run and their results.
