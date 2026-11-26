<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# SimDream Architecture, Design & Code Instructions

Comprehensive source of truth and professional prompt instructions for all engineering, design, scheduling, routing, multilingual (i18n), and booking systems implemented for **Sim Dream LTD** (`simdream.co.il`), located at **Gershon Shatz St 36, Tel Aviv-Yafo, Israel**.

> 📐 **Visual Architecture Diagrams**: Visual system topology, adaptive booking workflows, scheduler engine pipelines, and payment sequence diagrams are maintained in [`ARCHITECTURE.md`](ARCHITECTURE.md).
> 🎛️ **Dashboard Reproduction Specification**: The complete master AI prompt and architectural blueprint for reproducing the Member Flight Deck (`/dashboard`) and Admin Dispatch Command Center (`/admin`) is documented in [`DASHBOARD_REPRODUCTION_SPEC.md`](DASHBOARD_REPRODUCTION_SPEC.md).
> 🧬 **Canonical Genesis & Reverse-Engineering Blueprint**: [`GENESIS.md`](GENESIS.md) is the only current system blueprint and one-shot prompt. Run `npm run docs:verify` after relevant source changes; archived drafts under [`docs/archive/`](docs/archive/README.md) are never authoritative.

---

## 0. Working agreement (read this first)

### Task contract

Every task states these four things; when the request leaves one out, state your assumption in the first message.

- **Deliverable**: what the visitor, member or owner gets, plus the tests that prove it. Update the document that owns a fact (a registry, `docs/modules/`, `GENESIS.md`) instead of retyping it.
- **Limits**: work on a `devel/<topic>` branch cut from a freshly fetched `origin/main` (`git fetch origin && git switch -c devel/<topic> origin/main`), never on `main` (other teams work there; branch protection also refuses it). Commit and push only when asked; the finish line is a pull request. Files stay under 400 lines, the Wix worker under 14 MiB, and no new dependency without a reason.
- **Do not touch**: the live simdream.co.il Editor site (§6.7); the unlisted `/refund` route's listing (§2); existing legal clause numbers (§10); `lib/reviews/last-known-rating.json` by hand (§1.7); visual baselines except on purpose; another session's in-progress files (a concurrent agent may edit this checkout, so read `git status` and never revert what you did not write).
- **Done when**: `npm run build` compiles; `npm run test:quick` passes for every change and `npm run test:all` before a feature is called complete (§7); `npm run docs:verify` passes whenever `AGENTS.md`, `ARCHITECTURE.md`, `TESTING.md` or the `app/`, `components/`, `lib/`, `scripts/` sources changed (re-stamp with `npm run docs:genesis:stamp` after reviewing the diff). Report a red check with its output; never call work finished on a failing check.

### Where things live

| You need | Open |
| :--- | :--- |
| System topology, booking and payment flows | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/CURRENT_CODEBASE_MAP.md`](docs/CURRENT_CODEBASE_MAP.md) |
| Everything a rebuild must reproduce | [`GENESIS.md`](GENESIS.md) (`npm run docs:verify`) |
| Scheduler rules and slot study | [`KANTOROVICH_SCHEDULER_SPEC.md`](KANTOROVICH_SCHEDULER_SPEC.md), [`docs/agents/slot-utilization-study.md`](docs/agents/slot-utilization-study.md) |
| Dashboards (member and admin) | [`DASHBOARD_REPRODUCTION_SPEC.md`](DASHBOARD_REPRODUCTION_SPEC.md) |
| Tests, quality gates, baselines | [`TESTING.md`](TESTING.md) |
| Module pattern (400-line rule) | [`docs/MODULARITY.md`](docs/MODULARITY.md), per-feature notes in [`docs/modules/`](docs/modules/) |
| Wix backend, pricing provider, cutover | [`docs/modules/wix-adapter.md`](docs/modules/wix-adapter.md), [`docs/WIX_HEADLESS_ARCHITECTURE.md`](docs/WIX_HEADLESS_ARCHITECTURE.md), [`docs/WIX_BIRTHDAY_PRICING_PROVIDER.md`](docs/WIX_BIRTHDAY_PRICING_PROVIDER.md), [`docs/WIX_HEADLESS_CUTOVER_RUNBOOK.md`](docs/WIX_HEADLESS_CUTOVER_RUNBOOK.md) |
| Google reviews bar and header | [`docs/modules/google-reviews-bar.md`](docs/modules/google-reviews-bar.md) |
| Blog languages, routes and Wix blog queries | [`docs/modules/blog-language.md`](docs/modules/blog-language.md) |
| CI, releases, PR automation | [`docs/GITHUB_PR_AUTOMATION.md`](docs/GITHUB_PR_AUTOMATION.md), [`docs/GITHUB_WIX_CICD.md`](docs/GITHUB_WIX_CICD.md), `.github/workflows/` |
| Environment variables | [`.env.example`](.env.example) |
| Code | pages `app/(public)/`, APIs `app/api/`, UI `components/<feature>/`, logic `lib/<feature>/` (`scheduler`, `booking`, `wix`, `db`, `i18n`, `legal`, `seo`, `reviews`, `discounts/birthday`), copy `lib/i18n/translations.ts` |

### Decisions and open items

[`docs/DECISIONS.md`](docs/DECISIONS.md) is the project's memory between sessions: settled decisions, working rules learned the hard way, and open items. [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) says what works, what is in progress and what is blocked. Read both before starting work; append to the log when you decide something or leave something unfinished, and update the state file in the same change.

---

## 1. Core Brand Architecture & Customer Value Pillars

Any customer-facing copy, landing page, or layout must reinforce the **5 Customer Value Pillars**:
1. **Full Captain's Command**: 70 tons of Boeing 737 LEAP-1B airliner power with authentic motorized control loading and sensory cockpit immersion — not an arcade game, amusement ride, or plastic toy.
2. **Active Airline Captain Mentorship**: 1-on-1 personal coaching with real commercial airline pilots; zero flight experience required for consumers.
3. **Unrestricted Global Freedom**: 24,000+ real-world airports (Ben Gurion LLBG, Hong Kong Kai Tak VHHX, Paro VQPR, Innsbruck LOWI) with live or custom extreme weather.
4. **Transformative Milestones & Fear of Flying**: Bucket-list birthday/anniversary gifts, corporate CRM leadership offsites, and therapeutic flight anxiety coaching.
5. **Authentic Aviation Integrity**: Strict fidelity to Boeing flight deck documentation, ICAO terminology, and official airline operating procedures.

### Brand Identity: Logo & Colour Tokens (mandatory)

The visual identity is the official **simdream.co.il** logo: an **orange airplane** and a **cerulean "SIM DREAM" wordmark**. The header shows that image alone; the translated tagline (*מערכות סימולציה (ישראל)*, "Simulation Systems (Israel)") appears only in the footer and the desktop flyout panel.

| Token | Value | Use |
| :--- | :--- | :--- |
| Sim Dream cerulean | `#2096C7` (Tailwind `sky-500`) | Primary brand colour: wordmark, links, accents; its lighter step `sky-400` `#56B9E9` fills the primary action everywhere except the two navy tones (item 6). |
| Sim Dream orange | `#FF5500` (Tailwind `orange-500`) | Brand highlight: airplane mark, tagline, active navigation indicator, key highlights; the primary action fill in the Cobalt Navy and Squadron Mid-Navy tones (item 6). |

