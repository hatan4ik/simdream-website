# Dependency Uplift Design — 2026-11-22

## Outcome

This program upgrades the reproducible local dependency graph, Node/npm contract, GitHub Actions runtime, and Stripe adapter without publishing, merging, deploying, or calling a live provider. It started at `bdd95da` and is implemented in an isolated worktree.

## Verified upgrades

- Runtime contract: Node `>=24.22.1 <25`, npm `>=11.20.0`, `packageManager: npm@11.20.0`, and `.node-version` `24.22.1`.
- GitHub Actions: checkout `v7.0.1` (`3d3c42e5aac5ba805825da76410c181273ba90b1`), setup-node `v7.1.0` (`949feb2413d6458794dcd2491c4babbbce0c15c1`), upload-artifact `v7.0.2` (`cf430e030ddbb5b0abf93d22962f4752f3646cd9`), and download-artifact `v8.0.2` (`9000827ccba6bdab643e8b6fd33ac0654aef8333`). Nightly now tests Node 24 rather than Node 22.
- Direct package updates: OpenNext 1.20.18, Playwright 1.65.1, Supabase 2.119.2, Node types 24.19.2, React DOM types 19.3.0, Vitest/V8 coverage 5.1.1, Wix Pricing Plans 1.0.453, Wix SDK 1.21.19, fast-check 4.11.0, Wrangler 4.166.0, Tailwind Merge 3.7.1, and Stripe 23.2.0.
- Security: the OpenNext-local `glob@14.0.6` override removes the `glob -> minimatch` advisory; `npm audit` now reports zero vulnerabilities.
- Lifecycle policy: only `esbuild@0.28.2` and `workerd@1.20261119.1` are version-pinned approvals. `rclone.js` self-update and optional `fsevents` native build are explicit denials. `npm install-scripts ls` is empty.
- Bundle remediation: `blog-seo` uses literal filesystem segments captured at module initialization, so Turbopack traces the JSON asset instead of the entire repository. The working-directory regression test fails on the old path construction and passes on the new one. The Wix-owned production Worker is explicitly minified in `wrangler.jsonc`; its config test pins that setting and the 14.00 MiB ceiling remains unchanged.
- Stripe 23 migration: Checkout uses API `2026-11-18.endive`, no longer sends the removed `payment_method_types` request field, and treats only `expired` and `complete` as recoverable terminal session statuses. A local fake-client test asserts the generated request; live checkout remains deliberately uncalled.

## Intentional holds

| Package | Held version | Reason and release condition |
| --- | --- | --- |
| `@wix/members` | 1.0.541 | Latest 1.0.551 declares optional React/React DOM `^18.3.1`; npm 11 cannot reproduce its lockfile with SimDream's required React 19 under normal `npm ci`. Upgrade only when Wix publishes a React-19-compatible peer range or a tested server-only split. |
| `lucide-react` | 0.453.0 | 1.77.0 removes the `Facebook`, `Instagram`, and `Youtube` exports used by the accessible social controls. Upgrade with a reviewed replacement icon source and visual/browser regressions. |
| `typescript` | 6.0.3 | 7.0.2 exports only version metadata from its stable entrypoint; repository source-analysis and type-hygiene tools require the TypeScript compiler API. Upgrade after those tools migrate to TypeScript 7's documented unstable APIs. |
| `@types/node` | 24.19.2 | The application release runtime is Node 24; Node-26 type definitions would permit APIs unavailable in the deployed runtime. Upgrade together with a deliberate Node 26 runtime program. |
| `node-domexception` | transitive | OpenNext's Cloudflare client reaches the deprecated package through `cloudflare -> formdata-node`. It is not an audit finding; remove it only through an upstream dependency update. |

## Safety boundaries

- The Wix worker ceiling remains exactly 14.00 MiB. A size increase is not an acceptable remedy.
- `npm audit fix --force`, `--legacy-peer-deps`, broad lifecycle approval, remote push, PR creation, deployment, and payment-provider calls are prohibited in this program.
- Stripe test fixtures prove request construction and webhook-safe control flow only. A separately authorized staging purchase, signed webhook, and immutable Wix preview remain required before release.

## Command ledger

| Command | Result |
| --- | --- |
| `npm ci` before updates | passed; 3 moderate OpenNext-chain audit findings and a deprecated upstream package warning. |
| `npm run typecheck && npm run test:unit` before updates | passed. |
| `npm run wix:build` before updates | passed at 13.99 MiB / 14.00 MiB, with two dynamic-filesystem trace warnings. |
| `npm run test:unit -- tests/unit/blog-seo.test.ts` before literal-path fix | failed as designed from an empty working directory. |
| `npm run test:unit -- tests/unit/blog-seo.test.ts && npm run test:build` after fix | passed; no dynamic-filesystem trace warning. |
| `npm ci`, `npm audit --json`, `npm install-scripts ls` after upgrades | clean install passed; zero vulnerabilities; no pending lifecycle scripts. |
| Node 24.22.1/npm 11.20.0 clean install and typecheck | passed through a temporary `npx` toolchain, without changing the workstation runtime. |
| `npm run wix:build` after enabling the tested Wrangler minifier | passed; generated the local Wix-compatible entry at 10.12 MiB against the fixed 14.00 MiB budget. |
| `npx --yes --package=node@24.22.1 --package=npm@11.20.0 sh -c 'node --version && npm --version && npm run verify:dependency-uplift'` | passed end-to-end: clean install, zero audit findings, no unreviewed lifecycle scripts, lint/typecheck, 139 unit files / 2,416 tests, 22 integration files / 451 tests, optimized build, Wix dry run at 10.12 MiB, and current Genesis coverage. |

## Repeatable local execution

The repository script executes the full local dependency gate in its safe order: clean install, vulnerability and lifecycle checks, lint, typecheck, unit/integration/optimized-build suites, Wix Worker dry-run, and Genesis verification.

```sh
npx --yes --package=node@24.22.1 --package=npm@11.20.0 sh -c \
  'node --version && npm --version && npm run verify:dependency-uplift'
```

It deliberately contains no publish, GitHub, Wix-release, or payment-provider command. Run it in a clean worktree; it regenerates ignored build outputs only.

## Remaining external gates

1. Run the modified GitHub workflows on an authorized pull request to prove action execution on GitHub-hosted runners.
2. Produce the immutable Wix preview and run its smoke suite; do not infer release success from local dry-run packaging.
3. Run a non-production Stripe card Checkout and signed webhook test with approved staging credentials, confirming the dashboard payment-method configuration remains card-appropriate after the API-version change.
