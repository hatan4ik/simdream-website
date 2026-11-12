# Cookie consent module (workstream A4)

Research answer plus a consent-management module that is useful whichever way the owner decides. The module adds no tracker
and sets no cookie. Everything below was checked against the code in this branch (base `origin/main` 65fc3a5) and, for Wix,
against the Wix documentation tools on 2026-11-11. Legal conclusions are marked **NEEDS LEGAL REVIEW**: this is engineering
research, not legal advice.

## The owner's three questions, in one paragraph each

1. **Integrate with the Wix cookies backend?** No, and there is nothing to integrate with today. Wix's cookie-consent runtime
   (`window.consentPolicyManager`) only exists on a page that loads Wix's site script, and this project does not load it
   (Findings 4). Wix itself tells headless owners, in its Editor-to-headless checklist, that the Editor consent banner "doesn't
   carry over" and to "add a visible consent banner or cookie settings link if your legal requirements require it". A
   first-party frontend consent module is the documented route. A small, flagged adapter is included for the day the site
   script is added (`lib/consent/wix-sync.ts`).
2. **Frontend-only banner "with some language like Israeli law requires"?** Israeli law has no cookie statute. What applies is
   the Privacy Protection Law 1981 (as amended by Amendment 13, in force 14 August 2025): a notice duty when personal data is
   requested or collected, and informed consent for uses beyond the service, which the Privacy Protection Authority (PPA) says
   should be opt-in for third-party commercial cookies (Findings 5). Today the site sets no cookie and runs no analytics or
   advertising, so nothing needs opt-in consent: the truthful thing is a short notice plus a way back to it. That is exactly the
   banner's default ("informational notice" mode). The day Google Analytics or Meta Pixel is added the same module becomes a
   real opt-in choice. **NEEDS LEGAL REVIEW** before relying on either mode.
3. **How do we track customers without the Wix cookies backend?** Two different things are being asked. *Customers* (people who
   book, pay or sign in) are recorded by the business systems (Wix Bookings/Members, Stripe, Supabase) as the contract data
   they are; that needs no cookie. *Anonymous visitors* are not tracked at all today. If the owner wants a conversion funnel,
   the lowest-exposure option is first-party, cookieless, aggregate counts of events the server already sees (slots requested,
   checkout created, payment confirmed), with no identifier and no personal data; GA4 and Meta Pixel are opt-in add-ons for
   advertising attribution (Findings 6).

## Findings

### 1. What this app stores on a visitor's device, per page type

Method: `grep` for `localStorage`, `sessionStorage`, `document.cookie`, `Set-Cookie`, `cookies()`, `<script>`, `next/script`,
`<iframe>`, `fetch(` to non-same-origin hosts, remote images, plus a read of `lib/wix/`, `lib/auth/auth-context.tsx`,
`app/wix/members/callback/page.tsx`, `proxy.ts` and the Wix SDK source in `node_modules/@wix/sdk` (1.21.18).

