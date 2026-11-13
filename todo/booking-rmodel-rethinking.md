# Booking Model Rethinking

Collaborative architecture & R&D log for rethinking SimDream's booking, add-ons, multi-service cart, and promotional/birthday pricing integration with Wix Headless.

---

## Team Antigravity

_Date: 2026-11-12 · Target Baseline: `origin/main` (`SimDream-Staging`, Wix `siteId: 317b0c6d-6608-499a-bb3c-b1c37650e460`, `appId: e03e8493-b29e-4681-9a76-30685ff52096`)_

### 1. Root Cause of the Live Booking Blocker

When `WIX_AVAILABILITY_ADAPTER_ENABLED=true` is enabled in the deployment environment, `/api/slots` returns `wixBookingsAuthoritative: true`. Two client guards then prevent add-ons and route requests:

1. **Instant Add-On Toggle Blocker (before Checkout)**:
   In [`components/booking/hooks/use-addon-controls.ts`](../components/booking/hooks/use-addon-controls.ts), calling `toggleAddon()` delegates to `resolveAddonToggle()` in [`lib/booking/client/addon-selection.ts`](../lib/booking/client/addon-selection.ts), which immediately returns `{ kind: 'wix-authority-required' }` whenever `wixBookingsAuthoritative && !isWixSubscriptionRedemption` and surfaces `t.booking.wixBookingAuthorityRequired`:
   > `"This live calendar is protected by Wix Bookings. Complete the base flight in Wix checkout; add-ons and route requests return after they are mapped to Wix."`
2. **Checkout Mode Gate**:
   In [`lib/booking/client/checkout-mode.ts`](../lib/booking/client/checkout-mode.ts), `resolveCheckoutMode()` sets:
   ```ts
   const canUseWixNativeCheckout =
     !inputs.isWixSubscriptionRedemption &&
     inputs.wixBookingsAuthoritative &&
     inputs.wixBookingFrontendActive &&
     inputs.selectedAddonCount === 0 &&
     !inputs.hasRequestedRoute;
   ```
   Whenever `selectedAddonCount > 0 || hasRequestedRoute`, `requiresUnsupportedLocalCheckout` becomes `true`, blocking Wix checkout, while [`app/api/checkout/route.ts`](../app/api/checkout/route.ts) also rejects local Supabase/Stripe booking creation with HTTP `409` so competing calendars cannot double-book the physical simulator.
   *(Note: Deep-linking a World Trio route via `?route=<id>` also auto-selects its `routeAddonId` in [`components/booking/hooks/use-booking-selection.ts`](../components/booking/hooks/use-booking-selection.ts), tripping both `selectedAddonCount > 0` and `hasRequestedRoute`.)*

---

### 2. Current Frontend ↔ Wix Backend Integration Inventory

| Domain | Next.js Codebase | Wix Headless (`SimDream-Staging`) Status | Gap / Missing Piece |
| :--- | :--- | :--- | :--- |
| **9 Flight Packages** | [`lib/wix/catalog.ts`](../lib/wix/catalog.ts), [`lib/wix/backend-blueprint.ts`](../lib/wix/backend-blueprint.ts) | **9 / 9** Wix Bookings appointment services mapped 1:1 sharing 1 Boeing 737 resource pool (`30, 45, 60, 90, 120m`) | Complete for base packages (45m Sun–Tue `<18:00` & 1-yr booking horizon rules enforced cleanly) |
| **Calendar / Availability** | [`lib/wix/availability-adapter.ts`](../lib/wix/availability-adapter.ts), `/api/slots` | Intersects duration-aware Kantorovich zero-waste grid with `POST /_api/service-availability/v2/time-slots` | Queries **base service duration only**; does not pass `customerChoices.addOnIds` |
| **11 Flight Add-ons** | [`lib/db/seed-data.ts`](../lib/db/seed-data.ts) (`10` duration-extending `+15m..+40m`, `1` qty-based `addon-extra-seat` `+0m` ₪90) | **0 / 11** mapped in Wix | No Wix Bookings Add-ons (`/addons/v1/add-ons`) or Add-on Groups provisioned; `bookedAddOns` not sent in `CreateBooking` |
| **Free Route Requests** (`?route=`) | `activeRequestedRoute` in `use-booking-selection.ts` (`0₪`, `+0m`, `>= 60m` packages) | **Blocked** (`hasRequestedRoute` triggers error) | Does **not** need a Wix SKU; only needs to pass through into `formSubmission` / Cart `note` |
| **Cart & Service List** | [`lib/wix/booking-checkout-client.ts`](../lib/wix/booking-checkout-client.ts) | Ad-hoc single-item `POST /ecom/v2/carts` for 1 `bookingId` (`appId: 13d21c63-b5ec-5912-8397-c3a5ddb27a97`) | **No persistent multi-item Cart** (`add-line-items` / `CurrentCart`), no header/drawer Cart UI, cannot mix multiple flights / Gift Cards |
| **Gift Cards** | [`lib/wix/gift-cards.ts`](../lib/wix/gift-cards.ts) | Product `07209324-1536-4ca3-aad2-d8782d04398a`, 17 denomination UUIDs (`50..1590` ILS), Cart V2 checkout | Separate checkout path (`POST /api/checkout`); staging parity gated on the 7 signature preset variants |
| **Pricing Plans** | [`lib/wix/plans.ts`](../lib/wix/plans.ts), `/api/subscriptions/checkout` | **4 / 4** consumer tracks provisioned + `/book?subscription=wix` member redemption | **2 PRO tracks** (`pro-interview-3x90`, `pro-interview-5x60`) not yet created in staging ([`docs/WIX_HEADLESS_CUTOVER_RUNBOOK.md`](../docs/WIX_HEADLESS_CUTOVER_RUNBOOK.md)) |
| **15% Birthday Discount** | [`components/booking/hooks/use-booking-birthday.ts`](../components/booking/hooks/use-booking-birthday.ts), `/api/offers/capabilities` | Appends birthday day/month into Cart `note` only; `/api/offers/capabilities` returns `birthdayDiscountEnforceable: false` | Anonymous visitor token cannot verify DOB server-side against payment total or mint coupons |
| **Payment Gateway** | Wix-hosted checkout redirect | Not yet connected in `SimDream-Staging` | **PayPlus provider** must be connected & verified in Wix Staging (`WIX_HEADLESS_CUTOVER_RUNBOOK.md`) |

---

### 3. Add-Ons & Multi-Service Cart Architecture

#### Critical Scheduling Physics Constraint
Our 11 add-ons in [`lib/db/seed-data.ts`](../lib/db/seed-data.ts) divide into three distinct operational behaviors:
1. **Duration-Extending Mission Add-ons (10 items)**: `addon-cold-dark` (`+20m`, ₪200), `addon-xwind-ifr` (`+15m`, ₪250), `addon-extreme-airports` (`+25m`, ₪450), and the 7 Continental World Trios (`+40m`, ₪450 each).
   - **Why Wix Stores products CANNOT be used for these**: Adding a Stores line item alongside a booking in Cart V2 collects payment, **but does not extend `booking.bookedEntity.slot.endDate`** on the Boeing 737 calendar—causing overlapping double-bookings during the extra 15–40 minutes.
2. **Quantity-Only Cockpit Add-on (`addon-extra-seat`, `+0m`, ₪90)**: Charges per jumpseat guest without extending flight time.
3. **Zero-Surcharge Route Preferences (`?route=<id>`, `0₪`, `+0m`, requires `>= 60m`)**: Briefing preference only; requires no Wix catalog SKU.

#### Native Wix Bookings Add-Ons Fit & API Constraints
Wix Bookings provides native duration- and quantity-based add-ons (`POST /addons/v1/add-ons`) organized into Add-on Groups (`ListAddOnGroupsByServiceId`, readable publicly with `SCOPE.DC-BOOKINGS.READ-BOOKINGS-PUBLIC`):
- **API Limits**: Max **3 Add-on Groups per service** and max **7 add-ons per group** (`21` total per booking).
- **SimDream Group Mapping (11/11 fit cleanly)** on the 4 recreational services (`pkg-discovery-30`, `pkg-promo-45`, `pkg-captain-60`, `pkg-ultimate-90`; keep PRO & Fear of Flying at **0 groups** so noise-free isolation stays enforced in Wix itself):
  - **Group 1 — Cockpit & Weather** (`durationInMinutes`): `Cold & Dark (+20m, ₪200)`, `X-Wind / IFR (+15m, ₪250)`, `Extreme World Airports Trio (+25m, ₪450)` *(3 / 7 slots)*
  - **Group 2 — Continental World Trios** (`durationInMinutes`): the remaining 7 `+40m` World Trios (`₪450` each) *(7 / 7 slots)*
  - **Group 3 — Jumpseat Passengers** (`maxQuantity`): `Extra Cockpit Jumpseat Passenger (₪90, maxQuantity: 2)` *(1 / 7 slots)*
- **Verified Availability & Booking Flow**:
  - `ListAvailabilityTimeSlots` (`POST /_api/service-availability/v2/time-slots`) accepts `customerChoices: { addOnIds: [...] }` and calculates resource availability for `baseDuration + sum(addOn.durationInMinutes)`.
  - `CreateBooking` (`POST /_api/bookings-service/v2/bookings`) accepts `bookedAddOns: [{ id, groupId, quantity? }]`. Adding the resulting `bookingId` as 1 `catalogItem` in `ecom/v2/carts` automatically prices base + add-ons and reserves the full extended calendar interval.

#### Path 1 — Easiest Working Path (Recommended Incremental Launch)
1. **Unblock `requestedRouteId` immediately** in `checkout-mode.ts` by removing `!hasRequestedRoute` from `canUseWixNativeCheckout` and persisting route selection in `formSubmission` / Cart `note`.
2. **Provision the 11 Add-ons + 3 Add-on Groups** across recreational services (`scripts/wix-provision.ts` + `WIX_ADDON_IDS` mapping in `lib/wix/catalog.ts`).
3. **Wire Duration-Aware Availability & `bookedAddOns`**:
   - Pass `addonIds` into `/api/slots` → `listWixAvailability()` (`customerChoices: { addOnIds }`), intersected with our Kantorovich continuous-window capacity check.
   - Pass extended `endDate` and `bookedAddOns` in `booking-checkout-client.ts`.
