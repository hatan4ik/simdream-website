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
| Browser journeys | Playwright | `tests/e2e` | Booking (storefront and wizard), success page, vouchers, workshops, contact, admin, member area, language and theme, navigation, mobile. The shared suite runs on Chromium, Firefox and WebKit; Pixel 7 and iPhone 15 run the dedicated touch journey `tests/e2e/mobile.spec.ts`, because phones get the Guided Wizard only and never show the desktop Express Shop (`ci.yml`, `e2e` matrix) |
| Accessibility | Playwright, axe-core | `tests/a11y` | WCAG 2.x AA scans in all three themes (Cockpit Night, Brand Daylight, Clean Studio; `SCAN_THEMES` in `tests/a11y/support/scan-keys.ts`): every public route (English and Hebrew; Arabic on the main funnel), booking states, success, member, auth and 404 pages, keyboard paths, mobile and admin |
| Usability | Playwright | `tests/usability` | Hydration (including on a later day than the build), forms, i18n and RTL (including the member area in all six languages), header theme switch and header fit in all six languages, layout stability (CLS), reduced motion, page structure, responsive layout from 320 to 1280px |
| Security (browser) | Playwright | `tests/security-web` | Response headers and CSP, access control, information disclosure, stored XSS |
| Resilience | Playwright | `tests/resilience` | Slot loading and checkout under slow, failing and offline networks |
| Visual | Playwright | `tests/visual` | Screenshot baselines for key pages |
| Load smoke | autocannon | `tests/load/smoke.ts` | p99 latency budgets for the hot endpoints |
| Lighthouse | `@lhci/cli` via npx | `tests/perf` | Accessibility, SEO, performance and best-practice scores; LCP, CLS and TBT budgets on `/`, `/book` and `/pro` (median of three desktop runs) |

## Commands

| Command | What it runs |
| --- | --- |
| `npm run lint` | Strict TypeScript check plus deterministic rejection of unsafe `any` escapes and TypeScript suppression directives in application source. |
| `npm run test:all` | Typecheck and type hygiene, Vitest with coverage, sandboxed build, e2e on Chromium, a11y, usability, security-web, resilience, visual and load. Writes `test-results/quality-report.md`. |
| `npm run test:quick` | Typecheck/type hygiene and Vitest only: seconds, no build, no browser |
| `npm run test:full` | `test:all` on all five browser projects, plus Lighthouse |
| `npm run test:all -- --no-build` | Reuses the current test build in `.next-test` |
| `npm run test:all -- --bail` | Stops at the first failing stage |
| `npm run test:report` | Rebuilds the quality report from existing results |
| `npm test` / `test:unit` / `test:integration` | Vitest: everything, or one project |
| `npm run test:security` / `test:reliability` | The Vitest project plus its browser counterpart |
| `npm run test:coverage` | Vitest with coverage thresholds |
| `npm run test:build` | A production build with every secret blanked |
| `npm run test:e2e` | Browser journeys on all five projects. Locally this runs every `tests/e2e` spec on the phone projects too, so desktop-only Express Shop journeys fail there by design; CI limits Pixel 7 and iPhone 15 to `tests/e2e/mobile.spec.ts` |
| `npm run test:a11y` / `test:usability` / `test:visual` | One browser quality project |
| `npm run test:a11y:baseline` | Re-records the accessibility baseline after a fix |
| `npm run test:visual:update` | Re-records Linux screenshot baselines in the pinned Playwright Docker image. The build runs on a private copy inside the container; only the snapshots are copied back. |
| `npm run test:load` / `test:lighthouse` | Starts a sandboxed server and runs the load smoke or Lighthouse |
| `npm run docs:verify` / `docs:genesis` | Fails unless canonical [`GENESIS.md`](GENESIS.md) still covers every route, table, migration, environment variable, catalog price, domain function, module, component, test script and AGENTS.md invariant—and has a reviewed source fingerprint. Also runs in `test:all`, `test:quick` and CI. |
| `tests/security/secrets-hygiene.test.ts` | Scans the production client bundle (`.next-test/static`, or `.next/static` when that is the only build) for server-only names and secret-shaped values. Without any build the bundle suite skips; the CI build job runs it with `REQUIRE_CLIENT_BUNDLE=1` right after `npm run test:build`, where a missing bundle fails. |
| Git history secret scan | The `secret-scan` CI job uses Gitleaks to block secrets introduced by every pull request and `main` push. It extends provider rules with a Wix Headless API-key rule. [`security-history-audit.yml`](.github/workflows/security-history-audit.yml) is the separately owner-triggered full-history audit; historical findings require rotation and a reviewed remediation, never a broad allowlist. |
| `npm run docs:genesis:stamp` | Re-stamps the canonical document after a human source review. Use only after verifying the code change is accurately reflected in `GENESIS.md`; CI rejects a stale fingerprint. The fingerprint hashes only files git would commit (tracked, or untracked and not ignored), so a stamp made locally matches the clean checkout CI verifies; git-ignored output such as `tests/perf/reports/` never affects it. |

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
- Browser test servers also use a triple-gated `.next-test` marker to isolate their parallel synthetic failed-admin attempts; Vitest continues to exercise the actual rate-limit boundary and production never receives that marker.
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
| Lighthouse | `tests/perf/lighthouserc.json` | Hard gates (`error`, fail the stage): accessibility ≥ 0.95, SEO ≥ 0.95, CLS ≤ 0.1. Advisory (`warn`, printed only): performance ≥ 0.8, best practices ≥ 0.9, LCP ≤ 2.5 s, TBT ≤ 300 ms. `tests/perf/run-lighthouse.ts` exits non-zero only on an `error` assertion, so a performance-score drop does not fail CI on its own |

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