| Page type | Written to the device | Third parties the browser contacts | Class |
| :--- | :--- | :--- | :--- |
| **Every page** | `localStorage simdream_lang` (written by `LanguageProvider` on first load, so even without a click: `lib/i18n/language-context.tsx:55-58`); `simdream_ui_theme`, `simdream_cockpit_tone` (only when the visitor switches); **new** `simdream_consent` (the consent record: `{version, decidedAt, categories}`, no identifier) | Blog/media images from `static.wixstatic.com` (Wix CDN, where a page shows one); reviewer avatars from `lh3.googleusercontent.com` when the Google reviews dropdown renders (the reviews text itself is fetched server-side) | Preference (language, theme) and necessary (consent record). No analytics, no marketing |
| **/contact** | nothing extra | **Google Maps iframe**, always loaded (`FACILITY_INFO.googleEmbedUrl`, `app/(public)/contact/page.tsx`, `loading="lazy"`). Google receives the IP address and referrer; a cookieless `curl` of the embed document on 2026-11-11 returned no `Set-Cookie`, but that does not prove the map scripts and tiles it loads set none: verify in browser DevTools | Third-party content, not strictly necessary |
| **/book, /vouchers, /subscriptions** | `sessionStorage simdream_cached_voucher` (voucher code); on the first browser-side Wix call (coupon or gift-card apply, hosted-checkout draft, subscription redemption) the Wix client mints **anonymous visitor tokens** and `lib/wix/member-client.ts` keeps them in `sessionStorage simdream_wix_member_tokens` (tab-scoped, no cookie) | `https://www.wixapis.com` (token, carts, bookings; `connect-src`); on submit a redirect to the **Wix-hosted checkout** (`redirects.createRedirectSession`), which in a Wix-managed project stays on the same domain, or to `checkout.stripe.com` (`form-action`) | Strictly necessary for the service the visitor asked for |
| **/login and `/wix/members/callback`** | `sessionStorage simdream_wix_member_oauth_data` (PKCE state) then the member tokens; after login the SDK's `sessions.syncToWixPages()` (`node_modules/@wix/sdk/build/auth/pre-warm-cookie.js`) loads a **hidden iframe** to a Wix redirect-session URL so Wix can set its own visitor cookie for its hosted pages, and writes `localStorage wixRedirectSessionLastPreWarm` (7-day throttle) | Wix login and the Wix pages domain | Necessary (authentication). The hidden iframe is Wix's mechanism, not ours |
| **/dashboard** | reads the member tokens above; no new storage | `GET /api/my-bookings` (same origin) with the Wix member access token | Necessary |
| **Non-production only** | `localStorage simdream_demo_user` | none | Demo mode, not shipped |
| **Conditional** | `supabase-js` persists its session in `localStorage` only when `NEXT_PUBLIC_SUPABASE_*` is set; the production Wix branch of `AuthProvider` does not use it | `*.supabase.co` | Necessary if used |
| **Server (all routes)** | **No cookie.** `grep` finds no `Set-Cookie`, `cookies()` or `document.cookie` in `app/`, `lib/`, `components/`, `proxy.ts`; `tests/security-web/information-disclosure.spec.ts` asserts `context.cookies()` is empty; `app/layout.tsx` states the no-tracking-identifier rule | `proxy.ts` only sets the CSP and the request header `x-nonce` | none |

Not present anywhere: `next/script`, a third-party `<script src>`, Google Analytics/Tag Manager, Meta Pixel, Hotjar, a social
embed, a chat widget, Google Fonts (`font-src 'self' data:`). Outbound links (Instagram, Facebook, YouTube, WhatsApp, Waze)
load nothing until clicked. Wix-hosted pages (login, checkout) and Stripe Checkout are separate sites with their own cookies.
Wix lists the cookies it sets on Wix pages, all marked "Essential" by Wix (`XSRF-TOKEN`, `svSession`, `bSession`,
`wixSession`, `oAuthState`, ...): <https://support.wix.com/en/article/cookies-and-your-wix-site>. Stripe calls its own
fraud-prevention cookies "essential": <https://stripe.com/cookies-policy/legal>. Whether each Wix cookie is *strictly*
necessary in the EU sense (for example `bSession`, "system effectiveness measurement") is a judgement for counsel.

