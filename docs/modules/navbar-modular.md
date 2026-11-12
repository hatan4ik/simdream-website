# Module handoff: navbar-modular

Branch `feat/navbar-modular` (workstream A8). Base: `feat/navbar-modular` at `5986c36` (offers nav item, Russian short Book
label, 360px header fix and the cookie-consent module already merged).

## Purpose

`components/layout/Navbar.tsx` was a 674-line client component holding the navigation data, three kinds of menu state,
keyboard handling, and the markup of the desktop flyouts, the account menu and the phone drawer. It is now a 71-line
orchestrator over `components/layout/navbar/`, so each part of the header can be fixed, restyled or tested on its own.

**The split is a pure move**: same markup, class strings, ids (`mobile-navigation`, `desktop-navigation-<useId>-<group>`,
`user-navigation-<useId>`), `data-*` hooks, aria attributes, focus behaviour, keyboard handling, effect order and render
order. The one intentional addition is the phone drawer's **Cookie settings** entry (below).

Routes, environment variables, database migrations, dependencies: **none added or changed.** `app/globals.css` and
`components/consent` are untouched.

## Module map

All under `components/layout/navbar/` (line counts at the time of writing; the budget is about 300 per new file).

| File | Lines | Role |
| --- | ---: | --- |
| `index.ts` | 21 | The public entry. `Navbar.tsx` imports `./navbar/index` (see Decisions 1). |
| `navigation-model.ts` | 116 | **Pure data**: `NavigationGroupId`/`NavigationItem`/`NavigationGroup`, `NAVIGATION_GROUP_IDS`, `buildNavigationGroups(t, offersLabel)`, `buildNavigationLinks(t, offersLabel)`, `buildAboutLinks(t)`, `isNavPathActive(pathname, path)`, `isNavGroupActive(group, pathname)`. No React, no I/O. |
| `use-navbar-menus.ts` | 265 | **All state and effects** (the hook contract below). |
| `use-navbar-member.ts` | 12 | `useNavbarMember()`: who the header shows (`user`, `isAdmin`, `memberName`, `logout`, `setDemoUser`). |
| `demo-mode.ts` | 5 | `DEMO_MODE_ENABLED` (local development without Supabase; gates the role switchers). |
| `DesktopNavTriggers.tsx` | 43 | The four group buttons (xl and up). |
| `DesktopNavPanel.tsx` | 82 | The full-width flyout (`data-navbar-menu-panel`) with its keyboard handler. |
| `DesktopNavActions.tsx` | 32 | `data-navbar-actions` (md and up): theme and tone switches, `UserMenu`, `NavBookLink`; focus or press dismisses a flyout. |
| `UserMenu.tsx` | 126 | The account button and its dropdown (`data-user-menu-trigger`, role menu). |
| `NavBookLink.tsx` | 24 | The Book link: full label on desktop, `nav.bookFlightShort` when `compact`. |
| `CompactNavActions.tsx` | 48 | The phone and tablet cluster: switches (from `sm`), WhatsApp (from 360px), short Book, the menu trigger (`data-mobile-menu-trigger`, `aria-controls="mobile-navigation"`). |
| `MobileNavigation.tsx` | 114 | The drawer (`#mobile-navigation`, `data-mobile-navigation`). |
| `MobileAboutGroup.tsx` | 48 | The drawer's "About" `<details>` group, **including the new Cookie settings entry**. |

`components/layout/Navbar.tsx` (71 lines): builds the model, calls `useNavbarMenus({ pathname, isRTL })` once and hands each
part its slice (`menus.desktop`, `menus.user`, `menus.mobile`). Its `SIZE_ALLOWLIST` entry in
`tests/unit/module-size.test.ts` is deleted.

Render order inside `<nav data-site-navbar>` is unchanged: logo link, desktop triggers, desktop actions, compact cluster
(inside `data-site-navbar-row`), then the desktop flyout panel, then the drawer.

## Hook contract: `useNavbarMenus({ pathname, isRTL })`

