# Module: refund request form (`/refund`)

Handoff spec for workstream A3. Branch `feat/refund-form`. Nothing here edits `GENESIS.md`, `AGENTS.md`,
`ARCHITECTURE.md`, `translations.ts`, `package.json` or `.github/**`; the exact lines to add are in section 12.

## 1. Purpose

Per the owner, refunds are requested **only** through an online form at the unlisted URL `/refund`. The
form is built to feel smart but stay simple:

1. **Your order**: what was bought (flight session, gift voucher, flight track), booking reference or
   voucher code or order number, email, name, phone, optional session date and time. The server checks the
   reference **and** the email against the local order store.
2. **What happened**: a reason (change of plans, illness, centre fault/technical, duplicate payment, gift
   voucher, subscription, other) plus free text.
3. **Review and send**: summary, two declarations (information is true; the request is handled under the
   refund rules and the privacy policy), links to `/rules#refunds` and `/privacy-policy`, a honeypot.

A live **"What to expect"** panel (from the pure policy module) shows the *likely* outcome under the rules,
with the clause numbers, and a "keep your flight" nudge with WhatsApp/phone/email while a free reschedule is
still open. It informs the customer and prioritises staff. **It never approves, pays, cancels or reschedules
anything**: every request goes to a person (`needsStaffConfirmation` is always `true`).

## 2. Files

| Area | Path |
| --- | --- |
| Page (unlisted) | `app/(public)/refund/page.tsx`, `app/(public)/refund/layout.tsx` (`robots: { index: false, follow: false }`) |
| API | `app/api/refund-requests/route.ts` (POST public, GET admin), `app/api/refund-requests/lookup/route.ts` (POST) |
| Policy (pure, client-safe) | `lib/refund/refund-policy.ts` (numbers and clauses), `refund-eligibility.ts` (`evaluateRefundEligibility`), `business-days.ts`, `israel-time.ts`, `subscription-refund.ts`, `refund-types.ts` |
| Fields, schema, reference | `lib/refund/refund-fields.ts` (shared validation), `refund-schema.ts` (zod, server), `refund-reference.ts` (`RF-XXXXXX`) |
| Presentation (pure) | `lib/refund/refund-presenter.ts` (evaluation to panel text), `refund-format.ts` (dates per language) |
| Server only | `lib/refund/refund-repository.ts`, `refund-order-lookup.ts`, `refund-notify.ts`, `refund-service.ts`, `refund-request-guard.ts` |
| Entries | `lib/refund/index.ts` (client-safe), `lib/refund/server.ts` (server-only), `components/refund/index.ts` |
| Copy | `lib/refund/copy/{he,en,ru,fr,ar,es}.ts`, `copy/email.ts`, `copy/refund-copy-types.ts`, `copy/fill-copy.ts`, `copy/index.ts` |
| UI | `components/refund/*` (`RefundRequestView`, `OrderStep`, `ReasonStep`, `ReviewStep`, `ExpectationPanel`, `RefundSuccess`, `RefundUnavailable`, `RefundStepper`, `RefundPageHeader`, `FormField`, `ChoiceCard`, `ContactLinks`, `use-refund-form.ts`, `refund-form-types.ts`) |
| Database | `lib/db/migrations/010_refund_requests.sql`, mirrored in `lib/db/schema.sql` |
| Tests | `tests/unit/refund-*.test.ts` (4 files), `tests/integration/refund-requests*.test.ts` (2), `tests/support/fake-refund-supabase.ts`, `tests/e2e/refund-form.spec.ts`, `tests/a11y/refund-states.spec.ts` (+ keys in `tests/a11y/support/scan-keys.ts` and `a11y-baseline.json`) |

The only shared files touched: `.env.example` (one optional variable), `lib/db/schema.sql` (the new table),
`tests/a11y/support/scan-keys.ts` and `tests/a11y/a11y-baseline.json` (new scan keys, all empty baselines).

## 3. The policy module

Source of truth: the owner's Hebrew rules (sections 3.5, 4.1 to 4.6, 5.1 to 5.3, 12.1). All numbers live in
one object, `REFUND_POLICY`, each with its clause:

