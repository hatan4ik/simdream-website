import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, expectThemeApplied, preferLanguage, preferTheme, type Language, type UiTheme } from '../support/e2e';
import { WCAG_A_AA_TAGS } from '../a11y/support/axe-baseline';
import { test } from './support/fixtures';
import { measureSurfaceContrast } from './support/contrast';
import { expectLanguageRendered, freezeCssMotion, gotoSettled, isolateFromThirdParties } from './support/page';

// The phone menu panel (#mobile-navigation) was near-black in Brand Daylight and Clean Studio: its
// background class (`bg-slate-950/98`) had no daylight override while its text had, so the links were
// dark ink on a black panel (1.9:1). axe never saw it: it reports a translucent panel over page content as
// "incomplete", not as a violation. These tests measure what is painted, then add axe for the rest.
// Phone width, but tall: the panel is capped at `100svh - 8rem` and scrolls inside itself, and axe cannot
// judge a node that its own scroll container clips ("incomplete"). A tall viewport keeps every link, the
// About disclosure and the theme controls in view, so this spec stays about colours and does not break each
// time a destination is added to the menu (Offers, Ground School).
test.use({ reducedMotion: 'reduce', video: 'off', viewport: { width: 390, height: 1600 } });

const WCAG_AA_NORMAL_TEXT = 4.5;
// White is 1 and the darkest slate fill is ~0.002: anything between these bounds is a mid-grey that
// would not suit both the dark and the light ink the themes use.
const LIGHT_PANEL_MIN_LUMINANCE = 0.85;
const DARK_PANEL_MAX_LUMINANCE = 0.05;

interface ThemeCase {
  name: string;
  theme: UiTheme;
  /** Cockpit Night palette tone, where it applies. */
  tone?: 'cobalt' | 'squadron';
  panel: 'light' | 'dark';
  languages: readonly Language[];
}

const CASES: readonly ThemeCase[] = [
  { name: 'Brand Daylight', theme: 'brand', panel: 'light', languages: ['en', 'he', 'ru'] },
  { name: 'Clean Studio', theme: 'studio', panel: 'light', languages: ['en', 'he', 'ru'] },
  { name: 'Cockpit Night', theme: 'cockpit', panel: 'dark', languages: ['en', 'he', 'ru'] },
  { name: 'Cockpit Night (Cobalt Navy)', theme: 'cockpit', tone: 'cobalt', panel: 'dark', languages: ['en'] },
  { name: 'Cockpit Night (Squadron Mid-Navy)', theme: 'cockpit', tone: 'squadron', panel: 'dark', languages: ['en'] },
];

async function openMobileMenu(page: Page): Promise<void> {
  // The Russian header currently pushes the menu button past the right edge of a 390px screen, where
  // Playwright's actionability check refuses to click it. Dispatching the click opens the menu exactly as
  // the button's handler does, and keeps this spec about the panel's colours rather than that layout.
  await page.locator('[data-mobile-menu-trigger]').dispatchEvent('click');
  const panel = page.locator('#mobile-navigation');
  await expect(panel).toBeVisible();
  // Open the About disclosure too so its four links are measured with the rest.
  await panel.locator('summary').click();
  await expect(panel.locator('details')).toHaveJSProperty('open', true);
  await freezeCssMotion(page);
}

for (const { name, theme, tone, panel, languages } of CASES) {
  test.describe(`mobile menu panel, ${name}, 390px wide`, () => {
    for (const language of languages) {
      test(`is a ${panel} surface with readable text and no axe color-contrast failures (${language})`, async ({ page, baseURL }) => {
        await isolateFromThirdParties(page, baseURL);
        await preferTheme(page, theme);
        await preferLanguage(page, language);
        if (tone) {
          await page.addInitScript((savedTone) => {
            try {
              window.localStorage.setItem('simdream_cockpit_tone', savedTone);
            } catch {
              /* sandboxed frame */
            }
          }, tone);
        }
        await gotoSettled(page, '/');
        await expectThemeApplied(page, theme);
        await expectLanguageRendered(page, language);
        await openMobileMenu(page);

        const surface = await measureSurfaceContrast(page, '#mobile-navigation');
        expect(surface.runs.length, 'the panel lists its links, About disclosure and theme controls').toBeGreaterThanOrEqual(15);

        if (panel === 'light') {
          expect(surface.luminance, `panel paints ${surface.backdrop}`).toBeGreaterThanOrEqual(LIGHT_PANEL_MIN_LUMINANCE);
        } else {
          expect(surface.luminance, `panel paints ${surface.backdrop}`).toBeLessThanOrEqual(DARK_PANEL_MAX_LUMINANCE);
        }
        const unreadable = surface.runs.filter((run) => run.ratio < WCAG_AA_NORMAL_TEXT);
        expect(unreadable, `text below ${WCAG_AA_NORMAL_TEXT}:1 on ${surface.backdrop}`).toEqual([]);

        // axe can only judge an opaque panel, so a light panel must leave nothing "incomplete" either:
        // that is what proves the check evaluated the links rather than skipping them.
        const axe = await new AxeBuilder({ page }).include('#mobile-navigation').withTags(WCAG_A_AA_TAGS).analyze();
        const failing = axe.violations
          .filter((violation) => violation.id === 'color-contrast')
          .flatMap((violation) => violation.nodes.map((node) => node.target.join(' ')));
        expect(failing, 'axe color-contrast violations inside the open panel').toEqual([]);
        if (panel === 'light') {
          const undecided = axe.incomplete
            .filter((result) => result.id === 'color-contrast')
            .flatMap((result) => result.nodes.map((node) => node.target.join(' ')));
          expect(undecided, 'axe could not determine the colours of these panel elements').toEqual([]);
        }
      });
    }
  });
}
