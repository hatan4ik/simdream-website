# Project State

Live state of the **SimDream LTD** website (`simdream.co.il`). Every new session starts by reading this file and `docs/DECISIONS.md`. Update both in the same change as any substantive code or architecture change; a stale state file counts as broken.

Facts here are checked against the repo; where a number is a measurement, the command that produced it is given. Rules and invariants live in `AGENTS.md`, not here.

---

## What works

- **Platform:** Next.js 16 (App Router), React 19, TypeScript strict. `proxy.ts` sets a CSP with nonces. Seven languages (`he` default and RTL, `ar` RTL, `en`, `ru`, `fr`, `es`, `de`), with aviation telemetry kept LTR (`AGENTS.md` section 5).
- **Scheduler (Kantorovich tiled interval engine):** 09:00-24:00 operating window; reserved blocks 30m to 45, 45m to 60, 60m to 75, 90m to 105, 120m to 150, 240m to 255; zero-waste tiling; closing-tail recovery (#276). Spec: `KANTOROVICH_SCHEDULER_SPEC.md`.
- **Booking (`/book`):** adaptive flows (3-step consumer, 2-step PRO and Fear of Flying), promotional tier bump-up ladder with the two-add-on cap, upgraded-duration grid switching (Option A, #279), flat 90m price all day (#271), 15% birthday discount judged on the upgraded tier (#281, #284).
- **Offerings:** consumer flight tracks and PRO tracks (6 subscription passes: 4 consumer, 2 PRO), gift vouchers, Fear of Flying course (60 min, 690 ILS), the `/offers` page.
- **Wix Headless adapter:** writes only to the SimDream-Staging site; `npm run wix:smoke` reconciles the catalog (9 of 10 package ids mapped).
- **Quality gates:** `npm run docs:verify` passes (GENESIS.md covers 599 of 599 checklist items, fingerprint current). Test files: 175 unit/integration-style `*.test.ts` and 62 Playwright `*.spec.ts`; `npx vitest list` listed about 1,860 tests on 2026-11-23; `playwright.config.ts` defines 10 projects; the accessibility baseline is empty (0 axe violations).

## In progress

- Agent working environment (this setup): `CLAUDE.md`, these two docs and `.claude/agents/`, following `~/Downloads/agent-setup-guidelines.md`. Created and reviewed on branch `devel/harness-audit`; nothing is committed yet.
- Wix staging: subscription plans and benefit pools (see `docs/DECISIONS.md`, Working rules, "Wix benefit pools").
- Wix worker bundle: held under the 14.00 MiB budget by not taking `@wix/pricing-plans` 1.0.451.

## Blocked

- **Wix production:** read-only from this repo. Linking plans or services needs a dashboard step by the owner and an explicit instruction; check read-only for duplicate benefit pools first.
- **`pkg-grand-120`:** not provisioned in Wix (`PENDING_WIX_PACKAGE_IDS`).
- **`@wix/pricing-plans` 1.0.451 and Dependabot PR #298:** the worker bundle reaches 14.01 of 14.00 MiB; about 30 KB must be trimmed first (`docs/modules/wix-bundle-diet.md`).

## Next step

1. Commit and open a pull request for the setup on `devel/harness-audit` (only when asked).
2. Run `/agents` or restart Claude Code so the new agents in `.claude/agents/` can be called.
3. Pick the session role for the next piece of work (`CLAUDE.md`, "Session roles").

Open items with owners and details are listed in `docs/DECISIONS.md`.

## Last updated

2026-11-23
