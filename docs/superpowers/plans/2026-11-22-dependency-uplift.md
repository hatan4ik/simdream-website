# Dependency Uplift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the local package, runtime, CI-action, Stripe, and Wix-worker baselines without weakening clean-install, worker-size, checkout, or release safeguards.

**Architecture:** Update direct dependencies only when a standard `npm ci` can reproduce the resulting lockfile. Remove the worker trace with a literal asset path, validate Stripe at its outbound request boundary, and leave provider/GitHub execution as explicit external gates.

**Tech Stack:** Next.js/Turbopack, Node 24, npm 11, TypeScript 6, Vitest, Stripe, OpenNext/Cloudflare, Wix, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-22-dependency-uplift-design.md`

## Global Constraints

- Keep Node `>=24.22.1 <25`, npm `>=11.20.0`, normal `npm ci`, immutable action SHA pins, and the 14.00 MiB Wix-worker ceiling.
- Never use force/legacy peer resolution, blanket lifecycle-script approval, or a real provider transaction.
- Keep React 19; do not downgrade it to satisfy an optional Wix peer.
- Record incompatible major releases as holds with a concrete upgrade condition.

---

### Task 1: Establish the clean dependency graph

**Files:** `package.json`, `package-lock.json`

- [x] Install supported direct upgrades with ordinary npm resolution and lock the exact graph.
- [x] Add the scoped OpenNext `glob@14.0.6` override after checking the advisory path.
- [x] Inspect all pending lifecycle scripts; approve version-pinned `esbuild`/`workerd` and deny `rclone.js`/`fsevents`.
- [x] Verify `npm ci`, `npm audit --json`, and `npm install-scripts ls`.

### Task 2: Preserve incompatible-major safety

**Files:** `package.json`, `package-lock.json`, `docs/superpowers/specs/2026-11-22-dependency-uplift-design.md`

- [x] Reject `@wix/members@1.0.551` after proving it requires React 18 peers and makes ordinary clean installs unreproducible.
- [x] Reject TypeScript 7 after proving its stable import lacks the compiler API consumed by repository tools.
- [x] Reject Lucide 1 after type-checking the removed social-platform exports.
- [x] Hold Node types at 24 to match the declared deployment runtime.

### Task 3: Remove Turbopack whole-project tracing

**Files:** `tests/unit/blog-seo.test.ts`, `lib/data/blog-seo.ts`

- [x] Add a working-directory regression test and observe it fail against the dynamic tuple path.
- [x] Capture the public JSON path from literal `path.join(process.cwd(), 'public', 'data', 'blog-seo.json')` segments at module initialization.
- [x] Re-run the focused test and optimized build; verify the warning is absent.

### Task 4: Migrate the Stripe 23 request boundary

**Files:** `tests/unit/stripe-hosted-checkout.test.ts`, `lib/stripe.ts`

- [x] Add a fake-client test for the configured API version and the outgoing Checkout Session payload; observe it fail against the prior adapter.
- [x] Pin the current SDK API version, remove the deleted payment-method parameter, and narrow only known terminal statuses.
- [x] Run the focused checkout test and keep real payment execution out of local verification.

### Task 5: Align the Node and Actions release contract

**Files:** `.node-version`, `package.json`, `.github/workflows/*.yml`, `GENESIS.md`

- [x] Add the Node/npm declaration and record the Node 24.22.1 version-manager target.
- [x] Replace checkout, setup-node, upload-artifact, and download-artifact references with the documented Node-24-native SHA pins; change nightly Node 22 to 24.
- [x] Verify Node 24.22.1/npm 11.20.0 with clean install and typecheck using a temporary toolchain.

### Task 6: Final local gates and handoff

**Files:** `docs/superpowers/specs/2026-11-22-dependency-uplift-design.md`, `GENESIS.md`

- [x] Run the full lint, unit, integration, optimized-build, Wix-worker, audit, lifecycle, and Genesis verification sequence on Node 24.
- [x] Record final worker size and the pass/fail output for every gate in the spec ledger.
- [x] Inspect the diff, create one local commit, and hand off the three external gates; a later explicit user request may authorize pushing and PR creation.
