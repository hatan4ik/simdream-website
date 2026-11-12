# Modularity

Sim Dream is built from **modules**, so one concern can be fixed, reviewed and tested without opening a
monolith. This page is the convention, the reference implementation (`/book`) and the plan for every file
that is still too big. The convention is enforced by `tests/unit/module-size.test.ts`.

## The module convention

A feature is a **folder module** with one public entry.

| Part | Where | Rules |
| --- | --- | --- |
| UI | `components/<feature>/` | One component per file, named after the file. Small, typed props. No data fetching inside leaf components. |
| Page state | `components/<feature>/hooks/` | One React hook per concern (`use-<thing>.ts`). A hook may use React and the browser; it holds state and effects, not business rules. |
| Rules and adapters | `lib/<feature>/` | Pure logic (rules, calculations, validation) with no React and no I/O, plus thin I/O adapters (a `fetch`, a Wix call) that take plain arguments. Unit-testable in Node. |
| Copy | the module's own copy file | A `Record<SupportedLanguage, ...>` with all six languages, resolved with `copy[language] \|\| copy.en` (pattern: `lib/data/subscription-page-copy.ts`). Existing modules still read `t.<area>` from `lib/i18n/translations.ts`; new modules do not add keys there. |
| Public entry | `index.ts` in each folder | Everything another module may use is re-exported here. Import `@/components/booking`, never `@/components/booking/AddonCard`. No reaching into a sibling's internals. |
| Types | next to the code that owns them | Prop groups are the hook return types (`ReturnType<typeof useX>`), so they cannot drift. |
| Tests | `tests/unit` for rules and adapters, `tests/integration` for routes, a Playwright spec for UI | A module's behaviour is pinned by tests, not by a reader's care. |
| Size | about 400 lines per file | Enforced: see [the ratchet](#the-size-ratchet). A page file is an orchestrator (under about 250 lines). |

Rules that apply to every module and are easy to break while splitting:

1. **Move, do not rewrite.** A split changes structure, never behaviour: same markup, classes, ids, `data-*`
   test hooks, copy and effect order. Prove it with the existing Playwright, accessibility and visual suites.
2. **Seams are props.** If a feature will plug into a module, give the module an optional prop for it
   (`extraFields`, `agreements`, `extraDiscountLines`) and document it on the prop. Do not make the next
   change edit the middle of a component.
3. **Hooks in dependency order.** An orchestrator calls its hooks top to bottom, each consuming the previous
   ones' results. When two concerns need each other, break the cycle with a plain value (for example the
   voucher-free subtotal) rather than a shared mutable object.
4. **Coverage lives in `lib/`.** `vitest.config.ts` measures `lib/**/*.ts` with ratcheted thresholds
   (`lib/booking/**` at 98/97/88/96). Pure logic and adapters go under `lib/<feature>/` with tests; React
   hooks (`.ts` under `components/`) are outside that glob and are covered by the Playwright journeys.
5. **Genesis.** `npm run docs:verify` requires every `lib/**` file name and every `components/**/*.tsx` name to
   appear in `GENESIS.md`, and a fresh source fingerprint. Adding files means adding them there and stamping
   (`npm run docs:genesis:stamp`) after review.
6. **Bundle.** The Wix worker bundle has a 14 MiB budget (`scripts/prepare-wix-worker.mjs`, never raised). The server
   renders Hebrew only, so non-Hebrew copy is client-only: put it in a `*Intl` module and import it only through
   `dynamic(() => import(...), { ssr: false })`; a plain dynamic `import()` in a client component is still bundled for the
   server. Details, measurements and the guard test: [`docs/modules/wix-bundle-diet.md`](modules/wix-bundle-diet.md).

### Splitting a file: the recipe

1. Read the file's tests first (`grep -rl "<name>" tests`), list the `data-*` hooks and roles they use.
2. Extract in this order, running `npm run typecheck` after each step: copy and constants, pure functions
   (with a unit test each), hooks, then leaf components. Leave the original file as the orchestrator.
3. Keep exports stable (barrel the old path if other files import it) so the diff stays mechanical.
4. Run the targeted Playwright specs and the visual project for the page. A visual diff means the split is
   not a pure move.
