# Rules-Based Tiled Interval Booking & Calendar Scheduler

> **Implementation status:** current source of truth for the scheduling and checkout behavior in this repository. The historical “Kantorovich Linear Programming” name remains in some file and component names for compatibility. The production implementation is **not** a linear-programming solver and must not be presented as one.

## Purpose and boundaries

The scheduling system protects a single simulator's operating hours, prevents overlapping reservations, and rejects candidate starts that create unusable time fragments. It has three separate responsibilities:

1. `lib/scheduler/kantorovich-engine.ts` generates bookable slots and daily-efficiency diagnostics.
2. `lib/scheduler/mission-calculator.ts` is the canonical calculation for an order's flight duration, add-on duration, end time, and price.
3. `lib/scheduler/tiled-interval-optimizer.ts` is an **admin-only, read-only** exact allocator for a small batch of draft requests. It does not create, move, or cancel bookings.

Live checkout remains deterministic and database-backed; it does not call the draft optimizer.

## Booking invariants

### Reservation capacity

The engine reserves more than the customer's flight time so the simulator has preparation and turnaround capacity. Use `getReservedMinutesForFlight()` as the authoritative mapping; do not reconstruct it in a UI or integration.

| Flight duration | Reserved capacity |
| --- | ---: |
| 20 min entry flight | 45 min |
| 45 min daytime promo | 60 min |
| 60 min session | 75 min |
| 90 min session | 105 min |
| 120 min PRO session | 150 min |
| 240 min corporate workshop | 255 min |

The public retail catalog currently exposes 20, 45, 60, 90, and 120 minute package durations. The slots API retains 30-minute support for legacy/internal scheduling compatibility; it is not a current retail package.

### Operating windows

| Day | Operating window | Capacity |
| --- | --- | ---: |
| Sunday–Thursday | 10:00–23:00 | 780 min |
| Friday | 09:00–16:00 | 420 min |
| Saturday | 19:00–24:00 | 300 min |

The engine generates candidate starts from these operating windows, calculates each candidate's reserved end, then rejects a candidate when it collides with a non-cancelled booking, closes after the operating window, violates the daytime-only 45-minute promo rule, or leaves a non-tileable gap.

### Gap tiling and availability

`canTileIntervalZeroWaste()` uses dynamic programming over the permitted reserved durations. A candidate is available only when the free interval before and after it can be tiled with valid durations for that time of day.

- Daytime allows 45, 60, 75, 105, and 150 minute reserved blocks.
- Prime time and Saturday exclude the 60-minute daytime-promo block.
- Existing bookings are immutable during slot generation; cancelled bookings do not consume capacity.
- The API reports unavailable slots and their reason for operational diagnostics. Customer UI should emphasize bookable choices, not internal optimization jargon.

The engine may mark a slot as a smart recommendation where it completes a 150-minute constructor pattern. This is a recommendation, not a promise of globally optimal revenue.

## Pricing and mission calculation

The package and add-on registries live in `lib/db/seed-data.ts`. The checkout request sends identifiers only; the server resolves the package, selected slot, and add-ons from its own registry.

`calculateMissionManifest()` is the shared calculation for storefront summaries, wizard summaries, server checkout, and the boarding pass:

```text
totalFlightMinutes = packageFlightMinutes + sum(addonFlightMinutes)
endTime            = startTime + totalFlightMinutes
subtotal           = serverSelectedBasePrice + sum(addonPrices)
total              = subtotal - boundedVoucherDiscount
```

Time-extending add-ons are accepted only when the resulting flight duration fits the continuous availability window before the next reservation or facility closing time. Recreational add-ons are intentionally suppressed for PRO training and Fear of Flying packages.

## Checkout and payment lifecycle

1. The browser submits a validated booking command to `POST /api/checkout`.
2. The server revalidates the date, package, add-ons, capacity, mission manifest, voucher, and optional verified member identity.
3. A fully funded voucher confirms the booking immediately. Card checkout creates a pending booking and a Stripe Checkout Session.
4. Only the signed Stripe webhook marks a card booking paid and confirmed. Returning to `/book/success` does not confirm a payment by itself.
5. If `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` is absent or invalid, card checkout returns HTTP 503 with an actionable inline error next to the storefront checkout button. This is intentional fail-closed behavior; no pending card booking or redirect is created.

Guest checkout is always permitted. When a customer is authenticated, a booking is associated with the member only if the checkout email exactly matches the member's confirmed identity-provider email. A later verified sign-in can claim matching **paid** guest bookings; no anonymous email lookup is exposed.

## Member purchase history and receipts

The member bootstrap route creates the profile and attaches eligible historical guest purchases. `/dashboard` then separates future sessions from historical bookings and exposes a protected Stripe payment-receipt lookup for paid card bookings.

The payment-receipt link is not a statutory tax invoice. A formal invoice requires an invoicing-system integration.

## Admin draft allocator

`POST /api/admin/schedule-optimization` is a protected, non-mutating preview. It accepts at most eight requests with up to four 15-minute-aligned candidate starts each.

The allocator exhaustively evaluates compatible combinations, ranks them by declared value, and accepts a recommendation only when it does not increase the baseline orphan capacity. Its response contains recommendations, unallocated request IDs, and audit metadata such as explored schedules. It never writes to the database.

This narrow boundary is suitable for replacing or complementing with a dedicated operations-research service later (for example, an OR-Tools CP-SAT integration). Such an integration must remain a draft/review workflow until its write semantics, observability, and concurrency behavior are explicitly designed.

## Data integrity controls

- The production schema has a booking exclusion constraint over the reserved interval, so overlapping non-cancelled reservations are rejected even if two checkout requests race.
- The checkout service recalculates all server-owned price and duration fields; client-submitted totals are ignored.
- `maxAvailableMinutes` prevents time-extending add-ons from exceeding the actual free window.
- The booking confirmation page obtains a deliberately narrow public projection using a high-entropy booking reference; member history and Stripe receipt APIs require authenticated ownership.

## Verification

Run the repository's checks after changing scheduling or checkout behavior:

```bash
npm run lint
npm test
npm run build
npm audit --audit-level=high
```

The tests cover manifest calculation, reservation capacity, server-owned checkout request shape, member ownership rules, and the exact draft allocator's non-overlap/orphan-capacity constraints.
