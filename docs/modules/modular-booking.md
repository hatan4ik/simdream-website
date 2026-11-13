# Module handoff: modular-booking

Branch `feat/modular-booking` (from `origin/main` 65fc3a5). Workstream A1.

## Purpose

`app/(public)/book/page.tsx` was a 1,710-line client component. It is now a 248-line orchestrator over folder
modules, with **no change in behaviour, copy, styles, ids, `data-*` hooks or test hooks**, so the two upcoming
features of the "Pilot in Command Details" step (a mandatory consent block, a mandatory birthday field with a
discount banner) land as small diffs. The convention and the plan for every other oversized file are in
[`docs/MODULARITY.md`](../MODULARITY.md); the size rule is enforced by `tests/unit/module-size.test.ts`.

## Files

Routes, environment variables and database migrations: **none added or changed.** No dependency was added.

| Path | Role |
| --- | --- |
| `app/(public)/book/page.tsx` | Orchestrator (248 lines): hooks in dependency order, then the steps. |
| `components/booking/*.tsx` | UI, one component per file (16 files) plus `index.ts` (public entry). |
| `components/booking/hooks/*.ts` | Page state, one hook per concern (10 hooks) plus `index.ts`. |
| `lib/booking/client/*.ts` | Pure rules and thin I/O adapters (no React), plus `index.ts`. |
| `tests/unit/booking-flow-client.test.ts` | 31 tests for the pure rules (URL intent, steps, departure selection, add-on toggling, checkout mode, Wix draft key, blockers, request body). |
| `tests/unit/booking-flow-adapters.test.ts` | 17 tests for `startLocalCheckout`, `startWixSubscriptionCheckout` and the Wix cart operations with mocked network and Wix client. |
| `tests/unit/module-size.test.ts` | The ratchet (6 tests). |
| `docs/MODULARITY.md` | Convention, `/book` reference layout, inventory of every file over 400 lines with split plans. |

Module map and where each requested concern lives:

| Concern | Module |
| --- | --- |
| Step container and stepper | `BookingStepper`, `useBookingStep`, `lib/booking/client/booking-steps.ts` |
| Date and slot step wrapper | `DateSlotStep` (wraps `KantorovichCalendarScheduler`), `useBookingSchedule`, `slot-selection.ts` |
| Add-ons step | `AddonsStep`, `AddonCard`, `useAddonControls`, `addon-selection.ts` |
| Pilot Manifest form | `PilotManifestForm` (heading `step4Title`, name, email, phone, experience, notes), `PilotManifestStep` (the `<form>` and both columns), `usePilotDetails` |
| Order summary and price breakdown | `OrderSummary`, `useBookingManifest`, `presentManifestWithDraft` |
| Voucher, coupon and gift-card redeem | `VoucherRedeem`, `useBookingVoucher` |
| Submit and checkout (local Stripe and Wix) | `CheckoutSubmit`, `useBookingCheckout`, `submit-local-checkout.ts`, `submit-wix-subscription.ts`, `checkout-request.ts`, `checkout-mode.ts` |
| Wix-hosted checkout draft (cart) | `useWixCheckoutDraft`, `wix-checkout-draft.ts`, `wix-checkout-cart.ts` |
| URL and query-param parsing | `useBookingUrlIntent`, `url-intent.ts` (`?package`, `?addons`, `?route`, `?voucher`, `?subscription=wix`) |
| Optional desktop storefront | `BookingStorefrontView` (adapter onto `AmazonFlightStorefront`, whose internals are untouched) |

## Seams for the next agent (documented in the props)

All are optional, render nothing when omitted, and are wired in `app/(public)/book/page.tsx`.

| Need | Seam | Where it appears |
| --- | --- | --- |
| Extra pilot fields (birthday) | `extraFields` on `PilotManifestStep` (passed to `PilotManifestForm`) | After "special requests", in the pilot form column. Put the discount banner inside it, above the field, or add a sibling prop. |
| Mandatory consent block | `agreements` on `PilotManifestStep` | Inside the summary card directly above the submit button. |
| Extra discount line (birthday discount) | `extraDiscountLines` on `PilotManifestStep` (passed to `OrderSummary`) | Under the voucher line, above the code-entry box. Display only: lower `displayTotalAmount` in the page and have the server recompute. |
| Block submit until consent and birthday are valid | `extraValidation: () => string \| null` on `useBookingCheckout` | Runs after the pilot-fields check; the returned (localized) message becomes the booking error. |
| Send the new fields to the server | `extraPayload` on `useBookingCheckout` | Merged into the `POST /api/checkout` body; core fields always win (`buildLocalCheckoutBody`). |
| Keep a Wix subscription checkout localized | `language` on `useBookingCheckout` | Passed to `startWixSubscriptionCheckout`, which uses Wix's documented redirect-session `lang` preference and returns to the matching public locale URL. |
| New state | A new hook per feature (for example `useBookingConsent`), called in the page before `useBookingCheckout`. | Do not grow `usePilotDetails`. |
| New copy | The new module's own `Record<SupportedLanguage, ...>` file (not `translations.ts`). | |