5. Lower the file's entry in `SIZE_ALLOWLIST`, or delete it once it is at or under 400 lines.

## Reference implementation: `/book`

`app/(public)/book/page.tsx` was 1,710 lines holding URL parsing, package rules, availability fetching, the
voucher and Wix cart logic, checkout, and the markup of three steps. It is now a 248-line orchestrator over:

```
app/(public)/book/page.tsx            orchestrator: wiring only (hooks in dependency order, then steps)
components/booking/                   UI, one component per file, public entry index.ts
  BookingViewSwitcher  RouteIntentBanner  BookingErrorAlert  BookingAccountNotice  WixSubscriptionBanner
  BookingStepper       DateSlotStep       AddonsStep (AddonCard)
  PilotManifestStep    PilotManifestForm  OrderSummary  VoucherRedeem  CheckoutSubmit
  BookingStorefrontView (adapter for AmazonFlightStorefront)   BookingLoadingFallback
components/booking/hooks/             page state, one hook per concern
  use-booking-url-intent  use-booking-selection  use-pilot-details  use-booking-schedule  use-booking-step
  use-wix-checkout-draft  use-booking-voucher    use-booking-manifest  use-booking-checkout  use-addon-controls
lib/booking/client/                   pure rules and adapters, unit-tested, public entry index.ts
  url-intent  booking-steps  slot-selection  addon-selection  checkout-mode  checkout-request  wix-checkout-draft
  booking-format  submit-local-checkout  submit-wix-subscription  wix-checkout-cart
```

Hook dependency order (each hook consumes the ones above it): `url-intent` -> `selection` -> `pilot` ->
`schedule` -> `step` -> checkout mode (pure) -> `wix-checkout-draft` -> `voucher` -> `manifest` -> `checkout` ->
`addon-controls`. Tests: `tests/unit/booking-flow-client.test.ts` (rules), `tests/unit/booking-flow-adapters.test.ts`
(adapters with mocked network), `tests/e2e/booking-*.spec.ts` (journeys). Handoff and extension seams:
[`docs/modules/modular-booking.md`](modules/modular-booking.md).

## The size ratchet

`tests/unit/module-size.test.ts` measures every `.ts` and `.tsx` file under `app/`, `components/` and `lib/`:

- a file over **400 lines** fails the test unless it is listed as **data** (`DATA_FILES`: pure catalogues and
  per-language copy, exempt) or in **`SIZE_ALLOWLIST`**;
- an allowlisted file fails the test when it **grows** past its recorded line count;
- an allowlisted file that is now at or under 400 lines fails the test until its entry is **deleted**, so the
  list can only shrink;
- new files are never added to the allowlist, and the `/book` page and its modules are asserted to stay in budget.

If your change makes an allowlisted file longer, move the new code into a module instead of raising the number.
When you shrink one, lower its number in the same change.

## Inventory: every file over 400 lines

Measured with `wc -l` on `app/`, `components/` and `lib/` (`.ts`, `.tsx`) at base commit `65fc3a5`. Risk is the
chance that a split changes behaviour or collides with other work; priority is the suggested order (P1 first).
"Copy-out" means moving a per-language dictionary into a `lib/data/<name>-copy.ts` file, which is mechanical and
low risk. Line estimates after a split are rough.

### Data (exempt, listed in `DATA_FILES`)

| File | Lines | Why it is data |
| --- | ---: | --- |
| `lib/i18n/translations.ts` | 4,810 | Six-language UI dictionary. Owned centrally; per-language files are a possible later change (coordinate, it is a merge hotspot). |
| `lib/data/experience-routes.ts` | 1,839 | World Trio and adventure catalogue with six-language copy; two small helpers at the end. |
| `lib/data/subscription-page-copy.ts` | 899 | Six-language copy for `/subscriptions`. |
| `lib/data/subscription-passes.ts` | 647 | Flight-track catalogue and its copy; four small helpers at the end. |
| `lib/db/seed-data.ts` | 779 | Package, add-on and demo seed registry (`SIMULATOR_PACKAGES`, `FLIGHT_ADDONS`). |

### Code (in `SIZE_ALLOWLIST`)

