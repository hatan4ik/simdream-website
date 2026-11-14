# CRM migration: production → SimDream-Staging

Copies the production Wix CRM (contacts, labels and purchase history) to the SimDream-Staging
site, **deduplicating and merging duplicate contacts on the way**. Everything passes through
local files, so you can inspect and correct the data before anything is written.

```text
export (read-only)  →  dedupe (offline)  →  load (staging, dry run first)  →  verify
 production → files      merge + review         contacts → labels → orders        read back
                                                          └─ rollback (undo, by recorded ids)
```

## Safety model

| Rule | How it is enforced |
| :--- | :--- |
| Production is never written | The source client (`createSourceHttp`) only allows the six read endpoints it needs; any other call throws before it is sent. `tests/unit/crm-migration-http.test.ts` pins this. |
| Only staging is written | The target client has no site-id parameter: it is fixed to `CANONICAL_STAGING_WIX_SITE_ID` (AGENTS.md §6.7). The source client refuses to be built for the staging site. |
| Nothing is written by accident | `load` and `rollback` are dry runs unless `--apply` is given. A dry run never contacts Wix. |
| No customer is emailed | Contacts are created with consent "not set", and *Import Order* sends no notification, adjusts no stock and creates no invoice or contact. |
| Re-runs are safe | Every id created is written to `load-state.json` as it happens. A re-run skips what exists; a contact that already exists on staging is matched, never overwritten. |
| It can be undone | `rollback` deletes the imported orders and the contacts this tool created, by the ids it recorded. Contacts that existed before are never touched. |
| Customer data stays local | The data directory `.crm-migration/` is git-ignored, created private (0700) with 0600 files. `purge --yes` deletes it. |

## Setup

Create two Wix API keys (Wix account → API keys; keys are account-level and are sent with the site id):

| Variable | Used by | Permissions (from the method docs; if Wix answers 403, add the one it names) |
| :--- | :--- | :--- |
| `WIX_SOURCE_API_KEY` | `export` | Read contacts, read eCommerce orders, read Pricing Plans orders. **Read-only.** |
| `WIX_SOURCE_SITE_ID` | `export` | The production site id (the Editor site on simdream.co.il). |
| `WIX_ADMIN_API_KEY` | `load`, `verify`, `rollback` | Manage contacts, **Import orders** (`SCOPE.ECOM.IMPORT-ORDERS`), read orders. Same variable `scripts/migrate-wix-blog.ts` uses. |

Put them in `.env.local` (git-ignored) or export them in the shell. They are never printed.

## Run it

```bash
# 1. Read production into .crm-migration/ (read-only; Wix throttles, so it goes slowly on purpose)
npm run crm:migrate -- export

# 1b. Optional but recommended: the records tied to customers that `export` does not hold
#     (bookings, form submissions, full member records, order payments and refunds, coupons)
npm run crm:migrate -- export-related

# 2. Merge duplicates (offline, instant, repeatable). Read the summary, review.csv and merge-report.json
npm run crm:migrate -- dedupe

# 3. Optional: settle the held-back groups. Create .crm-migration/overrides.json, then run dedupe again
#    { "forceMerge": [["idA","idB"]], "neverMerge": [["idC","idD"]] }
#    To leave someone out of the migration (for example the owner's own test customer), by email:
#    { "excludeEmails": ["owner@example.com"] }
#    Every contact holding that email (main or additional) and every order they bought is skipped by
#    dedupe, load and the form rules. Nothing is deleted from the export or from Wix; remove the entry
#    and run dedupe again to bring them back (`excluded.json` lists what is left out).

# 4. See exactly what would be written (no network)
npm run crm:migrate -- load

# 5. Small real probe: 5 contacts and 5 orders, then look at them in the staging dashboard
npm run crm:migrate -- load --apply --limit 5

# 6. Everything (resumes where it stopped if interrupted)
npm run crm:migrate -- load --apply

# 7. Read staging back and compare with production
npm run crm:migrate -- verify

# Undo (dry run first), and delete the local customer data when finished
npm run crm:migrate -- rollback            # then --apply
npm run crm:migrate -- purge --yes
```

`status` prints the load state and the first failures. `--interval-ms N` changes the gap between
requests (default 250 ms).

## How duplicates are decided

Two contacts are *candidates* when they share an email (exactly, or after Gmail normalisation:
dots and `+tags` ignored) or a phone number (Israeli `050-…`, `+972 50 …`, `00972…` compare equal).
Main and additional emails/phones all count.

A candidate group is **merged automatically only if** it has at most 6 contacts (`--max-cluster`)
**and** every pair of named members could be one person (one name is a subset of the other:
"Dana" / "Dana Levi"). Anything else is **left unmerged and listed in `review.csv`**, because a
wrong merge of two people (siblings on one family phone, a company line) cannot be undone downstream.
Names that only share a word ("Dan Cohen" / "Dan Levi") are *not* compatible.

The merged person keeps the contact with the most orders (then site member, then reachable by
email, then most recently active, then oldest) as the survivor; fills blank fields from the others;
keeps every other email and phone as `additionalEmails` / `additionalPhones` (Wix allows 10 each);
unions addresses and labels; and records disagreements (for example two birthdates) in
`merge-report.json`. Every order of every merged contact is re-pointed at the survivor.

