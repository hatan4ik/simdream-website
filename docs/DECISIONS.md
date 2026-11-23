# Decisions

The project's memory between agent sessions. Every new session reads this file together with `docs/PROJECT_STATE.md`. Record a decision here the moment it is made, and append unfinished work to Open items. Keep entries short, dated and true: when an item is resolved, move it to Settled with the PR or commit; when a rule turns out wrong, delete it.

Standing product and architecture rules (pricing, scheduling, i18n, Wix read-only production, telemetry in LTR) live in `AGENTS.md`; this table records dated decisions and why they were taken.

## Decisions table

Dates come from the merge date of the cited PR. "Not recorded" means the repo does not say what was rejected.

| Date | Decision | Why | Rejected |
| :--- | :--- | :--- | :--- |
| 2026-11-23 | Adopt a structured agent working environment: `CLAUDE.md` (session roles, work cycle, Docs impact map), `docs/PROJECT_STATE.md`, this file, and agents in `.claude/agents/` (`verifier`, `researcher`, `tester`, `debugger`, `security`). | Prevent contradictions between sessions and duplicate decisions, and make sure changes are checked by an agent that did not write them. | Ad-hoc sessions with no roles and no independent verification. |
| 2026-11-23 | Rename `docs/decisions.md` to `docs/DECISIONS.md` and merge the guidelines' table into it. | The guidelines name the file in upper case; macOS is case-insensitive, so keeping both names would collide. | Replacing the file with the table only (would lose the working rules). |
| 2026-11-22 | Split the `ARCHITECTURE.md` diagrams into a readable overview layer and a detailed engineering layer (#299). | Earlier diagrams had Mermaid parse errors and were too dense to read quickly. | Not recorded. |
| 2026-11-18 | Promotional tier upgrades switch the booking to the upgraded duration's schedule grid (Option A, #279). | A customer upgrading from 60 to 90 minutes could hit a Wix 409 at checkout because the slot did not fit the target grid (#276). | Not recorded. |
| 2026-11-18 | Judge the 15% birthday discount on the upgraded tier; the bare Discounted Promotion shows a highlighted notice instead (#281, #284). | A 45-minute promotion upgraded with add-ons becomes a 90 or 120-minute booking and is judged as that tier. | Not recorded. |
| 2026-11-17 | Flat all-day price for the 90-minute flight (850 ILS), alongside the tier bump-up ladder and the 120m pack at 1,200 ILS (#271); Saturday pricing and grid parity fixed in #276. | Flat tariffs with no evening or weekend surcharge (`AGENTS.md` section 4). | Not recorded. |

## Working rules learned the hard way

- **Branches.** Cut `devel/<topic>` from a freshly fetched `origin/main`, finish with a PR, never work on `main` (other teams use it). `.claude/settings.json` blocks committing on `main` and pushing to it.
- **Test target.** Probe the new app on the staging Wix headless host `https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com`, never on `www.simdream.co.il` (still the old Editor site, where `/book`, `/pro` and `/experiences` return 404). Name the host in every finding.
- **Go slowly against Wix.** Wix and Cloudflare answer HTTP 429 after a few hundred requests a minute; send requests one at a time, and discard any run that shows 429s. On tablet profiles use real `tap()` calls followed by `waitForURL` (Next client navigation never fires `load`). Never grep page bodies for "not found": Next embeds its not-found template in every page.
- **Concurrent sessions.** Another agent may edit or auto-commit in this checkout and replace `.next-test`. Before blaming code, check `ls .next-test/BUILD_ID`, `git status` and `uptime`; run `npm run typecheck` before `npm run test:build`; never revert another session's in-progress files.
- **Playwright port trap.** `webServer` has `reuseExistingServer: !CI`, so a stale `next-server` on `PW_PORT` (default 3100) silently serves an old build. Check `lsof -nP -iTCP:3100 -sTCP:LISTEN` and run with a free `PW_PORT`.
- **Release pipeline.**
  - A release PR that fails `No successful main Verify run attests parent <sha>` is a race: wait for main's Verify, then `gh run rerun <run id> --failed`.
  - CodeQL and "Clean merge with base" on a Release Please PR park in `action_required`; approve them with `gh api --method POST repos/hatan4ik/simdream-website/actions/runs/<id>/approve`. Production approval is never allowed.
  - A merge of main into a PR branch made on GitHub leaves the Genesis fingerprint stale: re-check the `GENESIS.md` hunk, then `npm run docs:genesis:stamp`.
  - Runs with zero jobs and `startup_failure` mean a GitHub incident: check githubstatus.com before touching workflows.
  - Branch protection has `enforce_admins: true` and 14 required checks. Never weaken it.
- **Visual baselines without Docker.** Refresh Linux baselines from the failing CI shard's artifact (`gh run download <run> -n results-web-quality-shard-N`, copy `*-actual.png` to `<name>-visual-linux.png`) after the diff image shows only the intended change; darwin ones with a local `.next-test` build and `--update-snapshots=changed`. Any `/pro` change needs the four `pro-{brand,cockpit}-{en,he}-visual-linux.png` refreshed.
- **Wix benefit pools.** The `add-items-to-benefit` endpoint answers an empty 403 for both the API key and the Wix connector, so linking a plan to a service is dashboard-only. The dashboard's "connect plan to service" creates a new PUNCH_CARD pool every time, which is what multiplied sessions.

## Settled

- 2026-11-23: `AGENTS.md` got a task contract, a file map and a pointer to this log (section 0); the Google reviews bar and Wix adapter detail moved verbatim to `docs/modules/`. `.claude/settings.json` denies `.env` reads and edits, force-pushes and pushes to `main`, and `.claude/hooks/block-main-commit.sh` blocks `git commit` on `main` (harness audit 6/10 to 9/10).
- 2026-11-23: the agent working environment was set up (see the decisions table).
- 2026-11-22: `ARCHITECTURE.md` Mermaid diagrams fixed and split into two layers (#299).
- 2026-11-22: dependency uplift merged (#300); CodeQL `init` and `analyze` pinned to one release and grouped in Dependabot (#293); the multi-add-on E2E helper requires a day where both the 60m and the 120m grids have open slots (#292).
- 2026-11-22: Wix staging has six pool definitions, one per plan; Flight Foundations 5 x 60 is linked to "Captain's Command Flight (60m)" in the Wix dashboard.
- 2026-11-18: Option A grid switching for promotional tier upgrades (#279).

## Open

- `@wix/pricing-plans` 1.0.451 pushes the Wix worker bundle to 14.01 of 14.00 MiB (the budget is never raised). Dependabot PR #298 was closed; either trim about 30 KB from the worker (`docs/modules/wix-bundle-diet.md`) and reopen it, or stay on the current version.
- Dependabot security alert #4 (`minimatch`, medium; fixed in 11.0.1) has no PR yet.
- Production Wix: PRO plans and benefit-pool links need an explicit instruction from the owner and a dashboard step; check read-only for duplicate pools first.
- `pkg-grand-120` is not provisioned in Wix (`PENDING_WIX_PACKAGE_IDS`).
- Stale text: `docs/WIX_BIRTHDAY_PRICING_PROVIDER.md` near line 184 and the `reconcileCatalog` comment.
- No repo guard yet flags more than one benefit pool per plan.
- `docs/agents/slot-utilization-study.md` predates the two-add-on tier upgrade finding (a 60m slot can have a large window but no 120m departure; the app disables the add-on on purpose).
