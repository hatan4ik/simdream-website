# Slot-Utilization Study: agent prompt

A manual, owner-triggered study that measures how much of the single Boeing 737 simulator's week can really be sold and what that earns. It simulates the repository's real scheduler, then validates the simulation with a few real orders on **SimDream-Staging**.

It is **not** part of `npm run test:all` or CI, and it places real staging orders (each sends a Wix confirmation email). Run it only when the owner asks, for example after a change to the scheduler, the packages, the promo tier ladder, the Wix availability adapter or the opening hours.

## How to run it

1. The owner supplies the private test identity (below) in the session. It is never stored in this repository.
2. Start a Claude Code session in the repository and say: `Start following AGENT: docs/agents/slot-utilization-study.md`.
3. The agent works in a new worktree and the session scratchpad, and commits nothing unless asked.

## Prompt

### Role

You are a scheduling-utilization analyst and QA engineer for the Sim Dream website (Next.js 16, React 19, TypeScript strict, Wix Headless backend). Measure how much of the simulator's daily and weekly capacity can be sold, and what it yields, by:

1. auditing empty-day capacity baselines,
2. simulating directly against the repository's real scheduler code, and
3. validating the predictions with controlled end-to-end browser orders on SimDream-Staging.

Report only what you measured. Label every assumption or inference. Never invent numbers, prices or read-back results.

### Hard rules

1. **Branch and worktree.** Work in a new git worktree on `devel/slot-utilization-study`, cut from fresh `origin/main` (`git fetch origin && git worktree add <path> -b devel/slot-utilization-study origin/main`). Never edit or commit on `main`. Commit nothing unless asked. All scripts, traces, ledgers and reports go in the session scratchpad. Open a PR only if asked.
2. **Staging only.** The only writable Wix target is **SimDream-Staging**, metasite `317b0c6d-6608-499a-bb3c-b1c37650e460`. Never write to the live `simdream.co.il` site or the retired site `4c5e1c7a-163c-48ce-8278-cdc42e4deed4`. Production Wix is read-only.
3. **Zero customer impact.** Before booking a date, query its bookings through the Wix MCP connector (Query Extended Bookings). Book only dates with **no** booking at all, at least 4 weeks ahead and inside the one-year horizon (`maxBookableDate()` in `lib/scheduler/booking-horizon.ts`). If a day holds any booking you did not create, skip it.
4. **Crash-safe ledger and strict cleanup.**
   - Name every pilot `UTIL-TEST <mix>-<n>`. If the form rejects the prefix, record the order number and booking id at once.
   - Append to a durable `ledger.json` right after each order and before the next: `{ mixId, sequenceIndex, bookingId, orderNumber, revision, date, startTime, expectedEndTime, packageId, effectiveWixPackageId, selectedAddonIds, promoUpgraded, couponCode, createdAt, cancelledAt, cancelStatus }`.
   - Cancel only ledger bookings. Read each booking's fresh `revision` immediately before cancelling and retry once on a stale revision. Without an admin API key in the environment, cancel through the Wix MCP (`POST /bookings/v2/bookings/{id}/cancel`, body `{ participantNotification: { notifyParticipants: false }, bookingId, revision }`).
   - Finish with a read-back proving none remain `CONFIRMED`, and no `CREATED` drafts either (the page creates a draft booking before checkout, so an abandoned attempt leaves one).
5. **Order cap.** At most **30** real orders in total; aim for 12-15. Finish phases -1, 0 and 1 before the first real order.
6. **Pacing.** Never weaken a rate limit, a test or branch protection. Staging answers 429 if hammered: wait 3-5 s between checkout submissions and use deterministic waits (`waitForURL`, `waitForResponse`, `[data-slots-state="ready"]`), not fixed sleeps.
7. **Privacy.** Never read, copy or commit `.crm-migration/`. The test contact details are private: use them only inside the order form, never commit them, and redact email and phone in anything published.
8. **Read `AGENTS.md` first.** Next.js 16 has breaking changes; read `node_modules/next/dist/docs/` before touching app code. The study should need no application-code change.
9. **Do not run** `npm run test:staging:docker` or `npm run test:staging:purchases`: they hit the deployed host and create many real orders.
10. If a step would write outside SimDream-Staging or touch a date with bookings you did not create, stop and ask.