4. **In-Page Service List + Optional Multi-Item Cart**:
   - Keep `AmazonFlightStorefront` buy-box / `OrderSummary` synced with `Cart V2 Calculate Cart` as the itemized service list.
   - Persist `cartId` in `sessionStorage` and expose a compact Cart Drawer calling `POST /ecom/v2/carts/{cartId}/add-line-items` (`SCOPE.ECOM.WRITE-CARTS-V2`, visitor-permitted for `catalogItems`) so buyers can combine a Flight + Gift Card or multiple sessions into one checkout.

#### Path 2 — Advanced Engineering Path (Full Multi-Service Bag + Server BFF)
1. **Site-Wide Persistent Cart Drawer (`ecom/v2/current-cart` + `addLineItems`)**: Global nav Cart badge + drawer supporting multiple independent bookings, Gift Cards, and future Stores merchandise (`215238eb-22a5-4c36-9e7b-e7c08025e04e`) in one transaction.
2. **Multi-Item Pending-Slot Collision Guard**: Because unpaid bookings (`status: CREATED`) do not block Wix calendar inventory before payment, `/api/slots` must locally subtract any pending booking intervals already sitting in the user's active Cart V2 when scheduling a second flight on the same day.
3. **Trusted Server BFF (`WIX_ADMIN_API_KEY` or Headless `client_credentials` in Worker secrets)**: Enables Cart V2 `customItems` (`SCOPE.ECOM.MANAGE-ADMIN`), live `RescheduleBooking (allowAddOnChanges: true)` inside the drawer, and atomic post-checkout webhook reconciliation.

---

### 4. 15% Birthday Discount Architecture Decision

| Option | Mechanism | Security & Accounting Assessment | Effort | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **A. Duplicate "15% Off" Services / Variants** | Create `-Bday` service SKUs priced at `-15%` | **Rejected**: Any anonymous client calling `CreateBooking` can reserve the discounted `serviceId` without DOB validation; duplicates 4+ services & 11×4 add-on mappings; breaks clean calendar analytics | Medium-High | **Do Not Use** |
| **B. Wix Gift Card Service (`gift-cards/v1`)** | Dynamically issue a 15% Gift Card | **Rejected**: Gift cards are stored-value liabilities (fixed shekel ledger), not percentage promotional discounts, and collide with customer Gift Card redemption | High | **Do Not Use** |
| **C. Static Promo Coupon (`BDAY15`)** | Dashboard coupon (`scope: bookings`, `percentOffRate: 15`) | **Weak Control**: Wix Coupons supports neither DOB nor flight-date validation (`limitPerCustomer` cannot enforce birthday month). Code leaks quickly unless manual/CRM-gated | Very Low | **Manual MVP Only** |
| **D. Server-Minted Single-Use `bookings` Coupon (JIT BFF)** | Server verifies DOB & flight date, mints 15-min `usageLimit: 1` coupon via Admin API, browser applies to Cart V2 | **Recommended**: Enforces age `10–110`, `recreational` only, flight within birthday month/+14 days, no voucher stacking, and verifies live booking `startDate` & `serviceId` from Wix so dates cannot be spoofed | Low-Medium (~150 LoC) | **✅ Best Pragmatic Path** |
| **E. Wix Bookings Pricing SPI (Service Plugin)** | Custom app implements `CalculatePrice` with `additionalFields` (DOB) | **Cleanest Long-Term UX**: Sets discounted booking price natively without consuming the 1-coupon-per-cart limit | High (Wix App + SPI hosting/approval) | **Future Consideration** |

#### Recommended JIT Single-Use Coupon Flow (Option D)
1. Hold `WIX_ADMIN_API_KEY` (or Headless `client_credentials` secret with `SCOPE.DC-COUPONS.MANAGE-COUPONS`) strictly in server/Worker secrets—never `NEXT_PUBLIC_*`.
2. On checkout submit (when no manual voucher or gift card is applied), browser posts `{ bookingId, packageId, pilotBirthDate }` to `POST /api/wix/bookings/birthday-coupon`.
3. Server fetches the booking's authoritative `startDate` and `serviceId` from Wix, runs `resolveBookingBirthday()` (`lib/discounts/birthday`), and—if eligible—calls `POST https://www.wixapis.com/stores/v2/coupons` with:
   - `code`: unguessable single-use token (e.g., `BDAY-<random>`)
   - `percentOffRate: 15`
   - `usageLimit: 1`
   - `expirationTime`: `Date.now() + 15 * 60 * 1000`
   - `scope: { namespace: 'bookings', group: { name: 'service', entityId: wixServiceId } }` *(note: Wix forces `limitedToOneItem: true` on `bookings` coupons)*
4. Browser applies the returned code to Cart V2 (`add-coupon` + `calculate`), and Hosted Checkout charges the exact `-15%` amount.
5. **Mandatory Staging Check Before Enabling (`birthdayDiscountEnforceable = true`)**: Confirm in `SimDream-Staging` whether a `bookings`-scoped `percentOffRate: 15` coupon discounts `base + bookedAddOns` or base service price alone inside Wix Checkout, and align the client preview in `use-booking-birthday.ts` accordingly.

---

### 5. Recommended Execution Sequence *(Superseded by §6 Board Outcome below)*

1. **Quick Win**: Unblock `requestedRouteId` (`?route=...`) in `checkout-mode.ts` + pass route metadata in `formSubmission` / Cart `note`.
2. **Sprint 1 (Add-ons & Extended Availability)**: Provision 11 native Bookings Add-ons across 3 Groups (`scripts/wix-provision.ts`), pass `customerChoices.addOnIds` in `availability-adapter.ts`, pass `bookedAddOns` in `booking-checkout-client.ts`, and lift the add-on UI block in `addon-selection.ts` / `checkout-mode.ts`.
3. **Sprint 2 (Cart V2 + Birthday Coupon + Staging Launch Readiness)**: Add `POST /api/wix/bookings/birthday-coupon`, add optional persistent Cart V2 `add-line-items` drawer, create the 2 missing PRO Pricing Plans (`3×90`, `5×60`), and wire **PayPlus** in `SimDream-Staging` so `npm run wix:readiness` + E2E test checkouts pass cleanly.

---

### 6. Engineering Board Review & Unified Outcome *(2026-11-12)*

Having reviewed all inputs from **Team Antigravity**, **Team Codex**, and **Team Claude** against the codebase (`origin/main` `123dd01`), here is Team Antigravity's board synthesis and the agreed **Right Engineering Approach**.

#### A. Unanimous Cross-Team Consensus
1. **The blocker is an intentional safety guard**: `wixBookingAuthorityRequired` + server `HTTP 409` prevent dual-calendar double-booking of the single Boeing 737 simulator. Never bypass Wix into local Supabase/Stripe checkout while `WIX_AVAILABILITY_ADAPTER_ENABLED=true`.
2. **Native Wix Bookings Add-ons win cleanly**: Provision all 11 add-ons into 3 Wix Add-on Groups (`3 + 7 + 1`) on the **4 recreational services only** (`pkg-discovery-30`, `pkg-promo-45`, `pkg-captain-60`, `pkg-ultimate-90`), leaving PRO and Fear-of-Flying services at **0 groups** so Wix itself enforces the noise-free rule. Reject Wix Stores products (no calendar duration extension), per-combination services (exponential explosion), and custom Cart V2 items.
3. **Wix Cart V2 `calculate` is the sole price authority**: Keep one booking per cart (`13d21c63-b5ec-5912-8397-c3a5ddb27a97`) for this release and display Wix's calculated total before checkout redirect. Defer the multi-service "Mission Bag" until single-flight native add-ons pass E2E staging.
4. **Server-minted single-use `bookings` coupon for Birthday (-15%)**: Reject duplicate discounted services, static codes (`BDAY15`), Gift Cards as promos, and Bookings Pricing SPI for v1.

#### B. Critical Board Corrections Adopted from Team Codex & Team Claude
1. **Flip Delivery Order — Gates & PayPlus Move to Phase 0** *(self-correction on Antigravity §5)*: PayPlus in `SimDream-Staging`, catalog price drift (`pkg-pro-60` 890 vs 950; `pkg-pro-90` 1250 vs 1285; `pkg-ultimate-90` evening 950 vs 850), and the 2 missing PRO Pricing Plans block end-to-end verification of *everything* else. Zero blockers in `npm run wix:readiness` must precede add-on implementation.
2. **Do Not Rely on `formSubmission` Arbitrary Keys or Cart `note` Alone for `?route=`** *(self-correction on Antigravity §3/§5)*: Unmapped keys in `formSubmission` fail `CreateBooking` cleanly. Provision an explicit allow-listed Wix Booking form field (e.g., `requested_route_id`), validate `>= 60m` + allow-list server-side, display `"Captain confirmation required"`, and treat Cart `note` strictly as human-readable summary.
3. **UI Honesty & Functional Dispatch**: Until native add-ons pass parity, do not render clickable add-on cards/combos that only fail at click/submit, and wire `/contact` (`app/(public)/contact/page.tsx`) to deliver real inquiries instead of a 600ms client timer.
4. **App-Level Validation + Read-Back Parity Gate**: Enforce rules Wix groups cannot express (e.g., max 1 World Trio across Groups 1–2) in app + server registries, make `addon-extra-seat` `maxQuantity` an explicit owner decision, and require `npm run wix:readiness` to verify live Wix add-on prices, durations, groups, and limits before lifting the frontend guard.
5. **Hardened Birthday Security & Governance**: Keep guest checkout open without the discount; require **Wix Member sign-in or verified email OTP** plus rate limiting and webhook/benefit ledger tracking to claim the birthday coupon; match coupon expiry to the unpaid booking hold (not a shorter 15-minute window); use deterministic/idempotent issuance keyed by `bookingId`; and store a single least-privilege `SCOPE.DC-COUPONS.MANAGE-COUPONS` credential via `wix env set` under an explicit owner exception to `AGENTS.md §6.7` backed by client-bundle leak tests.

#### C. The Right Engineering Approach — Phased Delivery Blueprint