1. **Logo assets only**: render the logo with [`components/brand/BrandLogo.tsx`](components/brand/BrandLogo.tsx) (`BrandLogo` = airplane + wordmark, `BrandMark` = airplane only), backed by `public/brand/simdream-logo.png` and `public/brand/simdream-plane.png`. The favicon is `app/icon.png`. Never rebuild the logo from text or icon fonts, never recolour it, and never mirror it in RTL layouts.
2. **The header carries the logo alone**: nothing is printed under or beside the brand image in the header, in any of the seven languages (`tests/usability/header-brand.spec.ts` enforces it). The wordmark artwork carries no tagline; wherever a tagline is still shown (footer, desktop flyout panel) it is the translated text `t.nav.brandSub`, never baked into the image (AGENTS.md §5).
3. **Colour tokens live in [`app/globals.css`](app/globals.css)** (`@theme`): Tailwind's `sky-*` scale *is* the Sim Dream cerulean scale and `orange-*` *is* the Sim Dream orange scale. Use those utilities; do not introduce other blues, cyans or oranges as brand colours, and never hard-code the old Tailwind sky values (`#0284c7`, `#0369a1`, `#38bdf8`).
4. **Contrast (WCAG 2.x AA, enforced by the axe suite with an empty baseline)**: `#FF5500` is 3.2:1 on white, so as text, and on any light surface, `orange-500` is for the logo, icons, borders/indicators and large text only; small orange text on light surfaces uses `orange-700` (5.3:1). As a fill, `orange-500` carries dark ink and never white text (white on `#FF5500` is the same 3.2:1); its one fill use is the primary action in the two navy tones (item 6). White text on a cerulean fill needs `sky-700` or darker. Brand Daylight colour overrides live in `app/globals.css` under `html[data-ui="brand"]`. Every slate fill class used in source (`bg-`, `from-`, `via-`, `to-slate-*`, with any opacity or state variant) needs its own `html[data-ui="brand"]` override there: `tests/unit/daylight-slate-overrides.test.ts` fails otherwise, and a deliberate dark exception goes in its `ALLOWED_UNCOVERED` with a reason. The phone menu panel is covered in all three themes by `tests/usability/mobile-menu-theme.spec.ts`.
5. **Three interface themes carry the brand, and Cockpit Night has three palette tones**. The themes are the type `UiTheme` (`THEME_ORDER`) in [`lib/theme/ui-theme-context.tsx`](lib/theme/ui-theme-context.tsx); the header switch (`UiThemeSwitcher`) cycles them in the order of the table and the choice is stored in `localStorage` as `simdream_ui_theme`. The on-screen names are the English `t.uiTheme.*` strings, translated in all seven languages; code comments, tests and this document also call `brand` "Brand Daylight".

   | Theme id | On-screen name | `<html>` attributes | Page background (`THEME_COLORS`) | Palette |
   | :--- | :--- | :--- | :--- | :--- |
   | `cockpit` | 🌙 Cockpit Night | `data-ui="cockpit"` and `data-cockpit-tone` | `#070b14` (Classic; follows the tone) | Dark surfaces per tone (next table), light ink (`#f8fafc` body, `slate-100` to `slate-400` text), accents `sky-400` `#56b9e9` and the orange scale. |
   | `brand` | ☀️ SimDream Day (**the default**) | `data-ui="brand"` | `#f8fafc` | Cloud white: canvas `#f8fafc`, cards `#ffffff`, wells `#f1f5f9`, borders `#e2e8f0` and `#cbd5e1`, ink `#0f172a` (secondary `#1e293b` and `#334155`, muted `#475569`), cerulean text `sky-700` `#136c91`, orange text `orange-700` `#cb3200`. |
   | `studio` | ✨ Clean Studio | `data-ui="brand"` and `data-look="studio"` | `#ffffff` | The daylight palette restyled after apple.com's mobile site: canvas `#ffffff`, wells and footer `#f5f5f7`, hairlines `rgba(0, 0, 0, 0.08)`, field borders `#d2d2d7`, ink `#1d1d1f` (secondary `#424245`, muted `#616166`), translucent nav `rgba(255, 255, 255, 0.72)`, 17px system type with tight semibold headlines, sentence-case labels, pill buttons. |

   `public/theme-bootstrap.js` sets the attributes before first paint: `data-ui="brand"` unless the stored choice is `cockpit`, so a first-time visitor sees daylight. Studio is layered on daylight — the document carries `data-ui="brand"` plus `data-look="studio"` — so daylight overrides keep applying and `app/globals.css` adds only the restyle under `html[data-look="studio"]`; never fork the palette.

   The Cockpit Night tones are the type `CockpitTone` (`COCKPIT_TONE_ORDER`), with their colours in `COCKPIT_TONE_COLORS` in the same file. The tone is the `data-cockpit-tone` attribute on `<html>`, present only while the theme is `cockpit`; it is stored in `localStorage` as `simdream_cockpit_tone`, applied before paint by `public/theme-bootstrap.js` and kept while a light theme is shown. [`components/layout/CockpitToneSwitcher.tsx`](components/layout/CockpitToneSwitcher.tsx) switches it: one button that cycles classic → cobalt → squadron in the desktop and compact navbar actions and the footer, three direct options in the phone menu. Used from a light theme it switches to Cockpit Night; the cycling button enters at Cobalt when the saved tone is Classic. `<meta name="theme-color">` follows the canvas.

   | Tone id | On-screen name | chrome | canvas | card | well | border |
   | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
   | `classic` (default) | Classic Night | `#020617` | `#070b14` | `#0f172a` | `#1e293b` | `#1e293b` |
   | `cobalt` | Cobalt Navy | `#091428` | `#0C1A33` | `#13264A` | `#1B335E` | `#28467A` |
   | `squadron` | Squadron Mid-Navy | `#0C1D38` | `#102547` | `#17325E` | `#21437A` | `#315896` |

   Classic sets no variables: it is Tailwind's slate scale as the components write it, and the row lists the nominal `slate-950`, `slate-900` and `slate-800` values (Tailwind 4 defines them in oklch; a browser computes `slate-950` as `#020618` and `slate-800` as `#1d293d`). Cobalt and Squadron define `--cockpit-chrome`, `--cockpit-canvas`, `--cockpit-card`, `--cockpit-well` and `--cockpit-border` (plus `--cockpit-well-hover` `#234073` / `#2A5394` and `--cockpit-border-strong` `#355B99` / `#3E6DB8`) under `html[data-ui="cockpit"][data-cockpit-tone="…"]` in `app/globals.css` and remap the slate utilities onto them: `bg-slate-950` → chrome, `body` → canvas, `bg-slate-900` → card, `bg-slate-800` → well, `bg-slate-700` → well-hover, `border-slate-900` and `border-slate-800` → border, `border-slate-700` → border-strong. Each navy tone also lifts text to keep AA on its lighter surfaces: Cobalt shows muted slate text as `#a9b9ce`, `text-sky-500` as `sky-400` and `text-orange-500` as `orange-400`; Squadron shows muted slate text as `#cbd5e1`, `text-sky-400` and `text-sky-500` as `sky-300`, and `text-orange-400` and `text-orange-500` as `orange-300`. A slate class missing from those blocks keeps its Classic colour in the navy tones. `tests/unit/cockpit-tone.test.ts` pins the palettes and their contrast; `tests/usability/cockpit-tone.spec.ts` runs the switcher and axe on eight routes in both navy tones.