| Job | Check name | Content |
| --- | --- | --- |
| release-integrity | Release source inheritance | Decides whether this run is a generated Release Please change (the release PR, its explicit dispatch, or the merged `chore(main): release …` commit). If so, it requires the diff to touch only `.release-please-manifest.json`, `CHANGELOG.md`, `package.json` and `package-lock.json`, and requires a **completed, successful `Verify` push run on `main` for the parent SHA**; then it sets `fast_path=true` so the browser suites are inherited from that parent instead of re-run. Any other change sets `fast_path=false`. It also sets `docs_only=true` when the diff against the base (PR base, or the squash parent on `main`) is non-empty and touches only `*.md` files or `docs/**`; see below |
| quality | Typecheck and hygiene, Vitest (…), audit | Typecheck/type hygiene, Vitest with the coverage ratchet and JUnit, `npm audit --audit-level=high` |
| secret-scan | Git history secret scan | Event-scope Git history secret detection with Gitleaks before any Wix preview or production release |
| build | Sandboxed production build | Sandboxed production build, shared with later jobs as an artifact |
| e2e | E2E (project) | Chromium, Firefox and WebKit run `tests/e2e`; Pixel 7 and iPhone 15 run `tests/e2e/mobile.spec.ts`. Every step is skipped on the fast path and on a docs-only change |
| web-quality | Accessibility, usability, security-web, resilience, visual | a11y, usability, security-web, resilience, then visual against committed Linux baselines. Skipped on the fast path and on a docs-only change |
| load-smoke | Load smoke | p99 budgets. Skipped on the fast path and on a docs-only change |
| lighthouse | Lighthouse budgets | Lighthouse budgets. Skipped on the fast path and on a docs-only change |
| report | Quality report | Merges every job's results into the quality report and the job summary; it runs `always()`, so it reports red when any earlier job failed |
| wix-preview | Wix immutable preview | Only on a `main` push with `fast_path=false`, `docs_only=false` and the repository variable `WIX_PREVIEW_CI_ENABLED=true`: builds the Worker and creates the immutable Wix preview ([`docs/GITHUB_WIX_CICD.md`](docs/GITHUB_WIX_CICD.md)) |

**Documentation-only changes.** When every changed path is Markdown or under `docs/`, `release-integrity` sets `docs_only=true` and the `e2e` steps, `web-quality`, `load-smoke`, `lighthouse` and `wix-preview` are skipped: no `.md` is read by the application or its build, so no behaviour can have changed. `quality` still runs in full, because `docs:verify` fingerprints `README.md`, `TESTING.md`, `AGENTS.md` and the spec files, and `secret-scan` and `build` still run. A skipped required job satisfies branch protection, so the PR remains mergeable with those checks reported as skipped. Before this rule a docs commit cost about 56 runner-minutes (a 25-minute PR run plus a 31-minute `main` run including a Wix preview); now about 3. The rule is deliberately narrow: a `.md` that ever becomes imported by code, or a `docs/**` asset the site serves, must leave this allow-list.

**Release PR failing on "Release source inheritance".** Release Please opens or refreshes the release PR as soon as `main` moves, so its `release-integrity` job can run before `main`'s own `Verify` run on that commit has finished. It then fails with `No successful main Verify run attests parent <sha>`, and `Quality report` goes red with it. Nothing is wrong with the code: wait for the `Verify` run on `main` to succeed, then re-run the failed jobs (`gh run rerun <run-id> --failed`), or let Release Please refresh the branch, which starts a fresh run. The job is also what makes a manual `workflow_dispatch` on the release branch meaningful: it verifies the candidate against the `merge-base` with `main`.

`.github/workflows/nightly.yml` runs an OWASP ZAP baseline (passive) scan against a sandboxed server every night. It reports only until the first findings are triaged.

## Backlog

These are coverage gaps the framework review found that are not yet closed. Each would be a new test, not an app fix.

| ID | Gap |
| --- | --- |
| GAP-4 | Production database defences are untested against real Postgres: the `EXCLUDE` overlap constraint, `redeem_gift_voucher`, the `23P01` → 409 mapping, durable `consume_rate_limit`, and migrations 001–005. This needs a Postgres service container. |
| GAP-6 | Admin back-office mutations (reschedule, cancel, voucher actions) aren't exercised in a browser |
| GAP-7 | Signed-in member journeys (dashboard, receipts, auth callback, password reset) have no browser coverage |
| GAP-8 | No resilience tests for the success page's polling of the payment status |
| GAP-9 | Transactional email rendering (escaping, recipient routing, no PII in logs) is untested |
| GAP-11 | No browser checks that booked slots stay hidden (open slots only), storefront/wizard parity or the Friday/Saturday grids (AGENTS.md §4) |
| GAP-12 | The `/pro` page content required by AGENTS.md §2 is unverified |
| GAP-13 | The SEO and metadata contract (sitemap, canonical, hreflang, OpenGraph, JSON-LD, noindex) is untested |
| GAP-15 | CSP violations are checked on only four routes, in Chromium |
| GAP-16 | No JavaScript bundle-size budget. Load and Lighthouse now run in CI. |