| File | Lines | Proposed split | Risk | Priority |
| --- | ---: | --- | --- | --- |
| `components/scheduler/AmazonFlightStorefront.tsx` | 1,992 | The other half of `/book` and a source of duplicated pilot/voucher markup. Extract `storefront-copy.ts` (lines 154-413, about 260), then `StorefrontCalendarPanel` (calendar and departure slots), `StorefrontPackageCards`, `StorefrontAddonMarketplace` (filter pills and combos), `StorefrontBuyBox` (header, itemized cart, express pilot form, promo, notes, buy button) and `StorefrontInclusionsModal`; derived data (lines 511-680) into a hook. Reuse `PilotManifestForm` and `VoucherRedeem` from `components/booking` in the buy box. Target: an orchestrator under 300 lines. | High: largest file, desktop e2e, a11y and visual suites hit it, many `data-*` hooks. | P1 (the next booking features must also land here) |
| `components/scheduler/KantorovichCalendarScheduler.tsx` | 941 | Copy-out of `CLEAN_COPY` and `DURATION_OPTION_SUBTITLES` (lines 61-300). Hook for the derived calendar data (lines 337-401). Components: `DurationPicker`, `WeekRibbon`, `MonthGrid`, `DepartureGrid` (period groups), `ZeroSlotsRecovery`, `BlueprintModal`. Share the pager and zero-slots recovery with the storefront through `components/scheduler/shared` (AGENTS.md section 4.4: both views must behave identically). | High: scheduling invariants (never hide durations, zero-slots recovery, open slots only), horizon and zero-slot e2e specs. | P1 (do together with the storefront) |
| `app/(public)/vouchers/page.tsx` | 1,078 | Hook `use-gift-purchase` (purchase and balance check, lines 106-266). Components: `GiftFormatSwitcher`, `CertificateTierPicker`, `CertificatePreview`, `GiftCardPreview` (lines 558-740), `DeliveryDetailsForm` (739-945), `OccasionTemplates`, `BalanceCheckDrawer`, `PostCheckoutBanner`. Pure helpers (amount formatting, presets) to `lib/vouchers/`. | Medium: Stripe checkout and printable previews; `gift-vouchers`, `gift-card-flow`, `gift-card-preview` specs and visual baselines. | P2 |
| `app/(public)/contact/page.tsx` | 1,126 | Copy-out of `CONTACT_COPY`, `PRESET_LOCALIZATIONS` and the preset helpers (lines 36-392) to `lib/data/contact-copy.ts` and `lib/contact/route-presets.ts`. Components: `FacilityRulesRibbon`, `FacilityCards`, `RouteCalculator` (state and engine in a hook, lines 424-486), `RouteSteps`, `MapEmbed`, `InquiryForm` (state in `use-inquiry-form`, lines 487-566). | Medium: route calculator logic, form submit, `contact.spec.ts` and i18n suites. | P2 |
| `components/pro/ProSessionsView.tsx` | 1,100 | Copy-out of `PRO_COPY` (lines 47-667, about 620) to `lib/data/pro-copy.ts` (client-only). Then one component per section: `ProHero`, `ProWhyPillars`, `ProSessionDepth`, `ProSpecsDrawer`, `ProTracks`, `ProBridge`. | Low: static presentation. `/pro` must keep the specs inside the disclosure drawer (AGENTS.md section 2) and its three tier links. | P2 (quick win: the copy-out alone brings it near 480) |
| `components/layout/Navbar.tsx` | 667 | `navigation-model.ts` (groups and items, lines 29-47, pure), `DesktopNavigation` with its flyout panels (288-452), `MobileNavigation` (452 onward), `NavActions` (Book and WhatsApp placement from 360px), hooks for menu open state, focus handling and outside click. | High: shared chrome, `header-fit`, `header-brand`, hydration and a11y suites across six languages and 320-1920px; also edited by parallel work. | P3 (do only when no other change touches the header; the coordinator owns this file) |
| `lib/db/store.ts` | 929 | Keep `store.ts` as the facade. Row mappers (lines 74-252) to `store-rows.ts`; one repository per aggregate: `store-bookings.ts`, `store-vouchers.ts`, `store-inquiries.ts`, `store-members.ts`; shared errors to `store-errors.ts`. The checkout ports in `lib/booking/checkout-ports.ts` already describe the narrow interface. | Medium-high: persistence, in-memory fallback and double-booking and idempotency reliability tests; `lib/**` coverage thresholds. | P2 |
| `lib/scheduler/kantorovich-engine.ts` | 781 | Keep `kantorovich-engine.ts` as a barrel so imports are unchanged. Split into `operating-window.ts` (config, reserved minutes, promo day), `pricing.ts` (`getKantorovichPricing`), `slot-generation.ts` (`generateKantorovichSlots`, about 260 lines), `efficiency.ts` (`evaluateDailyEfficiency` and the public report, about 210 lines). | High: core scheduling invariants (KANTOROVICH_SCHEDULER_SPEC.md), property tests, `lib/scheduler/**` coverage at 97/94/98/97. Pure moves only. | P3 (pure and well tested, but nothing forces it) |
| `lib/wix/backend-blueprint.ts` | 732 | `blueprint-specs.ts` (types and the blueprint, lines 34-220), `provision-plan.ts` (`planWixBackendProvisioning`, 221-494), `provision-safety.ts` (safety gate, 495-607), `provision-payloads.ts` (payload builders, 608-732); barrel keeps the old path. | Low: pure, covered by `wix-backend-blueprint.test.ts`. The staging-site guard must stay intact. | P3 |
| `components/about/AboutExperienceView.tsx` | 701 | Copy-out of `ABOUT_COPY` (lines 31-479, about 450) to `lib/data/about-copy.ts`; the component is then about 250 lines. | Low. | P2 (quick win) |
| `app/admin/page.tsx` | 553 | Hook `use-admin-overview` (load and reschedule, lines 32-104). Components: `AdminKpiRow`, `EfficiencyRibbon`, `GapCollisionAlerts`, `SubsystemHealthRibbon`, `DispatchManifest` with `SlotRescheduler`, `QuickControls`. | Low-medium: admin e2e, Basic-auth guard unchanged. | P3 |
| `lib/wix/booking-checkout-client.ts` | 537 | `wix-cart-api.ts` (`wixPost`, error detail, customer info), `wix-cart-price.ts` (price parsing), `wix-booking-time.ts` (`wixLocalDateTimeToIso`, phone normalisation), cart lifecycle (`prepare`, `applyWixCoupon`, `applyWixGiftCard`, remove, checkout URL) in `wix-cart.ts`; barrel keeps the old path (the `/book` modules import it). | Low: pure and covered by `wix-booking-checkout-client.test.ts`. | P3 |
| `app/(public)/subscriptions/page.tsx` | 492 | One component per section (hero, tracks grid, flight deck, billing FAQ with its `FaqPageJsonLd`), plus a hook for the Wix member and checkout state. | Low-medium: the FAQ must keep matching its JSON-LD (AGENTS.md section 8). | P3 |
| `lib/auth/auth-context.tsx` | 454 | `auth-types.ts` and `auth-copy.ts` (lines 1-117), `profile-mappers.ts` (118-187, pure), `use-supabase-session.ts`, `use-wix-member-session.ts`, demo user helper; the provider composes them. | High: authentication, member ownership rules, `member-i18n` suite. | P3 |
| `components/legal/RulesContentView.tsx` | 440 | Copy-out of `RULES_COPY` (lines 22-155) to `lib/data/rules-copy.ts` and a `RulesSection` component. Legal wording is moved verbatim, never edited. | Low. | P3 |
| `components/layout/LiveMetarBar.tsx` | 410 | Copy-out of `REVIEWS_BAR_COPY` and `REVIEW_NOUNS` (lines 14-165) to `reviews-bar-copy.ts`; `RatingStars` and `RatingRow` to `components/reviews/`. | Low-medium: shared chrome (the only place Google reviews render); `google-reviews-utility-bar` and a11y specs. | P3 (10 lines over; coordinate with the header owner) |
| `app/(public)/experiences/page.tsx` | 410 | One component per tab (experiences, world routes, flight tracks) behind a small tab hook. | Low. | P3 (10 lines over) |

Suggested order: P1 together (the two scheduler views share logic and the next booking features must be added to
both), then the P2 quick wins (copy-outs shrink four files by 30-60% with almost no risk), then P3 when the area is
otherwise quiet.
