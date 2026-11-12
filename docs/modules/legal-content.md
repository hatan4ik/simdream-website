# Module handoff: legal content (rules, privacy policy, checkout consent)

Workstream A2 "legal-content". Branch `feat/legal-content` (from `origin/main` 65fc3a5).

## 1. Purpose

1. `/rules` and `/privacy-policy` are now a complete, faithful port of the owner's Wix texts
   (`simdream.co.il/rules`, `simdream.co.il/privacy-policy`), with the original clause numbering.
2. The Wix "consent, release and waiver of rights" form (photo/video use) became rules clause 14,
   in all six languages. New clauses 13 (refund requests by form) and 15 (checkout consent record).
3. `lib/legal/` exports what the checkout needs: the six-language consent copy, the version
   stamps, link helpers, a loader for the full clause 14 text, and a server-side consent record builder.
4. Everything is split into small modules; the two page views are thin compositions.

No route was added or renamed (`app/(public)/rules/page.tsx` and `privacy-policy/page.tsx` are untouched, metadata unchanged).

## 2. Files

```
lib/legal/
  index.ts              public API (import from '@/lib/legal')
  versions.ts           LEGAL_DOCUMENT_VERSION = '2026-11-11', CONSENT_VERSION = '2026-11-11.1', currentLegalVersionStamp()
  policy-constants.ts   14 days, 2 business days, 24 h, 150 ILS, subscription refund rates 450/650/850 (rules 4.x as numbers)
  anchors.ts            RULES_SECTIONS (16 ids + numbers), LEGAL_PATHS (/rules, /rules#refunds, ..., /refund), legalPathAnchor()
  types.ts              LegalClause / LegalBody / PrivacyBody
  rules-headings.ts     section headings in 6 languages (always loaded, small)
  page-copy.ts          header/highlight/notice/contact copy of both pages in 6 languages
  consent-copy.ts       CONSENT_COPY (6 languages), splitConsentLabel(), CONSENT_LINKS, MEDIA_RELEASE_PATH, getConsentCopy()
  consent-record.ts     buildConsentRecord() (pure; the server stamps the time and versions)
  loaders.ts            memoised dynamic import() loaders, one module per language per document
  content/
    rules-core.{he,en}.ts          clauses 1-12 + privacy appendix (original Hebrew; faithful English)
    rules-extra.{he,en,ru,fr,ar,es}.ts   clauses 13-15 (refunds, media release and waiver, consent record)
    privacy.{he,en,ru,fr,ar,es}.ts       privacy policy, sections 1-6 original, 7-10 added
components/legal/
  RulesContentView.tsx, PrivacyPolicyContentView.tsx    thin compositions
  rules/    RulesHeader, RulesHighlights, RulesNotice, RulesToc, RulesSections, RulesBody, rules-section-icons
  privacy/  PrivacyHeader, PrivacySections, PrivacyBody, privacy-section-icons
  shared/   LegalDocumentHeader, LegalToc, LegalSectionCard, LegalClauseList, LegalContactBox,
            LegalLoadingFallback, LegalHashScroll
tests/unit/  legal-content, legal-consent-copy, legal-render, legal-versions, _support/legal-fixtures
tests/usability/legal-pages.spec.ts
```

The long clause text is read only through `loaders.ts` (`import()` per language). `RulesBody` /
`PrivacyBody` read the promises with React `use()` inside one `<Suspense>`; the server renders the
Hebrew default into the HTML and other languages load their chunk after the saved language resolves
(a small "Loading the full text" card for a moment). The boundary element is memoised in the two views so the
language provider's post-mount context update does not discard the server-rendered text (found and fixed during the browser check).

### Design note: one section component, not sixteen

The brief asked for "one section component per clause group". The groups differ only in data (icon,
heading, clauses), so a single data-driven `LegalSectionCard` renders all of them, driven by
`RULES_SECTIONS` and the per-language content. Special cases live in the data (`action` button for the
refund form, `items` for lists, `intro` for the media release recital). Splitting into sixteen near-identical files would
only duplicate markup.

