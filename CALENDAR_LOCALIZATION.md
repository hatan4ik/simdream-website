# Localized Booking Calendar — Implementation Handoff

**Status:** Implemented and verified on 2026-10-27  
**Scope:** `/book` calendar presentation in the Amazon-style storefront and the guided booking wizard.

## Outcome

The booking calendar is no longer English-first or limited to a 14-day ribbon:

- **Month view is the default** in both booking interfaces.
- A compact **Week view** remains available as an optional alternative.
- Every supported language has localized calendar presentation:
  - Hebrew (`he-IL`), RTL
  - English (`en-GB`), LTR
  - Russian (`ru-RU`), LTR
  - French (`fr-FR`), LTR
  - Arabic (`ar-IL`), RTL
- Weeks begin on **Sunday** for Hebrew, Arabic, and English; **Monday** for Russian and French.
- Month names, weekday labels, date order, and day numerals are rendered through `Intl`, not English lookup tables.
- RTL navigation arrows flip visually, while aviation telemetry such as slot times remains explicitly LTR.

## Customer Experience

1. A visitor arrives on `/book` and sees the current **month grid** by default.
2. They can choose **Week** for a seven-day compact calendar centered on the selected date.
3. Previous/next month controls expose dates beyond the current grid.
4. Selecting any date preserves the existing availability, package-selection, zero-slots recovery, and checkout behavior.
5. If no compatible slot exists, the localized recovery flow still offers the next day and compatible package durations.

The change is present in both supported booking experiences:

| Interface | Component | Calendar behavior |
| --- | --- | --- |
| One-page storefront | `components/scheduler/AmazonFlightStorefront.tsx` | Default month grid, optional week view, localized slots and recovery copy |
| Guided wizard | `components/scheduler/KantorovichCalendarScheduler.tsx` | Default month grid, optional week view, localized date selection |

## Engineering Design

### Shared presentation layer

`lib/i18n/calendar-presentation.ts` is the single calendar-presentation module. It provides:

- Locale mapping and cultural week-start configuration.
- Locale-formatted month, date, weekday, and day-number helpers.
- A seven-day week generator for the optional Week view.
- A stable 42-cell, six-row month grid including selectable adjacent-month dates.
- ISO `YYYY-MM-DD` values as the internal selection identity.

The UI consumes presentation values only. It does **not** calculate slot availability, package capacity, price, flight duration, or reservation buffers.

### Scheduling and checkout integrity

The existing scheduling and payment boundaries remain unchanged:

- `/api/slots` and the Kantorovich tiled-interval engine remain authoritative for availability.
- The selected date remains an ISO date across package selection, add-ons, checkout, success, and boarding-pass flows.
- Flight time ranges are rendered inside `bdi dir="ltr"` where required, preventing RTL bidi reordering.
- Customer-facing localization does not alter server-authoritative pricing or duration calculation.

### Testability without English coupling

Calendar controls expose neutral attributes:

- `data-calendar-date="YYYY-MM-DD"`
- `data-calendar-previous-month`
- `data-calendar-next-month`

Browser tests use those ISO identifiers rather than English accessible names. This allows Hebrew and Arabic to use correctly localized accessible names while retaining deterministic test selection, including a date in the next month.

## Primary Files

| File | Responsibility |
| --- | --- |
| `lib/i18n/calendar-presentation.ts` | Shared locale, grid, week, and date-formatting logic |
| `components/scheduler/AmazonFlightStorefront.tsx` | Localized one-page booking calendar and slot presentation |
| `components/scheduler/KantorovichCalendarScheduler.tsx` | Localized guided-wizard calendar |
| `tests/unit/calendar-presentation.test.ts` | Locale week-start, 42-cell grid, Hebrew/Arabic script coverage |
| `tests/usability/i18n.spec.ts` | RTL telemetry isolation in both calendar experiences |
| `tests/a11y/keyboard.spec.ts` | Keyboard date selection and booking journey coverage |
| `tests/usability/support/booking.ts` | Locale-neutral booking calendar selectors |

## Verification

The final source state passed:

| Check | Result |
| --- | --- |
| `npm run test:quick` | Passed: 1,355 tests, 0 failures |
| `npm run test:all` | Passed all stages |
| Chromium E2E | 87 tests passed, 7 expected skips |
| Accessibility, usability, browser security, resilience | 494 tests passed |
| Visual regression | 22 tests passed |
| Load smoke | Passed for home, booking, packages API, and slots API |
| `git diff --check` | Passed |

The visual baselines for the English booking page were intentionally refreshed after restoring the established `Selected Window:` copy casing.

## Developer Workflow

```bash
npm run test:build
npm run test:quick
npm run test:all
```

For a focused local review:

```bash
npx vitest run tests/unit/calendar-presentation.test.ts
npx playwright test tests/usability/i18n.spec.ts --project=usability --grep 'LTR isolation'
npx playwright test tests/a11y/keyboard.spec.ts --project=a11y
npx playwright test --project=visual
```

## Acceptance Checklist

- [x] Month view is the default in both booking interfaces.
- [x] Week remains an optional compact view.
- [x] Hebrew, English, Russian, French, and Arabic render their own calendar presentation.
- [x] Arabic and Hebrew render RTL navigation correctly.
- [x] Flight times remain LTR and readable in RTL interfaces.
- [x] Dates outside the visible month remain reachable through month navigation.
- [x] Calendar presentation does not change availability, scheduling, pricing, or checkout authority.
- [x] Keyboard, i18n, resilience, visual, and full quality suites pass.