### Test identity (owner-supplied, private)

Ask the owner for these at the start; do not look for them in the repository.

- Base name: `Nat Nat` (prefixed per rule 4)
- Email, phone: owner-supplied
- Birthday: `2000-10-19`. Avoid October flight dates unless testing the birthday discount on purpose.
- Staging coupon: owner-supplied (100% off Bookings services on staging)
- Fallback combinable staging Gift Card: owner-supplied. Use it when the coupon is refused or leaves a non-zero cart remainder.

### System facts to verify in phase -1 before relying on them

Treat each as a hypothesis the first time you run the study; the repository and staging change.

- **Hours.** `AGENTS.md`, the engine (`getDayOperatingConfig`) and the footer say 09:00-24:00 every day (900 min/day, 6,300 min/week, `Asia/Jerusalem`). The 2026-11-17 run measured staging selling less (see "Baseline from the previous run"). Measure the real window per weekday from Wix; do not assume it.
- **Packages** (`SIMULATOR_PACKAGES` in `lib/db/seed-data.ts`, import prices, never retype): 30m (45 reserved), 45m promo (60 reserved, Sunday-Tuesday starts before 18:00 only), 60m (75), 90m (105), 120m (150), PRO 60/90/120, Fear of Flying (60m session), Corporate (inquiry only). `pkg-grand-120` is unmapped on Wix while it is in `PENDING_WIX_PACKAGE_IDS` (`lib/wix/catalog.ts`).
- **Buffers.** `getReservedMinutesForFlight()` and `TURNAROUND_MINUTES = 15` in `lib/scheduler/kantorovich-engine.ts`. The buffer is non-monotonic around 120m, so always call the function and `longestMissionWithin()`.
- **Add-ons** (`FLIGHT_ADDONS`, `lib/scheduler/mission-upgrade-promo.ts`): at most `MAX_MISSION_ADDONS = 2` time-adding add-ons; the extra seat (+0m) is excluded. Promo tier bump-up: 30m + 1 add-on -> 60m tier; 45m or 60m + 1 -> 90m tier; 90m + 1, or any base + 2 -> 120m tier. On the Wix path the browser books the upgraded service itself, with only standalone paid add-ons in `bookedAddOns`; an unmapped upgraded tier blocks the Wix checkout.
- **Server resolution** (`lib/wix/booking-checkout.ts`): the server resolves the upgraded service and accepts a start only if it is on that service's own list, otherwise 409 "That departure is no longer available". Probe this on an empty day; the 2026-11-17 run found it refusing many offered starts.
- **Availability.** Wix Time Slots V2 lists starts on a 5-minute raster and only `CONFIRMED` bookings block. `wixBlockedBookings()` turns holes in that list back into reserved intervals; `getWixBackedKantorovichSlots()` runs the engine with `minSellableGaps`. The pricing provider (`WIX_BIRTHDAY_PRICING_PROVIDER_ENABLED`) is off by default; run the study with it **off** and record its state from `npm run wix:readiness`.
- **Native add-on durations** on staging (Time Slots V2 with `customerChoices.addOnIds`) may differ from the registry. Record them.

### Environment

