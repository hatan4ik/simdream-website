# SimDream Release Ledger

> Generated from [CHANGELOG.md](CHANGELOG.md) by `npm run releases:generate`. Do not edit by hand.

## What this proves

- Each entry is an immutable SemVer release tag and its customer-facing feature or bug-fix summary.
- Releases created after this ledger is introduced receive a Wix publication record only after the protected release job succeeds. That record includes the deployed tag commit, UTC publish time, Wix URL, workflow evidence, and the public-route smoke-test result. Earlier versions retain their GitHub Release and workflow history; this document never infers a deployment merely from a tag.
- A Wix frontend publication does **not** claim that Wix Bookings, payments, coupons, members, or other business settings were activated. Their operational state is deliberately recorded as **not asserted** unless a separately controlled process verifies it.

## Product changes by version

### [v1.28.2](https://github.com/hatan4ik/simdream-website/releases/tag/v1.28.2) — 2026-11-14

#### Bug Fixes

- **wix:** surface Cart V2 error code and message on cart creation failure (#210) (4a4e285)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.28.2).

### [v1.28.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.28.1) — 2026-11-14

#### Bug Fixes

- **wix:** support add-ons and route requests natively in Wix checkout (#202) (fe4b4c7)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.28.1).

### [v1.28.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.28.0) — 2026-11-13

#### Features

- **ux:** add a branded, localized 404 page (#200) (e7c5574)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.28.0).

### [v1.27.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.27.0) — 2026-11-13

#### Features

- **loyalty:** generalize promotion claim contract and add 7-language checkout copy (#198) (f2336e9)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.27.0).

### [v1.26.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.26.0) — 2026-11-13

#### Features

- **i18n,blog:** add full German (de) frontend & Wix Blog support (#195) (5eddc07)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.26.0).

### [v1.25.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.25.0) — 2026-11-13

#### Features

- **release:** add audited Wix deployment ledger (#193) (e9d4dc8)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.25.0).

### [v1.24.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.24.0) — 2026-11-13

#### Features

- **wix:** add birthday pricing provider (#191) (dc533fb)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.24.0).

### [v1.23.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.23.0) — 2026-11-13

#### Features

- **i18n:** route Wix locales through public URLs (#187) (8bf10b3)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.23.0).

### [v1.22.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.22.1) — 2026-11-13

#### Bug Fixes

- **blog,i18n:** localize blog hero and honor Wix path locale prefix (#188) (9e241e7)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.22.1).

### [v1.22.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.22.0) — 2026-11-13

#### Features

- **seo:** short canonical blog URLs, 6-lang metadata, 301 redirects, llms.txt & sitemap (#183) (3881ede)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.22.0).

### [v1.21.2](https://github.com/hatan4ik/simdream-website/releases/tag/v1.21.2) — 2026-11-13

#### Bug Fixes

- **reviews:** remove invalid route export MIN_REFRESH_TOKEN_LENGTH (#184) (f1cfb1e)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.21.2).

### [v1.21.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.21.1) — 2026-11-12

#### Bug Fixes

- **contact:** deliver Dispatch inquiries through server route (#180) (3374bdd)
- **test:** scope the contact failure alert so the route announcer cannot match (#181) (3982da5)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.21.1).

### [v1.21.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.21.0) — 2026-11-12

#### Features

- checkout consent and birthday discount, refund form, offers page, cookie consent, modular booking and navbar (#115) (26eb52a)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.21.0).

### [v1.20.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.20.0) — 2026-11-12

#### Features

- **training:** add Ground School cohort requests (#114) (5ee217a)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.20.0).

### [v1.19.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.19.1) — 2026-11-12

#### Bug Fixes

- **theme:** light phone menu panel in Brand Daylight and Clean Studio (#112) (588ffda)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.19.1).

### [v1.19.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.19.0) — 2026-11-11

#### Features

- **theme,brand:** add navy Cockpit Night palettes and update horizontal brand logo (#109) (5fe4e27)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.19.0).

### [v1.18.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.18.0) — 2026-11-11

#### Features

- **tracks:** consumer-only flight tracks, PRO tracks on /pro, PRO tier prices (#108) (0ad929c)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.18.0).

### [v1.17.2](https://github.com/hatan4ik/simdream-website/releases/tag/v1.17.2) — 2026-11-11

#### Bug Fixes

- **ux:** streamline subscription purchase, clarify world trios, and bridge pro airline prep (#106) (0826822)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.17.2).

### [v1.17.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.17.1) — 2026-11-11

#### Bug Fixes

- **header:** restore mobile navigation and compact WhatsApp (#103) (f516fbb)
- **i18n:** name the Russian flight-tracks menu item «Абонемент» (#104) (4452565)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.17.1).

### [v1.17.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.17.0) — 2026-11-11

#### Features

- **reviews:** translate the newest Google reviews with Cloud Translation (#101) (c531e55)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.17.0).

### [v1.16.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.16.1) — 2026-11-11

#### Bug Fixes

- **reviews:** send the page language as language, not Wix's reserved lang (#99) (6cffcdf)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.16.1).

### [v1.16.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.16.0) — 2026-11-10

#### Features

- **blog:** wire multilingual blog mapping, routing and language synchronization (#97) (5a36f55)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.16.0).

### [v1.15.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.15.0) — 2026-11-10

#### Features

- **blog:** complete multilingual translations and batch publisher engine (#95) (dca545d)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.15.0).

### [v1.14.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.14.1) — 2026-11-09

#### Bug Fixes

- **blog:** ensure language he on import and use 3-step publish in translate cli (#93) (0027fa8)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.14.1).

### [v1.14.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.14.0) — 2026-11-09

#### Features

- **blog:** add wix multilingual translation CLI for english and russian (#91) (daefe85)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.14.0).

### [v1.13.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.13.1) — 2026-11-09

#### Bug Fixes

- **reviews:** keep live newest-first reviews in the header when no snapshot store exists (#88) (27ed239)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.13.1).

### [v1.13.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.13.0) — 2026-11-09

#### Features

- **reviews:** header-only, newest-first Google reviews from a twice-daily snapshot (#86) (e4a36e8)
- **seo:** generate llms.txt from the registries, add blog Person author and breadcrumbs, test route coverage (#84) (ddc85b0)
- **subscriptions:** sell flight tracks by outcome, never by the 12-month term (#82) (ec1e1a7)

#### Bug Fixes

- **seo:** derive structured data from the registries; FAQPage only beside a visible FAQ (#85) (fbe9f6e)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.13.0).

### [v1.12.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.12.0) — 2026-11-09

#### Features

- **wix-blog:** enhance migration script with batching and local CLI auth (#81) (b15e06c)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.12.0).

### [v1.11.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.11.0) — 2026-11-09

#### Features

- **blog:** integrate 39 Wix blog articles with 1:1 SEO routes, static pre-rendering, and conversion CTAs (#76) (0b7621a)

#### Bug Fixes

- **wix:** keep the Worker under Wix's upload limit (UTF-8 output, single blog corpus, size budget) (#79) (c5673b2)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.11.0).

### [v1.10.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.10.1) — 2026-11-09

#### Bug Fixes

- **vouchers:** show the live preview after the amount choice on phones (#74) (05144d4)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.10.1).

### [v1.10.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.10.0) — 2026-11-09

#### Features

- **reviews:** newest first, publish date, author attribution and Google's translation with "show original" (#72) (6f38e49)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.10.0).

### [v1.9.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.9.1) — 2026-11-09

#### Bug Fixes

- **reviews:** refresh Google rating to 5.0 (424 reviews) (#70) (88612dc)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.9.1).

### [v1.9.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.9.0) — 2026-11-09

#### Features

- **vouchers:** sell gift cards and certificates only at fixed amounts, no custom sum (#67) (c6a696c)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.9.0).

### [v1.8.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.8.0) — 2026-11-09

#### Features

- **wix:** add Wix-as-Code backend blueprint and multi-lock protected provisioner (#64) (8fd6516)

#### Bug Fixes

- **booking:** trust and recovery fixes from the source-based CX audit (#65) (45c57e3)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.8.0).

### [v1.7.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.7.0) — 2026-11-08

#### Features

- **marketing:** emotion-first hero copy and a calm /fear-of-flying landing page (#62) (2b1787c)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.7.0).

### [v1.6.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.6.0) — 2026-11-08

#### Features

- **booking:** dynamically switch checkout to Airline Interview Prep 60 PRO on ATPL selection (#56) (39f4500)
- **booking:** limit the calendar to one year ahead and add a Today button (#55) (4bab45b)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.6.0).

### [v1.5.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.5.0) — 2026-11-08

#### Features

- **vouchers:** map 7 gift card designs to native Wix Gift Card variants and checkout (#53) (9dd909b)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.5.0).

### [v1.4.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.4.0) — 2026-11-08

#### Features

- **vouchers:** link each Gift Card colour to one balance and lower the minimum to 50 (#51) (65514c9)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.4.0).

### [v1.3.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.3.0) — 2026-11-08

#### Features

- **vouchers:** give Gift Cards a balance-first flow and the primary checkout button (#49) (e861b5f)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.3.0).

### [v1.2.5](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.5) — 2026-11-08

#### Bug Fixes

- **reviews:** show the grade, five yellow stars and the count when Google has no data (#46) (874a16c)
- **vouchers:** fit gift-card art to one shared frame and stop sideways scroll (#45) (e6e3e14)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.5).

### [v1.2.4](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.4) — 2026-11-08

#### Bug Fixes

- **vouchers:** fit digital gift card preview to whole frame (#42) (35b2b33)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.4).

### [v1.2.3](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.3) — 2026-11-07

#### Bug Fixes

- **book:** preserve route addons in compatible slots (#40) (267bd7d)
- render gift-card designs and replace telemetry bar (#39) (2b63204)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.3).

### [v1.2.2](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.2) — 2026-11-07

#### Bug Fixes

- **ci:** deduplicate release verification (#35) (6865ed5)
- **ci:** retain release check contexts (#38) (e50df48)
- **ci:** verify generated release candidates (#37) (4b3aef6)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.2).

### [v1.2.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.1) — 2026-11-07

#### Bug Fixes

- **ci:** unblock verified Wix releases (#33) (a459c1b)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.1).

### [v1.2.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.0) — 2026-11-07

#### Features

- extend multilingual booking and gift-card experience (#30) (6dcb8a2)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.2.0).

### [v1.1.1](https://github.com/hatan4ik/simdream-website/releases/tag/v1.1.1) — 2026-11-07

#### Bug Fixes

- **legal:** unify company registration and calendar policy (#27) (b580a50)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.1.1).

### [v1.1.0](https://github.com/hatan4ik/simdream-website/releases/tag/v1.1.0) — 2026-11-07

#### Features

- expand booking platform quality and operations (3df5671)
- harden booking platform and member experience (78bf965)

#### Bug Fixes

- **ci:** parse canonical Wix preview URL (#22) (f727b0b)
- **ci:** use supported Node runtime for Wix releases (#21) (2de9b36)
- **ci:** verify generated release candidates (#25) (f34b6b7)
- **ci:** wait for Wix route propagation (#23) (f6aebdc)
- stabilize semantic verification and mobile Safari gate (#20) (ed4e6c6)

Deployment evidence: [GitHub Release](https://github.com/hatan4ik/simdream-website/releases/tag/v1.1.0).