## 3. Public API for the other workstreams

```ts
import {
  LEGAL_DOCUMENT_VERSION, CONSENT_VERSION,            // stored with every consent record
  getConsentCopy, CONSENT_COPY, splitConsentLabel,    // checkout text (6 languages)
  CONSENT_LINKS,            // { rules: '/rules', refunds: '/rules#refunds', privacy: '/privacy-policy' }
  MEDIA_RELEASE_PATH,       // '/rules#media-release'
  loadMediaReleaseSection,  // Promise<LegalSectionBody>: full clause 14 in the page language (expandable text)
  buildConsentRecord,       // server side: { ok, record } | { ok: false, missing }
  LEGAL_PATHS,              // includes refundForm: '/refund'
  REFUND_WINDOW_DAYS, REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION, FREE_RESCHEDULE_NOTICE_HOURS,
  RESCHEDULE_FEE_ILS, SUBSCRIPTION_REFUND_USED_SESSION_RATE_ILS,   // rules 4.x as numbers (refund form should reuse them)
} from '@/lib/legal';
```

### Checkout step (owned by another agent): what it must do

- Two separate checkboxes, unchecked by default, each with its own error. Do not merge them.
  1. `copy.rules`: label via `splitConsentLabel(copy.rules)` (parts of `{type:'text'}` and `{type:'link', key}`; links open
     `CONSENT_LINKS[key]` in a new tab with `rel="noopener noreferrer"`), `copy.rules.summary` under it, `ariaLabel` as the accessible name.
  2. `copy.media`: label, `summary`, `guardianNote` (booker is 18+; a minor's parent or guardian consents on the child's behalf),
     `optOutNote`, an expander (`expand`/`collapse`) that renders `loadMediaReleaseSection(language)` (sections carry
     `intro` and `clauses[].number/term/text/items`), `loadError` fallback with `openOnPage` linking `MEDIA_RELEASE_PATH`.
  3. `copy.recordNote` under both; `copy.heading`/`copy.intro` above.
- The server (`POST /api/checkout`) must call `buildConsentRecord({ language, rulesRefundsAndPrivacy, mediaReleaseAndWaiver })`
  with the two booleans from the client, reject the order with 400 when `ok` is false, and store `record` with the order
  (suggested: a `consent_record jsonb` column on orders, plus the same on subscription/voucher orders). Never accept versions or
  a timestamp from the client.
- Telemetry rule: `legalDocumentVersion`, `consentVersion` and timestamps render with `dir="ltr"` if shown.

## 4. Diff result: previous repo text vs. the owner's originals

### Rules (repo before this branch vs `rules.txt`)

The previous `RulesContentView` was a heavily reworked summary, not a port. Its clause numbers did not match the original, so
references such as "see clause 4" in the original text pointed at the wrong clause.