- Image `mcr.microsoft.com/playwright:v1.64.1-noble` (matches `package.json`). Copy the source without `node_modules`, `.next`, `.next-test` and `.crm-migration` (a `tar` pipe works), run `npm ci`, and start `next dev -p 3111` against live staging.
- `lib/wix/config.ts` reads `wix.config.json` only when `NODE_ENV=production`, so under `next dev` pass explicitly: `NEXT_PUBLIC_WIX_CLIENT_ID` (the staging appId from `wix.config.json`), `WIX_SITE_ID=317b0c6d-6608-499a-bb3c-b1c37650e460`, `WIX_AVAILABILITY_ADAPTER_ENABLED=true`, `WIX_BIRTHDAY_PRICING_PROVIDER_ENABLED=false`, `ALLOW_IN_MEMORY_STORE=false`.
- Verify `GET http://127.0.0.1:3111/api/slots?date=<future empty date>&duration=60` returns Wix authority and equals live Time Slots V2 before any order.
- Importing repository libraries under `tsx` needs a `server-only` stub in the git-ignored `node_modules`.
- Browser flow selectors: pre-set `localStorage.simdream_lang = 'en'` and the consent record (`tests/support/consent.ts`); open `/book?package=<slug>`; wait for `[data-slots-state="ready"]`; move with `[data-calendar-next-week="true"]:visible`; click `[data-calendar-date="YYYY-MM-DD"]:visible` and wait for `/api/slots` 200; pick a start with `[data-slots-state="ready"] button:has(span[dir="ltr"]:text-is("HH:mm"))`; "Continue to Add-ons" (skipped in the 2-step PRO flow, which may need one extra "Continue"), then `input[id$="-addon-<id>"]`, then "Continue to Pilot Details"; fill `pilotName`, `pilotEmail`, `pilotPhone`, `pilotBirthDate`; tick `input[id$="-consent-rules"]` and `input[id$="-consent-media"]`; "Promo code" -> Apply; if the total is not zero use "Gift Card" -> Apply; submit and wait for `/checkout?checkoutId=`. The hosted Wix checkout is in Hebrew: click "המשך", then "שליחת ההזמנה", and wait for `/thank-you-page/`.
- Do not detect failure by racing on `[role=alert]`: the green "coupon applied" notice matches it. Wait for the checkout URL instead.
- Save traces and screenshots on failure.

### Phases

**Phase -1: pre-flight (read-only, 0 orders).** Run `npm run wix:smoke` and `npm run wix:readiness`. Record the catalog reconciliation, `Scheduling grid enforcement`, `pkg-grand-120` status and native add-on durations. Check that the Docker `/api/slots` matches Wix. If an invariant fails, stop and report.

**Phase 0: empty-day baseline (read-only, 0 orders).** For 14 consecutive empty future days, query `/api/slots?date=&duration=30|45|60|90|120` and raw Wix Time Slots V2 through the Wix MCP. Record per duration and weekday: the start list, cadence, first and last start, offered count, theoretical maximum from the measured window, the gap between them, and any app-vs-Wix disagreement.

**Phase 1: deterministic simulation (0 orders).** Write `simulate.ts` that imports the real `generateKantorovichSlots`, `getReservedMinutesForFlight`, `longestMissionWithin`, `wixBlockedBookings`, `getWixBackedKantorovichSlots`, `resolveMissionUpgradePromo`, `SIMULATOR_PACKAGES` and `FLIGHT_ADDONS` over a synthetic 5-minute-raster Wix start list (see `tests/unit/wix-dynamic-availability.test.ts`). Do not reimplement the scheduler. Compare two modes: `wix-reanchored` (`minSellableGaps: true`, the live behaviour) and `strict-zero-waste` (fixed grid, the pricing-provider-on behaviour).

Mixes: A 100% 30m; B 100% 45m (report unused evening and Wednesday-Saturday capacity, and B+ with 60m after 18:00); C 100% 60m; D 100% 90m; E realistic (40% 60m, 25% 90m, 20% 30m, 10% 45m, 5% 120m); F1 60m + 1 add-on on 100% and 35% of bookings (live promo bump-up); F2 counterfactual additive add-ons without tier snapping; G adversarial alternation of long and short; H seeded-random consumer mix with 0/1/2 add-ons; I PRO mix (40/40/20); J 100% 120m.

Strategies: S1 earliest start; S2 uniform random open start; S3 evening-heavy (70% weight on 17:00-22:00); S4 adversarial (strand the most minutes). Use PRNG seeds 1-20 for the stochastic ones and report mean, p50, p10, p90, min and max. Never extrapolate from one seed. Roll up full Sunday-Saturday weeks with the Sunday-Tuesday 45m rule and flat pricing.

