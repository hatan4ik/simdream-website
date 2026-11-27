# Project State

Live state of the **SimDream LTD** website (`simdream.co.il`). **Start here:** run `npm run status` (a read-only snapshot of the checkout, open PRs, CI, releases, the last Wix publish and the staging site), then read this file, then only the "Working rules" and "Open" sections of `docs/DECISIONS.md`. Update both documents in the same change as any substantive code or architecture change; a stale state file counts as broken. At this stage the only URL to test is the staging site (`https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com`).

Facts here are checked against the repo; where a number is a measurement, the command that produced it is given. Rules and invariants live in `AGENTS.md`, not here.

---

## What works

- **Platform:** Next.js 16 (App Router), React 19, TypeScript strict. `proxy.ts` sets a CSP with nonces. Seven languages (`he` default and RTL, `ar` RTL, `en`, `ru`, `fr`, `es`, `de`), with aviation telemetry kept LTR (`AGENTS.md` section 5).
- **Scheduler (Kantorovich tiled interval engine):** 09:00-24:00 operating window; reserved blocks 30m to 45, 45m to 60, 60m to 75, 90m to 105, 120m to 150, 240m to 255; zero-waste tiling; closing-tail recovery (#276). Spec: `KANTOROVICH_SCHEDULER_SPEC.md`.
- **Booking (`/book`):** adaptive flows (3-step consumer, 2-step PRO and Fear of Flying), promotional tier bump-up ladder with the two-add-on cap, upgraded-duration grid switching (Option A, #279), flat 90m price all day (#271), 15% birthday discount judged on the upgraded tier (#281, #284).
- **Offerings:** consumer flight tracks and PRO tracks (6 subscription passes: 4 consumer, 2 PRO), gift vouchers, Fear of Flying course (60 min, 690 ILS), the `/offers` page.
- **Wix Headless adapter:** writes only to the SimDream-Staging site; `npm run wix:smoke` reconciles the catalog (9 of 10 package ids mapped). Wix benefit pool allocations are audited via `npm run wix:check-benefit-pools` (`lib/wix/plan-benefit-pools.ts`). Blog V3 reads put filters inside `query`, filter by slug with `$eq` (Wix rejects `$hasSome` on a slug with HTTP 400) and by language with `$eq`, and reject a returned locale mismatch before local fallback, so a Hebrew route cannot render an English breadcrumb or JSON-LD and a translated route cannot silently render Hebrew. Worker bundle stands at 10.15 MiB UTF-8 (12.73 MiB with `\u` escapes), 3.85 MiB below the 14.00 MiB budget with `@wix/pricing-plans` 1.0.453 and `@opennextjs/cloudflare` 1.20.16.
- **Wix worker and cookies:** staging runs `v1.32.6` (published 2026-11-25 00:55Z, includes the `/rules` and `/privacy-policy` duplicate-id fix). After a publish it is verified by `npm run test:staging:content:docker` (Playwright in Docker, 32 read-only checks, staging only; 32 of 32 on `v1.32.6`): a request with a cookie, every language of two blog articles with its own title and canonical, the language loop, both blog indexes, and the legal pages. `@opennextjs/cloudflare` is pinned to exactly 1.20.16 because 1.20.18 bundled the middleware cookie parser without esbuild's node-mode flag (every request with a Cookie header answered HTTP 500, "reading 'parse'"). `npm run wix:build` fails on that bundle (`scripts/wix-worker-guards.mjs`), and the CI preview, release and rollback smoke checks send a cookie and open a translated article. Dependabot ignores later versions until one passes a cookie request. After a publish the deployed staging site is checked by `npm run test:staging:content:docker` (Playwright in Docker, read-only). A nightly job (`wix-blog-languages`) checks the live Wix Blog API for every translation group in every language. Details: `docs/modules/wix-adapter.md`, `docs/modules/blog-language.md`.
- **Dependency security:** `npm audit` reports 0 vulnerabilities; the `@node-minify/core` override pins its `glob` to 14.0.6 (which brings `minimatch` 11.0.9) for the older toolchain that the `@opennextjs/cloudflare` 1.20.16 pin needs (#318, Dependabot alert #4).
- **Dependency security (Wix `i18next`):** the npm override resolves the Wix transitive `i18next` dependency to 26.3.4, removing GHSA-6jcc-5g8w-32mx without downgrading `@wix/pricing-plans`; the clean Node 26/npm 12.2 audit reports zero production vulnerabilities.
- **Quality gates:** `npm run docs:verify` passes (`GENESIS.md` covers 608 of 608 checklist items, fingerprint current). 185 Vitest test files and 64 Playwright `*.spec.ts` in 10 projects; `npm run test:quick` passes (184 files, 3,588 tests, 17 skipped bundle checks that need a built site); the accessibility baseline is empty (0 axe violations).

## In progress

- **Performance audit, Batch A (first paint) merged (#339, release 1.34.1):** First-time and Hebrew visitors no longer wait for hydration to see the page (mobile-emulated first paint 3788 ms to 1288 ms). Batch B shipped separately (next bullet); the rest of the audit is awaiting the owner's go-ahead.
- **Waiting for a time:** the nightly `wix-blog-languages` job (live, read-only: every blog translation group in every language) has never run on GitHub; its first scheduled run is 2026-11-25 02:00 UTC. Check it with `npm run status` ("Nightly").
- **Performance audit, Batch B (reliability) merged (#341, release 1.34.2):** Deadlines on idempotent outbound reads (none on writes), overlapped member and voucher reads in checkout, concurrent efficiency read in Wix-mode `/api/slots`, the voucher confirmation email through `after()`. Still to verify on the deployed staging Worker once the release is published: `AbortSignal.timeout` and `after()`. Approved by the owner on 2026-11-26 and being done one PR at a time (next bullet): bookings read scope, bundle splitting, admin lockout pre-check, throttling the Wix routes, choosing the auth provider by token shape.
- **Performance audit, bounded bookings read, merged (#345):** Availability, the efficiency report, the reschedule check and the admin optimizer preview read one day's bookings from the database instead of the whole table.
- **Audit, admin lockout pre-check, merged (#347):** A locked-out address is refused even with the correct password (`SECURITY.md`, "Admin lockout"). It is active only where `RATE_LIMIT_CLIENT_IP_HEADER` is set (or on Vercel); the Wix host has no such setting recorded, so it is off there until the owner names the header. Not observed on production: the service-role read of `security_rate_limits`.
- **Audit, Wix checkout start throttle, merged (#348):** `POST /api/wix/bookings/checkout` and `/api/subscriptions/checkout` are counted per client address before any Wix call (`SECURITY.md`). Not observed on the deployed Worker: the in-process fallback there bounds one instance, not the site.
- **Audit, identity provider by token shape, merged (#350):** A bearer token that cannot be a Supabase session token is no longer sent to Supabase before Wix. Not measured on a deployment: the saving depends on Wix member tokens not being three-segment JWTs, which was not observed with a real member token.
- **Audit, booking first paint, merged (#356):** `/book` server-renders its first step from the server's per-request Israel date instead of a placeholder; largest paint on an emulated phone about 4.9 s to about 1.3 s on a local production build. Departures are still fetched by the browser after hydration. Not measured on the deployed Worker. On English first visits the reported largest paint is still the cookie notice (`docs/DECISIONS.md`, Open).
- **Audit, client address diagnostic (PR open):** `GET /api/diagnostics/client-address`, off unless `CLIENT_ADDRESS_DIAGNOSTIC=1`, reports which forwarding headers reach a host without returning their values. Waiting for the owner to enable it on SimDream-Staging so the header can be observed.
- **Audit, client bundle, step 1 merged (#351):** The Supabase SDK loads on first use (home page JavaScript 498 to 442 KiB gzipped on a local production build). Measured but not yet changed, in order of size: all seven languages of `lib/i18n/translations.ts` ship on every page (142 KiB gzipped), and the Wix SDK ships on every page (61 KiB).

## Blocked

- **Wix production:** read-only from this repo. Linking plans or services needs a dashboard step by the owner and an explicit instruction; check read-only for duplicate benefit pools first (`npm run wix:check-benefit-pools`).
- **`pkg-grand-120`:** not provisioned in Wix (`PENDING_WIX_PACKAGE_IDS`; runbook in `docs/WIX_HEADLESS_CUTOVER_RUNBOOK.md`).

## Next step

1. **Owner decision:** run `npm run test:staging:content:docker` automatically after every Wix publish, as a separate non-blocking job in `wix-release.yml` (it changes the publish pipeline, so it is not done yet).
2. Move `@opennextjs/cloudflare` past 1.20.16 only when a release passes `npm run wix:build` and a cookie request on the built worker; then drop the `@node-minify/core` override if it is no longer needed.

Open items with owners and details are listed in `docs/DECISIONS.md`.

## Last updated

2026-11-27