1. **Phase 0 — Owner Decisions & Readiness Gates**
   - Owner settles: authoritative PRO 60/90 prices, evening 90m Wix tariff handling, `addon-extra-seat` `maxQuantity`, and the server-only coupon credential exception (`AGENTS.md §6.7`).
   - Connect & test **PayPlus** in `SimDream-Staging`; fix catalog drift & create the 2 PRO Pricing Plans until `npm run wix:readiness` passes with `0` blockers.
2. **Phase 1 — 1-Day Staging Spike (Settle Unknowns Before Coding)**
   - Prove visitor token permissions for listing add-on groups, `customerChoices.addOnIds`, and `bookedAddOns`.
   - Measure Wix buffer behavior (`timeBetweenSessions` vs SimDream's `+15m` Kantorovich block) when base + add-ons push a flight to `80m`/`120m`+, and confirm shekel pricing units + Cart V2 itemized breakdown + `get-checkout-url` vs redirect session.
   - Verify whether `bookings` percentage coupons discount `base + bookedAddOns` or base only, when `usageLimit` is consumed (cart add vs checkout vs paid order), `limitPerCustomer` on guests, and custom `requested_route_id` form field visibility in Staff Bookings.
3. **Phase 2 — Immediate UX Relief**
   - Surface honest pre-selection state in Wix-authoritative mode until native add-ons go live (no submit-time traps), and wire `/contact` Dispatch form to real server submission.
4. **Phase 3 — Native Wix Add-ons & Structured Route Requests**
   - Provision the 3 Add-on Groups (11 items) on the 4 recreational services + `requested_route_id` booking form field in `SimDream-Staging`.
   - Maintain a canonical registry (`localAddonId -> wixAddOnId -> groupId -> eligibleServiceIds`) with read-back parity checks inside `wix:readiness`.
   - Update `lib/wix/availability-adapter.ts` + `lib/wix/booking-checkout.ts` to query with `customerChoices.addOnIds`, pass `bookedAddOns` + extended slot bounds in `booking-checkout-client.ts`, verify displayed price against Cart V2 `calculate`, and then remove the client guards in `addon-selection.ts` and `checkout-mode.ts`.
5. **Phase 4 — Identity-Verified Server Birthday Coupon**
   - Implement `POST /api/wix/bookings/birthday-coupon` behind member session or email OTP + bot/rate checks: fetch authoritative `startDate` & `serviceId` from Wix Booking, run `evaluateBirthdayDiscount()`, mint idempotent single-use service-scoped coupon matching cart hold TTL, apply via Cart V2 `add-coupon` + `calculate`, and reconcile redemptions/expirations via webhooks.
6. **Phase 5 — Future Expansion (Deferred by Board Consensus)**
   - Persistent multi-item "Mission Bag" (`add-line-items`, combining multiple bookings + Gift Cards + Stores items) only after Phases 0–4 pass staging E2E and explicit policies exist for unpaid `CREATED` slot holds, cross-tab double bookings, and per-item refunds.

---

### 7. Lead Engineering Execution Plan, Team Assignments & Pre-Issue Gates *(2026-11-12)*

#### Master Execution Plan (`Why`, `What`, `Team`, `Outcome`)

| Phase | What (Workstream & Scope) | Why (Root Problem & Dependency) | Lead & Assigned Teams | Concrete Outcome / Exit Gate |
| :--- | :--- | :--- | :--- | :--- |
| **0. Commercial & Payment Gates** | 1. Reconcile **PRO 60** (`890` vs `950`) & **PRO 90** (`1,250` vs `1,285`) + decide **90m evening/Sat (`950` vs `850`)** tariff.<br>2. Provision/wire **2 missing PRO Pricing Plans** (`3×90`, `5×60`).<br>3. Connect & verify **PayPlus** in `SimDream-Staging`.<br>4. Confirm `addon-extra-seat` `maxQuantity` & server-coupon-key amendment (`AGENTS.md §6.7`). | Nothing can complete E2E in Wix Staging without PayPlus; `wix:readiness` currently fails on `catalog-drift` and `unresolved-subscription-plans` (`#119`, `#125`, `#140`, `#141`, `#144`). | **Lead:** Owner<br>**Support:** Team Claude (verification probes), Team Codex (catalog & plan specs) | `npm run wix:smoke` and `npm run wix:readiness` report **0 blockers**; a controlled base test flight completes paid checkout via PayPlus in Staging. |
| **1. Quick UX Relief & Real Dispatch** | 1. In Wix-authoritative mode, clearly mark/disable add-on cards & combos upfront instead of trapping users at click/submit.<br>2. Replace the simulated `600ms` timer in `app/(public)/contact/page.tsx` with a real server delivery endpoint. | Add-ons appear purchasable until clicked, deep links (`?route=`, `?addons=`) & combos fail only at submit, and every "contact Dispatch" fallback silently drops leads. | **Lead:** Team Antigravity (UI state & 6-lang copy)<br>**Backend:** Team Codex (Dispatch API route)<br>**QA:** Team Claude | Zero surprise submit traps in Wix mode; Playwright confirms Dispatch submits reach a real recipient; zero broken 6-language strings. |
| **2. 1-Day Staging Spike (De-Risk Unknowns)** | Test in `SimDream-Staging` only:<br>• Visitor permissions on Add-on Groups, `customerChoices.addOnIds`, `bookedAddOns`.<br>• Wix `timeBetweenSessions` vs `+15m` Kantorovich buffer on `80m`/`120m` totals & Sun–Tue 45m promo.<br>• Shekel price units, `Cart V2` breakdown, `get-checkout-url` vs redirect session.<br>• Unpaid `CREATED` booking hold length.<br>• Route custom field (`requested_route_id`) visibility to staff.<br>• Coupon scope (`base` vs `base+addOns`), `usageLimit`, `limitPerCustomer`, & persistence store choice (`#139`). | Eliminates the 12 `UNKNOWN` items before coding; `getWixBackedKantorovichSlots` currently runs with `[]` local bookings (`maxAvailableMinutes = 885`) and base durations only. | **Lead:** Team Claude<br>**Support:** Team Codex (API contracts), Owner (dashboard checks / staging writes approval) | Signed spike report settling all 12 unknowns + exact Wix payload shapes, buffer timings, and hold TTL; go/no-go sign-off for Phase 3. |
| **3. Structured Route Requests (`?route=`)** | 1. Add allow-listed Booking form field (`requested_route_id`) on `>= 60m` recreational services.<br>2. Enforce `>= 60m` & route-registry allow-list server-side (`lib/wix/booking-checkout.ts`); write human summary to `add_your_message`.<br>3. Display `"Captain confirmation required"` in 6 languages pre-checkout & in staff view.<br>4. Unblock `hasRequestedRoute` only after verification. | Passing unmapped keys in `formSubmission` rejects `CreateBooking`, and Cart `note` alone is unstructured and unverified for staff. | **Lead:** Team Codex (server contract & validation)<br>**UI & Provisioning:** Team Antigravity (`wix-provision` / 6-lang UI)<br>**QA:** Team Claude | Unknown route IDs or `< 60m` route selections fail `400` server-side; valid `>= 60m` route bookings complete in Staging and show `requested_route_id` to staff. |
| **4. Native Wix Add-Ons & Single-Mission Checkout** | 1. Provision **3 Add-on Groups (11 items)** on the **4 recreational services only** (`3` cockpit modules, `7` trios, `1` quantity seat); keep PRO & Fear-of-Flying at **0 groups**.<br>2. Build canonical mapping (`localAddonId -> wixAddOnId -> groupId -> eligibleServiceIds`) + read-back parity check in `scripts/wix-readiness.ts`.<br>3. Wire `customerChoices.addOnIds` in `lib/wix/availability-adapter.ts` & `lib/wix/booking-checkout.ts` (strictly Wix slot truth, no browser `endDate` math) + cross-group validator (max 1 Trio total).<br>4. Pass `bookedAddOns` in `booking-checkout-client.ts`; show exact Wix Cart `calculate` total before redirect.<br>5. Remove `addon-selection.ts` & `checkout-mode.ts` blockers. | Native add-ons are the only mechanism that reserves extra Boeing 737 time *and* calculates unified price without creating 8,192 bundle SKUs; parity gates prevent silent price/time drift. | **Lead:** Team Antigravity (provisioning script, checkout client & `/book` UX)<br>**Backend & Rules:** Team Codex (registry, cross-group/server guard, adapter)<br>**QA:** Team Claude (`wix:readiness` parity + E2E lifecycle) | Visitors book recreational flights with duration + quantity add-ons in one Cart V2 checkout; Wix calendar blocks full extended time; PRO/FoF remain noise-free; E2E Staging checkout & staff calendar pass. |
| **5. Hardened Birthday Discount (-15%)** | 1. Amend `AGENTS.md §6.7` + add server-only coupon key (`SCOPE.DC-COUPONS.MANAGE-COUPONS`) via `wix env set` + CI bundle-leak check.<br>2. Build `POST /api/wix/bookings/birthday-coupon`: read `startDate` & `serviceId` from Wix Booking (never trust client date), run `evaluateBirthdayDiscount()`, mint idempotent keyed-hash single-use coupon matching booking hold TTL.<br>3. Apply chosen identity gate (Wix Member or email OTP + rate limits/bot check) & webhook/benefit ledger (`#139`), plus `add-coupon` + `calculate` UI preview. | Wix Cart controls checkout pricing, so client discounts fail. Single-use service-scoped server coupons enforce terms (`recreational` only, no stacking) without duplicating SKUs. Guest checkout without benefit stays open. | **Lead:** Team Codex (issuer endpoint, idempotency, rate limit, webhook ledger)<br>**UI & Client:** Team Antigravity (`use-booking-birthday.ts`, Cart coupon apply)<br>**Security & QA:** Team Claude (bundle-leak test & Staging coupon abuse tests) | Eligible birthdays receive exact `-15%` in Wix Cart `calculate`; repeat requests return same coupon; expired/abandoned/stacked attempts fail safely; secret proven absent from client bundles. |
| **6. Deferred: Multi-Service "Mission Bag"** | *(Separate future RFC — excluded from Phases 0–5)* Multi-booking + Gift Card + Merch persistent Cart drawer with unpaid `CREATED` hold cleanup, cross-tab concurrency guard, and per-item refund rules. | Combining multiple independent unpaid bookings and heterogeneous catalog apps before single-mission PayPlus is proven creates double-booking & refund/expiration race conditions. | **Design Owner:** Team Codex + Team Antigravity (after Phase 5) | Separate approved architecture RFC opened only after Phases 0–4 pass staging acceptance. |

#### Team Leadership & Assignment Matrix

| Role / Team | Primary Ownership | Specific Deliverables | Review / Sign-off Authority |
| :--- | :--- | :--- | :--- |
| **Engineering Lead (Coordination)** | Architecture integrity, dependency gating, GitHub issue sequencing, PR merge order | Keeps Phase gates enforced (no guard removed before parity & E2E pass); prevents parallel file collisions | Final go/no-go per phase gate |
| **Team Antigravity** | **Frontend Booking UX, Wix Checkout Client, Provisioning & i18n** | Pre-cutover UI state, `scripts/wix-provision.ts`, `booking-checkout-client.ts` (`bookedAddOns`, Cart `calculate` price match), `/book` & Storefront hooks, 6-language copy, Playwright UX/a11y suites | Reviews UI/UX & client checkout PRs |
| **Team Codex** | **Server Integrity Gates, Registry Contracts, Dispatch & Coupon Issuer** | API contracts (`/api/slots`, `/api/checkout`, `/api/contact`), `local -> wix` add-on & route registries, cross-group rule enforcement, `birthday-coupon` issuer, webhook/benefit ledger | Reviews backend contracts, data parity & security gates |
| **Team Claude** | **Staging Spike, Verification Tooling, Security Audits & Cutover QA** | 12-item Phase 2 Staging Spike execution, `wix:readiness` / `wix:smoke` parity checks, bundle-leak secret test, PayPlus & E2E Staging reconciliation sign-off | Independent blocker/acceptance sign-off before lifting guards |
| **Owner (Business & Wix Admin)** | **Commercial Truth, PayPlus & Dashboard Credentials** | Resolves 6 open decisions below, connects PayPlus in `SimDream-Staging`, provisions/approves Staging dashboard objects & secrets (`wix env set`) | Approves prices, limits, secrets exception, and release cutover |

#### Pre-Issue Owner Decisions Needed Before Creating GitHub Issues
*(Linked to existing tracker `#119`, `#124`, `#125`, `#126`, `#139`, `#140`, `#141`, `#144`)*
1. **PRO Pricing Authority**: PRO 60 (`₪890` Wix vs `₪950` code) and PRO 90 (`₪1,250` Wix vs `₪1,285` code).
2. **90m Evening / Saturday Tariff**: Keep `₪950` prime-time pricing (modeled in Wix) vs standardizing on `₪850`.
3. **Extra Jumpseat Max Quantity**: Cap `addon-extra-seat` (`₪90`) at `1` or `2`.
4. **PayPlus & Staging Spike Approval**: Owner/timeline for PayPlus in `SimDream-Staging` and Staging-only writes approval.
5. **Birthday Credential Exception (`AGENTS.md §6.7`)**: Approve least-privilege server-only `SCOPE.DC-COUPONS.MANAGE-COUPONS` key via `wix env set` + CI bundle-leak check.
6. **Birthday Identity Timing**: Require Member auth / Email OTP + Benefit Ledger (`#139` store) on Day 1 of Phase 5 *(Antigravity + Codex)*, or ship booking-bound coupon + rate limits first and OTP/ledger second *(Claude)*.

---

## Team Codex

**Owner section:** Team Codex  
**Status:** Proposed architecture and implementation gates  
**Scope:** Wix Bookings authority, native add-ons, route intent, Cart V2, and birthday discounts.

_Restored verbatim after a concurrent overwrite of this file on 2026-11-12. Original text as written by Team Codex._

### Decision

The message below is an intentional safety guard, not an incidental frontend error:

> This live calendar is protected by Wix Bookings. Complete the base flight in Wix checkout; add-ons and route requests return after they are mapped to Wix.

When Wix availability is authoritative, the existing frontend permits Wix checkout only for a base flight with no add-ons and no requested route. Falling back to the legacy local checkout for richer selections would create two competing reservation writers and can double-sell simulator time.

The correct direction is to make Wix Bookings the authority for the complete recreational flight mission:

```text
Choose base package
  -> Choose native Wix Booking add-ons
  -> Wix returns availability for the selected add-ons
  -> Create one Wix Booking with bookedAddOns
  -> Add that booking to one Wix Cart
  -> Wix Cart calculates the authoritative total
  -> Wix hosted checkout / PayPlus
  -> Wix order and booking confirmation
```

Do **not** model duration-extending add-ons as independent Wix Stores products or arbitrary Cart V2 line items. They could charge the customer without extending the simulator reservation. Native Wix Bookings add-ons carry both the commercial price and the scheduling duration.

### Verified current state

| Area | Current state | Gap |
| --- | --- | --- |
| Base packages | 9 local packages map one-to-one to Wix Bookings services | Catalog price parity must be restored before expansion. |
| Availability | Wix availability limits the local Kantorovich grid | Current request contains base service duration only. |
| Checkout | Browser creates a visitor-owned Wix booking, then a Cart V2 containing one booking item | No native add-ons or route-intent mapping. |
| Add-ons | 11 local add-ons: 10 duration-based and one quantity-based Jumpseat | No Wix add-on IDs, groups, runtime mapping, or parity check. |
| Route requests | Local flow validates a known `requestedRouteId`, requires 60+ minutes, costs ₪0, and says captain confirmation is required | Wix-native checkout currently blocks it. |
| Gift cards and coupons | Native Wix Cart code application already exists for a simple booking | Birthday eligibility cannot be enforced by the browser. |
| Pricing plans | Consumer tracks exist; two PRO tracks need Wix Staging confirmation/provisioning | Do not claim subscription checkout is ready until live-read readiness passes. |
| Payment | Wix hosted checkout is the intended payment handoff | PayPlus must be configured and tested in Wix Staging. |

### Non-negotiable implementation rules

1. The browser submits only local IDs. Server-side code resolves package, add-on, Wix service, Wix add-on, group, price, duration, and eligibility from registries.
2. Availability must be requested and revalidated with the selected native Wix add-ons. Do not calculate an extended end time in the browser and submit it as truth.
3. The booking must include Wix `bookedAddOns`; the Cart contains the resulting booking as one Wix Bookings catalog item.
4. Wix Cart `calculate` is the only displayed/charged checkout total for the Wix path.
5. PRO and Fear-of-Flying services retain zero add-on groups and their noise-free booking flows.
6. Guest checkout remains available. A personalized benefit may require verified identity; guest checkout itself must never require membership.
7. No Wix management secret, API key, PayPlus credential, or client secret enters the browser or repository.

### Native add-on model

Provision native add-ons only for the four recreational services first: 30, 45, 60, and 90 minutes.

| Local category | Native Wix type | Product rule |
| --- | --- | --- |
| Cold & Dark, Crosswind/IFR, Extreme Airports, World Trios | Duration add-on | Wix availability and booking duration must include the add-on. |
| Extra Cockpit Jumpseat | Quantity add-on | Business owner must explicitly choose its maximum quantity; do not infer `1` or `2`. |
| On-request World Trio | No paid add-on | Store as a controlled booking-form value; captain confirms the mission plan. |

Wix permits three add-on groups per service and seven add-ons per group. Eleven add-ons fit, but a business rule such as “only one World Trio in total” is **not** enforceable solely through two different Wix groups. It requires application/server validation as well as clear UI feedback.

Maintain one registry mapping:

```text
local addon ID
  -> Wix add-on ID
  -> Wix add-on group ID
  -> eligible Wix service IDs
```

The mapping must be read back from Wix and validated by `wix:readiness`; missing, mismatched price, mismatched duration, invalid group membership, or an unexpected selection limit must block cutover.

### Route-request correction

An on-request route does not require a paid Wix SKU. It does require a structured and staff-visible Wix record.

Do not simply remove the frontend guard and append arbitrary data to a cart note. A Cart note is supplemental and is not the operational source of truth. Configure a Wix Booking form field with a known target such as `requested_route_id`; send only an allow-listed route ID, retain the 60-minute minimum server-side, and display “Captain confirmation required” before payment and in staff-facing booking details.

Existing generic notes may be used as a temporary human-readable summary, but not as the authoritative field.

### Birthday discount decision

Do **not** apply a frontend-only 15% reduction and do not duplicate discounted Booking services. Either approach can make the frontend promise a total that Wix checkout does not accept.

Recommended pragmatic design:

1. Guest checkout remains available without a birthday benefit.
2. Birthday benefit requires member login or a verified email/OTP.
3. A server-side Birthday Benefit Issuer verifies birthday, eligibility window, service category, booking date, prior redemption, and rate limits.
4. The server creates or retrieves a short-lived, single-use Wix Bookings coupon scoped to eligible services.
5. The browser applies the code to the visitor-owned Wix Cart.
6. Wix Cart calculation returns the only customer-facing total.
7. Order/webhook reconciliation records redeemed, expired, cancelled, and refunded benefits in the benefit ledger.

A single-use coupon is not automatically identity-bound. Before enabling it, test in Wix Staging whether the tenant enforces intended service scope, expiry, one use, per-customer behavior, and whether it discounts the base booking only or base booking plus native add-ons. Do not describe the birthday feature as fully secure until that proof exists.

Wix Bookings Custom Pricing is a later alternative if deeply personalized pricing is required. It needs a Wix app/service plugin and is not the first implementation choice.

### Delivery order

1. Reconcile Wix Staging service prices with the repository source of truth and resolve all readiness blockers.
2. Confirm/provision the two missing PRO Pricing Plans in Wix Staging.
3. Configure the controlled Wix booking-form field for route intent.
4. Provision the 11 native recreational add-ons and their groups in Wix Staging.
5. Add the local-to-Wix add-on/group mapping and a read-only parity/readiness test.
6. Update availability and final slot revalidation to use native Wix add-on selections.
7. Create Wix bookings with `bookedAddOns`; preserve the existing one-booking/one-cart checkout model.
8. Remove the Wix add-on and structured route-request blockers only after parity passes.
9. Configure PayPlus in Wix Staging and run end-to-end payment/booking reconciliation tests.
10. Implement the server-issued birthday coupon only after the base/add-on Wix path is proven.

### Deferred advanced work

Do not combine this first delivery with a persistent multi-service “Mission Bag” containing multiple appointments, gift cards, subscriptions, and merchandise. That feature needs explicit policies and tests for:

- unpaid `CREATED` booking expiration and cleanup;
- duplicate/double booking across tabs and devices;
- cart ownership and restoration after browser storage loss;
- editing or removing add-ons from an already-created booking;
- cancellation/refund behavior for each item type;
- staff calendar, order, and member-history reconciliation.

Implement it as a separate design after the single-flight native Booking add-on flow has passed staging acceptance.

### Acceptance criteria

- A customer can buy a recreational base flight with one duration add-on and sees a Wix-calculated itemized total.
- The Wix calendar reserves the full native duration and refuses overlapping availability.
- A customer can buy the quantity add-on only within its explicit configured limit.
- PRO and Fear-of-Flying flows expose no Wix or local add-ons.
- A 60+ minute route request is visible to staff as a structured value and clearly says captain confirmation is required.
- Invalid route IDs, invalid group selections, stale slots, and price/mapping drift fail safely with actionable customer feedback.
- Guest checkout works without account creation.
- Birthday discount eligibility and actual Wix-cart discount behavior are proven in Staging before the benefit is advertised.
- `npm run wix:readiness`, checkout integration tests, and end-to-end staging smoke tests pass before release.

### Engineering Board outcome — Team Codex

**Inputs reviewed:** Team Antigravity's incremental native-add-on proposal, Team Claude's evidence-led staging-risk review, and the Team Codex architecture above.

**Board decision:** select **C2 — Native Wix Booking Add-ons inside one booking and one Wix Cart**. This is the only approach that simultaneously keeps one calendar authority, reserves duration-extending mission time, gives Wix a truthful commercial total, and avoids a combinatorial service catalogue.

The selected architecture is:

```text
SimDream UI submits local IDs only
  -> server validates registry, category, duration and selection rules
  -> Wix add-on-aware availability and final slot revalidation
  -> visitor creates one booking with bookedAddOns
  -> visitor creates one Cart V2 line for that booking
  -> Wix calculates the total and hosts payment
  -> Wix confirms order/booking; server consumes a narrow event projection
```

The server is an **integrity gate**, not a second scheduler, price calculator, payment processor, or reservation writer. In Wix-authoritative mode, local checkout remains blocked for any selection Wix cannot represent.

#### Board consensus

| Subject | Board conclusion |
| --- | --- |
| Current customer error | Correct safety guard, but poor UX. Until native mapping is live, add-ons and route requests must be visibly unavailable in Wix mode before a customer clicks them. |
| Duration add-ons | Native Wix Bookings add-ons only. No Wix Stores products, custom cart lines, duplicate discounted services, or separate sequential bookings for duration-bearing missions. |
| Route requests | Controlled, allow-listed Wix Booking form value; never Cart note alone. It stays zero-price, requires 60+ minutes, and carries captain-confirmation copy. |
| Add-on groups | Three groups fit the catalogue, but cross-group rules such as one World Trio total require server/UI validation. |
| Price authority | Wix Cart calculation is authoritative for Wix checkout. The frontend may preview only a value returned by Wix. |
| Birthday benefit | Server-issued, short-lived, single-use Wix coupon after verified identity and an explicit server-side management credential decision. It remains off until staging proves scope, redemption, expiry, and add-on behavior. |
| Payments | PayPlus configuration and a successful Staging checkout are release gates, not a post-implementation task. |
| Mission Bag | Deferred. Multiple independent bookings, gift cards, subscriptions, and merchandise in one bag are a separate product and concurrency design. |

#### Rejected approaches

1. **Local checkout fallback while Wix owns availability:** creates competing reservation writers.
2. **Wix Stores products for time add-ons:** charges money without extending booking capacity.
3. **Service variants or prebuilt bundle services:** cannot express the combination set without catalogue explosion.
4. **Custom-priced Cart items from the visitor browser:** violates price authority and does not reserve time.
5. **Duplicate birthday-discounted services:** hiding a service is not authorization and doubles operational maintenance.
6. **Gift Card as a percentage birthday discount:** creates stored-value liability instead of a scoped discount.
7. **Persistent multi-service Mission Bag in this delivery:** adds unpaid-booking, cancellation, and cross-item reconciliation risks before the single mission flow is proven.

#### Eight-gate engineering approach

This supersedes the earlier Team Codex delivery order only by moving payment readiness and the staging spike to the front.

1. **Commercial truth gate:** reconcile all Wix service prices, including PRO 60/90 and the 90-minute evening/Saturday tariff; resolve missing PRO plans; `wix:readiness` must have no catalog or plan blockers.
2. **Payment gate:** configure PayPlus on SimDream-Staging and complete a controlled test checkout before accepting any checkout feature as done.
3. **Scheduling spike:** use non-production test data to prove native add-on availability reserves `base + add-on minutes + required turnaround` without violating the duration-aware Kantorovich cadence or shared Boeing resource.
4. **Catalog-provisioning gate:** create the 11 Wix add-ons and three groups for recreational services only; record IDs through read-back, not hand-entered assumptions.
5. **Parity gate:** implement local-to-Wix add-on/group mapping plus `wix:readiness` checks for price, duration, group membership, quantity policy, and service eligibility.
6. **Route-intent gate:** configure and test the staff-visible Booking form field, submit only registry-valid route IDs, and prove captain-confirmation messaging across six languages.
7. **Native mission checkout gate:** add add-on-aware availability, final revalidation, `bookedAddOns`, Wix Cart calculation, hosted checkout, cancellation/abandonment handling, and staff-calendar/order verification.
8. **Birthday-benefit gate:** only after the first seven gates pass and the owner approves the server-side credential/trust boundary; prove coupon behavior, abuse controls, idempotency, and post-payment reconciliation before enabling the UI benefit.

#### Explicit owner decisions still required

- Confirm the business source of truth for the PRO 60/90 prices and the 90-minute evening/Saturday tariff.
- Set the maximum purchasable Extra Jumpseat quantity.
- Approve Staging writes for the spike: native add-ons, groups, a test route form field, test booking/cart, and test coupon.
- Approve or reject a least-privilege server-only Wix coupon-management identity. It must be isolated in server-side secrets, never exposed to the browser or committed to Git.

#### Board release rule

No add-on or route-request guard may be removed merely because a UI is present. It is removed only when the corresponding Wix entity is provisioned, mapping parity passes, the full booking/payment lifecycle passes in Staging, and the staff can see the same structured mission information the customer bought.

### Primary sources

- [Wix single-service booking flow](https://dev.wix.com/docs/api-reference/business-solutions/bookings/flow-single-service-booking)
- [Wix Bookings add-ons](https://dev.wix.com/docs/api-reference/business-solutions/bookings/services/add-ons/introduction)
- [Wix Create Booking API](https://dev.wix.com/docs/api-reference/business-solutions/bookings/bookings/bookings-writer-v2/create-booking)
- [Wix Add-on Groups](https://dev.wix.com/docs/api-reference/business-solutions/bookings/services/services-v2/about-add-on-groups)
- [Wix Coupons functionality](https://dev.wix.com/docs/api-reference/business-solutions/coupons/coupons/functionality)
- [Wix Create Coupon API](https://dev.wix.com/docs/api-reference/business-solutions/coupons/coupons/create-a-coupon)

---

## Team Claude

**Status:** research complete, no code written, staging spike not yet run.
**Date:** 2026-11-12. **Code reference:** `origin/main` at `123dd01` (release 1.21.0). Line numbers drift; file names do not.
**Method:** three read-only research passes. (1) A code and docs audit with a read-only check of the live Wix address (`GET` only) and the read-only probes `npm run wix:smoke` and `npm run wix:readiness`. (2) Wix documentation research on carts and add-ons. (3) Wix documentation research on discounts. Every Wix claim below carries a documentation link and one of three labels: **VERIFIED** (read on the page), **INFERRED** (reasoned from verified facts), **UNKNOWN** (needs the staging spike).

### 1. Summary

*The engineering board outcome for all three teams is in section 11.*

- The error is a deliberate guard, not a bug. It is raised when Wix Bookings is the calendar writer and the visitor has an add-on or an on-request route selected. A Wix service has one fixed duration, so add-on minutes cannot extend a Wix booking, and the local checkout would sell the same simulator time.
- Wix Bookings has **native add-ons** for appointment services, with a price and optional extra minutes. All 11 of our add-ons fit. This removes the need for a service per combination (8,192 package and add-on-set combinations) and for Stores products (which cannot add minutes).
- Our own server **cannot** charge 15% less on the Wix path, because Wix computes the price at checkout. The proper birthday design is a single-use Wix coupon created by our server and applied by the browser. It needs one admin credential, which the project rule currently forbids, so it needs an explicit owner exception.
- Before anyone builds: a payment provider must be connected, two PRO prices have drifted in Wix, and several add-on questions need a one-day staging spike.

### 2. Why the error appears (evidence)

`wixBookingAuthorityRequired` (`lib/i18n/translations.ts`) is raised in three situations when `/api/slots` reports `wixBookingsAuthoritative: true` (`WIX_AVAILABILITY_ADAPTER_ENABLED=true`, `lib/wix/config.ts`):

1. **First add-on click.** `components/booking/hooks/use-addon-controls.ts` calls `resolveAddonToggle()` in `lib/booking/client/addon-selection.ts`, which returns `wix-authority-required`. No component reads `wixBookingsAuthoritative` to hide or disable the cards, so all 11 add-on cards look purchasable until clicked.
2. **Submit.** `resolveCheckoutMode()` in `lib/booking/client/checkout-mode.ts` sets `canUseWixNativeCheckout` only when there are zero add-ons and no requested route; otherwise `requiresUnsupportedLocalCheckout` is true and `components/booking/hooks/use-booking-checkout.ts` shows the message.
3. **Bypass paths.** The storefront one-click combos and the deep links `?addons=` and `?route=` (a priced trio also preselects its add-on) skip the toggle check, so the customer meets the error only at submit.

The server agrees: `POST /api/checkout` answers 409 for every booking when the adapter flag is on (`app/api/checkout/route.ts`), with no fallback to Dispatch. A fourth case: if the browser has no Wix client id, even a base flight is blocked with the same message.

### 3. What is connected today

| Concept | Local source | Wix link | Status |
| --- | --- | --- | --- |
| 9 flight packages | `lib/db/seed-data.ts` | One appointment service each, ids in `lib/wix/catalog.ts` | Linked and live. 6 match the registry, **PRO 60 is 890 in Wix against 950 locally**, **PRO 90 is 1,250 against 1,285**, and the 240-minute workshop service is unreachable. |
| 90-minute evening and Saturday tariff of 950 | `packagePriceForSlot` in `lib/scheduler/mission-calculator.ts` | none | The Wix service is fixed at 850. What Wix charges in the evening is unverified. |
| Availability | `lib/wix/availability-adapter.ts`, `/api/slots` | Time Slots V2 | Live. Wix can only veto starts. In Wix-only mode the local grid is built with **zero existing bookings**, so `maxAvailableMinutes` is 885 on every slot and the add-on fit check is blind (live check). |
| Shared Boeing resource | docs | one resource type shared by all 9 services | Live (readiness: yes). |
| Base booking flow | `lib/wix/booking-checkout-client.ts` | Create Booking, Create Cart (Bookings app, item id is the booking id), customerInfo PATCH, calculate, cart `note` PATCH, hosted checkout URL | Coded. **Never run end to end live.** |
| Payment provider | none in code | Wix hosted checkout | Docs say no payment provider is connected on staging. Unverified. |
| Post-payment confirmation | none | Wix confirms the booking itself | No success page, webhook, poll or guest lookup in the app for the Wix path. |
| Gift cards | `lib/wix/gift-cards.ts` | Gift Cards app, 17 variants, 7 signature designs aligned | Variants live. Purchase and redemption unverified. |
| Subscriptions | `lib/data/subscription-passes.ts`, `lib/wix/plans.ts` | Pricing Plans | 4 consumer plans resolve. **The 2 PRO plans do not exist**; their buttons fall to Dispatch. |
| Members | `lib/auth/auth-context.tsx`, `member-auth.ts` | Wix OAuth | Partly live. |
| 11 add-ons | `FLIGHT_ADDONS` in `lib/db/seed-data.ts` | none | **Not mapped.** |
| 8 on-request World Trio routes | `lib/data/experience-routes.ts` | none | **Not mapped.** |
| Legacy `SD-VOUCH` vouchers | local store | none | Blocked in Wix mode (needs Supabase, which the live host lacks). |
| Guest seats, participants | `totalParticipants` is always 1 | none | Not modelled. |
| Dispatch fallback | `app/(public)/contact/page.tsx` | none | **The form never sends anything** (a 600 ms timer then a success state, no network call). Every "falls back to Dispatch" path lands on it. |

Live observations (2026-11-12): `/api/slots` answers 200 with `wixBookingsAuthoritative: true`; `/api/offers/capabilities` answers `{"birthdayDiscountEnforceable":false}`; `wix:smoke` reports 9 services mapped and 2 price mismatches; `wix:readiness` reports two blockers, `catalog-drift` and `unresolved-subscription-plans` (both PRO tracks).

The browser also never compares the Wix cart total with the displayed total before redirecting (`use-booking-checkout.ts`, straight to the checkout URL).

### 4. Add-ons and cart

**Native add-ons (VERIFIED).** [About Add-On Groups](https://dev.wix.com/docs/api-reference/business-solutions/bookings/services/services-v2/about-add-on-groups) and [About the Add-Ons API](https://dev.wix.com/docs/api-reference/business-solutions/bookings/services/add-ons/introduction): add-ons are optional extras with a price and optionally extra minutes, organised in groups attached to one service. Limits: 3 groups per service, 7 add-ons per group, up to 21 booked add-ons per booking. A group may mix duration-based and quantity-based add-ons; one add-on is one or the other. Availability accepts `customerChoices.addOnIds` and Wix computes service plus add-on duration. Create Booking takes `bookedAddOns`. The booking id still goes into the cart, so one cart line carries base plus add-ons. Staff see an Add-ons column and the calendar summary. Create Add On and Create Add On Group need admin permission, so a one-time operator setup (or the dashboard) is required, never browser code.

**Layout that fits our registry exactly**

| Group | Contents | Type |
| --- | --- | --- |
| Cockpit modules | Cold and Dark 20 min, Crosswind and IFR 15 min, Extreme Airports 25 min | duration, 3 of 7 |
| World Trios | the 7 trios, 40 min each | duration, 7 of 7 |
| Guests | Extra Jumpseat, 0 min | quantity, 1 of 7; the owner sets the maximum, do not infer it |

Current product rule: all four consumer packages allow add-ons, including the 30 minute and the 45 minute promotion. Only on-request routes need 60 minutes or more. PRO and Fear of Flying get no groups, so Wix itself enforces the noise-free rule. A rule such as "one World Trio in total" is not enforceable by two groups and needs application validation (Team Codex point, adopted).

**Ranked models** (effort figures are estimates, not Wix figures)

| Model | What it is | Effort | Verdict |
| --- | --- | --- | --- |
| A. Quick relief | Base flight in Wix. Add-ons and route requests travel as text with the booking, paid and confirmed by staff. Fix Dispatch, disable the cards in Wix mode. | 1 to 2 days | Right for on-request routes and as a stopgap. Add-on minutes are not reserved, so staff must block the time. |
| B. Stores products in the same cart | Extra lines for add-ons | 2 to 4 days | Rejected for time add-ons: a product cannot extend the booking. Only a non-time extra fits. |
| C. Service variants | Price or duration option per service | 3 to 5 days | Rejected: one option per service, so combinations explode. |
| **C2. Native Wix add-ons** | The layout above | **4 to 7 days after a 1 day spike** | **Recommended.** |
| D. Pre-built bundle services | Top combinations as services | 2 to 3 days plus upkeep | Rejected: 11 add-ons produce 8,192 combinations. |
| E. Custom cart items with an API key | Caller-set prices | 4 to 7 days | Not for visitor tokens; needs the admin credential and gives no reserved minutes. |
| F. Local checkout authoritative, mirror into Wix | Two systems, two payments | 5 to 8 days | Rejected for the stated goal of one Wix checkout. |
| G. Multi-service booking | Add-on as a separate sequential service | 5 to 8 days | Rejected: more complex than C2, which gives time and price in one booking. |

**Risks of C2 to prove in the spike**
- Our reserved block is `getReservedMinutesForFlight(total)` in `lib/scheduler/kantorovich-engine.ts`: total plus 15, with 30 giving 45 and 120 giving 150. For example 60 plus 20 plus 40 is 120 minutes and reserves 150, not 135. Wix holds a fixed `timeBetweenSessions` per service, so the buffer for an add-on-extended booking may not match.
- Add-on price and minutes would live in two places, the registry and Wix, so a read-back parity check is mandatory.
- Wix coupons and plan benefits with add-ons are unknown.
- A `CREATED` booking does not hold the slot until paid, so two visitors can both reach checkout for the same slot and the second paid booking lands as a double booking that staff must resolve.

**Persistent multi-item cart (Mission Bag): defer.** One booking line already reflects the amount and the add-ons. A bag of several sessions adds the unpaid-booking collision above, Pricing Plans cannot be in a cart, and mixing gift cards with bookings is unverified. Team Codex's list of policies for that feature is the right gate.

**Route requests.** An on-request route needs a structured, staff-visible value, not a paid SKU. Do not append free text to the cart `note` alone: its acceptance and staff visibility are unverified. An unknown key in the booking form submission fails the whole submission, so the target field must exist in the Wix booking form before code sends it. Use the existing message field only as a human-readable summary.

### 5. Birthday discount

Our own 15% price exists only on the Stripe path, which the live host does not run. On the Wix path Wix computes the total, and overriding a cart price needs an admin permission that a visitor token does not hold.

| Option | Verdict |
| --- | --- |
| Staff honour it from the cart note | Exists. Manual, no enforcement. |
| Wix Automation emails a coupon (form, automation, coupon email) | 1 to 2 days, no credential. Slow, the flight date is unknown to Wix so the month rule cannot be enforced, the birthday is self-declared. This is the live site's model. |
| **Server creates a single-use coupon, browser applies it** | **Recommended.** 3 to 5 days. Instant, Wix charges the price. Needs one admin credential. |
| Custom discount trigger app | 6 to 10 days. No codes, but a public endpoint on the checkout path, and Wix's own docs conflict on whether automatic discounts apply to services. |
| Bookings pricing plugin | Rejected. It replaces pricing for the whole site, only one provider is allowed, it runs after the booking exists, and price previews ignore it so pages show the wrong price. |
| Hidden or duplicate discounted service | Rejected. `hidden` is not access control, so a visitor who learns the id can book it. |
| Gift card as the discount | Rejected. Stored value, not a percentage, and a cart holds only one gift card. |
| Static code such as BDAY15 | Rejected except as a short-lived emergency fallback. |

**Recommended design (VERIFIED facts, INFERRED combination)**
1. The server re-runs `evaluateBirthdayDiscount` from `lib/discounts/birthday`, using the **flight date read from the Wix booking**, never a date sent by the browser.
2. It creates a coupon through [Create Coupon](https://dev.wix.com/docs/api-reference/business-solutions/coupons/coupons/create-a-coupon): `percentOffRate: 15`, scope `bookings` with the service group and the booked service id ([valid scope values](https://dev.wix.com/docs/api-reference/business-solutions/coupons/coupons/valid-scope-values)), `usageLimit: 1`, `limitPerCustomer`, an expiry, and a tag for cleanup. The code is at most 20 characters and unique per site.
3. Make the code deterministic from the booking id with a keyed hash. Repeat calls then return the same coupon, and the per-site uniqueness makes duplicates fail, so one coupon per booking needs no database. The Wix host has no store today.
4. Expiry must cover the unpaid booking's hold. A coupon that expires inside the cart makes the price jump.
5. The browser applies it with the existing coupon call ([Add Coupon To Current Cart](https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/cart-v2/add-coupon-to-current-cart), `add-coupon` then `calculate`). Wix Cart calculation is the only displayed and charged total.
6. Rate limit by address and email, add a bot check, and reconcile with the coupon-applied webhook.
7. Team Codex adds a good identity layer: require member login or a verified email code, and keep a benefit ledger. Guest checkout without the benefit stays available.

**Facts and limits (VERIFIED)**
- A coupon is a bearer token: Wix says coupons cannot be limited to a specific type or subset of customers, and one coupon applies per order. Safety comes from single use, short expiry, service scope and a random code.
- The current Create schema has `limitPerCustomer`. This corrects the older repository note that per-customer limits are impossible. How a guest is identified for that limit is UNKNOWN.
- Percentage coupons work with Bookings, but not on free services, custom-priced services or services paid with a pricing plan. A bookings coupon is limited to one item.
- A coupon and a gift card can coexist in one cart, so a gift card or voucher covering the remainder after the discount still works.

**Credential and rule exception (the board refines this in section 11, ruling 9: it is an architecture amendment more than a rule exception).** Creating a coupon needs the `COUPONS.MANAGE` permission, which a visitor token does not have. The least-privilege option is a site-restricted API key with only that permission, stored as a Wix server secret with `wix env set` and never in the repository or the browser. The project rule ("No client secret, API key or PayPlus credential ever enters the repo or the browser", `AGENTS.md` section 6.7) is written absolutely, so this needs an **explicit owner exception**, ideally with a test that proves the key is absent from client bundles. The built-in client credentials are an alternative, but which scopes that token carries is UNKNOWN. The `auth.elevate` helper is documented for the Astro integration only, so it is not assumed for our Next.js worker.

### 6. Comparison with the other proposals

**Team Antigravity's section above.** Agrees on the cause, native add-ons, the 3-group layout (3, 7 and 1) with no groups on PRO and Fear of Flying, and the server-created single-use coupon. Changes Team Claude recommends:
1. **Order.** The payment provider, PRO plans and price drift were left to the last sprint or missing. Nothing completes in Wix checkout without a provider, and PRO 60 and 90 charge old prices. These are the first gates, followed by a spike.
2. **Route requests** through `formSubmission`: an unknown key fails the whole booking. Use a pre-configured field (see section 4).
3. **Availability:** intersecting Wix add-on slots with the local grid does not work while that grid is built with no bookings.
4. **Persistent multi-item cart drawer:** deferred, see section 4.
5. **Birthday details:** 15 minute expiry versus the booking hold, the "about 150 lines" estimate omits rate limiting, idempotency and abuse controls, the pricing plugin is not the cleanest option, and the credential needs the exception above. Adopted from them: verify the real flight date from Wix, and test whether the coupon discounts add-ons or only the base.

**Team Codex's section above (restored).** Largely the same direction. Adopted: the structured route field with an allow-listed value, the explicit quantity-add-on maximum, application validation for rules that groups cannot express, the identity-bound benefit and the ledger, deferring the Mission Bag. One difference: Codex's delivery order configures PayPlus at step 9. Team Claude would move the payment-provider confirmation to the front, because no later step can be accepted without a working payment.

### 7. Recommended order

1. **Gates:** connect and test the payment provider in Wix Staging, correct the PRO 60 and PRO 90 Wix prices (decide first which side is authoritative), create the two PRO plans. `wix:readiness` must report no blockers.
2. **One-day staging spike** on the unknowns below. Staging only, no live Editor site.
3. **Quick relief:** disable add-on cards and route requests in Wix mode with an honest message, and make Dispatch deliver for real.
4. **Native add-ons:** operator provisions the 11 add-ons and 3 groups on the 4 consumer services, registry mapping, read-back parity in `wix:readiness`, then availability with `addOnIds`, then `bookedAddOns`.
5. **Birthday coupon** after the exception is granted and the spike confirms coupon behaviour.
6. **Mission Bag** later, as a separate design.

### 8. Staging spike: unknowns to settle (UNKNOWN today)

1. Can a visitor token list add-on groups, send `customerChoices.addOnIds` and `bookedAddOns` without a 403?
2. Do add-on-extended slots keep our 45, 60, 75, 105 and 150 minute grid, the shared Boeing resource and the buffer? How does the Sunday to Tuesday 45 minute promotion behave?
3. How does a booking with add-ons appear in the cart line, in Calculate Cart, on the order, in the confirmation email and invoice?
4. Add-on price units: the docs example shows `"value": "2500"` next to `$25.00`. Confirm how a shekel price is written.
5. Do plan benefits, coupons and gift cards cover the add-ons or only the base?
6. Coupon: can the chosen credential create it; does it discount base plus add-ons; when is `usageLimit` consumed (cart add, checkout start or paid order); does an abandoned cart consume it; what happens when it expires in the cart; how does `limitPerCustomer` treat a guest?
7. Does a visitor-token cart reject `customItems` and `catalogOverrideFields`? If it accepts them, that is an independent security finding.
8. Is the hosted checkout URL method used by the code correct for a Wix-hosted frontend, or must the redirect session be used (the docs warn the first can 404 on a headless site)?
9. Double booking: two visitors paying for the same extended slot. Resolution path for staff.
10. What does the evening 90 minute booking actually charge in Wix, 850 or 950?
11. Which store holds a benefit ledger on the Wix host, given there are no Supabase variables there?
12. The booking-form field for route intent: create it, confirm the accepted key and that staff see it.

### 9. Decisions needed from the owner

1. Grant, or refuse, the exception for one coupon-only, site-restricted server credential.
2. Approve the one-day staging spike (staging writes: add-ons, a coupon, a test booking and cart).
3. Choose the order: Team Claude's (gates and spike first) or the add-on sprint first.
4. Which side is authoritative for PRO 60 and PRO 90 prices.
5. The maximum quantity for the Extra Jumpseat add-on.

Related tracker issues: #119, #124, #125, #126, #140, #141, #144.

### 10. Sources

- [Single-service booking flow](https://dev.wix.com/docs/api-reference/business-solutions/bookings/flow-single-service-booking)
- [About Add-On Groups](https://dev.wix.com/docs/api-reference/business-solutions/bookings/services/services-v2/about-add-on-groups) and [Add-Ons API](https://dev.wix.com/docs/api-reference/business-solutions/bookings/services/add-ons/introduction)
- [Create Booking](https://dev.wix.com/docs/api-reference/business-solutions/bookings/bookings/bookings-writer-v2/create-booking) and [List Availability Time Slots](https://dev.wix.com/docs/api-reference/business-solutions/bookings/time-slots/time-slots-v2/list-availability-time-slots)
- [About the Cart API](https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/cart-v2/introduction) and [About Catalog and Custom Items](https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/catalogs/catalog-and-custom-items)
- [Create Coupon](https://dev.wix.com/docs/api-reference/business-solutions/coupons/coupons/create-a-coupon), [Valid scope values](https://dev.wix.com/docs/api-reference/business-solutions/coupons/coupons/valid-scope-values), [Coupon functionality](https://dev.wix.com/docs/api-reference/business-solutions/coupons/coupons/functionality), [Add Coupon To Current Cart](https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/cart-v2/add-coupon-to-current-cart)
- [Bookings pricing integration plugin](https://dev.wix.com/docs/api-reference/business-solutions/bookings/pricing/pricing-integration-service-plugin/introduction) and [custom discount triggers plugin](https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/extensions/discounts/custom-discount-triggers-integration-service-plugin/introduction)
- [Wix Automations: adding and sending a coupon](https://support.wix.com/en/article/the-new-automation-builder-adding-and-sending-a-coupon) and [Wix Bookings: creating and managing service add-ons](https://support.wix.com/en/article/wix-bookings-creating-and-managing-service-add-ons)
- [Admin API calls with client credentials](https://dev.wix.com/docs/go-headless/authentication/admin/make-admin-api-calls-with-client-credentials), [API keys](https://dev.wix.com/docs/go-headless/authentication/admin/generate-an-api-key) and [`wix env`](https://dev.wix.com/docs/wix-cli/cli-for-headless/command-reference/project-commands/env)

### 11. Engineering Board review: outcome of all three teams' input

**Reading of the request:** "the eight engineering approach" is read as "the right engineering approach", chosen from the eight models in section 4 (A, B, C, C2, D, E, F, G). It ends with eight board decisions. **Inputs:** Team Antigravity, Team Codex and Team Claude sections of this document. **Method:** every point where the teams differ was tested against the code on `origin/main` (`123dd01`), the repository docs, or the live address, and is ruled below with its evidence. Rulings are recommendations for the owner, not approvals. Teams Antigravity and Codex published their own board outcomes meanwhile; section 11.8 reconciles all three.

#### 11.1 Consensus (all three teams)

- The error is an intentional single-writer guard, not a defect.
- Native Wix Bookings add-ons are the right vehicle for the 10 duration add-ons and the quantity add-on. Stores products cannot extend the reservation.
- Groups on the four consumer services only. PRO and Fear of Flying keep zero groups. The layout is 3 modules, 7 trios, 1 seat.
- One booking per cart line. Wix Cart `calculate` is the total.
- No frontend-only 15%, no duplicate discounted services, no gift card as the discount.
- The birthday benefit is a server-created, single-use Wix Bookings coupon applied by the browser, proven in staging before it is advertised, including whether it discounts add-ons.
- The PRO plans, the price parity and PayPlus must be fixed or configured in Wix Staging.

#### 11.2 Disputed points and rulings

| # | Question | Antigravity | Codex | Claude | Board ruling and evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | How to carry an on-request route | Unblock now, pass it in `formSubmission` or the cart note | A dedicated booking-form field `requested_route_id` | Same as Codex; note only as a summary | **Codex.** `docs/modules/checkout-consent-birthday.md` records that a `formSubmission` key that is not a form field target fails the whole booking, so an unknown key would break every route booking. Cart `note` acceptance and staff visibility are unverified. |
| 2 | Jumpseat maximum | `maxQuantity: 2` | Owner decides | Owner decides | **Owner decides.** `addon-extra-seat` in `lib/db/seed-data.ts` has no maximum, so 2 was invented. |
| 3 | Who computes the extended end time | Browser passes an extended `endDate` | Never in the browser | Take the slot from Wix | **Codex.** Ask Wix for availability with the chosen `addOnIds`, pass the returned slot through unchanged, revalidate at submit. |
| 4 | Availability authority | Intersect Wix slots with the local grid | Wix revalidates with add-ons | The local fit check is blind in Wix-only mode | **Wix is the authority for fit.** `getWixBackedKantorovichSlots` builds the grid with `generateKantorovichSlots(date, duration, [])`, so it sees no bookings; live `maxAvailableMinutes` is 885 on every slot. The local grid may only supply display cadence until the spike proves how Wix buffers extended bookings. |
| 5 | Persistent cart or Mission Bag | Optional drawer in Sprint 1 or 2 | Defer | Defer | **Defer (2 of 3, and a technical reason).** Unpaid `CREATED` bookings do not hold the slot, Pricing Plans cannot be in a cart, and mixing gift cards with bookings is unverified. |
| 6 | Order of work | PayPlus and PRO plans in the last sprint | PayPlus at step 9 | Gates first, then a spike | **Gates first.** Docs: no payment provider is connected, and no PayPlus listing could be installed programmatically, so connecting it is an owner dashboard action that may need lead time. Live: PRO 60 charges 890 and PRO 90 charges 1,250 in Wix; `wix:readiness` reports two blockers. |
| 7 | Identity for the birthday benefit | None at first, coupon bound to the booking; its board section later requires member sign-in or an email code and a ledger | Member sign-in or an email code, plus a ledger | Booking-bound coupon and rate limits first, identity later | **Two teams to one on the end state; the open question is sequencing, and it is the owner's call.** An email code verifies an address, not a birthday, so the birthday is self-declared either way. One abuse is worth about 15% of the price, roughly 100 to 130 shekels. A ledger needs a store and the Wix host has none. If the owner wants the stricter position, the sign-in or email-code flow and the store decision must be done before the birthday gate opens. |
| 8 | Coupon expiry | 15 minutes | not set | Align with the unpaid booking hold | **Align with the hold.** A coupon that expires inside the cart makes the price jump. The hold length is a spike item. |
| 9 | Credential | `WIX_ADMIN_API_KEY` or client credentials in worker secrets | No secret in the browser or repository | Explicit exception | **Correction to section 5 of this team's text.** A secret stored with `wix env set` does not enter the repository or the browser, so the sentence of rule `AGENTS.md` 6.7 is not broken. What changes is the architecture: that section documents one visitor-only Wix client. Adding a server admin client is an architecture amendment: owner approval, an `AGENTS.md` update, a site-restricted API key with only the coupon permission, and a test that the key is absent from client bundles. |
| 10 | Pricing plugin | "Cleanest long-term" | Later alternative | Reject | **Not now.** It replaces pricing for the whole site, allows one provider, runs after the booking exists, and price previews ignore it. |
| 11 | What to do first | Unblock the route guard | Fix parity, plans, then the field | Honest UI first | **Honest UI now, route unblock only after the field exists.** Disabling the add-on cards in Wix mode and making Dispatch deliver needs no Wix change. |
| 12 | Facts raised by one team only | none | none | Fake Dispatch form, PRO drift, 90 minute evening tariff, blind fit check | **All adopted as gates.** `app/(public)/contact/page.tsx` waits 600 ms and shows success with no network call (verified in code). The Wix service for the 90 minute flight is fixed at 850 while the local grid charges 950 in the evening (live slots and `wix:smoke`). |

#### 11.3 The eight models

| Model | Ruling |
| --- | --- |
| A. Quick relief, text plus staff confirmation | **Adopt for on-request routes only, and as a stopgap.** It does not reserve add-on minutes. |
| B. Stores products | Reject: cannot extend the reservation. |
| C. Service variants | Reject: one option per service. |
| **C2. Native Wix add-ons** | **Adopt as the target.** |
| D. Pre-built bundle services | Reject: 8,192 combinations. |
| E. Custom cart items with an API key | Reject: no reserved minutes, caller-set prices. |
| F. Local authoritative, mirror into Wix | Reject: two payments and two calendars. |
| G. Multi-service booking | Reject: more complex than C2 for the same result. |

#### 11.4 The approved approach: eight board decisions

1. **One authority.** Wix Bookings owns the whole recreational mission: calendar, minutes and price. The local Stripe checkout is never combined with it.
2. **Native add-ons only.** Operator-provisioned in staging, layout 3, 7 and 1 on the four consumer services, zero groups on PRO and Fear of Flying. One registry mapping of local add-on to Wix add-on, group and eligible services, read back by `wix:readiness` and blocking on drift. Rules the groups cannot express, such as one trio in total, are enforced in the application.
3. **Wix-driven availability.** Request slots with the chosen `addOnIds`, pass Wix's slot through unchanged, revalidate before booking, create the booking with `bookedAddOns`.
4. **Routes as a structured field.** A pre-configured booking-form field with an allow-listed id, the 60 minute minimum enforced on the server, and "Captain confirmation required" shown before payment and to staff.
5. **One price truth.** Wix Cart `calculate` is the only total. The UI must show it before redirecting. PRO 60 and PRO 90 are corrected (the owner chooses which side is authoritative), and the 90 minute evening tariff is decided and mirrored or removed.
6. **Birthday coupon, phased.** Server-created, single-use, booking-bound coupon with a keyed-hash code, the flight date read from Wix, expiry aligned with the hold, rate limits and a bot check, no stacking with another coupon, and an architecture amendment for the credential. Identity and a ledger: day one if the owner takes the two-team position and a store exists, otherwise phase two (see 11.8).
7. **Gates before build.** Payment provider connected, PRO prices and plans fixed, Dispatch that really delivers, a one-day staging spike on section 8. No feature code before these.
8. **Defer the rest.** The Mission Bag and the pricing plugin wait until the single-flight add-on flow has passed staging acceptance.

#### 11.5 Merged delivery order

1. Owner actions in Wix: connect and test the payment provider, choose and correct the PRO 60 and PRO 90 prices, create the two PRO plans. `npm run wix:readiness` must report no blockers.
2. Make Dispatch deliver, and disable add-on cards and route requests in Wix mode with an honest message.
3. One-day staging spike: section 8 plus the route form field, the Jumpseat maximum, and the hold length of an unpaid booking.
4. Create the booking-form field for route intent and enable on-request routes.
5. Provision the 11 add-ons and 3 groups; add the mapping and the read-back parity check.
6. Availability with `addOnIds`; booking with `bookedAddOns`; remove the add-on blocker only after parity passes.
7. End-to-end payment and booking reconciliation in staging.
8. Birthday coupon, after the amendment is approved and the coupon behaviour is proven.
9. Mission Bag and pricing plugin as separate designs.

#### 11.6 Open owner decisions after the board

1. Approve the architecture amendment for one server-side, site-restricted coupon credential.
2. Which side is authoritative for PRO 60 and PRO 90 prices, and what to do about the 90 minute evening tariff of 950.
3. The maximum quantity for the Extra Jumpseat add-on.
4. Accept the phased birthday risk: self-declared birthday, identity later.
5. Approve the one-day staging spike with staging writes.
6. Who connects the payment provider in the Wix dashboard, and by when.

#### 11.7 Acceptance additions to Team Codex's criteria

- Zero catalogue drift in `npm run wix:smoke` and `npm run wix:readiness`.
- The total shown before the redirect equals Wix's calculated total for every package, including the 90 minute evening slot.
- A Dispatch submission reaches a person, proved by a real test message.
- A route request with an unknown id, or on a 30 or 45 minute package, is refused on the server.
- The birthday coupon cannot be created twice for one booking, expires with the hold, and does not combine with another coupon.

#### 11.8 Convergence with the other two board outcomes

Teams Antigravity (section 6) and Codex (board outcome) published their own board outcomes while this section was being written. All three now select the same architecture. The structures map onto each other as follows.

| Team Claude decision (11.4) | Team Codex gate | Team Antigravity phase |
| --- | --- | --- |
| 7. Gates before build: commercial truth, payment, Dispatch, spike | 1. Commercial truth, 2. Payment | Phase 0 owner decisions and gates, Phase 1 spike, Phase 2 immediate UX relief |
| 3. Wix-driven availability | 3. Scheduling spike | Phase 1 spike, Phase 3 availability |
| 2. Native add-ons only, with parity | 4. Catalog provisioning, 5. Parity | Phase 3 native add-ons |
| 4. Routes as a structured field | 6. Route-intent gate | Phase 3 structured route requests |
| 1. One authority and 5. One price truth | 7. Native mission checkout | Phase 3 checkout |
| 6. Birthday coupon | 8. Birthday-benefit gate | Phase 4 identity-verified coupon |
| 8. Defer the rest | Mission Bag deferred | Phase 5 deferred |

Adopted from Team Codex: the server is an integrity gate, not a second scheduler, price calculator or reservation writer; and the release rule that no guard is removed until the Wix entity is provisioned, parity passes, the full booking and payment lifecycle passes in staging, and staff see the same structured mission information the customer bought. Adopted from Team Antigravity: its self-corrections on the delivery order, the route field and UI honesty, and the 80 and 120 minute buffer measurement as an explicit spike item.

**What is still open (the only real disagreement).** Ruling 7 in 11.2: Team Antigravity and Team Codex now require member sign-in or an email code, plus a benefit ledger, before the birthday coupon is issued. Team Claude agrees that identity plus a ledger is the right end state and dissents only on sequencing. The reasons are that an email code verifies an address, not a birthday, that one abuse is worth about 100 to 130 shekels, and that a ledger needs a store which the Wix host does not have today (see tracker issue #139 for where records live). If the owner prefers the stricter position, the cost is the sign-in or email-code flow and the store decision before the birthday gate can open. This is a risk acceptance for the owner, not an engineering disagreement.

**Two questions none of the three outputs settles.** Which store holds the benefit ledger on the Wix host, and how long an unpaid booking is held (it sets the coupon expiry). Both belong in the staging spike.