6. **Action buttons replicate apple.com's store buttons in all themes and viewports**: [`components/ui/Button.tsx`](components/ui/Button.tsx) (and `buttonClassName()` for links) owns the geometry: a 980px pill, regular-weight 17px system type (21px `lg` on desktop), `-0.022em` tracking, 1px border on every variant, no shadow, no press scale. `primary` is the filled "Learn more" pill: cerulean `sky-400` with a dark label in Classic Night, SimDream Day and Clean Studio, and **the brand orange `orange-500` (`#FF5500`) with the tone's chrome navy as its label in the Cobalt Navy and Squadron Mid-Navy tones only** (hover `orange-400`; never white text on the orange fill, item 4). `outline` is the "Buy" pill, the cerulean as a 1px outline that fills on hover; `secondary` is the neutral grey pill; `ghost` is text-only. Hero pairs are text-only (no icons) and sit side by side on phones (`flex-row flex-wrap`). Never pass `font-bold`, `shadow-*` or padding overrides to a Button, and never style generic `button` or rounded utilities per theme; themes and tones recolour only through `[data-ui-control="button"][data-button-variant="…"]` in `app/globals.css` (the navy-tone primary rule sits under `html[data-ui="cockpit"]:is([data-cockpit-tone="cobalt"], [data-cockpit-tone="squadron"])`). A link styled with `buttonClassName()` must carry both data attributes, or no theme or tone rule reaches it.

   Button colours as painted: computed styles read in Chromium on 2026-11-14 from the header "Book" link, the home page and `/offers`. Each cell is fill / label / border.

   | Variant, state | Classic Night | Cobalt Navy | Squadron Mid-Navy | SimDream Day and Clean Studio |
   | :--- | :--- | :--- | :--- | :--- |
   | `primary`, rest | `#56b9e9` / `#020618` / `#56b9e9` | `#ff5500` / `#091428` / `#ff5500` | `#ff5500` / `#0c1d38` / `#ff5500` | `#56b9e9` / `#0f172a` / `#56b9e9` |
   | `primary`, hover | `#91d0f2` / `#020618` / `#91d0f2` | `#ff7c4b` / `#091428` / `#ff7c4b` | `#ff7c4b` / `#0c1d38` / `#ff7c4b` | `#91d0f2` / `#0f172a` / `#91d0f2` |
   | `outline`, rest | transparent / `#56b9e9` / `#56b9e9` | transparent / `#56b9e9` / `#56b9e9` | transparent / `#91d0f2` / `#56b9e9` | transparent / `#136c91` / `#56b9e9` |
   | `outline`, hover | `#56b9e9` / `#020618` / `#56b9e9` | `#56b9e9` / `#020618` / `#56b9e9` | `#56b9e9` / `#91d0f2` / `#56b9e9` | `#56b9e9` / `#0f172a` / `#56b9e9` |
   | `secondary`, rest | `#1d293d` / `#f1f5f9` / `#1d293d` | `#1b335e` / `#f1f5f9` / `#28467a` | `#21437a` / `#f1f5f9` / `#315896` | `#e8e8ed` / `#1d1d1f` / `#e8e8ed` |
   | `secondary`, hover | `#314158` / `#f1f5f9` / `#314158` | `#234073` / `#f1f5f9` / `#355b99` | `#2a5394` / `#f1f5f9` / `#3e6db8` | `#dcdce1` / `#1d1d1f` / `#dcdce1` |
   | `ghost`, rest | transparent / `#56b9e9` / transparent | transparent / `#56b9e9` / transparent | transparent / `#91d0f2` / transparent | transparent / `#136c91` / transparent |
   | `ghost`, hover | `sky-500` at 10% / `#91d0f2` / transparent | `sky-500` at 10% / `#91d0f2` / transparent | `sky-500` at 10% / `#91d0f2` / transparent | transparent / `#136c91` / transparent |

   - Through release 1.28.6 `primary` in Cobalt and Squadron was the Classic column: fill and border `#56b9e9`, label `#020618`, hover `#91d0f2`. Only the two `primary` rows of those two columns changed.
   - Label contrast on the orange fill (AA asks 4.5:1 for the 14px to 21px regular label; white would be 3.21:1): Cobalt `#091428` is 5.74:1 at rest and 7.21:1 on hover, Squadron `#0c1d38` is 5.25:1 and 6.60:1. The label colour is `var(--cockpit-chrome)`, applied to the control and to everything inside it.
   - In all three Cockpit Night tones keyboard focus changes neither fill nor label in any variant: it adds a 2px `sky-400` ring outside a 2px offset (`slate-900` in Classic, the tone's chrome in Cobalt and Squadron).
   - Open defect, not part of the orange rule: on hover the Squadron `outline` label stays `sky-300` on the `sky-400` fill (1.32:1), because the tone's `.text-sky-400` lift outranks `hover:text-slate-950`.
   - `tests/usability/navy-tone-primary-button.spec.ts` reads every primary control of the home page at rest, the header "Book" link and the hero action on hover and under keyboard focus, and runs axe on the primary controls, in both navy tones, Classic, Day and Studio; `tests/unit/cockpit-tone.test.ts` pins the rule's scope and the ratios.
7. **The header is one centred column, and the Google rating follows Google's own row** (full rules: [`docs/modules/google-reviews-bar.md`](docs/modules/google-reviews-bar.md); read it before touching `components/layout/LiveMetarBar.tsx`, `components/layout/navbar/`, `lib/reviews/` or `app/api/reviews`). The utility bar and the navbar share one `max-w-7xl` column. **The utility bar is the only place Google reviews render**: no home-page carousel or second copy. Reviews are displayed in true chronological order (newest first, never Google's "most relevant") in a scrollable dropdown, with Google's author attribution, Google's translation into the page language and the ordering and policy notices. Google is read on a twice-a-day cadence, never per page view (`google-reviews-snapshot.yml`, `POST /api/reviews/refresh`, stored in `google_reviews_snapshot`); the API parameter is `language`, never `lang`. Ratings and counts are never hard-coded (`LAST_KNOWN_GOOGLE_RATING` is refreshed by automation, not by hand). The header carries `components/layout/navbar/` markup and test hooks; never grow `Navbar.tsx` past 400 lines.