| Original | Previous repo (he/en) | Now |
|---|---|---|
| 1.1 The Center | present, plus postal code and Hebrew company name | original, values from `FACILITY_INFO` |
| 1.2 Simulator | "racing car" dropped, "official" added | restored |
| 1.3, 1.4 | present (1.4 gained "according to the booked package") | original |
| 1.5 gift voucher, 1.6 external voucher | merged into one 1.5 | separate again |
| 1.7 Rates | missing | added |
| 1.8 Accept | numbered 1.6 | 1.8 |
| 1.9 Force majeure, 1.10 The website | missing | added |
| 1.11 Customer, 1.12 Visitor | merged into one 1.7 | separate again |
| 2.1 to 2.3 | reworded and extended (visitors, calibration, security situation) | original |
| 3.1 | present | original |
| **3.2 voucher number entry, automatic cancellation** | **missing** (3.2 was the e-mail confirmation) | restored |
| 3.3 to 3.6 | present but renumbered 3.2 to 3.5 | original numbers |
| 3.7 acceptance declaration | missing | restored |
| **4.1 to 4.6** (free change 24 h, 150 ILS fee, full refund 14 days / 2 business days, no-show, shortened session, **subscription refund amounts 450/650/850**) | **all missing**; repo 4.1 cited the statutory 5% / 100 ILS fee (not in the original), 4.2 was voucher redemption (not in the original) | restored, including 4.6 |
| 5.1 to 5.5 liability and compensation | missing; repo section 5 was safety (instructor authority, no food or drink, epilepsy) | restored; repo's extra safety lines removed (see section 8) |
| **6.1 to 6.4** safety, medical limits, discipline, **6.4 photography opt-out** | missing | restored |
| 7.1 to 7.8 incl. **7.7 liability cap, 7.8 commercial use of footage** | missing | restored |
| 8.1 promotions | missing | restored |
| 9.1 to 9.3 incl. **9.3 cookies** | missing | restored |
| 10.1 accessibility (SI 5568 AA) | missing | restored |
| 11.1 force majeure, 12.1 disputes (14 days, Tel Aviv courts) | missing | restored |
| Appendix: privacy statement (collection, use, removal) | missing | restored (unnumbered, as in the original) |

The English text of the repo did not match the original either; it is replaced by a faithful translation of the
Hebrew (`rules-core.en.ts`). Obvious slips in the Hebrew original were tidied for the web (1.2 "סימולטור היא" to "הסימולטור הוא",
1.8 "אקטפט" to "אקספט (Accept)", consistent quotation marks); nothing else was changed. Company number, address, e-mail and the
age/timing figures of clauses 1.1, 3.1, 3.5, 3.6, 5.3, 10.1 come from `FACILITY_INFO` (a test pins this).

### Privacy policy (repo before vs `privacy-policy.txt`)

| Original | Previous repo | Now |
|---|---|---|
| 1 General (Privacy Protection Law 5741-1981, Amendment 13) | missing | restored |
| 2 Duty to inform: provision is voluntary, consequences of not providing | missing | restored |
| 3 Purposes as an exhaustive list | one paragraph on booking data | restored as list |
| 4 Third parties: **Wix.com, payment providers, Google / Meta** | missing; repo said "payment gateways PCI-DSS" | restored; Google/Meta line extended with "if enabled, only after your consent" (added words) |
| 5 Rights of access and correction/deletion | present (with phone) | original, contact e-mail |
| 6 Information security (Wix servers) | missing; repo section 3 was a PCI-DSS/TLS claim not in the original | restored; PCI-DSS claim removed |
| (not in original) cookies / local storage | repo section 2 | kept in substance as added section 9 |

## 5. What is original and what was added

Rules: clauses 1-12 and the appendix are original. **Added**: clauses 13 (all), 14.7, 15 (all), plus the sentence that defines
"the Company" and "the person filmed" at the start of clause 14, and the edits that make clause 14 acceptable by checkbox instead of by signature
(14.5 says "agree to the above" instead of "sign this document"; the ID number and signature lines are gone). Clauses 14.1 to 14.6 are otherwise the
Wix form, in its first person ("I hereby grant...").
Privacy: sections 1-6 are original, in all six languages (translations of the Hebrew). **Added**: section 7 (checkout data: booking details,
date of birth, consent record, refund requests), 8 (photos and video), 9 (cookies and local storage), 10 (version), the infrastructure-provider clause in 4, and the
"if enabled, only after your consent" words in 4. Every added clause carries `added: true` in the data; every one needing a lawyer carries
`needsLegalReview: true` (neither is rendered).

