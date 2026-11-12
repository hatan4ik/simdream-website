# Birthday offers module (workstream A5)

Pure birthday-discount engine, the public Offers page (`/offers`), the navigation entry, and the Wix
feasibility finding. Scope stops at the engine and the explanation page: the mandatory date-of-birth
field, the checkout banner and the server pricing are workstream A6.

Branch `feat/birthday-offers`. Nothing under `app/(public)/book/`, `components/booking/`, `lib/booking/`
or `lib/db/` was touched.

## 1. Files

| Path | Role |
| :--- | :--- |
| `lib/discounts/birthday/` | Pure engine, no React, no I/O. Public entry `index.ts`. |
| `lib/discounts/birthday/constants.ts` | The vetoable decisions as named constants. |
| `lib/discounts/birthday/civil-date.ts` | Strict `YYYY-MM-DD` parsing and day arithmetic without `Date` or time zones. |
| `lib/discounts/birthday/evaluate.ts` | `evaluateBirthdayDiscount()` and `isBirthdayDiscountEarned()`. |
| `lib/discounts/birthday/eligibility.ts` | `getBirthdayPackageEligibility()`, `isBirthdayDiscountApplicablePackage()`, `getBirthdayEligiblePackages()`. |
| `lib/discounts/birthday/money.ts` | `applyBirthdayDiscount()`, `calculateBirthdayDiscountIls()` (whole shekels and agorot). |
| `lib/discounts/birthday/minimise.ts` | `toBirthdayMonthDay()`: the only part of a birth date to persist. |
| `lib/discounts/birthday/capability.ts` | `isBirthdayDiscountEnforceableOnActivePath()`. |
| `lib/discounts/birthday/copy.ts` | Six-language checkout copy for A6: congratulations slogan, link label, field label, errors. |
| `lib/offers/` | Offers page copy (`copy/<lang>.ts`, aggregated in `offers-copy.ts`), registry-derived data (`offers-data.ts`), `nav-label.ts`, `format.ts`. |
| `components/offers/` | Page sections, calculator, `<BirthdayOfferLink />`. Public entry `index.ts`. |
| `app/(public)/offers/{layout,page}.tsx` | The route. |
| `app/api/offers/capabilities/route.ts` | `GET` one boolean: can the live checkout apply the discount. |
| `tests/unit/birthday/*.test.ts`, `tests/unit/nav-book-short.test.ts`, `tests/e2e/offers.spec.ts` | Tests. |

Shared files edited, each with the smallest diff: `components/layout/Navbar.tsx`, `components/layout/Footer.tsx`,
`lib/seo/seo-config.ts`, `lib/seo/site-routes.ts`, `lib/i18n/translations.ts` (the single `nav.bookFlightShort`
key, see section 9), `public/llms.txt` (regenerated with `npm run llms:generate`, required by
`tests/unit/llms-txt.test.ts`), `tests/support/e2e.ts` (`/offers` added to `PUBLIC_ROUTES`),
`tests/a11y/a11y-baseline.json` (six empty `public /offers [...]` scans), `tests/usability/header-fit.spec.ts`.

## 2. Engine API

```ts
import {
  evaluateBirthdayDiscount, getBirthdayPackageEligibility, applyBirthdayDiscount,
  toBirthdayMonthDay, isBirthdayDiscountEnforceableOnActivePath,
  getBirthdayBannerText, getBirthdayErrorText,
} from '@/lib/discounts/birthday';

evaluateBirthdayDiscount({ birthDate: '1990-10-28', flightDate: '2026-11-11' });
// {
//   valid: true, eligible: true, reason: 'grace_before', percent: 15,
//   birthdayDate: '2026-10-28', windowStart: '2026-10-01', windowEnd: '2026-11-11',
//   daysFromBirthday: 14,
// }
evaluateBirthdayDiscount({ birthDate: '1990-10-28', flightDate: '2026-11-12' }); // eligible: false, reason: 'none' (15 days)
evaluateBirthdayDiscount({ birthDate: '2024-01-01', flightDate: '2026-11-20' }); // valid: false, error: 'pilot_too_young'

getBirthdayPackageEligibility('pkg-promo-45'); // { applicable: false, reason: 'discounted_promotion' }
getBirthdayPackageEligibility('pkg-captain-60', { isSubscriptionRedemption: true }); // 'subscription_redemption'

applyBirthdayDiscount(690);
// { percent: 15, subtotalIls: 690, discountIls: 104, totalIls: 586, discountAgorot: 10400, totalAgorot: 58600 }

toBirthdayMonthDay('1990-11-25');                       // { month: 11, day: 25 }  (drop the year before persisting)
isBirthdayDiscountEnforceableOnActivePath({ wixAuthoritative: true }); // false
```

