# Project State

Live state of the **SimDream LTD** website (`simdream.co.il`). Every new session starts by reading this file and `docs/DECISIONS.md`. Update both in the same change as any substantive code or architecture change; a stale state file counts as broken.

Facts here are checked against the repo; where a number is a measurement, the command that produced it is given. Rules and invariants live in `AGENTS.md`, not here.

---

## What works

- **Platform:** Next.js 16 (App Router), React 19, TypeScript strict. `proxy.ts` sets a CSP with nonces. Seven languages (`he` default and RTL, `ar` RTL, `en`, `ru`, `fr`, `es`, `de`), with aviation telemetry kept LTR (`AGENTS.md` section 5).
- **Scheduler (Kantorovich tiled interval engine):** 09:00-24:00 operating window; reserved blocks 30m to 45, 45m to 60, 60m to 75, 90m to 105, 120m to 150, 240m to 255; zero-waste tiling; closing-tail recovery (#276). Spec: `KANTOROVICH_SCHEDULER_SPEC.md`.
- **Booking (`/book`):** adaptive flows (3-step consumer, 2-step PRO and Fear of Flying), promotional tier bump-up ladder with the two-add-on cap, upgraded-duration grid switching (Option A, #279), flat 90m price all day (#271), 15% birthday discount judged on the upgraded tier (#281, #284).
- **Offerings:** consumer flight tracks and PRO tracks (6 subscription passes: 4 consumer, 2 PRO), gift vouchers, Fear of Flying course (60 min, 690 ILS), the `/offers` page.
- **Wix Headless adapter:** writes only to the SimDream-Staging site; `npm run wix:smoke` reconciles the catalog (9 of 10 package ids mapped). Wix benefit pool allocations are audited via `npm run wix:check-benefit-pools` (`lib/wix/plan-benefit-pools.ts`). Blog V3 reads put filters inside `query`, filter by slug with `$eq` (Wix rejects `$hasSome` on a slug with HTTP 400) and by language with `$eq`, and reject a returned locale mismatch before local fallback, so a Hebrew route cannot render an English breadcrumb or JSON-LD and a translated route cannot silently render Hebrew. Worker bundle stands at 10.15 MiB UTF-8 (12.73 MiB with `\u` escapes), 3.85 MiB below the 14.00 MiB budget with `@wix/pricing-plans` 1.0.453 and `@opennextjs/cloudflare` 1.20.16.
- **Wix worker and cookies:** staging runs `v1.32.4` (published 2026-11-24 22:51Z). It was checked in a real browser with a cookie (`/`, `/book`, `/vouchers`, `/pro`, `/offers`, `/experiences` all 200) and the translated blog articles were checked in all seven languages (each returns its own title and its own canonical). `@opennextjs/cloudflare` is pinned to exactly 1.20.16 because 1.20.18 bundled the middleware cookie parser without esbuild's node-mode flag (every request with a Cookie header answered HTTP 500, "reading 'parse'"). `npm run wix:build` fails on that bundle (`scripts/wix-worker-guards.mjs`), and the CI preview, release and rollback smoke checks send a cookie and open a translated article. Dependabot ignores later versions until one passes a cookie request. Details: `docs/modules/wix-adapter.md`, `docs/modules/blog-language.md`.
- **Dependency security:** `npm audit` reports 0 vulnerabilities; the `@node-minify/core` override pins its `glob` to 14.0.6 (which brings `minimatch` 11.0.9) for the older toolchain that the `@opennextjs/cloudflare` 1.20.16 pin needs (#318, Dependabot alert #4).
- **Dependency security (Wix `i18next`):** the npm override resolves the Wix transitive `i18next` dependency to 26.3.4, removing GHSA-6jcc-5g8w-32mx without downgrading `@wix/pricing-plans`; the clean Node 24/npm 11.20 audit reports zero production vulnerabilities.
- **Quality gates:** `npm run docs:verify` passes (GENESIS.md covers 599 of 599 checklist items, fingerprint current). Test files: 176 unit/integration-style `*.test.ts` and 62 Playwright `*.spec.ts`; `playwright.config.ts` defines 10 projects; the accessibility baseline is empty (0 axe violations).

## In progress

- Hebrew `/rules` briefly renders two `#refunds` cards when hydration runs before React's deferred Suspense swap (found with a delayed `requestAnimationFrame`; seen once on CI); a product fix is not done, details in `docs/DECISIONS.md` (Open). The lost-hover WebKit failure (#317) and the blog language loop are fixed.

## Blocked

- **Wix production:** read-only from this repo. Linking plans or services needs a dashboard step by the owner and an explicit instruction; check read-only for duplicate benefit pools first (`npm run wix:check-benefit-pools`).
- **`pkg-grand-120`:** not provisioned in Wix (`PENDING_WIX_PACKAGE_IDS`; runbook in `docs/WIX_HEADLESS_CUTOVER_RUNBOOK.md`).

## Next step

1. Remove the transient duplicate `#refunds` on Hebrew `/rules` at its source (see Open in `docs/DECISIONS.md`).
2. Move `@opennextjs/cloudflare` past 1.20.16 only when a release passes `npm run wix:build` and a cookie request on the built worker; then drop the `@node-minify/core` override if it is no longer needed.

Open items with owners and details are listed in `docs/DECISIONS.md`.

## Last updated

2026-11-24
