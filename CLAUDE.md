# SimDream LTD: agent working instructions (CLAUDE.md)

@AGENTS.md

`AGENTS.md` is the source of truth for product rules, invariants and the task contract. This file adds how Claude sessions work in this repo: what to read first, which commands to run, who does what, and which documents to update.

---

## 1. Project and stack

- **Project:** the SimDream LTD website (`simdream.co.il`), a Boeing 737 simulator and flight-training centre in Tel Aviv: eCommerce, smart flight scheduling, subscriptions, a member area (Flight Deck) and an admin dispatch centre.
- **Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, Wix Headless SDK (bookings, services, pricing plans, members), Supabase PostgreSQL (local persistence), Stripe (payments on the local checkout path), deployed through OpenNext on Cloudflare. `proxy.ts` sets the CSP with nonces. Seven languages (`he`, `ar` RTL; `en`, `ru`, `fr`, `es`, `de` LTR) and three interface themes (`AGENTS.md` sections 1 and 5).

## 2. Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Local development server |
| `npm run start:local` | Local production server with the in-memory store (no live Supabase) |
| `npm run build` | Full Next.js build; must compile with 0 errors |
| `npm run test:quick` | Quick checks; required for every change |
| `npm run test:all` | Full suite (Vitest, Playwright, axe); required before a feature is called complete |
| `npm run docs:verify` | Checks `GENESIS.md` against the code (`scripts/check-genesis-coverage.ts`) |
| `npm run docs:genesis:stamp` | Re-stamps the `GENESIS.md` fingerprint after reviewing the diff |
| `npm run wix:smoke` | Wix catalog reconciliation (run after touching the catalog or Wix services) |
| `npm run wix:readiness` | Wix Headless readiness check, read-only |

## 3. Session rules

1. **Read state first.** Every new session starts by reading `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`, before any other action.
2. **Keep docs current.** After any substantive change, update both files in the same change. A document that no longer reflects the code is broken.
3. **Independent verification.** Before marking a task done, run the [`verifier`](.claude/agents/verifier.md) agent. It did not write the code and reports without editing.
4. **Branches, commits and pull requests** follow the task contract in `AGENTS.md` section 0 (Limits). `.claude/hooks/block-main-commit.sh` blocks commits on `main`.
5. **Wix environments** follow `AGENTS.md` section 6.7 (only SimDream-Staging is writable).
6. **Concurrent sessions.** Another session may edit this checkout. Read `git status` and file timestamps before writing, and never revert what you did not write.

## 4. Docs impact map

If you changed the item on the left, update what is on the right.

| If you changed | Update |
| :--- | :--- |
| Prices, flight packages or mission add-ons | `lib/db/seed-data.ts`, `AGENTS.md` (section 3), `GENESIS.md`, `ARCHITECTURE.md`, `docs/PROJECT_STATE.md` |
| Scheduler, buffer times or the Kantorovich algorithm | `lib/scheduler/`, `KANTOROVICH_SCHEDULER_SPEC.md`, `GENESIS.md`, `ARCHITECTURE.md` |
| A page route or API route | `app/`, `GENESIS.md`, `ARCHITECTURE.md`, `AGENTS.md` (section 2) |
| Wix integration, scheduling adapter or subscription plans | `lib/wix/`, `docs/modules/wix-adapter.md`, `docs/WIX_HEADLESS_ARCHITECTURE.md`, `docs/PROJECT_STATE.md` |
| Environment variables | `.env.example` (the only place they are documented), `GENESIS.md` |
| A design, brand or theme decision | `app/globals.css`, `AGENTS.md` (section 1), `docs/DECISIONS.md` |
| Any new technical or architectural decision | `docs/DECISIONS.md` (decisions table) |
| Anything in the `GENESIS.md` fingerprint surface (listed in `AGENTS.md` section 0, "Done when", and in `scripts/check-genesis-coverage.ts`) | Run `npm run docs:genesis:stamp` after reviewing the diff, then `npm run docs:verify` |

## 5. Session roles

Every session opens with `My role: ...` and works only inside that role's authority. Roles activated for this project: Architect, Core Development and Secondary Development.

1. **Architect.** Holds the whole picture and is the only role responsible for the overall outcome. Owns `docs/`, splits work into small tasks, writes the definition of done for each and decides integration. Does not write core code itself; it delegates it.
2. **Core Development.** Owns the core: scheduler, booking and checkout, Wix adapter, components and business logic. Keeps files under 400 lines and TypeScript strict, and implements to the specification it was given.
3. **Secondary Development (optional).** Works in a separate git worktree (`git worktree add ../<name> -b devel/<topic>`), builds a defined feature or subsystem without disturbing the main session, and hands over finished work for the Architect to integrate.

**Single session.** With one session, write "My role: ..." at the start of a message to switch roles. Planning, splitting work, integration and documentation are done as the Architect. Implementation of core code is done only after switching to Core Development, and never in the same step as the Architect's decisions. Subagents (`researcher`, `tester`, `debugger`, `security`, `verifier`) are used as needed.

## 6. Work cycle

The Architect runs this cycle at every stage (a single session plays the Architect first and routes work to subagents):

1. **Read** `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
2. **Split** the next stage into small, well-defined tasks.
3. **Assign** each task to the right session or agent (`researcher`, `tester`, `debugger`, `security`).
4. **Integrate** the results into the main code, checking for conflicts.
5. **Verify** with the independent [`verifier`](.claude/agents/verifier.md) agent: status, diff and tests.
6. **Document**: update `docs/PROJECT_STATE.md`, add decisions to `docs/DECISIONS.md`, and run `npm run docs:verify`.

Agent files in `.claude/agents/` created mid-session need `/agents` or a restart of Claude Code before they can be called.