| Rule | Clause | Value |
| --- | --- | --- |
| Free reschedule when requested at least | 4.1 | 24 hours before the session (exact hours, DST-safe) |
| Reschedule inside that window | 4.2 | 150 ILS, subject to calendar availability |
| Full refund | 4.3 | 100 percent, needs **both**: at most 14 days since the order **and** at least 2 business days before the session |
| Session day or no-show | 4.4 | no refund at all |
| Customer ends the session early | 4.5 | pro rata by base price of delivered time (not computed, see section 10) |
| Unused subscription | 4.6 | paid minus the **full** price of used sessions: 30 min 450, 60 min 650, 90 min 850 |
| Centre fault | 5.1, 5.2 | full refund or a new date; compensation by session length and circumstances |
| Reply to a written request | 12.1 | up to 14 days |

`evaluateRefundEligibility({ productKind, reason, orderDate, sessionDateTime, requestedAt, subscription })`
returns `{ outcome, alsoPossible, clauses, refundBlockers, coverage, amounts, facts, staff: { priority, flags } }`.
Outcomes: `full_refund_possible`, `reschedule_free`, `reschedule_fee`, `no_refund_window`,
`centre_fault_review`, `subscription_prorata`, `manual_review`.

Decision table for a flight session that has not started (reason change of plans, illness or other):

| Situation | Outcome | Alternative |
| --- | --- | --- |
| order within 14 days **and** request on or before the date 2 business days before the session | `full_refund_possible` (4.3) | free reschedule (4.1) if 24 h or more remain, else paid (4.2) |
| otherwise, 24 h or more remain | `reschedule_free` (4.1), blockers say why no refund | none |
| otherwise, under 24 h but not the session day | `reschedule_fee` (4.2, 150 ILS) | none |
| session is today, or has started | `no_refund_window` (4.4) | paid reschedule (4.2) while it has not started |

Other cases: centre fault goes to `centre_fault_review` whatever the timing; duplicate payment and gift
voucher go to `manual_review` (the rules text does not cover them, `coverage: 'none'`, shown to the
customer as such); a subscription is `subscription_prorata` (amount computed only when paid amount and used
sessions are supplied: `computeSubscriptionRefund`); a flight with no usable session date is `manual_review`;
a past session with the reason "other" is `manual_review` (the customer may have ended early, 4.5).
Staff priority: `urgent` for any upcoming session inside 48 hours, `high` for centre fault and duplicate
payment, `low` for a session that is over, otherwise `normal`.

## 4. Assumptions to veto (all in `refund-policy.ts` or its tests)

1. **Israeli business days are Sunday to Thursday; Friday and Saturday are the weekend.** No holiday
   calendar is applied (inventing one would be a legal decision): staff add holidays by hand.
2. **"2 business days before the session"** is counted by calendar date: the last day to cancel is the
   session date minus 2 business days (Thursday 10:00 session: Tuesday; Sunday session: Wednesday). A request
   sent at 23:00 on that last day still qualifies. Time of day is not used for this limit.
3. **"No more than 14 days since the order"** is counted by Israel calendar date and **day 14 is included**
   (order on the 1st: still OK on the 15th, not on the 16th). The Hebrew "טרם חלפו 14 יום" could be read as
   stopping one day earlier; the customer-favourable reading was chosen.
4. **A session given only by date is read at the opening time (09:00)** and marked "assumed", which can make
   a fee look due when the real session is later. The form also asks for the time.
5. **Between 24 hours and 2 business days, and between 2 business days and the session day** the rules give
   no refund and no explicit "no refund" either (4.4 names only the session day and no-shows). The module
   answers "free reschedule" or "reschedule for 150 ILS" and says a full refund is not available.
6. **Illness** has no exception in the rules: the timing outcome is shown, the request is flagged `illness`
   for staff discretion, and the page promises nothing.
7. **Gift voucher refunds** are not described in the rules text, so they are always `manual_review`.
   Verification of a voucher uses the **buyer's** (sender's) email, not the recipient's.
8. The reasons list is: change of plans, illness, centre fault/technical, duplicate payment, gift voucher,
   subscription, other. "Gift voucher" is offered only for vouchers and "subscription" only for tracks.

## 5. Order check and privacy

`POST /api/refund-requests/lookup` takes `{ productKind, orderReference, email }`. Reference **and** email
must match a **paid** booking or voucher in the local store. Anything else (unknown order, wrong email, a Wix
order, storage down) answers the identical `{ "verified": false }`. A match returns only
`{ verified, productKind, packageTitle, sessionDate, sessionTime, orderDate }`: never an amount, name,
phone, email, payment id, Stripe receipt, or another order (AGENTS.md section 6.5). **Deliberate small
extension of your brief:** `orderDate` is also returned, because the 14-day rule needs it for the live panel;
it is only revealed to someone who already holds the reference and the matching email. Throttled by IP
(20 per 15 min) and by reference (10 per 15 min).