---

## 2. Canonical Routing & URL Discipline

- **Canonical Home Intent Route Gate (`/`)**: [`app/page.tsx`](app/page.tsx) is the top-of-funnel Intent Route Gate composed of modular units under `components/home/` (`HomeHero`, `HomeRouteGate`, `HomeHowItWorks`, `HomeWhyUs`, `HomeFeaturedPackages`, `HomeCtaRibbon`). It routes visitors directly into the 6 core customer funnels (`/experiences`, `/pro`, `/fear-of-flying`, `/subscriptions`, `/workshops`, `/vouchers`), reinforces all 5 Customer Value Pillars (§1), and articulates a truthful 3-step visitor journey (Briefing & Mission Plan → Cockpit in Command → Mission Debrief) with single semantic `<Link>` controls (no nested `<Link><Button>`), WCAG 2.x AA contrast across all themes and Cockpit tones, and zero false promises (no certificates, logbook stamps, photos, or clinical medical claims).
- **Canonical Professional Training Route**: [`app/(public)/pro/page.tsx`](app/(public)/pro/page.tsx) (`/pro`) is the single source of truth for commercial assessment training.
- **Offers & Benefits route**: [`app/(public)/offers/page.tsx`](app/(public)/offers/page.tsx) (`/offers`) explains every offer in seven languages from the registries (never retyped prices or percentages): the birthday discount with an in-browser calculator, the Discounted Promotion, flight and professional tracks, gift vouchers, the no-stacking rule and the fair-use fine print. It is listed in the header "Experiences" flyout, the drawer and the footer through `lib/offers/nav-label.ts`. `GET /api/offers/capabilities` reports whether the live checkout can apply the birthday discount.
- **Refund requests**: `/refund` is deliberately unlisted: no Navbar, Footer, sitemap, llms.txt, structured-data or robots.txt entry, `robots: { index: false, follow: false }` in its layout, linked only from the rules refund clause and confirmation emails (`tests/unit/refund-unlisted.test.ts`). Refund numbers and clauses live only in `REFUND_POLICY` (`lib/refund/refund-policy.ts`); the estimate shown to customers never approves or pays anything.
- **Canonical Customer Story Route**: [`app/(public)/about/page.tsx`](app/(public)/about/page.tsx) (`/about`) explains Sim Dream’s story, the consumer flight experience, and official social channels. It is intentionally separate from professional training.
- **Experience Flights ("טיסות חוויה") Route Catalog**: `/experiences#world-routes` ([`components/experiences/WorldRoutesSection.tsx`](components/experiences/WorldRoutesSection.tsx)) is the only place that lists World Trio routes, sights and flight adventures. Its content lives in [`lib/data/experience-routes.ts`](lib/data/experience-routes.ts): every world-trio add-on appears exactly once and takes price and minutes from `FLIGHT_ADDONS` (never duplicate them); an on-request World Trio opens `/book?package=captains-command-60&route=<id>` in the calendar-first flow. The booking must retain only a registry-validated `requestedRouteId`, require a 60-minute or longer session, add no route surcharge, and plainly state that the captain confirms the final mission plan before the visit. Scenario adventures still use `/contact?subject=route&route=<id>` because they are a briefing inquiry, not a scheduled World Trio. Every airport must be a real Boeing 737 destination with a real ICAO code (§1 pillar 5). The platform supports all seven selector locales (§5); route records are currently authored in six locales and use the controlled English fallback for Spanish until editorial Spanish route copy is supplied. `tests/unit/experience-routes.test.ts` enforces the route and registry rules.
- **Edge Security, Nonce CSP & Locale Routing ([`proxy.ts`](proxy.ts))**: The Next.js 16 edge proxy guard intercepts incoming requests, generates a per-request cryptographically secure nonce (`x-nonce`), enforces a strict Content Security Policy (CSP), strips Wix Multilingual secondary locale prefixes (`/en/...`, `/fr/...`) while passing `x-simdream-locale`, and protects the `/admin` route family with HTTP Basic authentication (`requireAdmin(request)`).
- **Admin Dispatch Command Center Routes**: [`app/admin/page.tsx`](app/admin/page.tsx) (`/admin`) and its dedicated sub-consoles: Schedule & Bookings Command Center ([`app/admin/bookings/page.tsx`](app/admin/bookings/page.tsx), `/admin/bookings`), Voucher Operations & Balance Control ([`app/admin/vouchers/page.tsx`](app/admin/vouchers/page.tsx), `/admin/vouchers`), and Corporate Workshop Inquiries ([`app/admin/workshops/page.tsx`](app/admin/workshops/page.tsx), `/admin/workshops`). All are guarded server-side by `requireAdmin` (503 if credentials unset, 401 on unauthorized).
- **Permanent Redirects (301)**:
  - The complete redirect inventory in `next.config.mjs` is deliberate and must stay permanent: `/simulator` and `/training` → `/pro`; `/aerophobia` → `/fear-of-flying`; `/book-online` → `/book`; the legacy Hebrew gift-voucher path → `/vouchers`; `/cooperation` → `/workshops`; `/pricing-plans/list` → `/subscriptions`; and `/blog/:slug` → `/post/:slug`.
  - The server component [`app/(public)/simulator/page.tsx`](app/(public)/simulator/page.tsx) invokes Next.js `redirect('/pro')`.
  - Navigation pointers must route customer-story calls to `/about` and professional-training calls to `/pro`; the two routes must not be conflated.
