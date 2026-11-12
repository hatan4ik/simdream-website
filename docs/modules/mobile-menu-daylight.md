# Mobile menu in Brand Daylight (workstream A7)

Branch `fix/mobile-menu-daylight`, from `origin/main` 65fc3a5.

## Report and root cause (reproduced, not assumed)

On a 390x844 phone in Brand Daylight the open hamburger panel (`#mobile-navigation`) painted near-black
while its links were dark ink. Reproduced on an isolated `.next-test` build with Playwright chromium and
`localStorage.simdream_ui_theme = 'brand'` (the same key `public/theme-bootstrap.js` and
`UiThemeSwitcher` use):

| Before the fix | Measured |
| --- | --- |
| Panel computed background | `oklab(0.129 -0.004 -0.042 / 0.98)` = `rgba(2, 6, 24, 0.98)`, painted `rgb(7, 11, 29)` |
| Link text (`text-slate-300` remapped by daylight) | `rgb(51, 65, 85)`, **1.89:1** on the panel (16 of 21 text runs below 4.5:1) |

The panel class is `bg-slate-950/98`. The daylight block in `app/globals.css` re-coloured `/30 /40 /50 /55 /60`
and `/70 /80 /85 /90 /95` but not `/98` (the cockpit tone block did list `/98`). Tailwind makes one class per
opacity, so `/98` was an unrelated class that no daylight rule matched.

**Clean Studio was broken too** (the owner reported it as fine). Studio is layered on daylight
(`data-ui="brand"` + `data-look="studio"`), has no mobile-panel rule of its own and inherits the daylight
fills, so it showed the same black panel with `#424245` links at 1.95:1. One daylight override fixes both.
Cockpit Night (all three tones) was never affected.

**Why no test caught it:** axe reports a translucent panel laid over page content as "incomplete" ("background
color could not be determined because it's partially obscured"), never as a violation (12 to 17 incomplete
nodes in every theme), and no existing spec opens the phone menu in a light theme.

Side finding: with nothing stored, the theme is **Brand Daylight** (`UiThemeProvider` and
`public/theme-bootstrap.js` default to `brand`; `tests/usability/cockpit-tone.spec.ts` asserts it), while
AGENTS.md §1.5 calls Cockpit Night the default. So most first-time phone visitors saw the black panel.

## What changed

Commit `1a36a9c` (the fix, the guard and the spec; no visual baseline changes):

- `app/globals.css`, `html[data-ui="brand"]` block, only existing daylight values:
  - `.bg-slate-950\/98` joins the white high-alpha group (the actual fix).
  - `.hover\:bg-slate-900\/40:hover` joins the `#f1f5f9` hover group (`/subscriptions` table row hover was ~4:1 mid-grey).
  - `.focus-visible\:bg-slate-800:focus-visible` joins the `#e2e8f0` hover group. A keyboard-focused,
    non-selected language option was `#1e293b` with `#334155` text, **1.41:1** (language selector popover).
  - `.bg-slate-700` becomes `#cbd5e1`: the unfilled difficulty pips on `/experiences` were darker than the filled orange ones.
- `components/layout/Navbar.tsx` is **not** touched: the fix is the missing override, not the panel class.

Commit `5702a2e` (four more dark gradient stops, a separate commit so it can be dropped): `from-slate-900/60`,
`via-slate-900/60`, `via-slate-950/90` and `to-slate-950/80` get the same light values as their existing
neighbours. Visible defects fixed: the `/pro` recommended 90 PRO card (a dark band across its middle, text
illegible), the `/experiences` route-choice panel ("Extended Mission" text on a dark gradient) and the
`/subscriptions` pillar cards (dark top edge). **This changes the Brand Daylight `/pro` visual baselines**
(`pro-brand-en`, `pro-brand-he`; the diff is confined to the card, 93,930 px in the 1280px capture): refresh
the four `pro-brand-*-visual-{linux,darwin}.png` files (CI artifact for linux, local test build for darwin). If you
prefer to defer that, revert `5702a2e`; the guard stays green because its allow-list is then the only thing to
re-add (see below).

## The guard: `tests/unit/daylight-slate-overrides.test.ts`

Pure helpers in `tests/unit/_support/daylight-slate.ts`. It parses every string, template chunk and JSX text in
`app/`, `components/` and `lib/` (TypeScript AST, so comments never count) for `[variants:]{bg,from,via,to}-slate-<shade>[/<opacity>]`,
reads `app/globals.css` for selectors under `html[data-ui="brand"]` whose subject is exactly one such class
(compound scrim selectors such as `.fixed.inset-0.bg-slate-950\/80` do not count as coverage for the general class),
and fails for every class whose shade daylight already re-colours but whose exact class has no override. A
shade with no daylight rule at all (`bg-slate-500`) is not required. Run against the unfixed CSS it fails with
exactly the 8 classes above. `ALLOWED_UNCOVERED` holds one entry, `from-slate-950/80` (BlogCard cover-photo scrim,
no text); stale or newly-covered entries fail the test so the list cannot rot. Arbitrary opacities
(`bg-slate-950/[0.98]`) and `!` modifiers are out of scope (none exist).

## The spec: `tests/usability/mobile-menu-theme.spec.ts` (+ `tests/usability/support/contrast.ts`)