Orders that live only in Wix (Wix bookings, flight tracks bought through Wix Pricing Plans) are not in the
local store: they are `unverified`, the form says so honestly, and the request carries
`order_not_verified` for staff.

## 6. Submit, storage and fail-closed

`POST /api/refund-requests` (Node runtime). Order of checks: same-origin (`Origin` must match the request,
the configured app URL or the proxy host; `Sec-Fetch-Site: cross-site` is refused) then JSON content type and
16 KB body cap (415, 413, 400) then zod (`refund-schema.ts`; a filled honeypot `website` is a 400, nothing
stored, nothing sent) then rate limit (per IP 8 per hour, per email 4 per hour; 429 + `Retry-After`). The
service then re-verifies the order, recomputes the outcome with the **server clock and the order's own dates**
(the browser's estimate is never trusted), draws `RF-XXXXXX` (32-character alphabet without 0, O, 1, I) and
stores and notifies.

Idempotency: the browser generates a `clientRequestId` once per form; a double click or retry returns the
same reference (`duplicate: true`) without a second record or email. Editing after an attempt makes a new id.

| Storage | Email (SendGrid) | Result |
| --- | --- | --- |
| stored | sent | 201; desk emailed, customer acknowledged in their language |
| stored | not configured or failed | 201; `acknowledged: false`, the success page says no copy was emailed |
| none | desk emailed | 201 (the email is the record) |
| none or DB error | not configured or desk email failed | **503** `{ error, contact: { email, phone, whatsapp } }`, nothing stored, nothing sent, the page says "Nothing was sent" and offers the desk |

"Stored" means Supabase in production, process memory on development and test servers, and memory in
production only with `ALLOW_IN_MEMORY_STORE=true` (demo and sandbox builds, never a real deployment).
Logs carry only error names and database error codes, never a body, email, name, phone or message (a test
asserts this, including for a database message that quotes a row).

Rate limiter: the project limiter (`consumeRateLimit`, migration 005) is used. If it is unavailable (a Wix
worker without Supabase) a **best-effort in-process limiter** takes over (hashed keys, per instance). It
slows a script down; it does not stop a determined one, and another worker instance has its own counters.
There is no CAPTCHA (honeypot, same-origin and limits only); add Turnstile if spam appears.

`GET /api/refund-requests` (admin Basic auth, `private, no-store`) lists the newest 100 requests, so stored
requests are visible without SQL. There is no status-change endpoint yet: set `status` in the table by hand.

## 7. Data model (migration `010_refund_requests.sql`, also in `schema.sql`)

Table `public.refund_requests`: `id`, `reference` (unique, `^RF-[A-HJ-NP-Z2-9]{6}$`), `client_request_id`
(unique uuid), `status` (`new`, `in_review`, `resolved`, `declined`), `product_kind`, `reason`,
`order_reference` (as typed), `contact_name/email/phone`, `session_date`, `session_time`, `verification`
(`verified` or `unverified`), `verified_order_id`, `order_date`, `package_title`, `message` (max 1000),
`language`, `priority`, `evaluation` (jsonb: outcome, clauses, facts, staff flags at submission time),
`submitted_at`, `staff_notified_at`, `customer_acknowledged_at`. RLS on, all access revoked from `anon` and
`authenticated`; only the service role reads and writes. Apply after 009 (renumber if another branch took 010).
The table holds personal data: **decide a retention period** (open question).

## 8. Environment variables (names only)

| Variable | Needed for | Note |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | durable storage, durable rate limits, order verification | already used by the order store |
| `SENDGRID_API_KEY` | desk notice and customer acknowledgement | already used by booking confirmations (`lib/sendgrid.ts`) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | the From address | already used |
| `REFUND_NOTIFY_EMAIL` | **new, optional**: inbox for refund requests | defaults to `desk@simdream.co.il` (`FACILITY_INFO.contact.email`) |
| `NEXT_PUBLIC_APP_URL` | same-origin check on a proxy | already used |
| `ALLOW_IN_MEMORY_STORE` | demo and test servers only | **never set on a real deployment** |

**Wix-hosted worker.** Set at least one of the two channels on the Wix site (`wix env set <NAME>`):
`SENDGRID_API_KEY` (plus `NEXT_PUBLIC_SUPPORT_EMAIL`, optionally `REFUND_NOTIFY_EMAIL`) gives an email-only
operation that is fully supported and tested; the Supabase pair gives storage plus order verification and the
durable limiter. With neither, `/refund` answers 503 and shows the desk contact (nothing is lost silently).
Recommended: both.

**Wix-native alternative (researched, not implemented, not verified).** The Wix docs describe the Form
Submissions API (`@wix/forms`, `submissions.createSubmission(submission, options)`; permission
`forms:v4:submission:create_submission`, scope `SCOPE.FORMS.VIEW-FORM`; needs the Wix Forms app installed and a
`formId`; fields map by field target; a `onSubmissionCreated` webhook exists) and the site owner can attach
Wix Automations to a form. The documented example calls it from Velo backend code with `auth.elevate`, so
**whether an anonymous headless visitor token may call it is not confirmed**; it needs a spike on the
SimDream-Staging site before anyone commits to it. If it works it would be a third channel (a new adapter
beside `refund-repository.ts` and `refund-notify.ts`) with no new infrastructure. No endpoint was invented.

## 9. The page is deliberately unlisted

- `app/(public)/refund/layout.tsx` sets `robots: { index: false, follow: false }` (the project has no
  `X-Robots-Tag` anywhere else, so none was added).
- Not in `PUBLIC_SITE_ROUTES` (`lib/seo/site-routes.ts`), so it is out of the sitemap, `public/llms.txt` and
  the structured data. `route-coverage.test.ts` already accepts any `app/(public)` page that is noindex, so
  no allow-list change was needed.
- **Not in `robots.txt` on purpose**: a `Disallow: /refund` line would publish the URL to anyone who reads
  robots.txt and would stop crawlers from ever seeing the `noindex`.
- No Navbar or Footer link. `tests/unit/refund-unlisted.test.ts` fails if any other `app/`, `components/` or
  `lib/` file links to `/refund`; the only allowed exception is `components/legal/RulesContentView.tsx` (the
  rules refund clause that A2 adds). `tests/e2e/refund-form.spec.ts` checks the live site chrome, the sitemap,
  robots.txt and llms.txt.
- Entry points: the rules refund clause (A2) and confirmation emails (section 11).
- `/refund?ref=SD-737-...` prefills the booking reference (a malformed value is ignored). The email is never
  put in the URL.

## 10. Known limits and open questions for the owner

1. **Rule 4.6 lists 60 minutes at 650 ILS; the booking registry sells 60 minutes at 690.** The module uses the
   rules' numbers. A unit test ties 30 and 90 minutes to the registry and deliberately leaves 60 out. Which is right?
2. **Rule 4.5 (ending a session early)** reads as a refund "proportional to the base price of the time
   actually delivered". The module does not compute it: such a request is `manual_review`. Please confirm
   the formula before it is automated.
3. **Gift voucher refunds** are not covered by the rules text (assumption 7). Is the 14-day limit meant to
   apply to an unredeemed voucher? Same question for a subscription bought more than 14 days ago.
4. Confirm the assumptions in section 4 (Sunday to Thursday, day 14 inclusive, date-based business days,
   09:00 for an undated session, holidays handled by hand).
5. **Retention and deletion** of refund requests (they hold name, email, phone, free text).
6. The inbox for refund requests (`desk@simdream.co.il` by default) and whether staff want a status endpoint
   or an admin screen (today: `GET /api/refund-requests` and SQL).
7. `orderDate` in the lookup response (section 5) is a small extension of the brief: veto it if you prefer the
   panel to say only "we will check the order date".
8. A request for a booking made on Wix, or for a flight track, is never auto-verified.
9. The page has no CAPTCHA. Honeypot, same-origin check and limits are in place.

## 11. Email templates (where a link to `/refund` could go)

Transactional email lives in one file, `lib/sendgrid.ts` (SendGrid over `@sendgrid/mail`), sent by
`app/api/webhooks/stripe/route.ts` and `lib/booking/checkout-composition.ts`:

- `sendBookingConfirmationEmail(booking)`: HTML footer block "For assistance, contact desk@simdream.co.il".
  Suggested addition: a line linking `${FACILITY_INFO.primaryDomain}/refund?ref=${booking.bookingReference}`.
- `sendVoucherActivationEmail(voucher)`: same idea with `?ref=${voucher.code}`.
- The new acknowledgement and desk emails are in `lib/refund/refund-notify.ts` (they already link the rules).

I did **not** edit `lib/sendgrid.ts` (shared, and the wording needs the owner's approval). Bookings and flight
tracks made through Wix send **Wix-native** emails that are edited in the Wix dashboard, not in this repo:
add a plain link to `https://www.simdream.co.il/refund` there.

## 12. Lines the coordinator must add

### GENESIS.md

`npm run docs:verify` currently reports these missing items, all introduced by this branch (the fingerprint
also needs a stamp after merging everything):

- Page route `/refund`; API routes `/api/refund-requests` (POST, GET) and `/api/refund-requests/lookup` (POST)
- Database: table `refund_requests`, migration `010_refund_requests.sql` (also change "migrations 001–009" to
  "001–010" and "schema.sql plus 003–009" to "003–010")
- Environment: `REFUND_NOTIFY_EMAIL`
- Library modules (mention each file name): `lib/refund/` `refund-policy`, `refund-types`, `refund-eligibility`,
  `business-days`, `israel-time`, `subscription-refund`, `refund-fields`, `refund-schema`, `refund-reference`,
  `refund-format`, `refund-presenter`, `refund-repository`, `refund-order-lookup`, `refund-notify`,
  `refund-service`, `refund-request-guard`, `copy/refund-copy-types`, `copy/fill-copy`, `copy/es`
- Components: `RefundRequestView`, `RefundPageHeader`, `OrderStep`, `ReasonStep`, `ReviewStep`,
  `ExpectationPanel`, `RefundStepper`, `RefundSuccess`, `RefundUnavailable`, `FormField`, `ChoiceCard`, `ContactLinks`

Suggested paragraph (routing table / modules section):

> **Refund requests (`/refund`)**: the only way to ask for a refund is an unlisted, noindex page
> (`app/(public)/refund`), reachable from the rules refund clause and confirmation emails and linked from no
> navigation, sitemap, llms.txt or structured data. A three-step form (order, reason, review) shows a live
> "what to expect" estimate from the pure policy module `lib/refund/` (`evaluateRefundEligibility`, numbers and
> clauses in `REFUND_POLICY`: free reschedule 24 h, 150 ILS fee, full refund within 14 days **and** 2 business
> days before the session, Israel time, Sunday to Thursday business days, no holiday calendar) and never
> refunds anything. `POST /api/refund-requests/lookup` verifies reference **and** email against the local
> store and reveals only package title, session date/time and order date, otherwise `{ verified: false }`.
> `POST /api/refund-requests` is same-origin, honeypot and rate limited, stores to `refund_requests`
> (migration 010; Supabase in production, memory in development), emails the desk and acknowledges the
> customer through SendGrid, and **fails closed with 503** and the desk contact when neither storage nor email
> can take the request. Copy lives in `lib/refund/copy/` in six languages.

### AGENTS.md

Add to section 2 (Canonical Routing) a bullet **Refund requests**: `/refund` is deliberately unlisted: no
Navbar, Footer, sitemap, llms.txt, structured-data or robots.txt entry, `robots: { index: false, follow: false }`
in its layout, linked only from the rules refund clause and confirmation emails
(`tests/unit/refund-unlisted.test.ts`). Refund numbers and clauses live only in `REFUND_POLICY`
(`lib/refund/refund-policy.ts`); the estimate shown to customers never approves or pays anything.

Add to section 6 (Runtime Database & Security) a bullet **Refund requests**: `POST /api/refund-requests`
returns 201 only when the request was stored or emailed to the team and answers 503 with the desk contact
otherwise; the order lookup reveals only title, session date/time and order date and only when reference and
email both match; logs never carry request data.

## 13. Verification run

See the handoff message. Commands: `npm run typecheck`, `npm run lint`, full `npx vitest run`, one
`npm run test:build`, then `PW_PORT=... npx playwright test --project=chromium tests/e2e/refund-form.spec.ts`
and `--project=a11y tests/a11y/refund-states.spec.ts tests/a11y/baseline-integrity.spec.ts`.

Source bytes added: `lib/refund/copy` 82 KB (six languages plus emails; 9.8 KB English to 15.3 KB Russian),
`lib/refund` logic 70 KB, `components/refund` 50 KB, routes and page 6 KB. The form copy is imported by client
components only (SSR layer once, not the route layer); the email strings are a separate 4 KB module so the
API route does not bundle the form copy. Measure with `npm run wix:build`.