Wiring sketch for the page:

```tsx
const consent = useBookingConsent();           // new hook, new module
const birthday = useBirthdayDiscount(...);     // new hook: value, validity, discount (display)
const checkout = useBookingCheckout({
  ...existing,
  extraValidation: () => consent.error ?? birthday.error,
  extraPayload: { consent: consent.payload, birthday: birthday.value },
});
<PilotManifestStep
  ...existing
  extraFields={<BirthdayField state={birthday} />}
  agreements={<ConsentBlock state={consent} />}
  extraDiscountLines={<BirthdayDiscountLine discount={birthday.discountIls} />}
  displayTotalAmount={displayTotalAmount - birthday.discountIls}
/>
```

Things the next agent must still do, because they are outside this refactor:

1. **Server**: `POST /api/checkout` (`lib/validation.ts`, `lib/booking/checkout-service.ts`) must validate, persist and
   price the new fields. The client never sends a discount amount, only the birthday; the server resolves the
   discount (AGENTS.md section 6.3).
2. **The Wix-hosted checkout path** (`canUseWixNativeCheckout`, `getWixCheckoutUrl`) and the Wix subscription
   redemption do not send `extraPayload`. Decide where consent and birthday are recorded for those paths.
3. **The optional desktop Express Shop** (`AmazonFlightStorefront`) renders its own pilot form and buy box, which
   this refactor does not touch. A field or agreement added to `PilotManifestStep` must also be added inside the
   storefront (props on `AmazonFlightStorefront`, fed by `BookingStorefrontView`), or the two views diverge.
   Splitting that file is P1 in `docs/MODULARITY.md`.
4. A mandatory checkbox inside the `<form>` can use the native `required` attribute; keep the error announced
   (`role="alert"`) and 44px tap targets, and run the axe suite in all three themes.

## Decisions and assumptions (veto any of these)

1. **Hooks live in `components/booking/hooks/`, not `lib/`.** `vitest.config.ts` measures `lib/**/*.ts` with ratcheted
   thresholds (`lib/booking/**` 98/97/88/96); untested React hooks there would fail `npm run test:coverage`. Pure rules
   and adapters are under `lib/booking/client/` with unit tests instead.
2. **No new copy file.** This is a zero-copy-change refactor, so the modules keep reading `t.booking.*` from the existing
   dictionary. New features bring their own copy files.
3. **Ratchet semantics** (`tests/unit/module-size.test.ts`): 400-line budget for `.ts`/`.tsx` under `app/`, `components/`,
   `lib/`; allowlisted files may not grow, and fail until their entry is deleted once at or under 400 (the list only shrinks).
   Five files are exempt as **data**: `lib/i18n/translations.ts`, `lib/data/experience-routes.ts`,
   `lib/data/subscription-page-copy.ts`, `lib/data/subscription-passes.ts`, `lib/db/seed-data.ts`. The allowlist records
   the 17 other offenders at their line counts on `65fc3a5`. **Any parallel branch that makes one of them longer will fail
   this test**; that is intended, but expect it when merging (the coordinator owns `Navbar.tsx` and `LiveMetarBar.tsx`).
4. `formId` (`useId()`) is still created in the page and passed to the steps as a prop, so element ids keep their form.
5. A voucher is verified against the voucher-free subtotal, so `useBookingManifest` is called twice (with `0` and with the
   applied discount). `subtotalIls` never depends on the voucher (`calculateMissionManifest`).
6. `extraValidation` and `extraPayload` were added to `useBookingCheckout` beyond the brief, as the minimal way for the
   consent and birthday features to plug into submit. Both are no-ops when omitted and are covered by unit tests.
7. `BookLoadingFallback` (private to the page) became `BookingLoadingFallback` in `components/booking`.
8. `AmazonFlightStorefront` and `KantorovichCalendarScheduler` are unchanged; `BookingStorefrontView` only maps props.

## Open questions

- Should the consent and birthday also be collected on the Wix-hosted checkout and the subscription redemption paths
  (see "still do" 2)?
- Do you want `translations.ts` split per language and the `data` allowlist exempt entries given a looser ceiling instead
  of an exemption? (Out of scope here.)

## Lines to add to the files the coordinator owns

`GENESIS.md` (required by `npm run docs:verify`, which lists every new `lib/**` file name and every
`components/**/*.tsx` name, then needs `npm run docs:genesis:stamp`). Suggested paragraph under the booking engine:

> **Booking page modules (`/book`).** `app/(public)/book/page.tsx` is only an orchestrator. UI lives in
> `components/booking/` (AddonCard, AddonsStep, BookingAccountNotice, BookingErrorAlert, BookingLoadingFallback,
> BookingStepper, BookingStorefrontView, BookingViewSwitcher, CheckoutSubmit, DateSlotStep, OrderSummary,
> PilotManifestForm, PilotManifestStep, RouteIntentBanner, VoucherRedeem, WixSubscriptionBanner) with hooks in
> `components/booking/hooks/`; pure rules and adapters in `lib/booking/client/` (addon-selection, booking-format,
> booking-steps, checkout-mode, checkout-request, slot-selection, submit-local-checkout, submit-wix-subscription,
> url-intent, wix-checkout-cart, wix-checkout-draft). Seams: `extraFields`, `agreements`, `extraDiscountLines` on
> `PilotManifestStep`; `extraValidation`, `extraPayload` on `useBookingCheckout`. The convention and the size
> ratchet (`tests/unit/module-size.test.ts`, 400 lines per file) are in `docs/MODULARITY.md`.

`AGENTS.md` (suggested new section 9, "Modularity"):

> ## 9. Modularity
> Every feature is a folder module with one public `index.ts`: UI in `components/<feature>/` (one component per file,
> hooks in `hooks/`), pure logic and thin I/O adapters in `lib/<feature>/`, copy in the module's own
> `Record<SupportedLanguage, ...>` file. Files stay under 400 lines; `tests/unit/module-size.test.ts` fails when an
> unlisted file exceeds that or an allowlisted one grows, and an allowlist entry is deleted once its file is within
> budget. `/book` is the reference implementation (`docs/MODULARITY.md`). Plug features into a module through its
> documented optional props, never by editing the middle of a component.

`TESTING.md` is not owned by you but worth a row: the new unit tests `booking-flow-client`, `booking-flow-adapters`,
`module-size`.

## Bundle note (Wix worker, 14 MiB budget)

Source bytes: the page went from 76,991 to 10,034 bytes; the new modules add 92,195 bytes under `components/booking/`
(including `hooks/`) and 27,082 under `lib/booking/client/`, so the booking source grows by about 52 KB overall
(129,311 bytes now versus 76,991 before), almost all of it comments, prop types and imports, with the markup moved
verbatim. No new dependency and no new per-language text; the bundle is measured by `npm run wix:build` (not run here).

## Verification

All run in this worktree on darwin, in the isolated `.next-test` build (one `npm run test:build`, exit 0), Playwright on
port 3171 (`PW_PORT`) so it could not collide with another session.

| Command | Result |
| --- | --- |
| `npm run typecheck` and `npm run lint` | pass (type hygiene: no unsafe `any`, no suppressions) |
| `npx vitest run --project unit --project integration` | 73 files, 1,250 tests pass (includes the 54 new tests) |
| `npx vitest run book checkout slots horizon calendar noise mission kantorovich i18n-audit module-size ...` | 25 files, 471 tests pass |
| `vitest --coverage` on `lib/booking/**` | `lib/booking/client`: 100% statements, 99.3% branches, 100% functions and lines |
| `npm run test:build` | compiled and type-checked, exit 0 |
| Playwright chromium: `booking-horizon`, `booking-noise-free`, `booking-recreational`, `booking-reliability`, `booking-success`, `booking-zero-slots`, `experience-routes`, `mobile` | 41 passed, 12 skipped (the 12 are the phone-only `mobile.spec.ts` tests, skipped by design on desktop Chromium) |
| Playwright mobile-chrome `mobile.spec.ts`, a11y `booking-states` and `keyboard`, usability `forms`, `hydration`, `responsive`, `layout-stability`, resilience `book-slots` and `checkout` | 211 passed (includes the guided booking journey by touch, 320px layout and the 0-violation axe scans) |
| Playwright visual, `/book` (cockpit en/he, brand en/he, mobile 390) | 5 passed against the existing darwin baselines; no snapshot was recorded or changed |
| `npm run docs:verify` | **fails as expected** on this branch: 11 new `lib/booking/client` files and 16 new `components/booking` components are not named in `GENESIS.md`, and the fingerprint is stale. The coordinator adds the paragraph above and stamps. |

Not run: `npm run wix:build` (the 14 MiB worker budget is therefore unmeasured), the Firefox and WebKit projects, the
full `test:all`, and the Linux visual baselines (they need the Docker image). The visual baselines cover only the first
step of `/book`; the pilot-manifest step is covered by the functional e2e, a11y and usability specs above plus a
source comparison (every class token, `data-*` attribute, `role`, `aria-*` attribute and `t.booking.*` copy key of the
old page is present in the new files), not by a pixel baseline.