`pathname` closes every menu when it changes; `isRTL` only mirrors the Left/Right arrow keys between the desktop triggers
(never used for display text, AGENTS.md section 5). `useId()` stays in this hook, which `Navbar` calls, so the generated ids
are the ones the old component produced. The return type is inferred and exported as `NavbarMenus`, `NavbarDesktopMenu`,
`NavbarUserMenu`, `NavbarMobileMenu`.

```ts
{
  navbarRef,                                   // ref of the <nav>; "outside the header" is measured against it
  desktop: {
    activeId: NavigationGroupId | null,        // the open flyout
    panelId(id): string,                       // aria-controls target
    registerTrigger(id): (el) => void,         // ref callback for a group trigger
    hoverTrigger(id), clickTrigger(id),        // hover opens and is confirmed (not toggled shut) by the click that follows
    onTriggerKeyDown(event, id),               // Arrow Up/Down/Left/Right, Enter, Space
    onPanelKeyDown(event),                     // Home, End, Arrow Up/Down, Escape
    close(restoreFocus?), dismiss(), onPointerExit(),
  },
  user: { open, menuId, menuRef, triggerRef, toggle(), onTriggerKeyDown(event), close(restoreFocus?) },
  mobile: { open, triggerRef, toggle(), close(restoreFocus?), closeForDialog() },
}
```

Behaviour it owns (all as before): route change closes everything; a pointer press outside the `<nav>` closes everything;
Escape closes the drawer first, then the account menu, then a flyout, and returns focus to that trigger on the next frame;
opening a flyout closes the account menu and the reverse. **There is no scroll lock** (the header never had one: the drawer
is an absolutely positioned panel with `overscroll-contain`); none was added.

New in the contract: `mobile.closeForDialog()` (see below). Everything else mirrors the old inline functions one to one.

## The one functional addition: Cookie settings in the phone drawer

Phones have no footer, so the footer's `ConsentSettingsLink` was unreachable there. `MobileAboutGroup` renders
`<ConsentSettingsLink />` (from `@/components/consent`, unedited) after the privacy-policy link, as the last entry of the
"About" group:

- Classes: the sibling links' exact string (`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-slate-300
  hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`) plus `w-full
  cursor-pointer text-start` (a `<button>` needs the cursor and full width; Tailwind 4 buttons default to `cursor: default`).
  Measured: 48px tall, the same box and the same label start edge as the privacy link in all six languages, LTR and RTL.
- Closing: `ConsentSettingsLink` takes only `className`, so a layout-neutral `<div className="contents" onClick={menu.closeForDialog}>`
  hears the click that bubbles up (mouse, tap, Enter and Space all fire it).
- Focus: `closeForDialog()` focuses the drawer trigger **in the same event**, then closes the drawer. The consent dialog records
  `document.activeElement` when it mounts and returns focus there on close. A deferred focus (`closeMobileMenu(true)`, an
  animation frame later) would race the dialog and steal the focus the dialog just took when the dialog chunk is already
  cached. With the synchronous version the opener is the drawer trigger, which is mounted for the whole interaction: Escape
  in the dialog returns focus to the menu button, drawer closed.

## Decisions and assumptions

1. **`./navbar/index`, not `./navbar`.** `Navbar.tsx` and the `navbar/` folder differ only in extension and case. On a
   case-insensitive file system (macOS, Windows) a bare `./navbar` resolves to `Navbar.tsx` itself (TS2459 circular import
   alias, found while building this). `Navbar.tsx` therefore imports `./navbar/index`, with a comment. Keep it, and import
   the barrel the same way from anywhere else.
2. **Leaf components read context themselves.** `useLanguage()` and `useNavbarMember()` (which wraps `useAuth()`) are called in
   the part that needs them, so props stay small (`menu`, `groups`, `pathname`, `links`). Context values are the same; the
   header re-renders on the same changes.
3. **`MobileNavigation` is always mounted and returns `null` while closed** (the old code rendered the `<div>` conditionally
   in `Navbar`). The DOM is identical; the hooks it calls run before the early return.
4. **The unit-tested seam is the model**, not the hook: Node has no DOM here, so keyboard and focus behaviour is pinned by
   Playwright (below).
5. `tests/e2e/pages/layout-quarantine.ts` still quotes `Navbar.tsx:171` in a comment (stale before and after this change).

## Tests added

| Test | What it pins |
| --- | --- |
| `tests/unit/navbar-navigation-model.test.ts` (24) | Group ids and order, every destination, drawer order with Offers second, flyouts and drawer expose the same internal routes (About aside), six-language labels with no Hebrew in Arabic or Arabic in Hebrew, exact-match active rules and the `/simulator` to `/pro` rule, and the About group: the cookie entry renders after the privacy link in all six languages, 44px class, same classes as its siblings. |
| `tests/usability/navbar-cookie-settings.spec.ts` (14) | At 360px and 390px in all six languages: the entry is reachable, last, 48px, the same box and label start edge as its sibling (RTL included), inside the screen; activating it closes the drawer, opens the named dialog with focus inside; Escape closes the dialog and focus returns to the menu button. Plus Enter and Space by keyboard with Tab kept inside the dialog, and reopening. |
| `tests/unit/module-size.test.ts` | Entry for `components/layout/Navbar.tsx` deleted (the test fails while it is listed). |

## Verification (2026-11-11, base `5986c36`, one isolated `npm run test:build`, Playwright on port 3731)

Zero-change proof, before and after, on the same dev server: `components/layout/Navbar.tsx` DOM (`nav[data-site-navbar]` outerHTML
plus the focused element) was captured in 318 states, in each of the 6 languages at 360, 390, 768 and 1440px: closed; phone
drawer open, About group open, after Escape; each of the 4 desktop flyouts by hover, hover then click, pointer leaving, ArrowDown,
ArrowDown again, End, Escape, ArrowRight, ArrowUp; account menu as guest (click, Escape, keyboard) and as the demo pilot.
**279 states are byte-identical. 36 differ only by the added `<div class="contents">` and the Cookie settings `<button>`
(the drawer-open and About-open states at the three phone and tablet widths in six languages; the group is in the DOM while collapsed).
The other 3 differ only in which element holds focus one animation frame after Escape (timing of the old `requestAnimationFrame`
focus restore, flipping in both directions between the two captures: the code path is unchanged).** A static comparison of
class tokens, `data-*`, `aria-*`, `role` and ids against `git show HEAD:components/layout/Navbar.tsx` finds nothing missing;
the only additions are the wrapper's `contents` and the button's `text-start`.

| Command | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` (typecheck + type hygiene) | pass |
| `vitest run --project unit` (full) | 1,521 pass, 1 fail: `refund-unlisted.test.ts` (`lib/legal/anchors.ts`, committed at the base commit, links to `/refund`; no file of this change is involved) |
| module-size, nav-book-short, navbar-navigation-model (new, 24), consent-*, legal-consent-copy, birthday/*, i18n-audit, seo-integrity | pass (376 tests in that run) |
| `npm run test:build` (isolated `.next-test`) | pass, once |
| Playwright usability + chromium + a11y: header-fit (48), header-brand (12), cookie-consent (21, 2 skipped: choice-mode only), navbar-cookie-settings (14, new), studio-navigation, google-reviews-utility-bar, cockpit-tone, apple-web-app, hydration, e2e navigation/offers/language-theme, a11y keyboard/public-routes/mobile-and-admin | 353 pass, 14 skipped (e2e `mobile.spec.ts` skips on the desktop project by design), 1 failed: a11y keyboard `/book (cockpit)` with "Unexpected end of JSON input" during `page.goto` under load; the three theme variants pass on rerun |
| `mobile.spec.ts` and `offers.spec.ts` on `mobile-chrome` (Pixel 7) and `mobile-safari` (iPhone 15) | pass: 24 + 36 |
| `navigation.spec.ts` on the two phone projects | 18 "from the footer" tests fail: the footer does not exist on phones (CI runs only `mobile.spec.ts` on those projects). Not a regression; they pass on desktop chromium |
| Visual, 390px `/` and `/book` | pass against the darwin baselines |
| Visual, desktop `/` and `/about` in cockpit and brand | 4 fail, **all pixels in the footer** (rows 2889-3189 of 3260 on `/about`, 3501-3801 of 3872 on `/`; columns 303-509: the footer link column that gained the Offers and Cookie settings entries). Zero differing pixels in the header or the page body; page heights equal the baselines. These are the known offers and cookie-consent baseline diffs, refreshed once at the end by the coordinator |
| Computed styles of the Cookie settings button vs the privacy link, 3 themes x en/he/ru/ar at 390px (production build) | identical in all 18 measured properties; axe (WCAG A/AA) on the About group: 0 violations |
| Phone drawer, Hebrew and Russian at 360 and 390px (also en, fr, ar, es) | the entry opens the dialog, the drawer closes, focus is in the dialog, Escape returns focus to the menu button. Screenshots reviewed in cockpit, daylight and studio |

## Lines for the coordinator (files I do not own)

**`GENESIS.md`**

- Components list (the `layout/` line near line 600, under `components/`): keep the existing
  `layout/  Navbar Footer LanguageSelector UiThemeSwitcher CockpitToneSwitcher LiveMetarBar SkipLink` line and add directly
  below it
  `  layout/navbar/  index navigation-model use-navbar-menus use-navbar-member demo-mode DesktopNavTriggers DesktopNavPanel DesktopNavActions UserMenu NavBookLink CompactNavActions MobileNavigation MobileAboutGroup   # the header, split by concern; Navbar.tsx only orchestrates`.
  `docs:verify` needs every component name present: `CompactNavActions`, `DesktopNavActions`, `DesktopNavPanel`,
  `DesktopNavTriggers`, `MobileAboutGroup`, `MobileNavigation`, `NavBookLink`, `UserMenu` (it already reports many missing names
  from the other merged branches; stamp once at the end).
- "Persistent mobile chrome" row (line 99): replace the last sentence
  `its customer-story, contact, rules and privacy links are reachable through the localized “About Us” disclosure in the mobile menu.`
  with
  `its customer-story, contact, rules and privacy links, and the Cookie settings entry (which reopens the consent dialog and closes the menu, returning focus to the menu button), are reachable through the localized “About Us” disclosure in the mobile menu (components/layout/navbar/MobileAboutGroup.tsx).`
  Also add one sentence to the same row: `The header is split into components/layout/navbar/ (navigation-model.ts pure data, use-navbar-menus.ts for every open/close, focus and keyboard rule, one component per part); Navbar.tsx is an orchestrator under 100 lines and imports ./navbar/index because a bare ./navbar would resolve to Navbar.tsx on case-insensitive file systems.`

**`AGENTS.md`** (section 1.7 mentions the header, section 7 the QA list): add to section 1, item 7 after the sentence about the WhatsApp action:
`On phones the footer is absent, so the localized "About" group of the mobile menu also carries "Cookie settings" (ConsentSettingsLink); the header's markup, ids and test hooks live in components/layout/navbar/ and are changed there, never by growing Navbar.tsx (tests/unit/module-size.test.ts keeps it under 400 lines).`

**`docs/MODULARITY.md`** (not forbidden, but a shared table other branches edit, so left to you): delete the
`components/layout/Navbar.tsx | 667 | ...` row of the inventory (the file is 71 lines; the ratchet entry is gone) and, if
you keep a list of reference modules, add `components/layout/navbar/` next to `/book`.

## Open observations (reported, not fixed)

- **Clean Studio's utility bar wraps to two rows at some phone widths** (measured, see the handoff report): 97px instead of
  49px at 320, 360 and 390px, but one row at 375 and 414px. Cockpit Night and Brand Daylight stay on one row from 360px.
  Cause: Studio's 17px root font makes the rating cluster plus the quick links (146/176 + 191px + 8px gap) wider than the 335
  and 365px content boxes at 360 and 390px. `components/layout/LiveMetarBar.tsx`, not this module.
- In the daylight and studio themes the open phone drawer renders transparent over the page in a local development server
  (page text shows through, dark labels on a dark panel). That is the issue the `mobile-menu-daylight` branch addresses in
  `app/globals.css`; this module does not touch it.
- `tests/unit/refund-unlisted.test.ts` fails in the merged base (`lib/legal/anchors.ts`, committed at `5986c36`, links to `/refund`,
  which the test does not allow). Unrelated to the header; it needs a decision between the legal-content and refund workstreams.