## What carries over, and what cannot

| Carried over | Not carried over (Wix does not allow it, or it is not data) |
| :--- | :--- |
| Name, email, phone, extra emails and phones, addresses, company, birthdate, locale, time zone | **Marketing consent.** `subscriptionStatus` is read-only; people who had opted in arrive as "not set". The report counts them so you can run a re-permission campaign. |
| Labels (recreated by name on staging and assigned) | **Site-member logins.** The 182 members arrive as ordinary contacts; passwords cannot be copied and no "set your password" email is sent. |
| Production contact id, kept as the new contact's `externalId` | Creation dates, last-activity history, `source`, segments. |
| **eCommerce orders** with original number, purchase date, status, payment status, totals, line items, discounts, tax, billing details, and the booked date | **Pricing Plan subscriptions.** There is no import API; they are exported to `plan-orders.ndjson` as a ledger only (the plan *labels* on contacts do carry over). |
| | **Bookings calendar entries.** Paid bookings appear as orders; the sessions are not recreated, so staging's live capacity is untouched. |

Imported orders keep production's catalog ids, which do not exist on staging: they read correctly as
history but their line items do not link to staging services.

## Related records: exported as an archive, not loaded

`export-related` reads what hangs off a customer but is not on the contact or in the order list. It is
read-only, needs `export` first (it asks about the exported orders), and writes private local files.
The `load` stage does not use them: Wix offers no way to import most of these, so they are the owner's
copy of what production holds.

| File | Holds | Why it matters |
| :--- | :--- | :--- |
| `bookings.ndjson` | every booking: contact, service, session, status, payment status | A paid booking reaches staging as an order only; the booking itself (and the Bookings tab of a contact) is not recreated. |
| `forms.json`, `form-submissions.ndjson` | the form definitions and every submission, with the contact each one created or updated | A birthday form's answers live here. One contact can hold many submissions about different people. |
| `members.ndjson` | full site-member records (login email, status, profile) | Contacts carry only a member id. |
| `order-transactions.ndjson` | the payments and refunds of every order | Orders carry a payment *status*, not the payment records. |
| `coupons.ndjson` | the site's coupons | Birthday and promotion codes. |
| `related-manifest.json` | counts, Wix's own totals, warnings, and what could not be read | Written last; `complete: false` means a count disagreed. |

Not exported, and said so in the manifest: **invoices** (the site uses the legacy invoices API), the
per-contact **activity log** (the API returned server errors when sampled) and **segment definitions**
(no public API found; each contact record still lists the ids of its segments).

### Birthday forms are applied by `dedupe`

When the related export is on disk, `dedupe` also applies the forms (product decision):

- **The newest form answer wins.** If the newest answer about a person disagrees with the birthday on their
  contact, the form answer is used; if the contact has none, it is filled in. Every change is listed in
  `birthday-changes.csv` (person, from, to, when). The date field is found from the form definition (the
  field mapped to the contact birthdate), not by name. Dates that are not real, or are in the future, are skipped.
- **An answer about someone else never touches the contact's birthday.** An answer is "about someone else" when
  its name is not compatible with the contact it was saved under (a parent entering a child; one contact many
  guests were entered under).
- **Such answers become new people only for contacts you name.** In `overrides.json`:
  `{ "splitSubmissionContacts": ["<contact id>"] }`, or `"all"`. Each distinct name becomes one new person with
  the newest answer's name and birthday and **no email or phone** (those belong to the contact, and Wix would
  match the new person to it). Their id is `birthday-form:<hash>`, also written as the contact's `externalId`.
  The count of answers left in the archive is in the `dedupe` summary.
- A birthday that looks like an unedited date-picker default (year 2000 and within days of the entry date) is
  *not* detected or removed; check `birthday-changes.csv` and the new people before `load`.

Wix is inconsistent about where a page's next cursor sits (`metadata` or `pagingMetadata`, and sometimes
no `hasNext`). The exporter follows the cursor from either field; `tests/unit/crm-migration-related.test.ts`
pins it, because reading only the first page is silent and looks complete.

## Known uncertainties (verified by the tool, not assumed)

*Import Order* is Beta and its documentation is inconsistent about the order number, `fulfillmentStatus`
and `balanceSummary`. The tool therefore:

1. sends the richest body (`full`) and, if Wix refuses it with a 4xx, retries that order with only the
   documented fields (`core`), listed in `status`;
2. checks **the first imported order** against its source and **stops** if Wix did not keep the number,
   purchase date, status or payment status. Inspect it, then continue with `--accept-mismatch` or roll back;
3. `verify` compares every order's number, date and total, and the sum of all totals, with the source.

## Before `--apply`

- **Owner sign-off.** `docs/WIX_HEADLESS_CUTOVER_RUNBOOK.md` §6 says the end-to-end booking tests run
  "without using live customer data". Copying real customers into staging is a deliberate exception:
  staging is a public headless host, and `.wix/topology.json` makes it the headless production target.
  Treat the privacy-law basis (Israeli privacy law, GDPR for EU customers) as the owner's decision.
- Check **Automations** on the staging site: nothing should fire on "contact created" or "order placed".
- Set the staging **order-number counter** above the highest imported number (printed by `load`) before real orders are taken.
- Run `purge --yes` when finished; the export is real customer data.