Date of birth (section 7): no module spec from workstream A5 existed when this was written, so the wording is generic ("used only to decide whether the birthday
discount applies; we keep only what is needed for that purpose"). If A5 stores only month/day and a discount flag, replace the sentence in `privacy.*.ts` with
"the full date is used only momentarily to check eligibility; only the month and day and whether the discount applied are kept" and bump `LEGAL_DOCUMENT_VERSION`.

## 6. Language coverage

| Part | he | en | ru, fr, ar, es |
|---|---|---|---|
| Rules 1-12 and appendix | original | translation (NEEDS LEGAL REVIEW) | official English text under the existing kind of notice, marked `lang="en" dir="ltr"` |
| Rules 13-15 (new) | original wording | translation | full translation (NEEDS LEGAL REVIEW) |
| Section headings, table of contents, page chrome | yes | yes | yes |
| Privacy policy | original | translation | full translation (NEEDS LEGAL REVIEW) |
| Checkout consent copy | yes | yes | yes (NEEDS LEGAL REVIEW) |

Decision: translating clauses 1-12 into ru/fr/ar/es was not done. It is about 12 KB of Hebrew per language, and the Wix worker has roughly
230 KB of headroom left. Adding a language later is one file (`content/rules-core.<lang>.ts` plus one line in `loaders.ts`); until then that language shows the English text.
The notices for ru/fr/ar/es are the previous notices extended by one sentence saying clauses 13-15 are in the visitor's language.

Also fixed on the way: the rules/privacy header printed the Hebrew company name on every language page (including Arabic). It now appears on the Hebrew page only.

## 7. Bundle weight (the Wix worker budget)

Source bytes (UTF-8) added by this branch: `lib/legal` 195,578 + `components/legal` 23,482 = 219,060; the two old monolithic views were 40,062, so net +179 KB source.
Minified per file (esbuild, `--charset=utf8`): new 163 KB, old views 33 KB, **net about +130 KB** in the bundle. Of the new code about 40 KB is always loaded
(consent copy 13 KB, page copy 13 KB, headings, loaders); the rest is one chunk per language and document, so one visitor downloads about 20-35 KB (Hebrew: 13 KB rules core + 7 KB extras + 7 KB privacy).
The server bundle holds every chunk, so the worker grows by the full amount. If the budget is tight, the cheapest cuts are `privacy.{ru,fr,es,ar}` (about 33 KB) and
`rules-extra.{ru,fr,es,ar}` (about 30 KB), falling back to English for those languages.

## 8. Decisions, assumptions, things removed

- **Refunds clause (13)**: refund requests only through `/refund` (linked from 13.1). 4.1-4.6 are restated by reference with their figures taken from `policy-constants.ts`.
  13.3 "the decision is made on the request" is from the brief. **13.4 "refund goes to the payment method used for the order" is not in the source: NEEDS LEGAL REVIEW.**
- **Removed because they are not in the owner's original**: the statutory cancellation-fee clause (repo 4.1, 5% or 100 ILS), voucher redemption by prior booking (repo 4.2),
  "no food or drink in the cockpit" and the photosensitive-epilepsy entry ban (repo 5.1, 5.2), the PCI-DSS/TLS claim and the phone number in the privacy policy. If the owner wants any of them,
  add them as new numbered clauses (16+) with a version bump; do not renumber.
- **4.6 amounts**: kept at the original 450 / 650 / 850 ILS. The registry list price of the 60-minute session is 690, so the 60-minute rate in the original differs from today's list price. Owner to confirm.
- **9.3** (rules) says the site uses cookies "for operational and statistical purposes"; the privacy policy (section 9) says no analytics or advertising cookies are set by default and that such tools load only after consent.
  Both are true only if the cookie consent module gates them; confirm when that module lands.
- **Footer link**: privacy section 9 refers to a "Cookie settings" link in the footer. The cookie consent workstream must use these labels: he "הגדרות עוגיות", en "Cookie settings", ru "Настройки cookie",
  fr "Paramètres des cookies", ar "إعدادات ملفات تعريف الارتباط", es "Configuración de cookies" (they are quoted in `privacy.*.ts` section 9).
- Version stamps: `LEGAL_DOCUMENT_VERSION` is shown in the header of both pages (`data-legal-version`). `tests/unit/legal-versions.test.ts` pins a digest of the legal wording and of the consent wording and fails when the text changes without a new version.
  Any other branch that changes `FACILITY_INFO` values quoted in the legal text (address, e-mail, registration number, age and timing rules) will trip the digest: bump the version and re-pin.
- `/refund` is linked from clause 13.1 and the checkout only; it must stay out of navigation, sitemap and `llms.txt` (not touched here).
- Localized plural forms (Russian "рабочих дня", Arabic "أيام عمل") are written for the current figures (2 business days, 24 hours, 14 days). If a figure in `policy-constants.ts` changes, re-check the wording in all six languages.

## 9. Passages marked NEEDS LEGAL REVIEW

1. All translations: English rules core, English/ru/fr/ar/es versions of clauses 13-15 and of the privacy policy, and the consent copy in en/he/ru/fr/ar/es (he is the owner's language for the waiver but the consent summaries are new).
2. Rules 13.4: refunds go to the original payment method (not in the source).
3. Rules 14.7: clause 6.4 (written opt-out) stays available despite the "irrevocable" grant in 14.1.
4. Rules 15.2: the content of the consent record (versions, time, consents given). 15.3: the booker declares being 18+, a parent or guardian consents for a minor. 15.4: ticking the box replaces a signature on the Wix form.
5. Rules clause 14 definitions sentence ("the Company" is the Center of 1.1; "the person filmed") and the adaptation of 14.5/14.6 (no signature or ID number).
6. Privacy section 7 (booking details, date of birth, consent record, refund requests), 8 (photos and video), 9 (cookies, local storage, "Cookie settings"), 10 (version), the added infrastructure-provider clause in 4, and the "if enabled, only after your consent" words in 4.
7. Notices for ru/fr/ar/es on the rules page (sentence about clauses 13-15 added).
8. Consent summaries: "without payment to you", "this agreement includes waiving claims over that use", and the refund summary that restates 4.3.

## 10. Legal risk notes for the owner (not legal advice; for counsel)

- **Bundled consent.** Making the media release and waiver of claims a mandatory condition of booking is the weakest part. Under the Israeli Protection of Privacy Law, use of a person's image for
  commercial purposes needs real consent; under GDPR (EU tourists), consent that is a condition of the service and bundled with the contract is presumed not freely given (Art. 7(4)), and withdrawal must be possible (Art. 7(3)).
  Standard-form terms can also be reviewed under the Israeli Standard Contracts Law. Mitigations applied: two separate checkboxes (rules/refunds/privacy vs media release), each unchecked by default (the checkout must implement this),
  a one-sentence plain-language summary before the full text, the full clause one click away, the written opt-out of rules 6.4 kept (14.7), and a record of version and time. **Stronger options** for counsel to weigh:
  make the media release optional (the booking still works if declined), or limit the mandatory part to filming for control purposes (6.4).
- **"Irrevocable" vs opt-out.** 14.1 grants an irrevocable permission, while 6.4 lets a customer ask not to be filmed. The text does not say whether footage can be withdrawn after the visit. GDPR requires a withdrawal path for consent-based processing.
- **Minors.** The checkout checkbox is ticked by the booker, who may not be the child's parent or guardian (a grandparent or a friend may book). Consent for a child's image needs the guardian. Consider asking at checkout whether the booker is the parent or guardian of participating minors, and a signed or counter confirmation on arrival.
  Children 10-15 must be accompanied by an adult (3.6), which helps but is not a consent record.
- **Companions and other adults.** Visitors (1.12) and adult companions who are filmed but did not book have no consent record; the Wix form had a per-person signature with ID number. A checkbox is weaker evidence than a signed form with ID. Decide whether signage or an on-site form is needed.
- **Advance waiver of statutory claims.** 14.4 waives claims "including" the Privacy Protection Law and the Defamation Law in advance, in a standard-form contract. Counsel should check enforceability, as for the liability cap in 7.7.
- **Refund terms.** The original 4.3 and 4.4 are stricter than what the previous page cited (statutory 5% / 100 ILS cancellation fee under the Consumer Protection Law). Counsel should check 4.1-4.6 against the distance-transaction cancellation rules. The text is the owner's; this module only ports it.
- **GDPR gaps in the original privacy policy** that were not invented away: no retention periods, no legal bases, no named controller contact beyond the e-mail, no mention of international transfers (Wix, payment processors, cloud hosting), no right to lodge a complaint. Section 4 now lists infrastructure providers generically; the owner should confirm the real list (the code base uses Wix, Stripe, Supabase, Cloudflare, SendGrid and Google Places, among others).
- **Translations** must be reviewed by counsel before being relied on, especially clause 14 in ru/fr/ar/es, and counsel should decide whether to add a "Hebrew prevails" sentence: the existing notice only says the rules are "legally fixed in Hebrew and English", and no such sentence was added because it is not in the source.
- Rules 1-12 remain English-only for ru/fr/ar/es. A tourist who reads Russian accepts "rules and regulations" whose long body is in English. The notice discloses it; full translations would be safer.

## 11. Tests and verification

New unit tests (`tests/unit`): `legal-content` (76: original clause numbers 1.1-12.1 in he and en, 4.x figures and 4.6 rates, restored clauses 3.2/6.4/7.8/9.3, registry values, clauses 13-15 structure and parity in six languages,
media release completeness, privacy structure and parity, cross-script checks), `legal-consent-copy` (49: identical key sets in six languages, no empty strings, cross-script, accessible names, age and guardian notes, label links,
anchors exist, consent record), `legal-render` (65: all sections, anchors, lang/dir of the English fallback, ToC, version stamp, header script isolation, contact box), `legal-versions` (5: constants and wording digests).
`tests/usability/legal-pages.spec.ts`: both pages in six languages (sections, ToC, deep link, version, refund link, fallback marking, no cross-script, 320 px overflow).

Run in this worktree (results in the final report): `npm run typecheck`, `npm run lint`, `npx vitest run`, a dev-server check of both pages in six languages and three themes with axe, and one `npm run test:build` followed by the targeted Playwright runs.

## 12. Lines for the files I must not edit

**GENESIS.md** (module list): "`lib/legal/` (+ `components/legal/{rules,privacy,shared}`): the versioned rules, privacy policy and checkout consent copy. `/rules` clauses 1-12 are the owner's Hebrew original with its numbering, 13 refunds by form (`/refund`), 14 media release and waiver (the Wix form), 15 checkout consent record. Long text is one module per language and document behind `import()`. `CONSENT_COPY` is the six-language checkout copy; `buildConsentRecord()` builds the server-side record. Run `npm run docs:genesis:stamp` after review: the source fingerprint changed."

**AGENTS.md** (new section "9. Legal content, consent and versions"):
1. The rules keep the owner's clause numbering (1-12 plus appendix); new clauses are appended (13+) and existing numbers never change. Refund requests go through `/refund` only (clause 13); `/refund` stays unlisted.
2. Legal wording lives in `lib/legal/content/*`, one module per language and document, loaded with `import()`; never import those modules directly. Page-only copy is `lib/legal/page-copy.ts`.
3. Any change to legal or consent wording bumps `LEGAL_DOCUMENT_VERSION` / `CONSENT_VERSION` in `lib/legal/versions.ts`; `tests/unit/legal-versions.test.ts` enforces it.
4. The checkout shows two separate, unchecked checkboxes (rules + refund rule + privacy; media release and waiver) with the copy from `CONSENT_COPY`, and the server stores `buildConsentRecord()` with the order.
5. Legal translations are flagged NEEDS LEGAL REVIEW until counsel signs off; no Hebrew text on non-Hebrew pages.

**Footer / cookie consent workstream**: the privacy policy quotes the "Cookie settings" link labels listed in section 8.
**Refund form workstream**: reuse `policy-constants.ts` for the 14 days / 2 business days / 24 h / 150 ILS terms and link back to `/rules#refunds`.