Consequence for the language bug-in-waiting: `simdream_lang` is written on the first page load without any click. The EU
"user interface customisation" exemption (WP29 Opinion 04/2012 section 3.6) covers a preference the user *explicitly
requested*. Recommend writing it only when the visitor picks a language (one line in `lib/i18n/language-context.tsx`, not in
this module's scope).

### 2. CSP today (`proxy.ts`, per-request nonce, `script-src 'self' 'nonce-…' 'strict-dynamic'`)

`img-src 'self' data: blob: https://lh3.googleusercontent.com https://static.wixstatic.com`; `connect-src 'self'
https://*.supabase.co wss://*.supabase.co https://www.wixapis.com`; `frame-src https://www.google.com
https://maps.google.com`; `form-action 'self' https://checkout.stripe.com`. No analytics host is allowed, so no analytics
script could run even if one were added by mistake.

### 3. The legacy Editor site

`privacy-policy.txt` (section 4) disclosed "Google / Meta: statistics and advertising services (subject to the Cookies policy)"
and `rules.txt` clause 9.3 says the site "uses cookies for operational and statistical purposes". The headless site runs none
of that. Check the Wix dashboard (Marketing Integrations) to see whether Google Analytics, a Meta Pixel or Google Ads tags were
actually connected to the Editor site: if they were, ad campaigns and audiences built on them stop receiving data after the
cutover (Open decisions 1).

### 4. Wix Headless specifics (each claim has its doc page)

This project is a **Wix-managed headless project built with a framework other than Astro** (`wix.config.json`
`projectType: "Site"`, Next.js on a Cloudflare-Worker bundle). Wix calls this "limited integration".

* **No automatic Wix consent, analytics or auth.** Capability table: "Analytics page views: when site scripts are loaded",
  "Analytics event tracking: not available", "Automatic authentication: not available" for non-Astro projects. We own the
  session. <https://dev.wix.com/docs/go-headless/wix-managed-headless/about-supported-frameworks>
* **`trackEvent()` is Astro-only**; the scripts that deliver events "are injected when Wix builds your project, which doesn't
  happen for projects built with another web framework". <https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/feature-guides/track-analytics-events>
* **The only way to get Wix Analytics page views, the project's cookie-consent policy, and connected GA/GTM in a non-Astro
  project is one script tag** (`manage.wix.com/_api/headless-business-setup/v1/headless-business/site-script.js`,
  `data-client-id=<appId>`). It stores an anonymous visitor token in `localStorage` (`wixSiteScript:<clientId>`), sets no
  cookie for it, and needs CSP entries for `manage.wix.com`, `static.parastorage.com`, inline scripts, `www.wixapis.com`,
  `frog.wix.com`. <https://dev.wix.com/docs/go-headless/self-managed-headless/site-scripts/load-site-scripts-on-a-self-managed-project>
  This repo does not load it (no such host in `proxy.ts`, none in the code).
* **Default consent policy is opt-out.** On a managed headless site every category (`essential`, `functional`, `analytics`,
  `advertising`, `dataToThirdParty`) is granted "until you configure a different site-level default or a visitor makes a
  choice", so analytics can set a cookie before any consent UI. Fix: set a restrictive site default with *Update Consent
  Policy* (`POST https://www.wixapis.com/site-properties/v4/properties/policy`, body `{"consentPolicy": {"essential": true,
  "functional": …, "analytics": false, "advertising": false, "dataToThirdParty": false}}`) or call
  `window.consentPolicyManager.setConsentPolicy(...)` early, after waiting for the `consentPolicyManagerReady` event.
  `setConsentPolicy` "changes take effect after the page is refreshed". <https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/feature-guides/manage-cookie-consent>,
  <https://dev.wix.com/docs/sdk/host-modules/site/consent-policy-manager/set-consent-policy>,
  <https://dev.wix.com/docs/api-reference/business-management/site-properties/properties/update-consent-policy>
* **There is no Wix banner for a custom frontend.** Wix's cookie banner is the Usercentrics-powered one configured in the
  dashboard Privacy Center for Wix sites (<https://support.wix.com/en/article/displaying-a-cookie-banner-on-your-site>); the
  Cookie Banner Settings API (`@wix/consent-policy`) only configures that banner. The Editor-to-headless checklist says the
  banner "doesn't carry over" and tells owners to add their own banner or cookie-settings link.
  <https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/get-started/post-migration-checklist-wix-studio-and-editor-sites-to-headless>
  UNVERIFIED: whether the Privacy Center banner also renders on the Wix-hosted checkout/login pages of this project; test on
  SimDream-Staging before assuming either way.
* **Visitor and member sessions are ours.** The SDK keeps tokens in memory unless the app stores them; Wix's own example
  stores them in `localStorage` or a cookie; this app uses `sessionStorage` (tab-scoped, no cookie).
  <https://dev.wix.com/docs/go-headless/authentication/visitors/authenticate-visitors-js-sdk>
* **Wix-hosted pages** (checkout, login) are redirects; "in Wix-managed headless projects, visitors stay on the same domain".
  Wix's cookies appear there, not in our code. <https://dev.wix.com/docs/go-headless/business-solutions/wix-hosted-pages/about-wix-hosted-pages>

So **nothing must be integrated with a "Wix cookies backend" for tracking**: tracking is not done by Wix on this frontend today,
and first-party consent in the frontend is sufficient. An adapter is only meaningful if the site script is added.

### 5. Law (summary; sources; conclusions marked)

**Israel.**
* No cookie-specific statute: "Israeli law does not contain specific legislation regulating the use of cookies"; the Privacy
  Protection Law, 5741-1981 (PPL) applies where cookies process personal data, especially when shared with third parties.
  Consent may be express or implied; mere placing or reading of cookies needs no consent; operational cookies are reasonably
  assumed not to need explicit consent. DataGuidance, March 2024: <https://www.dataguidance.com/notes/israel-cookies-similar-technologies>;
  Linklaters Data Protected, updated August 2026: <https://www.linklaters.com/insights/data-protected/data-protected---israel>
* **Amendment 13** entered into force **14 August 2025** (Knesset approved 5 Aug 2024): wider definitions, administrative
  fines, a DPO duty for some entities (grace period to 31 Oct 2025). <https://www.pearlcohen.com/israel-significant-amendment-to-the-privacy-law-takes-effect/>.
  The enacted wording of "personal information" (reported as covering "online identifiers") was not read from the statute:
  NEEDS LEGAL REVIEW.
* **Notice (s.11):** a request for personal data must come with a notice (is it mandatory, purposes, recipients, controller
  identity and contact, access and correction rights). This is what the privacy policy (A2) carries.
* **PPA, 2020:** "the use of cookies ought to be subject to the user's separately given informed consent through an opt-in
  consent mechanism" (non-binding recommendation in its payment-technologies opinion). <https://www.pearlcohen.com/the-israeli-privacy-protection-authority-recommends-obtaining-user-consent-to-cookies/>
* **PPA consent opinion, final 25 February 2026** (interpretive, guides supervision and enforcement; the text is at
  `https://www.gov.il/he/pages/consent-2026`, which returned HTTP 403 to automated fetches, so it was read through law-firm
  summaries): s.11 is "only a minimum"; consent must be informed and freely given; avoid "dark patterns"; banners and
  pop-ups with choices are the expected digital form; continued browsing may imply consent only where reasonably connected to
  the service, otherwise opt-in is preferred; pre-ticked boxes are "suspicious"; withdrawal should be possible.
  <https://www.gornitzky.com/israeli-privacy-protection-authority-publishes-new-guidance-on-obtaining-consent/>,
  <https://www.pearlcohen.com/israeli-privacy-regulator-issues-position-paper-on-valid-consent/>
* **Practical exposure:** several Israeli class actions over cookies; one settled with a company committing to an opt-in
  banner and NIS 140,000 (DataGuidance note above). Civil claims without proof of harm up to NIS 50,000 are reported
  (Linklaters). Direct-marketing messages (email, SMS, WhatsApp) are a separate regime (Communications Law s.30A, prior
  consent): <https://www.law.co.il/en/news/2016/08/19/israeli-anti-spam-law-amended-for-first-time/>.
* **Conclusion (NEEDS LEGAL REVIEW):** with no analytics, advertising or third-party sharing beyond processors, no opt-in
  consent is required in Israel for what this site stores; the duties are the notice in the privacy policy and security.
  Adding Google/Meta statistics or advertising moves the site into the PPA's opt-in recommendation and the class-action
  risk, so those should load only after an opt-in.

**EU/EEA visitors** (the site is offered in French and Spanish; tourists are realistic).
* ePrivacy Directive 2002/58/EC art. 5(3): storing or reading information on a device needs consent unless strictly necessary
  to provide a service the user explicitly requested. <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0058>
  (the page serves the original text; art. 5(3) was amended by 2009/136/EC).
* WP29 Opinion 04/2012 (WP194): UI-customisation (language) storage is exempt when the user explicitly requested it (s.3.6);
  first-party analytics is **not** exempt but low-risk with opt-out and anonymisation (s.4.3).
  <https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp194_en.pdf>
* CNIL: audience measurement is exempt only if purpose-limited, no cross-site tracking, IP truncated, identifiers at most 13
  months, and an opt-out; most large vendors fall outside it. <https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications>
* CJEU C-673/17 *Planet49*: a pre-ticked box is not valid consent
  (<https://cms.law/en/int/legal-updates/time-to-update-your-cookie-consent-and-policy!-cjeu-says-pre-ticked-checkboxes-are-not-valid>).
  EDPB Cookie Banner Taskforce (Jan 2023): no reject button on the first layer is an infringement for most authorities
  (para. 8 onward), pre-ticked boxes do not give valid consent (para. 10), and a permanent link or icon to withdraw consent
  is expected (paras. 31-32). <https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf>
  This is why the choice banner gives "Accept all" and "Reject non-essential" the same style and size, with nothing pre-ticked.
* **Does GDPR reach a Tel Aviv business?** Only if it offers services to people in the Union or monitors their behaviour (art.
  3(2)). EDPB Guidelines 3/2018 s.2(b): mere accessibility of a website is not enough; indicators include a language or
  currency other than the trader's own and "the international nature of the activity, such as certain tourist activities".
  Six languages incl. French and Spanish and a physical tourist-type activity are indicators; prices only in shekels and a
  single Tel Aviv venue point the other way. <https://edpb.europa.eu/sites/edpb/files/files/file1/edpb_guidelines_3_2018_territorial_scope_en.pdf>
  **NEEDS LEGAL REVIEW.** Practical reading: with nothing non-essential stored, EU visitors need no consent either; if
  GA4/Meta are added and any EU-targeted advertising runs, treat the EU rules as applicable.

### 6. Tracking options, ranked (least legal exposure first), with what each does to the CSP

None of these is enabled by this module; the CSP lines describe what `proxy.ts` would need.

| # | Option | What the owner gets | Exposure | CSP change in `proxy.ts` |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **No tracking** (today) | Orders, bookings, payments from the business systems only; no visit or funnel-top data | Lowest; notice-only | none |
| 2 | **First-party cookieless aggregate funnel**, counted server-side at the boundaries the server already sees: `/api/slots` (slots viewed), `/api/checkout` and `/api/wix/bookings/checkout` (checkout started), the signature-verified payment webhook (paid), `/book` request referrer host and language, all aggregated per day, no IP kept, no identifier, no personal data | Real conversion funnel and channel mix (referrer host, UTM source) for the booking path, not unique visitors | Low: no device storage (so ePrivacy art. 5(3) is not engaged) and no personal data; confirm with counsel (**NEEDS LEGAL REVIEW**). Needs a store: the Wix-hosted worker has no Supabase variables today, so counters need Supabase or Wix Data | none (same-origin `connect-src 'self'`) |
| 3 | **Wix Analytics via the site script**: page views only (`trackEvent()` is not available for non-Astro projects) | Page views in the Wix dashboard; connected GA/GTM/Pixel forward from it | Medium: default policy is all-granted, so set a restrictive site default first | `script-src`: `manage.wix.com`, `static.parastorage.com`; `connect-src` + `frog.wix.com` (`www.wixapis.com` is already allowed); inline scripts need the nonce (Wix doc) |
| 4 | **Server-side events** to GA4 Measurement Protocol / Meta Conversions API from the payment confirmation | Purchase counts and revenue in GA4/Meta without a browser tag; no attribution to a campaign unless a click id was captured on landing, which is itself tracking and needs consent | Low-medium (sends data to a US ad platform; hashed email would be personal data) | none in the browser (server-to-server) |
| 5 | **Consent-gated GA4 with Consent Mode v2** (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`, default denied, `gtag('consent','update')` after the visitor chooses) and **Meta Pixel** (`fbq('consent','revoke')` then `'grant'`) | Full acquisition, funnel and ad attribution, with modeled conversions for visitors who decline | Highest, but compliant when loaded only after opt-in; needs the banner in *choice* mode and the Wix/Google/Meta sub-processors in the privacy policy | Per Google's CSP guide, Analytics-only: `script-src-elem https://www.googletagmanager.com`, `img-src https://www.googletagmanager.com https://*.google-analytics.com`, `connect-src https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com` (<https://developers.google.com/tag-platform/security/guides/csp>); load the tag with `loadScriptWhenConsented({category:'analytics', src, nonce})` (nonce + `strict-dynamic` keeps it allowed). Meta Pixel hosts (`connect.facebook.net`, `www.facebook.com`) are **not confirmed from Meta's docs here**: verify before enabling |

Which gives the owner conversion/funnel measurement with the least legal exposure? **Option 2**, because the owner's question
is about the booking funnel and the server already sees each step. Option 5 is the right add-on only if Meta/Google ads are
run and need attribution.

## Recommendation

1. **Ship the module in notice mode** (the default). It tells the truth in six languages, costs one line of footer, and adds the
   reopen path regulators and the PPA's February 2026 opinion expect. Note plainly: **a banner that gates nothing is only
   informational.** If the owner prefers no banner at all, remove `<ConsentManager />` from `app/layout.tsx`, keep the footer
   link and the privacy-policy section; the Israeli duties are met by the policy (NEEDS LEGAL REVIEW).
2. **Do not integrate with Wix's consent backend now.** There is nothing on the page to talk to. Keep `NEXT_PUBLIC_CONSENT_WIX_SYNC`
   off. If the Wix site script is ever added: first set a restrictive site default consent policy, then turn the flag on.
3. **If measurement is wanted, build option 2 first**, then option 5 only for ads.
4. **Gate or remove the one real third party that is always on: the Google Maps iframe on `/contact`** (click-to-load
   placeholder using `useConsentCategory` or a plain button). With that done the "Map on the contact page" line in the
   dialog can go.
5. Write `simdream_lang` only on an explicit language choice, and give phones a way back to Cookie settings (footer is
   `hidden md:block`).

## Open decisions (owner)

1. Does the owner want visitor analytics or advertising measurement at all? Check first whether GA/Meta/Google Ads were live on
   the Editor site (Findings 3): the old privacy policy says so.
2. If yes: option 2 (server aggregate funnel) or option 5 (GA4/Meta, opt-in), who owns the GA4 property and Pixel id, and where
   the counters live (Supabase variables on the Wix worker, or Wix Data).
3. Notice banner, or no banner and a footer link only? (Legal review.)
4. Google Maps on `/contact`: keep always-on, or click-to-load?
5. Approve the wording in `components/consent/consent-copy.ts` (six languages, not legal text) and align it with A2's privacy
   policy; add a reference to this module's Cookie settings entry there.
6. Re-ask period: 12 months (`CONSENT_RENEWAL_MONTHS`) and version bumps (`CONSENT_VERSION`).
7. Whether a server-side consent log is wanted once analytics exists (GDPR art. 7(1) "demonstrate consent"; the Wix banner
   logs visitor IP, time and choices, this module keeps the record only in the visitor's browser).
8. Counsel to confirm: GDPR applicability, the strictly-necessary status of Wix `bSession`/`fedops` cookies on hosted pages,
   and the enacted Amendment 13 definition of personal information.

## Module reference

### Files

* `lib/consent/` (pure, no React): `types.ts` (categories, record), `config.ts` (constants, env), `record.ts` (build, parse,
  validity, mode), `store.ts` (`createConsentStore`, injectable storage and clock), `default-store.ts`, `gating.ts`
  (`whenConsented`, `loadScriptWhenConsented`, **unused**), `settings-ui.ts` (open/close state), `wix-sync.ts` (flagged
  adapter), `index.ts` (single entry; bound `getConsent`, `hasConsent`, `subscribe`, `acceptAll`, `rejectNonEssential`,
  `savePreferences`, `acknowledge`, `withdraw`, `clearConsent`).
* `components/consent/` (UI): `ConsentManager` (single mount, tiny, loads the rest lazily with `ssr: false`), `ConsentBanner`,
  `ConsentDialog`, `ConsentCategoryRow`, `ConsentSettingsLink`, `consent-copy.ts` (six languages), `link-label.ts` (the
  "Cookie settings" label, kept separate so the footer does not load the copy), hooks `use-consent-state.ts`,
  `use-dialog-focus.ts`, `index.ts` (public entry: `ConsentManager`, `ConsentSettingsLink`, `useConsentCategory`).
* Shared files edited, smallest diffs: `app/layout.tsx` (+2 lines: import and `<ConsentManager />` after `<SkipLink />`),
  `components/layout/Footer.tsx` (+2 lines: import and `<ConsentSettingsLink />` in the bottom bar after the Privacy link),
  `app/globals.css` (the `bottom-safe-area-*` utility and two rules, see Layout).
* Tests: `tests/unit/consent-record.test.ts`, `consent-store.test.ts`, `consent-ui.test.ts`;
  `tests/usability/cookie-consent.spec.ts`; test infrastructure `tests/support/consent.ts` and `playwright.config.ts`.

### Behaviour

* **Storage.** One `localStorage` key, `simdream_consent`, value `{version, decidedAt, categories:{necessary,preferences,
  analytics,marketing}}`. **No cookie.** Justification: the server never reads the choice (nothing renders conditionally on
  it), a cookie would be the first identifier the site writes (`app/layout.tsx`), and EU practice treats storing the consent
  choice itself as exempt. If storage is blocked the choice lasts for the page session.
* **Validity.** A record counts only while `version === CONSENT_VERSION` and it is under `CONSENT_RENEWAL_MONTHS` (12) old
  (calendar months from `decidedAt`); a record stamped ahead of the device clock counts as current (clock skew; it also lets tests
  that freeze the clock in the past keep the pre-seed valid). Otherwise the banner asks again.
* **Records only what is offered.** `acceptAll()` and `savePreferences()` write `true` only for categories in
  `CONSENT_CATEGORIES_IN_USE`.
* **Modes.** `CONSENT_CATEGORIES_IN_USE` (`lib/consent/config.ts`, env `NEXT_PUBLIC_CONSENT_CATEGORIES_IN_USE=analytics` or
  `analytics,marketing`, default empty = `['necessary']`): empty means **notice** (one "Got it", a "Cookie settings" link,
  the dialog lists what is stored and shows analytics and marketing as "Not used on this site", no toggles); non-empty means
  **choice** ("Accept all" and "Reject non-essential" in the same component, variant and size, "Customize", a toggle only
  for categories in use, nothing pre-ticked). When flipping it on, wire the tracker through `whenConsented` /
  `loadScriptWhenConsented` and bump `CONSENT_VERSION` in the same change.
* **Reopen.** The footer "Cookie settings" button, `<ConsentSettingsLink />` anywhere, or
  `window.dispatchEvent(new Event('simdream:consent-open'))`.
* **Wix sync.** `NEXT_PUBLIC_CONSENT_WIX_SYNC=true` makes `ConsentManager` call
  `window.consentPolicyManager.setConsentPolicy({essential, functional: preferences, analytics, advertising: marketing,
  dataToThirdParty: marketing})` (waiting for `consentPolicyManagerReady`). Default off; inert without Wix's site script.

### Quality

* **No layout shift:** the banner is `position: fixed`, rendered only after hydration (`useSyncExternalStore` with a server
  snapshot of "not yet"), and loads lazily. The spec asserts that header, `main`, `h1` and first section do not move when it
  appears or is dismissed.
* **Sticky bars and WhatsApp:** the banner is `z-[45]` (above sticky booking bars `z-30`, below modal dialogs `z-50` and the
  header `z-[60]`), publishes its height as `--consent-banner-offset`, and `bottom-safe-area-*` now reads
  `max(safe-area, offset)`, so the booking bars rise above it; `html` gets `scroll-padding-bottom` and `body`
  `padding-bottom` from the same variable (focus and the end of the page stay clear: WCAG 2.2 "Focus Not Obscured"). Unset,
  both are `0px` and nothing changes. The WhatsApp action lives in the header, never at the bottom. Banner height on a phone
  is capped at a third of the viewport (asserted).
* **Targets and focus:** every banner control is at least 44px tall (asserted at 320px). The dialog is `role="dialog"
  aria-modal` with a focus trap, Escape, focus return to the opener; the banner is a named non-blocking `region`.
* **Accessibility:** axe (WCAG 2.x A/AA, zero violations of any impact) on the banner and the dialog in cockpit, brand and
  studio themes and in all six languages.

### Test infrastructure change

Every Playwright project now starts from `storageState: seededConsentStorageState(baseURL)` (`playwright.config.ts`,
`tests/support/consent.ts`): a current "necessary only" consent record in `localStorage`, built with the real record functions
and stamped at config load, so a version bump or the 12-month renewal cannot bring the banner back. It must also survive tests
that freeze the clock in the past (`tests/visual` fixes the date to 2026-11-04): that is why a record stamped ahead of the
clock counts as current (the first attempt, which rejected future-dated records, brought the banner back into every visual capture). Only `localStorage` is
seeded (no cookie; `tests/security-web` still passes `cookies() == []`). `cookie-consent.spec.ts` opts out with
`test.use({ storageState: NO_SEEDED_CONSENT })`. **Lighthouse (`tests/perf`) is not seeded**: it launches its own Chrome via
`@lhci/cli`, which cannot pre-seed `localStorage` without Puppeteer. A Lighthouse run therefore shows the banner exactly as a
first-time visitor sees it (a real measurement; the banner is out of flow, accessible, and adds no script).

### Visual baselines: what changed and what did not

With the pre-seed, **no banner appears in any visual capture**: the two mobile baselines (the footer is hidden on phones) are
byte-for-byte unchanged. The 20 desktop baselines (home, about, pro, book, vouchers x cockpit, brand x en, he) change **only**
because of the footer "Cookie settings" link the task asks for: page heights are identical and every differing pixel lies in
the footer bottom-bar line (1,141 to 1,156 pixels in English, about 3,340 in Hebrew, against a 100-pixel allowance). The 20
darwin baselines are refreshed in their own commit (drop it if the coordinator regenerates baselines at the end). The 20 Linux
baselines (`*-visual-linux.png` for the same pages) cannot be made locally and need the usual CI-artifact refresh
(`results-web-quality-shard-*`, `*-actual.png`, after checking the diff shows only the footer line).

### Choice-mode tests

The shipped build is in notice mode, so the choice tests in `cookie-consent.spec.ts` skip themselves (`data-consent-mode`).
They were run once against a dev server started with `NEXT_PUBLIC_CONSENT_CATEGORIES_IN_USE=analytics` (see the handoff
report). To run them: build with that variable and run the same spec.

### Assumptions (owner can veto)

1. `preferences` (language, theme) is treated as necessary/user-requested and **not** gated (it is user-initiated storage),
   so it is a defined category but not "in use".
2. `marketing` also drives Wix's `dataToThirdParty` (Wix describes it as the CCPA third-party-transfer switch).
3. The copy says the site "adds no advertising or analytics cookies" and names Wix, the payment provider and Google Maps
   plainly; it avoids claiming nothing at all is set on Wix-hosted or Stripe pages.
4. 12 months and the calendar-month rule are the defaults; there is no upper bound on `decidedAt` (a skewed clock cannot lock the banner out or in).
5. Phones have no footer, so no reopen link there; see Recommendation 5.

### Bundle size (Wix worker budget)

Source added: `lib/consent` about 31 KB (of which about 7 KB reach the eager bundle), `components/consent` about 35 KB
(`consent-copy.ts` 22 KB, all six languages, loaded lazily). Only `ConsentManager`, the footer link, its label map and the
small state hooks are eager; the banner and the dialog are separate `dynamic(..., { ssr: false })` chunks (about 21 KB and 25 KB
minified, each carrying the copy, client only), so none of it reaches the server bundle (checked in `.next-test/server`: only the
eager label map is there). The measured effect on the worker is the coordinator's to confirm with `npm run wix:build`.

### Exact lines for GENESIS.md and AGENTS.md (not edited here)

GENESIS.md (module tree, library modules and components lists; `npm run docs:verify` reports these as missing):
`lib/consent/{types,config,record,store,default-store,gating,settings-ui,wix-sync,index}.ts`; components
`ConsentManager`, `ConsentBanner`, `ConsentDialog`, `ConsentCategoryRow`, `ConsentSettingsLink`; env
`NEXT_PUBLIC_CONSENT_CATEGORIES_IN_USE`, `NEXT_PUBLIC_CONSENT_WIX_SYNC`; Playwright pre-seed `tests/support/consent.ts`.
Then run `npm run docs:genesis:stamp`.

AGENTS.md, new subsection after §6 (or §8): "**Cookie consent (`lib/consent`, `components/consent`).** The site sets no cookie
and runs no analytics or advertising. The consent record is one `localStorage` key (`simdream_consent`, versioned, renewed
after 12 months), never a cookie. `CONSENT_CATEGORIES_IN_USE` decides the banner: nothing optional in use means an
informational notice ('Got it' plus 'Cookie settings'), never a toggle that gates nothing; adding any tracker means adding its
category there, wiring it through `whenConsented()`/`loadScriptWhenConsented()`, bumping `CONSENT_VERSION`, allowing its hosts in
`proxy.ts`, and updating the privacy policy. 'Accept all' and 'Reject non-essential' stay identical in size and style. Copy lives in
`components/consent/consent-copy.ts` in six languages. Every Playwright project is pre-seeded with a current consent record
(`tests/support/consent.ts`); only `tests/usability/cookie-consent.spec.ts` starts without one."

Integration step for the privacy policy (A2): place `<ConsentSettingsLink className="…" />` (from `@/components/consent`) in
the cookies section, and give phones an entry (Navbar "About" drawer list, `components/layout/Navbar.tsx`, not edited here).

### Verification run (isolated build `.next-test`, chromium)

* `npm run typecheck` and `npm run lint`: pass. `npx vitest run --project unit`: 61 files, 1013 tests, pass (80 are the
  consent tests; the existing `i18n-audit` script-contamination scan and `seo-integrity` CSP checks pass with the new files).
* `tests/usability/cookie-consent.spec.ts`: 21 pass; 2 choice-mode tests skip themselves in the shipped notice mode. The
  choice-mode and dialog tests (5) pass against a dev server started with `NEXT_PUBLIC_CONSENT_CATEGORIES_IN_USE=analytics`.
* Existing suites after the change: e2e `smoke`, `language-theme`, `mobile`; usability `apple-web-app`, `layout-stability`,
  `hydration`, `header-fit`; a11y `keyboard`, `public-routes` (book routes), `baseline-integrity`; security-web
  `information-disclosure` (including "the public site sets no cookies"): all pass. Visual: see above.
* Not run: Lighthouse (`npx @lhci/cli` download; see the note above), the firefox, webkit and mobile Playwright projects, the
  rest of `test:all`.
* The module needed three isolated builds: the first showed the phone banner was too tall, the second revealed that a seed
  stamped at config load was rejected by the visual suite's frozen past clock (the validity rule was then relaxed, see
  Behaviour), the third is the build every result above comes from.