- **Content on `/pro`**:
  - Highlights airline interview preparation (El Al, Arkia, Israir, Wizz Air, Ryanair).
  - Features the 3 official commercial tiers:
    - **Airline Interview Prep 60 PRO** (₪950) — [Official Service Page](https://www.simdream.co.il/service-page/airline-interview-prep-60-pro?referral=service_list_widget)
    - **Airline Interview Prep 90 PRO** (₪1,285) — [Official Service Page](https://www.simdream.co.il/service-page/airline-interview-prep-90-pro?referral=service_list_widget)
    - **Airline Interview Prep 120 PRO** (₪1,590) — [Official Service Page](https://www.simdream.co.il/service-page/airline-interview-prep-120-pro?referral=service_list_widget)
  - Technical simulator hardware specifications (CPflight avionics, Sismo CDU/FMC, motorized dual autothrottles) must remain inside a clean disclosure/specs drawer so as not to distract commercial pilot candidates.
  - **PRO tracks (multi-session Airline Interview Prep) are sold on `/pro` only** (`PRO_SUBSCRIPTION_PASSES` in [`lib/data/subscription-passes.ts`](lib/data/subscription-passes.ts), `audience: 'pro'`): `pro-interview-3x90` (3 × 90 PRO, ₪2,565) and `pro-interview-5x60` (5 × 60 PRO, ₪4,165). Their standard value and savings (₪ and %) are derived from the PRO tier prices with `getSubscriptionPassFinancials()`, never retyped; they carry no add-on themes and check out through the same `POST /api/subscriptions/checkout`, returning to `/pro#pro-tracks`.
- **Consumer flight tracks (`/subscriptions`, `/experiences` Flight Tracks tab) are for non-professional customers**: `CONSUMER_SUBSCRIPTION_PASSES` only (Flight Foundations 5 × 60, Advanced Captain 5 × 90, Flight Deck Mastery & Systems 10 × 60, Captains' Course / קורס הקברניטים 10 × 90). Their copy never mentions airline interviews, assessments or screening and never uses SOP, QRH, V1, raw data or ATPL; "airline captain" as the mentor stays. `/pro` never links pilots to `/subscriptions`. `tests/unit/subscription-passes.test.ts` enforces the split.

---

## 3. Specialized "Noise-Free" Booking Engine Discipline (`/book`)

The booking engine adapts dynamically depending on the selected package category:

| Package Category | Allowed Packages | Add-ons & Combos | Booking Flow | Default Level (internal) |
| :--- | :--- | :--- | :--- | :--- |
| **Professional Training** (`training`) | Strictly the 3 PRO tiers (60 PRO, 90 PRO, 120 PRO). Consumer 30m & 45m suppressed. | **Zero add-on noise (`addons = []`)**. Tourist combos, extreme turbulence modules, and guest-experience upsells are completely suppressed. | **2-Step Streamlined Flow**: `Date & Operational Slot` &rarr; `Pilot Manifest & Checkout`. (Step 2 Add-ons is completely bypassed). | `atpl` (Airline Transport Pilot) |
| **Fear of Flying** (`fear_of_flying`) | Strictly Fear of Flying Course (`pkg-fear-of-flying-90`; legacy ID, **60-minute** session). | **Zero add-on noise (`addons = []`)**. V1 engine failures, storms, and crosswind challenges are suppressed. | **2-Step Streamlined Flow**: `Date & Therapeutic Slot` &rarr; `Pilot Manifest & Checkout`. | `beginner` |
| **Recreational / Consumer** (`recreational`) | Full consumer catalog (30m Discovery, 45m Daytime Promo, 60m Captain, 90m Odyssey, 120m Grand Odyssey at ₪1,200). | Full e-commerce catalog with curated 1-click combos, 8 bookable World Trio add-ons, Cold & Dark startup (+30m), Crosswind/IFR (+30m), and optional guest seating (+0m). Time-extending mission add-ons are hard-capped at `MAX_MISSION_ADDONS = 2` (Extra Seat excluded) and automatically trigger the promotional tier bump-up ladder (`lib/scheduler/mission-upgrade-promo.ts`: 30m+1→60m ₪690, 45m/60m+1→90m ₪850, 90m+1 or any+2→120m ₪1,200 with ≥15% OFF). | **3-Step Flow**: `Date & Slot` &rarr; `Cockpit Add-ons` &rarr; `Pilot Manifest & Checkout`. | `beginner` (schema default) |

**Mandatory extras in every booking flow.** The pilot manifest collects name, email, phone, pilot date of birth (placed directly under contact fields; aviation experience level was removed from customer inputs and defaults to `beginner` in the schema), and special requests. It carries two separate, unchecked confirmations (rules, refund-by-form rule and privacy; media release and waiver, with the full clause loaded on demand) in both the guided steps and the Express Shop, from the same modules (`bookingExtraSlots()` in `components/booking`). The submit is blocked with a focused, announced error until they are given. `POST /api/checkout` answers 400 without both confirmations or with an unusable birth date, stamps `buildConsentRecord()` with the server clock and versions, and prices the tiered birthday discount (Option A: 10% for 60m, 15% for 90m/120m, 0% for <60m) from the slot's flight date with `resolveBookingBirthday()`; the Stripe amount is the discounted total, a voucher covers what remains, and only the birthday month and day, the discount amount and the consent record are stored (migration 012). On a Wix-authoritative checkout the default is still no discount and an honest notice. Only a complete, separately registered Wix Bookings Pricing provider on SimDream-Staging may issue an opaque 10-minute claim and set the final Wix price; see [`WIX_BIRTHDAY_PRICING_PROVIDER.md`](docs/WIX_BIRTHDAY_PRICING_PROVIDER.md). A Wix subscription redemption requires the same inputs but stores nothing.

---

## 4. Calendar & Scheduling Invariants (Tiled Interval Engine)

The scheduling system is defined in [`KANTOROVICH_SCHEDULER_SPEC.md`](KANTOROVICH_SCHEDULER_SPEC.md). Maintain these non-negotiable invariants:

### Capacity Buffer Map
Always reserve operating capacity via `getReservedMinutesForFlight()`:
- `30 min` flight &rarr; `45 min` reserved block
- `45 min` flight &rarr; `60 min` reserved block (Discounted Promotion, `< 18:00` Sunday–Tuesday only)
- `60 min` flight &rarr; `75 min` reserved block
- `90 min` flight &rarr; `105 min` reserved block
- `120 min` flight &rarr; `150 min` reserved block
- `240 min` workshop &rarr; `255 min` reserved block

### Operating Window
- **Sunday–Saturday**: `09:00–24:00` (900 min). This mirrors the Wix Bookings business schedule and the Nathanel S staff schedule.
- Saturday retains its `saturday_prime` operating-window metadata and forbids the Sunday–Tuesday-only 45m promotion; all package tariffs (including 90m at ₪850) run flat all day with no evening or weekend surcharge.

### Duration-Aware Cadence (product decision)
The calendar must follow each selected package's actual reserved duration from real capacity boundaries, never a fixed 60- or 75-minute display grid: 30m → 45m (`09:00`, `09:45`, `10:30` …), 45m → 60m, 60m → 75m, 90m → 105m, and 120m → 150m. A close-aligned final departure is valid when it prevents waste. The engine judges gaps only against operating-window and live-booking boundaries, then requires both remaining gaps to be tileable. `tests/unit/kantorovich-completeness.test.ts` pins exact zero-waste soundness and duration-aware availability.

### Frontend Calendar & Duration Rules
1. **Never Hide Available Durations / Packages**: When a package has 0 open slots on a selected date, **do not filter it out or remove it from the DOM**. It must remain visible with a status badge (`0 slots open today` / `0 מקומות היום`).
2. **Never Overwrite User Selection**: If a user selects a date where their current package is sold out, preserve their selected package.
3. **Actionable Zero-Slots Recovery**: If `openSlotCount === 0`, always display:
   - Clear feedback: `No open runway slots for [Package Title] on [Selected Date]`.
   - **`Check Next Day →`** button advancing the calendar by 1 day.
   - Quick-switch buttons to available alternative durations on the same date (e.g., `Try 60m`).
   - **Open slots only**: the departure grid lists bookable slots and nothing else. Booked, reserved or internally locked slots are never rendered (no strikethrough or disabled tiles), so the visitor chooses from what is actually available.
4. **Dual GUI Support**:
   - [`AmazonFlightStorefront.tsx`](components/scheduler/AmazonFlightStorefront.tsx): Amazon-style 1-page catalog view with sticky buy-box.
   - [`KantorovichCalendarScheduler.tsx`](components/scheduler/KantorovichCalendarScheduler.tsx): Guided 3-step wizard view.
   - Both components must share identical availability and zero-slots recovery logic.
5. **One-Year Booking Horizon**: a flight can be booked from today up to the same calendar date one year ahead (`maxBookableDate()` in [`lib/scheduler/booking-horizon.ts`](lib/scheduler/booking-horizon.ts), on the Israel date). The shared `BookingWeekPager` and `BookingMonthPager` disable "next" and every day past it (with the localized `horizonNote`), `/book` clamps any selected date, and the server is authoritative: `POST /api/checkout` and `GET /api/slots` answer 400 for a later date. Both pagers also show a **Today** button whenever the view has moved away from today (`data-calendar-today`); `tests/e2e/booking-horizon.spec.ts` covers both interfaces.

---

## 5. Multilingual & Bidirectional UI Discipline (7 Languages)

The platform supports 7 languages with zero cross-language contamination:
- **Hebrew (`he`)** — RTL
- **English (`en`)** — LTR
- **Russian (`ru`)** — LTR
- **French (`fr`)** — LTR
- **Arabic (`ar`)** — RTL
- **Spanish (`es`)** — LTR
- **German (`de`)** — LTR

### Critical Coding Rules
1. **No `isRTL ? he : en` Hacks**:
   - Arabic is an RTL language. Using `isRTL ? 'עברית' : 'English'` forces Hebrew text on Arabic-speaking users.
   - Always resolve strings through `translations.ts` or localized copy dictionaries: `t.booking[key] || CLEAN_COPY[language] || CLEAN_COPY.en`.
   - Reserve `isRTL` exclusively for CSS layout styling (`dir="rtl"`, chevron flips `rotate-180`, alignment).
2. **Zero Cross-Script Contamination**:
   - Never mix Hebrew unicode characters (`[\u0590-\u05FF]`) into Arabic text.
   - Never mix Arabic unicode characters (`[\u0600-\u06FF]`) into Hebrew text.
3. **Telemetry Isolation (`dir="ltr"`)**:
   - Aviation telemetry must strictly remain in LTR: METAR weather strings, radio frequencies, transponder squawks, booking references, and slot ranges (`10:00 - 11:15`).
4. **Key Parity**:
   - When adding a new translation key in [`lib/i18n/translations.ts`](lib/i18n/translations.ts), all 7 languages (`he`, `en`, `ru`, `fr`, `ar`, `es`, `de`) must be provided simultaneously.
5. **Server-Rendered HTML First Paint (`lib/i18n/language-bootstrap.ts`)**:
   - Hebrew is the first-visit default. An inline anti-flicker bootstrap script sets `data-language-pending="true"` on the body container only when a returning visitor has an explicit non-Hebrew `simdream_lang` preference in local storage on a URL without a routed locale prefix.
   - First-time visitors, Hebrew visitors (`simdream_lang === 'he'`), and routed-locale visitors (`/en/...`, `/ru/...`, etc.) see the server-rendered HTML painted immediately without waiting for React hydration. A bounded 3-second fail-safe removes `data-language-pending` if client bundles fail.

---

## 6. Runtime Database & Security Architecture

1. **Fail-Closed in Production**:
   - The legacy local checkout writer and its persistence require valid Supabase credentials; a card-funded local checkout additionally requires valid Stripe secrets and a verified Stripe webhook.
   - Wix-authoritative checkout is a separate boundary: it requires the enabled Wix adapter plus live Wix Bookings, Cart V2, and hosted-payment configuration. It never falls back to the local writer or to in-memory persistence.
   - Never fallback to in-memory orders in production.
2. **Graceful Local In-Memory Fallback**:
   - In [`lib/db/supabase-admin.ts`](lib/db/supabase-admin.ts) and [`lib/db/store.ts`](lib/db/store.ts), check `isProduction && Boolean(getSupabaseAdmin())`.
   - If Supabase environment variables are missing during local development or testing, fallback gracefully to in-memory store and demo seed data without crashing `/api/slots` with HTTP 500. Local dev server can run with `npm run start:local` (`ALLOW_IN_MEMORY_STORE=true`).
3. **Server-Authoritative Pricing & Durations**:
   - The client submits validated selection inputs (`packageId`, `bookingDate`, `startTime`, `addonIds`, and optional route or voucher) plus the required pilot manifest and consents. It never submits a price, duration, end time, or discount authority.
   - The server resolves all prices, durations, end times, and discounts from authoritative registries.
4. **Stripe Webhook Authority**:
   - For card-funded local bookings, only a signature-verified Stripe webhook (`checkout.session.completed`) marks a booking paid and confirms its reservation. A fully funded, already-paid gift voucher is redeemed atomically and confirms its voucher-funded booking inline. Client redirect to `/book/success` never confirms a card payment.
5. **Verified Member Identity & Protected Data Ownership**:
   - A flight booking is attached to a member profile only when the checkout email matches that member's confirmed identity-provider email.
   - Guest checkouts remain permitted; an authenticated member may later claim matching **paid** guest bookings. Anonymous email lookups must never expose purchase history or Stripe receipts.
6. **Isolated Test Build Sandboxing**:
   - Sandboxed test runs and Playwright servers must use `.next-test` (`NEXT_DIST_DIR: '.next-test'`, see `tests/support/test-env.ts`), ensuring test builds never mutate or clobber the developer's working `.next` build.
7. **Wix Headless Backend Adapter (`lib/wix/`)** (full rules: [`docs/modules/wix-adapter.md`](docs/modules/wix-adapter.md); read it before touching `lib/wix/`, the booking checkout or the Wix environment):
   - The only writable Wix target is the **"SimDream-Staging"** Headless site (metasite `317b0c6d-6608-499a-bb3c-b1c37650e460`); the live Editor site on simdream.co.il and the retired `4c5e1c7a-163c-48ce-8278-cdc42e4deed4` site are never written to from this repo. No client secret, API key or PayPlus credential ever enters the repo or the browser.
   - Two public-client boundaries: `lib/wix/client.ts` (anonymous visitor) and `lib/wix/member-client.ts` (browser-only member session). Bookings is called over REST; `@wix/bookings` is not installed.
   - `lib/wix/catalog.ts` maps 9 of 10 `SIMULATOR_PACKAGES` ids (`pkg-grand-120` is pending); `reconcileCatalog()` must report 0 mismatches. Run `npm run wix:smoke` after touching the catalog or Wix services.
   - Availability re-anchors on real Wix bookings, time-adding add-ons are native Wix add-ons, and the Bookings Pricing provider alone enforces the zero-waste grid. The checkout fails closed (503) when Wix and the registries disagree.
   - Source mappings do **not** prove that a Wix service, product, plan or provider is configured: treat `npm run wix:smoke`, `npm run wix:readiness` and a recorded staging purchase as separate evidence. Confirm every endpoint from the docs, never from memory, and confirm a query operator against the live API as well: the Wix reference lists `$hasSome` for a blog post slug, the API rejects it with HTTP 400 (`docs/modules/blog-language.md`). A fallback to local data must log, never stay silent.

8. **Refund requests**: `POST /api/refund-requests` returns 201 only when the request was stored or emailed to the team and answers 503 with the desk contact otherwise; the order lookup reveals only title, session date/time and order date and only when reference and email both match; logs never carry request data.
9. **Birthday discount**: the pure engine `lib/discounts/birthday/` applies Option A tiered discounts (10% for 60m Captain's Command, 15% for 90m Ultimate and 120m Grand, whole shekels, half up, agorot for Stripe; 30m Discovery and 45m Promo are ineligible) when the pilot's birthday falls in the FLIGHT date's calendar month or up to 14 days before it (`BIRTHDAY_*` constants; forward grace supported, off). The flight date decides, never the booking date. It never stacks (Terms 8.1): not on the bare Discounted Promotion (once add-ons upgrade it to the 90m or 120m tier the booking is judged as that tier, `effectivePackageId` on `/book`, and the bare promotion shows a highlighted `promo_picked` notice instead), not on subscription redemptions or gift-voucher purchases. Local checkout re-evaluates every claim and persists only month, day and the applied flag. Wix is fail-closed until its separately registered Bookings Pricing provider is fully configured; then the provider validates a short-lived opaque claim, service and flight date and Wix owns the final price. The claim is bound to the pilot's email and phone (a booking for another contact, or without `contactDetails`, gets the standard price) and issued at most 10 per 10 min per client and 5 per hour per email, falling back to a bounded in-process count (60 per client) when no limiter store exists; the birthday stays self-attested, and neither a one-time nonce nor a once-per-identity-per-year rule exists (owner decision). Do not activate it outside SimDream-Staging; see [`WIX_BIRTHDAY_PRICING_PROVIDER.md`](docs/WIX_BIRTHDAY_PRICING_PROVIDER.md).
10. **Checkout throttle and unpaid holds**: `POST /api/checkout` consumes `lib/booking/checkout-throttle.ts` after validation and before any record, for card, voucher-funded and local gift-voucher checkouts: `checkout-init-ip` 10 per 10 min (60 for the shared `unknown-client` bucket), `checkout-init-email` 6 per 30 min (normalized `pilotEmail` or `senderEmail`), `checkout-init-slot` 8 per 30 min (`<date>T<start>`). Over a limit 429 with `Retry-After` (the longest refused wait); limiter unavailable 503, `no-store`. The Wix Gift Cards path is never throttled. The two Wix checkout starts have their own per-address throttle (`lib/wix/checkout-start-throttle.ts`: `POST /api/wix/bookings/checkout` 30 per 10 min, `/api/subscriptions/checkout` 10 per 10 min, looser for `unknown-client`), which counts in process when no limiter store exists and never answers 503. A card checkout (`lib/booking/checkout-hold-policy.ts`) stores its Stripe session id, URL and expiry on the pending booking (migration 013); a failed write of them does not fail the checkout (one fixed, data-free log line from the service, plus the store's error-code line on Supabase), and that hold then has no stored session. The email is unverified, so a retry never releases a live hold. When the same normalized email retries the departure it holds (same package, date, start): an open session with the same add-on set and payable total is resumed, 201; a session past its stored expiry is sent to `expireHostedCheckout`, and only an exactly `expired` outcome cancels the hold and lets a normal checkout run (a `complete` one answers 409 "already paid", a gateway error 503, any other outcome 409, all releasing nothing); anything else (a differing retry while the session is open, no stored session, or a stored expiry that is not a time) answers 409 and releases and expires nothing. Any other departure is refused with 429 once the email holds 2 unpaid pending card bookings (`paymentMethod` `stripe`; a pending desk booking does not count). A different email keeps the 409; voucher-funded bookings skip the hold rules. Tests never weaken limits: they reset the in-memory limiter (`resetInMemoryRateLimitsForTests`).
11. **Outbound Deadlines & Concurrency (`lib/http/timeouts.ts`, `lib/booking/after-response.ts`)**:
    - Idempotent outbound reads enforce deadlines: member-token check 5 s (`TIMEOUT_MEMBER_TOKEN_MS`), Wix catalog, availability, member calendar, Google Places and Cloud Translation 8 s (`TIMEOUT_IDEMPOTENT_READ_MS`), and full Wix availability query 20 s (`TIMEOUT_WIX_AVAILABILITY_QUERY_MS`). Outbound mutating calls (Wix cart, Stripe session) carry no artificial deadline.
    - `wixPost` takes opt-in `timeoutMs` and reports timeouts as 504 `WixApiError`.
    - Overlapped execution: `POST /api/checkout` starts member token verification and voucher lookup concurrently with slot checking (preserving hold release and error priority order). Wix `/api/slots` starts the local efficiency calculation concurrently with Wix availability reads.
    - Post-response tasks: voucher-funded booking confirmation emails are dispatched non-blocking via Next.js `after()`, while Stripe webhook awaits email delivery before replying.

---

## 7. Quality Assurance (QA) Checklist

Before completing any feature or code change:
1. Run `npm run build` — must compile with 0 TypeScript or build errors across every active App Router page and route handler.
2. Verify `/book` with consumer packages (30m, 45m, 60m, 90m, 120m) &rarr; 3-step flow with add-ons, promotional tier bump-ups, and the 2-mission-add-on cap.
3. Verify `/book` with PRO packages (`/book?package=airline-interview-prep-90-pro`) &rarr; 2-step noise-free flow.
4. Verify calendar across Sunday through Saturday (09:00–24:00); verify flat all-day pricing (including 90m at ₪850), Saturday `saturday_prime` operating metadata, and the Sunday–Tuesday-only 45m promotion.
5. Verify all 7 language switchers (`he`, `en`, `ru`, `fr`, `ar`, `es`, `de`) render correctly with zero mixed scripts or broken keys.
6. Verify the brand identity in all three themes and the three Cockpit Night tones: official logo (orange airplane + cerulean wordmark) alone in the header with no tagline beneath it, no off-brand blues or cyans, and the orange primary action with a dark label in the Cobalt and Squadron tones only (§1, Brand Identity).
7. Verify responsive header and UI fit across all viewports from 320px (iPhone SE) to 1920px desktop (`tests/usability/header-fit.spec.ts`), with 44x44px minimum tap targets.
8. Verify member authentication & dashboard localization across all 7 languages (`tests/usability/member-i18n.spec.ts`).
9. Verify iPhone/iPad behaviour (`tests/usability/apple-web-app.spec.ts`, the 320px test in `tests/e2e/mobile.spec.ts`): `viewport-fit=cover` with pinch zoom intact, safe-area utilities (`pb-safe-area-*`, `px-safe-area-*`, `bottom-safe-area-*`) on sticky bars, dialogs and the footer, `overflow-x: clip` (never `hidden`, which detaches the sticky navbar on iOS), the 48px coarse-pointer control floor with 8px calendar/slot gaps and a 12px phone text floor (Material and Lighthouse; Apple asks 44px), an opaque 180px `app/apple-icon.png` and the manifest icons regenerated with `node scripts/generate-app-icons.mjs` whenever the brand mark changes. Recipes: `npx skills add https://github.com/joe-bell/skills --skill apple-web-app`.
10. Run the automated quality framework ([`TESTING.md`](TESTING.md)): `npm run test:quick` for every change, `npm run test:all` before completing a feature. The accessibility baseline must stay empty (0 axe violations) and visual baselines change only on purpose.

---

## 8. Structured Data & SEO Facts

Search engines and AI assistants quote whatever the site publishes about itself, so every published fact must be the registry's fact:
1. **No hand-typed prices, hours or ratings**: JSON-LD, page metadata ([`lib/seo/seo-config.ts`](lib/seo/seo-config.ts)) and `public/llms.txt` take prices and durations from `SIMULATOR_PACKAGES` / `FLIGHT_ADDONS`, hours, address, contact and social URLs from [`lib/config/facility-info.ts`](lib/config/facility-info.ts) (operating window 09:00–24:00; schema.org `Time` writes an end-of-day close as `23:59`), and languages from `LANGUAGES`. Never retype a number a registry already owns.
2. **One site-wide graph**: [`lib/seo/structured-data.ts`](lib/seo/structured-data.ts) builds the `@graph` that [`components/seo/StructuredDataJsonLd.tsx`](components/seo/StructuredDataJsonLd.tsx) renders once in the root layout (LocalBusiness, offer catalogues including an `Offer` for each PRO tier, WebSite with all seven `inLanguage` tags). `sameAs` lists Google Maps, the alternate domain, WhatsApp and the three social profiles from the facility config.
3. **FAQPage only beside a visible FAQ**: emit [`components/seo/FaqPageJsonLd.tsx`](components/seo/FaqPageJsonLd.tsx) inside the FAQ section of the route, passing the exact array that section maps over in the visitor's language. Never add FAQPage to the root layout or to a route without the same questions and answers on screen.
4. **Ratings are never hard-coded**: no `aggregateRating` or `review` in any schema; Google's own numbers reach the page only through the review bar (§1.7).
5. `tests/unit/seo-integrity.test.ts` renders the graph and enforces all of the above, and keeps the CSP `img-src` in step with the blog cover hosts.

---

## 9. Modularity

Every feature is a folder module with one public `index.ts`: UI in `components/<feature>/` (one component per file, hooks in `hooks/`), pure logic and thin I/O adapters in `lib/<feature>/`, copy in the module's own `Record<SupportedLanguage, ...>` file. Files stay under 400 lines; `tests/unit/module-size.test.ts` fails when an unlisted file exceeds that or an allowlisted one grows, and an allowlist entry is deleted once its file is within budget. `/book` is the reference implementation (`docs/MODULARITY.md`). Plug features into a module through its documented optional props, never by editing the middle of a component.


**Wix worker budget (14 MiB, `scripts/prepare-wix-worker.mjs`, never overridden to ship).** The server renders only Hebrew, so non-Hebrew copy is client-only: load it through `dynamic(..., { ssr: false })` components (see `lib/legal/loaders-intl.ts`), and never import `lib/i18n/translations.ts` values from the root layout or from `lib/seo` (`tests/unit/worker-bundle-rules.test.ts`). Measure with `npm run wix:build` before adding sizeable copy; `docs/modules/wix-bundle-diet.md` lists the remaining levers. `npm run wix:build` also fails when the middleware bundles the `cookie` parser without esbuild's node-mode flag (`scripts/wix-worker-guards.mjs`); `@opennextjs/cloudflare` stays pinned at 1.20.16 until a release passes that build and a cookie request on the built Worker (`docs/modules/wix-adapter.md`).

---

## 10. Legal content, consent and versions

1. The rules keep the owner's clause numbering (1-12 plus appendix); new clauses are appended (13+) and existing numbers never change. Refund requests go through `/refund` only (clause 13); `/refund` stays unlisted.
2. Legal wording lives in `lib/legal/content/*`, one module per language and document, loaded with `import()`; never import those modules directly.
3. Any change to legal or consent wording bumps `LEGAL_DOCUMENT_VERSION` / `CONSENT_VERSION` in `lib/legal/versions.ts`; `tests/unit/legal-versions.test.ts` enforces it.
4. The checkout shows two separate, unchecked checkboxes (rules + refund rule + privacy; media release and waiver) with the copy from `CONSENT_COPY`, and the server stores `buildConsentRecord()` with the order.
5. Legal translations are flagged NEEDS LEGAL REVIEW until counsel signs off; no Hebrew text on non-Hebrew pages.

---

## 11. Browser support policy

Use Baseline Widely available web platform features without fallbacks. A feature that is only Newly available or Limited availability (for example `closedby`, `focusgroup`, anchor positioning, `popover` in older Safari) is used only as progressive enhancement: the page works without it, and any behaviour that matters is provided another way (the native modal dialogs keep click-outside dismissal in a script handler because Safari lacks `closedby`). Do not add a polyfill or a library for a feature a browser lacks when graceful degradation is enough. Check support in the Modern Web Guidance guide (`npx -y modern-web-guidance@latest retrieve "<guide>"`) before relying on a newer feature.
