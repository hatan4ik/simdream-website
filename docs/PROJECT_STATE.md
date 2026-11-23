# Project State

Live state of the **SimDream LTD** website (`simdream.co.il`). Every new session starts by reading this file and `docs/DECISIONS.md`. Update both in the same change as any substantive code or architecture change; a stale state file counts as broken.

Facts here are checked against the repo; where a number is a measurement, the command that produced it is given. Rules and invariants live in `AGENTS.md`, not here.

---

## What works

- **Platform:** Next.js 16 (App Router), React 19, TypeScript strict. `proxy.ts` sets a CSP with nonces. Seven languages (`he` default and RTL, `ar` RTL, `en`, `ru`, `fr`, `es`, `de`), with aviation telemetry kept LTR (`AGENTS.md` section 5).
- **Scheduler (Kantorovich tiled interval engine):** 09:00-24:00 operating window; reserved blocks 30m to 45, 45m to 60, 60m to 75, 90m to 105, 120m to 150, 240m to 255; zero-waste tiling; closing-tail recovery (#276). Spec: `KANTOROVICH_SCHEDULER_SPEC.md`.
- **Booking (`/book`):** adaptive flows (3-step consumer, 2-step PRO and Fear of Flying), promotional tier bump-up ladder with the two-add-on cap, upgraded-duration grid switching (Option A, #279), flat 90m price all day (#271), 15% birthday discount judged on the upgraded tier (#281, #284).
- **Offerings:** consumer flight tracks and PRO tracks (6 subscription passes: 4 consumer, 2 PRO), gift vouchers, Fear of Flying course (60 min, 690 ILS), the `/offers` page.
- **Wix Headless adapter:** writes only to the SimDream-Staging site; `npm run wix:smoke` reconciles the catalog (9 of 10 package ids mapped). Wix benefit pool allocations are audited via `npm run wix:check-benefit-pools` (`lib/wix/plan-benefit-pools.ts`). Worker bundle stands at 10.12 MiB UTF-8 (12.70 MiB with `\u` escapes), 1.30 MiB below the 14.00 MiB budget with `@wix/pricing-plans` 1.0.453.
- **Quality gates:** `npm run docs:verify` passes (GENESIS.md covers 599 of 599 checklist items, fingerprint current). Test files: 176 unit/integration-style `*.test.ts` and 62 Playwright `*.spec.ts`; `playwright.config.ts` defines 10 projects; the accessibility baseline is empty (0 axe violations).

## In progress

- Tracked git hooks and secret scan pre-commit (`.githooks/` and PR #305).
- Single hardening & documentation consolidation PR (benefit pool guard, flat 90m tariff docs, Grand 120 runbook, slot study Option A updates).

## Blocked

- **Wix production:** read-only from this repo. Linking plans or services needs a dashboard step by the owner and an explicit instruction; check read-only for duplicate benefit pools first (`npm run wix:check-benefit-pools`).
- **`pkg-grand-120`:** not provisioned in Wix (`PENDING_WIX_PACKAGE_IDS`; runbook in `docs/WIX_HEADLESS_CUTOVER_RUNBOOK.md`).

## Next step

1. Complete verification (`npm run typecheck`, `npm run test:quick`, `npm run docs:verify`).
2. Push branch `devel/system-hardening-and-bundle-diet` and open single consolidation PR.

Open items with owners and details are listed in `docs/DECISIONS.md`.

## Last updated

2026-11-23