Result fields: `valid` / `error` (`invalid_birth_date`, `invalid_flight_date`, `birth_date_in_future`, `pilot_too_young`,
`pilot_too_old`); `eligible`; `reason` (`same_month`, `grace_before`, `grace_after`, `none`); `percent` (15 when
eligible, else 0); `birthdayDate` (the occurrence the verdict is about: the flight-year one, or the neighbouring
year's when a grace window crosses New Year, for example flight 2027-01-03 and birthday 12-28 gives 2026-12-28);
`windowStart` and `windowEnd` (inclusive FLIGHT dates that qualify for that occurrence); `daysFromBirthday` (flight
minus birthday, positive when the birthday has passed). `evaluateBirthdayDiscount(input, policy?)` accepts a
`BirthdayPolicy` so tests and future campaigns can vary the numbers. `input.today` is injectable; the default is the
Israel date from `lib/scheduler/israel-clock.ts`.

## 3. Decision table

| Decision | Value | Where to veto |
| :--- | :--- | :--- |
| Discount | 15 percent of the booking subtotal (package plus add-ons), rounded half up to a whole shekel (450 gives 68, 690 gives 104) | `BIRTHDAY_DISCOUNT_PERCENT` |
| Which date decides | The FLIGHT date (Israel calendar date), not the booking date, so nobody books a year ahead inside their birthday month | `evaluate.ts` |
| Same month | Birthday month equals flight month (birthday earlier or later in the month) | `evaluate.ts` |
| Backward grace | A birthday 1 to 14 days before the flight qualifies even when it fell in the previous month (exactly 14 yes, 15 no; works across New Year) | `BIRTHDAY_LOOKBACK_DAYS` |
| Forward grace | Supported by the engine and the tests, OFF by default | `BIRTHDAY_LOOKAHEAD_DAYS` (0) |
| 29 February | Counts as 28 February in a year without a 29th | `occurrenceIn()` |
| Age | Date not in the future (Israel today); pilot at least 10 on the flight date (Terms 3.6); at most 110. The birthday is the PILOT's, the booker is 18+ | `BIRTHDAY_MIN_PILOT_AGE_YEARS`, `BIRTHDAY_MAX_PILOT_AGE_YEARS` |
| No stacking (Terms 8.1) | Not on the Discounted Promotion (the registry's `daytimeOnly` flag), not on a subscription redemption, not on a gift-voucher PURCHASE | `eligibility.ts` |
| Voucher as payment | A gift voucher or gift card used to pay is not a promotion: the discount comes off first, the voucher covers the rest | policy only (no code) |
| Package categories | Consumer flights only: `recreational`. PRO training, fear of flying and the corporate workshop are excluded | `BIRTHDAY_ELIGIBLE_CATEGORIES` |
| Data minimisation | Validate with the full date, persist only `{ month, day }` and the "discount applied" flag | `toBirthdayMonthDay()` |
| Money | Whole shekels from the registries; never negative or fractional; agorot provided for Stripe | `money.ts` |

## 4. Wix feasibility finding

Question: when `WIX_AVAILABILITY_ADAPTER_ENABLED=true` the checkout is Wix-authoritative and this app only holds an
anonymous visitor session (`lib/wix/booking-checkout-client.ts`, `docs/WIX_HEADLESS_ARCHITECTURE.md`). Can that
checkout securely apply a percentage discount that depends on customer-entered data (a birthday)?

Evidence, one claim per source (Wix docs read on 2026-11-11):

| Claim | Source |
| :--- | :--- |
| A visitor session can add a coupon by CODE to its cart (permission Write Carts V2). The repo already does this (`applyWixCoupon`, `couponCode`). | Cart V2 Add Coupon: https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/cart-v2/add-coupon |
| A coupon is a shared code, not a rule about the customer: "Coupons can't be limited to a specific type/subset of customers"; the number of uses per customer cannot be limited; only one coupon per order. So a static birthday coupon cannot depend on the entered birth date. | Coupon Functionality: https://dev.wix.com/docs/api-reference/business-solutions/coupons/coupons/functionality |
| Creating a coupon (`percentOffRate`, a `bookings` scope, `usageLimit`, `expirationTime`) needs `COUPONS.MANAGE` (admin). A visitor token cannot create one. | Create a Coupon: https://dev.wix.com/docs/api-reference/business-solutions/coupons/coupons/create-a-coupon |
| Admin calls need elevation or client credentials. Elevation exists only in projects built with Wix's Astro integration; any other setup (this repo is Next.js) must use client credentials, i.e. an OAuth client SECRET on a backend. | About Admin Operations: https://dev.wix.com/docs/go-headless/authentication/admin/about-admin-operations |
| Automatic discounts: creating a discount rule needs `ECOM.DISCOUNT_RULES_CREATE` (admin); only item-level discounts exist; built-in triggers are item quantity or cart subtotal. | https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/extensions/discounts/discount-rules/introduction and `.../create-discount-rule` |
| A custom discount trigger (service plugin) is called with line items, `purchaseFlowId`, shipping info and the payment method type. It receives NO buyer, contact, custom field or note, so it cannot read a birthday. It also needs an app with a service-plugin extension. | Get Eligible Triggers: https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/extensions/discounts/custom-discount-triggers-integration-service-plugin/get-eligible-triggers |
| The Bookings pricing service plugin DOES receive the slot start date, `contactDetails` and `additionalFields` (custom booking-form fields), so a birthday captured as a form field plus the flight date could drive a 15 percent price inside Wix. But it needs an app from the Wix Developer Center AND a sign-up request by email to `bookings-integration@wix.com` that Wix reviews; it runs only after the booking exists and replaces the standard pricing logic. | Pricing integration plugin: https://dev.wix.com/docs/api-reference/business-solutions/bookings/pricing/pricing-integration-service-plugin/introduction and `.../calculate-price` |
| No visitor-writable price or discount field was found: the base booking price comes from the service configuration, and any other reduction in eCommerce checkout comes from coupons, automatic discounts or fees. | Bookings Pricing API intro: https://dev.wix.com/docs/api-reference/business-solutions/bookings/pricing/pricing-api/introduction |
| A Wix Automation can email a UNIQUE single-use coupon code on a trigger. | https://support.wix.com/en/article/the-new-automation-builder-adding-and-sending-a-coupon |

Conclusion. With only an anonymous visitor session and no secret, the birthday discount CANNOT be enforced on the
Wix-authoritative path. Every mechanism that could enforce it needs something this app does not have today:
(a) admin credentials (a client secret in a backend) to mint one single-use coupon per validated claim, an
architecture decision that the repo rules currently forbid; (b) a separately hosted Wix app with the Bookings
pricing plugin and Wix's approval; (c) a Wix-owned flow outside the checkout (Automations emailing a single-use
coupon, which is how the owner's current live `/promotion` page works: a form, then a coupon by email).

Safe behaviour (implemented): `isBirthdayDiscountEnforceableOnActivePath({ wixAuthoritative })` is `false` on the Wix
path (`WIX_PATH_CAN_ENFORCE_BIRTHDAY_DISCOUNT = false`); `/offers` then shows an amber notice instead of a promise
(via `GET /api/offers/capabilities`); the checkout must not show the banner or a discount line and the server must
not reduce any amount there. The date-of-birth field the owner wants may still be collected. To flip it, make one of
(a) to (c) real, verify it end to end, then change that one constant. Not built here, not verified end to end.

## 5. Navigation placement (item C)

| Option | Pros | Cons |
| :--- | :--- | :--- |
| 1. A fifth top-level header trigger | Most visible | `tests/usability/header-fit.spec.ts` asserts exactly four triggers; it costs width where Russian and French already fill the row at 1280 px; competes with Book |
| 2. **An item in the "Experiences" flyout (second position), in the drawer list and in the footer: chosen** | Zero change to the closed header at 320 to 1920 px (no new control, so no header-fit or logo-only risk); sits next to Flight Tracks and Gift Vouchers where visitors compare prices; 44 px items; matches the way premium brands file offers under the shop menu | One hover or tap deep on desktop |
| 3. Footer only | No header risk | Invisible to a deal-seeker; the owner asked for the main menu |
| 4. A promo chip or badge beside Book or in the utility bar | Highest raw click-through | The 320 px row and the utility bar are already full; changes every visual baseline; a banner cheapens the brand |
| 5. Contextual links only (checkout, experiences) | Right moment | Not discoverable on its own. Done as well: `<BirthdayOfferLink />` for the checkout, and the page links to `/book` |

Label, by language (chosen / alternatives). The word "Discounts" or "Sale" reads as clearance for a premium
aviation brand; "offers and benefits" reads as a privilege while keeping the search meaning (`/offers` metadata still
says "Discount" and "הנחת יום הולדת").

| Language | Chosen | Alternatives |
| :--- | :--- | :--- |
| en | Offers & Benefits | Offers; Special Offers; Privileges; Offers & Discounts (the owner's wording, most literal) |
| he | הטבות ומבצעים | מבצעים (the owner's "המבצעים שלנו"); הטבות |
| ru | Акции и привилегии | Акции и бонусы; Специальные предложения |
| fr | Offres et avantages | Offres spéciales; (avoid "Promotions", it reads retail) |
| ar | العروض والمزايا | العروض؛ عروض خاصة |
| es | Ofertas y ventajas | Ofertas especiales; (avoid "Promociones") |

The label lives in `lib/offers/nav-label.ts` (not `translations.ts`), so the owner can change it in one place; the
page `<h1>` uses the same wording.

## 6. The owner's current live page (`https://www.simdream.co.il/promotion`, "המבצעים שלנו")

Read with curl on 2026-11-11. It lists offers that the new site does not reflect. Nothing below was imported.

| Live page | New site | Note |
| :--- | :--- | :--- |
| Birthday: 15 percent, a form that emails a coupon; birthday within the last 7 days or the next 7 days; valid only for "קברניט לשעה" (60 min) and "אתגר קברניטים 90 דקות"; no stacking; not valid on gift-voucher purchase; no date guarantee | Birthday month plus 14 days back, automatic at checkout (owner's new request) | The live offer is limited to the 60 and 90 minute flights. The new default (`recreational`) also includes the 30 minute flight. Open question 1 |
| BRAVO15: 15 percent on the "Captains' Challenge" 90 minute package for IDF and reserves, police and border police, fire and rescue, MDA and United Hatzalah, ZAKA, prison service, local emergency squads; conditional on showing a relevant ID on arrival | Absent | Needs a decision; it would need a Wix coupon (`BRAVO15`) and the ID check wording from the owner |
| Subscriptions "up to 30 percent on experience packages, 10 percent on professional" with prices 5x30 1,790; 5x60 2,750; 5x90 3,390; 10x30 3,150; 10x60 4,850; 10x90 5,950; PRO 3x60 2,400 (6 months) and 2x90 2,250 (6 months) | Four consumer tracks (20 and 30 percent) and two PRO tracks (3x90, 5x60), 12 months | Different tracks and prices; the new page quotes the registry only |
| ID: only BRAVO says an ID is shown on arrival | No ID wording | `/rules` (3.6) supports the age rule only, so the Offers page states the age rule and NOT an ID check |

## 7. A6 integration notes

1. Field: validate with `evaluateBirthdayDiscount({ birthDate, flightDate })` on the SERVER with the slot's own
   Israel date; the browser only previews. Map `error` to text with `getBirthdayErrorText(language, error)`.
2. Price: `getBirthdayPackageEligibility(packageId, { isSubscriptionRedemption, isGiftVoucherPurchase })` first, then
   `applyBirthdayDiscount(subtotalIls)` on the registry subtotal; send `totalAgorot` to Stripe. A voucher or gift card
   used as payment covers what remains after the discount.
3. Persist `toBirthdayMonthDay(birthDate)` and a boolean "discount applied" only; drop the year.
4. Capability: on the client `isBirthdayDiscountEnforceableOnActivePath({ wixAuthoritative })` with the existing
   `/api/slots` `wixBookingsAuthoritative` flag; on the server with `isWixAvailabilityAdapterEnabled()`. When it is
   `false` show no banner and no discount line.
5. Copy: `getBirthdayCheckoutCopy(language)` (all placeholders filled), `getBirthdayBannerText(language, reason)` for
   the congratulations banner (`same_month`, `grace_before`, `grace_after`), `fieldLabel`, `fieldHint`,
   `required`/`invalid`/`future`/`tooYoung`/`tooOld`/`notEligible`, `discountLine`.
6. Link: `import { BirthdayOfferLink } from '@/components/offers'` and place `<BirthdayOfferLink />` (points to
   `/offers#birthday`, 44 px target). The fieldHint says only day and month are kept: that sentence is true only once
   A6 persists nothing else.

## 8. Open questions for the owner

1. Which flights? Default: consumer flights (30, 60, 90 minute). The live page lists only the 60 and 90 minute flights.
   Include PRO training or fear of flying? (`BIRTHDAY_ELIGIBLE_CATEGORIES`.)
2. Forward grace: should a birthday in the next few days also qualify (a flight on 30 November, birthday 1 December)?
   The request mentions a first-week or last-week birthday; the default covers only the backward case
   (`BIRTHDAY_LOOKAHEAD_DAYS`).
3. Should the discount apply to add-ons or only to the base flight? Default: the whole subtotal.
4. Is the pilot allowed to be a child (10 to 17)? Default yes (Terms 3.6); the booker is 18+.
5. Gift voucher as payment together with the discount: allowed by this decision; confirm.
6. BRAVO15 (first responders) and the live subscription prices differ from the new site; keep, port or retire?
7. An ID check on arrival is not in the Terms, so it is not mentioned; add a sentence if the owner wants it.
8. Wix path: which of the three enforcement routes in section 4, if any, should be built. Until then the discount is
   advertised only on the local Stripe path.
9. The SEO description of `/offers` quotes the 15 percent: revisit it if the Wix path stays the live checkout.

## 9. The `nav.bookFlightShort` key and the 360px header (coordinator extra task)

The compact Book button of the phone and tablet header read `t.nav.bookFlight.split(' ')[0]`, which gave Russian
"Забронировать". `lib/i18n/translations.ts` now has `nav.bookFlightShort` in all six languages: for every language
except Russian it equals exactly what `split(' ')[0]` produced (`Book`, `הזמן`, `Réserver`, `احجز`, `Reservar`;
`tests/unit/nav-book-short.test.ts` pins that equality), and Russian is `Бронь`. Only the mobile `Link` in
`Navbar.tsx` uses it; the desktop button still uses `t.nav.bookFlight`. No language-specific code exists.

Finding: "Бронь" alone was NOT enough at exactly 360 to 365 px. Measured on a touch emulation, the row (logo 177 px,
WhatsApp 44, Book 65, menu 48 plus gaps) is 18 px wider than a 360 px screen, so the menu trigger sat 6 px off screen
(French and Spanish, whose short words are longer, were 21 px off at 360 and overflowed up to 380 px: a defect that
already existed). Two small language-neutral changes close it, neither of which moves a pixel while there is room:

1. `Navbar.tsx`: the logo link is `min-w-0 shrink` (it was `shrink-0`) and the logo image is `object-contain`. When the
   row is too tight the logo scales down proportionally (about 10 percent at 360 px in Russian); with room to spare
   it is unchanged. It is the only element that yields.
2. `WhatsAppAction.tsx`: the utility-bar placement (below 360 px) gets `pointer-coarse:min-w-11`, because it was 36 px
   wide on a phone while the row needs 44 px targets.

`tests/usability/header-fit.spec.ts` now also runs, for all six languages at 320, 360, 390 and 430 px on a touch
emulation: Book, WhatsApp, language selector and menu trigger all visible inside the screen, no overflow of the
page, the navbar or the utility bar, no overlap in their rows, 44 px tap targets.

## 10. Verification and impact

Run in this worktree (isolated `.next-test` build, Playwright on port 3187):

| Check | Result |
| :--- | :--- |
| `npm run typecheck`, `npm run lint` (type hygiene) | pass |
| `vitest --project unit` | 66 files, 1077 tests pass (new: `tests/unit/birthday/*` 140 tests, `tests/unit/nav-book-short.test.ts` 4) |
| `vitest --project security --project integration` | 21 files, 678 tests pass |
| `tests/usability/header-fit.spec.ts` + `header-brand.spec.ts` (usability, chromium) | 60 pass: 24 existing desktop-fit, 12 logo-only, 24 new phone tests (6 languages x 320, 360, 390, 430 px) |
| `tests/e2e/offers.spec.ts` (chromium, mobile-chrome) | 18 pass on each: nav link in all six languages, RTL, 320 px, calculator edge cases, registry figures, capability notice |
| axe on `/offers` (6 scans: 3 themes x en, he), baseline integrity, mobile scans | 0 violations (the studio scan caught a contrast failure on the promotion chip, fixed) |
| PUBLIC_ROUTES specs that now include `/offers` (page-structure, responsive, layout-stability, hydration, i18n, security-web) | 18 pass |
| `npm run docs:verify` | fails as expected until GENESIS.md lists the new items (section 11); not stamped |

Not run: firefox, webkit, mobile-safari projects, the full e2e suite, Lighthouse, `npm run test:all`. The isolated
build was run three times (the first was stopped when the extra header task arrived; the second exposed the studio
contrast issue; the third is the verified one), not once.

### Visual baselines (not regenerated)

The closed desktop header does not change (the new item is inside the "Experiences" flyout, which no baseline opens),
and the 390 px mobile baselines do not change (the footer is hidden there; the drawer is closed): both mobile
snapshots pass. The only difference is the new footer link, one text row in the "Flight Experiences" column.
Run against the existing darwin baselines of `tests/visual/visual.spec.ts`: 20 of 22 fail (5 pages `/`, `/about`,
`/pro`, `/book`, `/vouchers` x cockpit and brand x en and he), each with 457 differing pixels in English and 321 to
326 in Hebrew, all inside one 35 px-high box near the page bottom (measured on the diff image of `/` cockpit en:
y 3502 to 3536, x 347 to 441 of a 1280 x 3872 capture). That is about 0.009 percent of the pixels: far inside the
`maxDiffPixelRatio: 0.01` in `playwright.config.ts`, but above the `MAX_DIFF_PIXELS = 100` that `visual.spec.ts`
sets for itself, so all 20 baselines need a deliberate refresh (`npm run test:visual:update`) after merge. Dropping the footer link
would leave every baseline untouched; the header and drawer entries would remain.

### Source bytes added (for the Wix 14 MiB budget)

About 98 KB of TypeScript source (UTF-8, comments included): `lib/discounts/birthday` 31 KB (of which the
checkout copy `copy.ts` is 11.6 KB), `lib/offers` 43 KB (of which the six page copies are 37 KB), `components/offers`
23 KB, route and API 1.3 KB. The shared chrome (`Navbar`, `Footer`) imports only `lib/offers/nav-label.ts`
(0.9 KB). `translations.ts` gains 244 bytes. Expect roughly 70 to 80 KB in the worker after minification; the
coordinator should measure.


## 11. Lines for GENESIS.md and AGENTS.md

AGENTS.md section 2 (Routing), add:

> - **Offers & Benefits route**: [`app/(public)/offers/page.tsx`](app/(public)/offers/page.tsx) (`/offers`) explains every offer in six languages from the registries (never retyped prices or percentages): the birthday discount with an in-browser calculator (`#birthday`, nothing stored or sent), the Discounted Promotion, flight and professional tracks, gift vouchers, the no-stacking rule and the fair-use fine print. It is listed in the header "Experiences" flyout, the drawer and the footer through `lib/offers/nav-label.ts`. `GET /api/offers/capabilities` reports whether the live checkout can apply the birthday discount.

AGENTS.md, new subsection (for example 6.8, Birthday discount):

> The birthday discount is the pure engine `lib/discounts/birthday/`: 15 percent of the booking subtotal (whole shekels, half up, agorot for Stripe) when the pilot's birthday falls in the FLIGHT date's calendar month or up to 14 days before it (`BIRTHDAY_*` constants; forward grace supported, off). The flight date decides, never the booking date. It never stacks (Terms 8.1): not on the Discounted Promotion, subscription redemptions or gift-voucher purchases. The server re-evaluates every claim, persists only month, day and the applied flag, and shows no banner or discount while `isBirthdayDiscountEnforceableOnActivePath()` is false (the Wix-authoritative checkout cannot enforce it with a visitor session: `docs/modules/birthday-offers.md`).

GENESIS.md: `npm run docs:verify` on this branch lists exactly what to add. Page route `/offers`; API route
`/api/offers/capabilities (GET)`; library modules `lib/discounts/birthday/{civil-date,constants,eligibility,evaluate,
minimise,money}.ts`, `lib/offers/{nav-label,offers-copy,offers-data}.ts`, `lib/offers/copy/es.ts`; components
`BirthdayCalculator`, `BirthdayOfferLink`, `BirthdaySection`, `BirthdaySteps`, `FinePrintSection`, `MoreOffersSection`,
`OffersHero`, `OffersPageContent`. Also the `nav.bookFlightShort` key and the logo-yields rule of the phone header
(section 9). Do not stamp the fingerprint from this branch; the coordinator stamps after merging.
