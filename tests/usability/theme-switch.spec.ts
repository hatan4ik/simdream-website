import type { Locator, Page } from '@playwright/test';
import { translations } from '../../lib/i18n/translations';
import { activate } from '../e2e/pages/hydration';
import { expect, preferLanguage, preferTheme, type Language, type UiTheme } from '../support/e2e';
import { test } from './support/fixtures';
import { isolateFromThirdParties } from './support/page';

// The header theme switch once wrapped its label onto two or three lines and, squeezed by the
// crowded header, shrank its track so the knob slid outside it. Reduced motion stops the knob
// animating, so measurements see its resting position.
test.use({ reducedMotion: 'reduce', video: 'off' });

const themeName = (language: Language, theme: UiTheme) => translations[language].uiTheme[theme === 'brand' ? 'brand' : 'cockpit'];

/** The visible header switch, found by its accessible name, which starts with the current theme. */
function headerSwitch(page: Page, language: Language, theme: UiTheme): Locator {
  return page
    .getByRole('navigation')
    .locator(`button[aria-label^="${themeName(language, theme)},"]`)
    .filter({ visible: true })
    .first();
}

async function measure(button: Locator) {
  return button.evaluate((element) => {
    const track = element.lastElementChild as HTMLElement;
    const knob = track.firstElementChild as HTMLElement;
    const [b, t, k] = [element, track, knob].map((node) => node.getBoundingClientRect());
    return {
      height: Math.round(b.height),
      trackWidth: Math.round(t.width),
      knobInsideTrack: k.left >= t.left - 0.5 && k.right <= t.right + 0.5,
      knobSide: (k.left + k.right) / 2 > (t.left + t.right) / 2 ? 'right' : 'left',
    };
  });
}

// "On" (daylight) puts the knob at the inline end: right in LTR, left in RTL.
const EXPECTED_SIDE: Record<'ltr' | 'rtl', Record<UiTheme, 'left' | 'right'>> = {
  ltr: { cockpit: 'left', brand: 'right' },
  rtl: { cockpit: 'right', brand: 'left' },
};

for (const width of [1440, 1100]) {
  test.describe(`header theme switch at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const language of ['en', 'he'] as const) {
      for (const theme of ['cockpit', 'brand'] as const) {
        test(`keeps its knob inside the track on one line (${language}, ${theme})`, async ({ page, baseURL }) => {
          await isolateFromThirdParties(page, baseURL);
          await preferLanguage(page, language);
          await preferTheme(page, theme);
          await page.goto('/');

          const button = headerSwitch(page, language, theme);
          await expect(button).toBeVisible();
          const geometry = await measure(button);

          expect(geometry).toEqual({
            height: geometry.height,
            trackWidth: 28,
            knobInsideTrack: true,
            knobSide: EXPECTED_SIDE[language === 'he' ? 'rtl' : 'ltr'][theme],
          });
          // One line of text: the 11px label wrapping made the button 43-58px tall.
          expect(geometry.height).toBeLessThanOrEqual(36);
          const nav = page.getByRole('navigation').first();
          expect(await nav.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
        });
      }
    }
  });
}

test('toggles between the night and daylight interfaces and remembers the choice', async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  await preferLanguage(page, 'en');
  await page.goto('/');

  await activate(headerSwitch(page, 'en', 'cockpit'));
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'brand');
  await expect(headerSwitch(page, 'en', 'brand')).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'brand');

  await activate(headerSwitch(page, 'en', 'brand'));
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'cockpit');
});