At 390x844: Brand Daylight, Clean Studio and Cockpit Night (en, he, ru), plus Cobalt Navy and Squadron Mid-Navy
(en). It opens the menu and the About disclosure, then asserts the painted panel colour (luminance >= 0.85 light,
<= 0.05 dark), every visible text run >= 4.5:1 (composited over translucent ancestors, any CSS colour syntax), and
no axe `color-contrast` violation inside `#mobile-navigation` (`AxeBuilder` + `WCAG_A_AA_TAGS` from `tests/a11y`).
For the light themes it also requires zero "incomplete" axe contrast results, which proves axe actually evaluated
the links. 11 tests; before the fix the 6 light ones fail ("panel paints rgb(7, 11, 29)"), after it all pass. The
menu is opened with `dispatchEvent('click')` because of the Russian header defect below.

## Checked, no defect

At 320, 390 and 430 px in en, he, ar and ru (Brand Daylight and Clean Studio): panel link, member row, About
disclosure and its sub-links, both theme switchers, language popover (tap and keyboard), no clipped text, no
horizontal overflow, all tap targets >= 44px. Active link (`text-sky-400 bg-sky-500/10`, 5.09:1), hover (9.45:1),
admin link (7.09:1, hover 6.47:1) and the demo-role buttons (5.09:1, 6.37:1) pass on white. The compact switchers
(from 640px), the WhatsApp action (`text-slate-950` on green) and the desktop flyout are fine in daylight.

## Found, NOT fixed (outside the panel colour classes; `Navbar.tsx` bar and `LiveMetarBar` are another agent's area)

1. **The hamburger button is pushed off-screen on phones, in every theme.** `[data-site-navbar-row]` holds the 177px logo,
   the 44px WhatsApp button, the Book link (its label is the first word of `t.nav.bookFlight`) and the 48px menu button.
   Right edge of the menu button against the viewport width, Brand Daylight (a value above the width is off-screen):
   Russian 377 at 320, 427 at 360, **431 at 390**, 431 at 430 (the 126px "Забронировать" label); French and Spanish 331 at 320 and
   381 at 360 (they fit from 390); English, Hebrew and Arabic fit everywhere. Clean Studio is worse (Russian off-screen up to
   430, French and Spanish up to 390, and English, Hebrew and Arabic at 360 by 3 to 9px). `overflow-x: clip` hides the overflow, so no test sees it, and
   `tests/usability/header-fit.spec.ts` only covers 1024px and up. Suggested fix: below ~440px let the logo shrink (`shrink min-w-0`
   on its link) or drop the Book link from the bar and keep it in the panel, then add 360px and 390px cases to the header-fit spec.
2. **Clean Studio's utility bar wraps to two rows at 390px and below** (`[data-site-utility-bar]` 97px high instead of 49px; reviews
   on one row, social icons and language on the next). Probably the 17px studio root font; AGENTS.md §1.7
   expects one row from 360px.
3. **Cockpit panel is not opaque**: `bg-slate-950/98` lets ~2% of the page show through, and the nested `backdrop-blur-xl`
   inside the nav's own backdrop root cannot blur it, so faint sharp page text ghosts behind the links. Cosmetic and
   pre-existing; an opaque `bg-slate-950` would remove it (the light themes are already opaque).
4. The `from-slate-950/80` BlogCard scrim is deliberately left dark (see the allow-list).

## Verification run (machine under heavy load; the single isolated build is of the PRE-fix tree)

- `npm run lint` (typecheck + type hygiene): pass. `npx vitest run --project=unit`: 59 files, 941 tests pass,
  including the new guard (8 tests). The guard fails against the original CSS (8 uncovered classes).
- Playwright against `.next-test`: `mobile-menu-theme.spec.ts` 6 of 11 fail on the pre-fix build and 11 of 11 pass with the fix;
  `header-fit.spec.ts` + `header-brand.spec.ts` 36 of 36 pass.
- Because the rules are plain CSS (no new Tailwind utilities), the "after" runs used that same build with the new rules
  appended to its CSS chunk and `PW_ALLOW_STALE_BUILD=1`, instead of a second `npm run test:build`. A real rebuild before
  merging is still the proper gate.
- Visual project, closed menu and pages: `/`, `/about`, `/book`, `/vouchers` (brand en and he), `/` and `/vouchers` (cockpit en)
  and the two 390px mobile baselines are unchanged. `/pro` brand en differs only inside the recommended card (commit `5702a2e`).
- `npm run docs:verify`: 318/318 items covered; the Genesis fingerprint is stale (expected after any source change).

## Lines for the coordinator (I did not edit GENESIS.md or AGENTS.md)

- AGENTS.md §1 item 4 (Contrast), append: "Every slate fill class used in source (`bg-`, `from-`, `via-`, `to-slate-*`, with any
  opacity or state variant) needs its own `html[data-ui="brand"]` override in `app/globals.css`; `tests/unit/daylight-slate-overrides.test.ts`
  fails otherwise, and a deliberate dark exception goes in its `ALLOWED_UNCOVERED` with a reason. The phone menu panel is covered by
  `tests/usability/mobile-menu-theme.spec.ts` in all three themes."
- AGENTS.md §1 item 5 says Cockpit Night is the default theme; the code defaults to Brand Daylight. Align one with the other.
- GENESIS.md, quality gates: list `tests/unit/daylight-slate-overrides.test.ts` (and `tests/unit/_support/daylight-slate.ts`) and
  `tests/usability/mobile-menu-theme.spec.ts` (and `tests/usability/support/contrast.ts`), then `npm run docs:genesis:stamp`.
- Source bytes added to the client bundle: none (CSS rules only, about 0.7 KB; the rest is tests).
