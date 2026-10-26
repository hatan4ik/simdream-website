# Testing

One command runs the entire quality framework:

```bash
npm ci
npx playwright install --with-deps   # once per machine
npm run test:all
```

No secrets, Stripe account or Supabase project are needed. Every test runs in a sandbox (see [The sandbox](#the-sandbox)), so a run can't charge a card, send an email or touch real data.

## What is covered

| Layer | Tool | Location | Guards |
| --- | --- | --- | --- |
| Unit / domain | Vitest, fast-check | `tests/unit` | Scheduler and gap optimiser, pricing, validation, Israel clock, admin guard, safe redirects, catalog and i18n integrity |
| API integration | Vitest | `tests/integration` | Every route handler's contract: slots, packages, bookings, checkout, Stripe webhook, vouchers, workshops, members, admin |
| Security | Vitest | `tests/security` | Authorization matrix, IDOR, webhook authenticity, payment integrity, input fuzzing, error disclosure, host-header redirects, secrets hygiene |
| Reliability | Vitest | `tests/reliability` | Concurrency (double booking), idempotency (Stripe retries), persistence outages, failure injection, DST and midnight edges |
| Browser journeys | Playwright | `tests/e2e` | Booking (storefront and wizard), success page, vouchers, workshops, contact, admin, member area, language and theme, navigation, mobile. Runs on Chromium, Firefox, WebKit, Pixel 7 and iPhone 15 |
| Accessibility | Playwright, axe-core | `tests/a11y` | WCAG 2.x AA scans in both themes: every public route (English and Hebrew; Arabic on the main funnel), booking states, success, member, auth and 404 pages, keyboard paths, mobile and admin |
| Usability | Playwright | `tests/usability` | Hydration (including on a later day than the build), forms, i18n and RTL (including the member area in all five languages), header theme switch and header fit in all five languages, layout stability (CLS), reduced motion, page structure, responsive layout from 320 to 1280px |
| Security (browser) | Playwright | `tests/security-web` | Response headers and CSP, access control, information disclosure, stored XSS |
| Resilience | Playwright | `tests/resilience` | Slot loading and checkout under slow, failing and offline networks |
| Visual | Playwright | `tests/visual` | Screenshot baselines for key pages |
| Load smoke | autocannon | `tests/load/smoke.ts` | p99 latency budgets for the hot endpoints |
| Lighthouse | `@lhci/cli` via npx | `tests/perf` | Accessibility, SEO, performance and best-practice scores; LCP and CLS budgets |

## Commands

| Command | What it runs |
| --- | --- |
| `npm run test:all` | Typecheck, Vitest with coverage, sandboxed build, e2e on Chromium, a11y, usability, security-web, resilience, visual and load. Writes `test-results/quality-report.md`. |
| `npm run test:quick` | Typecheck and Vitest only: seconds, no build, no browser |
| `npm run test:full` | `test:all` on all five browser projects, plus Lighthouse |
| `npm run test:all -- --no-build` | Reuses the current test build in `.next-test` |
| `npm run test:all -- --bail` | Stops at the first failing stage |
| `npm run test:report` | Rebuilds the quality report from existing results |
| `npm test` / `test:unit` / `test:integration` | Vitest: everything, or one project |
| `npm run test:security` / `test:reliability` | The Vitest project plus its browser counterpart |
| `npm run test:coverage` | Vitest with coverage thresholds |
| `npm run test:build` | A production build with every secret blanked |
| `npm run test:e2e` | Browser journeys on all five projects |
| `npm run test:a11y` / `test:usability` / `test:visual` | One browser quality project |
| `npm run test:a11y:baseline` | Re-records the accessibility baseline after a fix |
| `npm run test:visual:update` | Re-records Linux screenshot baselines in the pinned Playwright Docker image. The build runs on a private copy inside the container; only the snapshots are copied back. |
| `npm run test:load` / `test:lighthouse` | Starts a sandboxed server and runs the load smoke or Lighthouse |

Browser tests run against a sandboxed **production build** in `.next-test`. That's a separate folder from `.next`, so tests never disturb a server you started with `npm run start`. Run `npm run test:build` after changing app code; a direct `npx playwright test` refuses to run on a missing or out-of-date test build (`PW_ALLOW_STALE_BUILD=1` overrides it). `test:all` rebuilds for you.

To run a single file or project, use the `--project=name` form. A bare `--project name` swallows the file argument.

```bash
npx vitest run tests/unit/israel-clock.test.ts
npx playwright test --project=chromium tests/e2e/booking-recreational.spec.ts
npx playwright test --project=usability --ui      # interactive runner
```

## The sandbox

`tests/support/test-env.ts` is the single source of truth.

- `SANDBOX_ENV` blanks every external secret (Stripe, Supabase, SendGrid, Google). An accidental `.env.local` can never leak into a test.
- The test admin is `qa-admin` with a fixed test password, used by the Basic-auth guard.
- Stripe is replaced per test: mocked (it records the sessions it would create), disabled, or failing. Webhooks are signed with a test secret through Stripe's own `generateTestHeaderString`.
- The production store fails closed without Supabase. Browser test servers opt into the in-memory store with `ALLOW_IN_MEMORY_STORE=true` (`SERVER_SANDBOX_ENV`). Production never sets it.
- `TZ` is pinned to `Asia/Jerusalem`, the business's time zone. Vitest freezes the clock at 2026-11-01 08:00 Israel time unless a test chooses another moment. Browser tests read live availability through `tests/e2e/pages/schedule-api.ts` instead of hardcoding dates.

### Writing a Vitest test

`loadApp()` in `tests/support/app.ts` loads the real route handlers with a fresh store, a frozen clock and the chosen Stripe mode:

```ts
const app = await loadApp({ now: '2026-12-13T08:00:00+02:00', stripe: 'mocked' });
const slot = await findOpenSlot(app, '2026-12-13', 30);
const { POST } = await app.routes.checkout();
const response = await POST(
  apiRequest('/api/checkout', { body: bookingCheckoutBody({ bookingDate: '2026-12-13', startTime: slot.startTime }) })
);
expect((await readJson(response)).status).toBe(201);
expect(app.checkoutSessions).toHaveLength(1);
```

Signed webhooks come from `signedWebhookRequest()` (`tests/support/stripe.ts`). `apiRequest`, `readJson` and `adminHeaders` are in `tests/support/http.ts`.

### Writing a Playwright test

Import `test` and `expect` from `tests/support/e2e.ts`, or from the folder's `fixtures.ts`. The base test **fails on any uncaught page exception**, so a journey can't pass while the UI throws. Use the page objects in `tests/e2e/pages/`, and locate elements by role and accessible name. Block third-party requests with `blockThirdPartyRequests()`.

## Ratchets: how fixed things stay fixed

| Ratchet | Where | Rule |
| --- | --- | --- |
| Known defects | `it.fails` / `test.fail` with `[KNOWN-DEFECT ID]` in the title | An open defect is an expected failure, so the suite stays green. When the defect is fixed, the run turns red until you remove the marker. Register and open IDs: [tests/KNOWN_DEFECTS.md](tests/KNOWN_DEFECTS.md). |
| Accessibility baseline | `tests/a11y/a11y-baseline.json` | Each scan fails on a new axe violation and on a baselined one that no longer fires. Only rules mapped to a tracked defect may be baselined (`baseline-integrity.spec.ts`). |
| Coverage | `vitest.config.ts` | Global thresholds plus stricter per-path ones for the scheduler, validation, auth, booking and `app/api`. Raise them when coverage improves; never lower them to pass. |
| Visual | `tests/visual/visual.spec.ts-snapshots` | Baselines are per platform. Locally a missing baseline is recorded. In CI it fails, so commit Linux baselines with `npm run test:visual:update` (needs Docker). |
| Load | `tests/load/smoke.ts` | p99 budgets from a measured baseline. `LOAD_BUDGET_SCALE=0.5` tightens them. Never raise them to hide a regression. |
| Lighthouse | `tests/perf/lighthouserc.json` | Accessibility ≥ 0.95, SEO ≥ 0.95, performance ≥ 0.8, best practices ≥ 0.9, LCP ≤ 2.5 s, CLS ≤ 0.1 |

## Flakiness policy

- CI retries a failed Playwright test twice and sets `failOnFlakyTests`, so a test that passes only on retry still fails the build. Locally there are no retries.
- Wait on state, never on time: no `waitForTimeout`. For a request a click triggers, start `waitForResponse` (or `waitForEvent('requestfailed')`) **before** the click.
- Property-based tests print their seed on failure. Replay with `FC_SEED=<seed> npx vitest run <file>`.
- Each orchestrator stage uses its own port (3801–3805) and output folder, so suites never share a server or overwrite reports.

## Debugging a failure

- HTML report: `npx playwright show-report` opens `playwright-report/` on <http://localhost:9323>. Orchestrator stages write `playwright-report-<port>/`, for example `npx playwright show-report playwright-report-3801`.
- Every failure keeps a screenshot, a video and an `error-context.md` (the page's accessibility tree) under `test-results/playwright*/`. A CI retry also records a trace.
- Hydration errors appear as `Minified React error #418`. Check for a clock read during render. Pages are prerendered at build time, so read the clock in the browser (`useClientValue` in `lib/ui/use-client-value.ts`) or in an effect.
- `test-results/quality-report.md` summarises every stage, JUnit totals, coverage, load latencies and open known defects.

## CI

`.github/workflows/ci.yml` (**Verify**) runs on every pull request and every push to `main`:

| Job | Content |
| --- | --- |
| quality | Typecheck, Vitest with the coverage ratchet and JUnit, `npm audit --audit-level=high` |
| build | Sandboxed production build, shared with later jobs as an artifact |
| e2e | Matrix over the five browser projects |
| web-quality | a11y, usability, security-web, resilience, then visual against committed Linux baselines |
| load-smoke | p99 budgets |
| lighthouse | Lighthouse budgets |
| report | Merges every job's results into the quality report and the job summary |

`.github/workflows/nightly.yml` runs an OWASP ZAP baseline (passive) scan against a sandboxed server every night. It reports only until the first findings are triaged.

## Backlog

These are coverage gaps the framework review found that are not yet closed. Each would be a new test, not an app fix.

| ID | Gap |
| --- | --- |
| GAP-4 | Production database defences are untested against real Postgres: the `EXCLUDE` overlap constraint, `redeem_gift_voucher`, the `23P01` → 409 mapping and migrations 001–004. This needs a Postgres service container. |
| GAP-6 | Admin back-office mutations (reschedule, cancel, voucher actions) aren't exercised in a browser |
| GAP-7 | Signed-in member journeys (dashboard, receipts, auth callback, password reset) have no browser coverage |
| GAP-8 | No resilience tests for the success page's polling of the payment status |
| GAP-9 | Transactional email rendering (escaping, recipient routing, no PII in logs) is untested |
| GAP-11 | No browser checks for booked-slot strikethrough, storefront/wizard parity or the Friday/Saturday grids (AGENTS.md §4) |
| GAP-12 | The `/pro` page content required by AGENTS.md §2 is unverified |
| GAP-13 | The SEO and metadata contract (sitemap, canonical, hreflang, OpenGraph, JSON-LD, noindex) is untested |
| GAP-15 | CSP violations are checked on only four routes, in Chromium |
| GAP-16 | No JavaScript bundle-size budget. Load and Lighthouse now run in CI. |