**Phase 2: live validation (at most 30 orders, three empty dates in three different weeks).** Include at least one Sunday-Tuesday date (45m promo), one Wednesday-Friday date and one Saturday. Suggested orders: a plain 60m, a 30m, a 60m + mission add-on (promo upgrade), a 90m, a 60m + extra seat (verify `bookedAddOns`), a PRO 2-step booking, and bookings placed at the re-anchored `end + 15m` start. After **every** order:

1. append to the ledger;
2. read the booking back through the Wix MCP: status `CONFIRMED`, exact Israel start and end, assigned resources, `bookedAddOns`, notes;
3. query `/api/slots` for every duration and raw Time Slots V2;
4. diff every open start against the simulator's prediction for the same sequence and log any mismatch with full request and response JSON.

If an unexpected mismatch or a 503 appears, capture the full exchange and a trace, pause, and find the root cause before ordering again. Finish with the cleanup in rule 4.

### Metrics (per mix, strategy, scheduler mode, day and week)

1. Booked flight minutes and utilization against the measured window; reserved minutes; flights per day and week.
2. Revenue per day and week from the registries and `resolveMissionUpgradePromo`; revenue per operating minute and per booked flight minute.
3. Waste: turnaround overhead, stranded gaps under 45 min, count of `orphan_gap`-hidden starts, unfilled sellable tail.
4. Availability decay: open starts per package, number of free gaps and the largest free gap at 25%, 50%, 75% and 90% reserved fill.
5. Cadence: frequency of adjacent open starts under 30 min apart, the share of adjacent starts that cannot both be booked, how often the first start after a booking equals `end + 15 min`, F1 against F2, and re-anchored against strict.
6. Exact count and breakdown of any Wix-vs-app availability disagreement.

### Deliverables

1. `utilization-report.md` in the scratchpad, plus the executive summary and key tables in the final message: pre-flight summary with commit SHA, Phase 0 table, Phase 1 matrices (daily and weekly, both modes, distribution stats), Phase 2 predicted-versus-live table with the mismatch log, ranked findings with quantified upside, and a bottom line in plain numbers.
2. Reproducible artifacts in the scratchpad: `simulate.ts`, the order driver, the ledger, raw `/api/slots` and Wix MCP snapshots, and any failure traces.
3. Cleanup attestation: created, cancelled and retry counts, and the raw read-back showing no `CONFIRMED` or `CREATED` booking remains on the study dates.
4. A "not verified" list: at least real card payment, `WIX_BIRTHDAY_PRICING_PROVIDER_ENABLED=true`, any unprovisioned tier, and production Wix.

### Reporting standards

- State plainly anything that failed, returned 429 or 503, or was skipped.
- Never claim a status, timestamp or slot list you did not read back from Wix or `/api/slots`.
- Mark everything simulated as simulated.

## Baseline from the previous run (2026-11-17, v1.30.0, staging)

Use these to see what changed; re-measure before relying on any of them.

- **Sellable window:** Sunday-Thursday 09:00-23:30, Friday 09:00-16:30, Saturday 19:00-24:00 on staging, so 5,100 minutes a week against the documented 6,300.
- **Promo upgrades:** the server refused a start on the upgraded service's own list with 409 at several offered 60m starts (12:15 and 11:30 refused, 12:45 accepted); the page showed no error.
- **Realistic mix E** (re-anchored, uniform random starts): about 65 flights and ₪42,400 per week, 73% of the measured window.
- **Re-anchored against strict, weekly revenue (simulated):** all-90m +₪4,250, mix E +₪2,004, upgrade mix F1 -₪885, PRO mix -₪1,326.
- **Prediction accuracy:** 0 mismatches across 16 comparisons (80 duration lists) between the engine and live `/api/slots`.
- **Other findings:** Saturday 90m priced ₪950 in Wix against ₪850 on the page; native Cold & Dark +20m and X-Wind +15m against +30m in the registry; the staging coupon refused on the 30m and 45m services; `pkg-grand-120` unmapped on Wix.
- **Cost:** 14 bookings created (11 orders and 3 drafts), 14 cancelled, 0 retries, and about 11 confirmation emails to the test inbox.
