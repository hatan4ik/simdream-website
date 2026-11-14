import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { expect, expectThemeApplied, preferLanguage, preferTheme, type UiTheme } from '../support/e2e';
import { WCAG_A_AA_TAGS } from '../a11y/support/axe-baseline';
import { test } from './support/fixtures';
import { freezeCssMotion, gotoSettled, isolateFromThirdParties } from './support/page';

// In the two navy tones of Cockpit Night (Cobalt Navy, Squadron Mid-Navy) the primary action is
// the brand orange #FF5500 with the tone's chrome navy as its label (AGENTS.md §1.6). White on
// #FF5500 is only 3.2:1, so the label must stay dark. Classic Night, SimDream Day and Clean Studio
// keep the cerulean pill. These tests read what the browser paints, at rest, on hover and under
// keyboard focus, on every primary control of the home page (the header "Book" link is a link
// styled with buttonClassName(); the hero action is a <Button>).
test.use({ reducedMotion: 'reduce', video: 'off', viewport: { width: 1440, height: 900 } });

const PRIMARY = '[data-ui-control="button"][data-button-variant="primary"]';
const WCAG_AA_NORMAL_TEXT = 4.5;

const SKY_400 = '#56b9e9';
const SKY_300 = '#91d0f2';
const ORANGE_500 = '#ff5500';
const ORANGE_400 = '#ff7c4b';

interface PrimaryCase {
  name: string;
  theme: UiTheme;
  tone?: 'classic' | 'cobalt' | 'squadron';
  fill: string;
  hoverFill: string;
  label: string;
}

const CASES: readonly PrimaryCase[] = [
  // Label = the tone's chrome navy (COCKPIT_TONE_COLORS in lib/theme/ui-theme-context.tsx).
  { name: 'Cockpit Night, Cobalt Navy', theme: 'cockpit', tone: 'cobalt', fill: ORANGE_500, hoverFill: ORANGE_400, label: '#091428' },
  { name: 'Cockpit Night, Squadron Mid-Navy', theme: 'cockpit', tone: 'squadron', fill: ORANGE_500, hoverFill: ORANGE_400, label: '#0c1d38' },
  // Unchanged: the cerulean "Learn more" pill with dark ink (slate-950 at night, slate-900 by day).
  { name: 'Cockpit Night, Classic Night', theme: 'cockpit', tone: 'classic', fill: SKY_400, hoverFill: SKY_300, label: '#020618' },
  { name: 'SimDream Day', theme: 'brand', fill: SKY_400, hoverFill: SKY_300, label: '#0f172a' },
  { name: 'Clean Studio', theme: 'studio', fill: SKY_400, hoverFill: SKY_300, label: '#0f172a' },
];

interface Paint {
  fill: string;
  border: string;
  label: string;
  /** Lowest WCAG contrast ratio of any text run inside the control against its fill. */
  contrast: number;
  borderWidth: string;
  radius: string;
  shadow: string;
  focusVisible: boolean;
}

/** The control as painted. Colours go through a canvas, so lab()/oklch() values come back as sRGB hex. */
async function paintOf(control: Locator): Promise<Paint> {
  return control.evaluate((element) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('2D canvas is unavailable');
    const rgb = (css: string): [number, number, number] => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = css;
      context.fillRect(0, 0, 1, 1);
      const data = context.getImageData(0, 0, 1, 1).data;
      if (data[3] !== 255) throw new Error(`Expected an opaque colour, got ${css}`);
      return [data[0]!, data[1]!, data[2]!];
    };
    const hex = (channels: [number, number, number]) => `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
    const luminance = (channels: [number, number, number]) => {
      const [r, g, b] = channels.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: [number, number, number], b: [number, number, number]) => {
      const [la, lb] = [luminance(a), luminance(b)];
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    const style = getComputedStyle(element);
    const fill = rgb(style.backgroundColor);
    let contrast = ratio(rgb(style.color), fill);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!(node.textContent ?? '').trim() || !parent || parent.getClientRects().length === 0) continue;
      contrast = Math.min(contrast, ratio(rgb(getComputedStyle(parent).color), fill));
    }
    return {
      fill: hex(fill),
      border: hex(rgb(style.borderTopColor)),
      label: hex(rgb(style.color)),
      contrast: Math.round(contrast * 100) / 100,
      borderWidth: style.borderTopWidth,
      radius: style.borderTopLeftRadius,
      shadow: style.boxShadow,
      focusVisible: element.matches(':focus-visible'),
    };
  });
}

async function openHome(page: Page, baseURL: string | undefined, { theme, tone }: PrimaryCase): Promise<void> {
  await isolateFromThirdParties(page, baseURL);
  await preferTheme(page, theme);
  await preferLanguage(page, 'en');
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
  if (tone) await expect(page.locator('html')).toHaveAttribute('data-cockpit-tone', tone);
  else await expect(page.locator('html')).not.toHaveAttribute('data-cockpit-tone', /./);
  await freezeCssMotion(page);
}

for (const primaryCase of CASES) {
  const { name, fill, hoverFill, label } = primaryCase;

  test.describe(`primary action colours, ${name}`, () => {
    test(`every primary control is a ${fill} pill with a readable ${label} label`, async ({ page, baseURL }) => {
      await openHome(page, baseURL, primaryCase);

      const controls = await page.locator(PRIMARY).filter({ visible: true }).all();
      // The header "Book" link and the hero action, at least.
      expect(controls.length).toBeGreaterThanOrEqual(2);
      for (const control of controls) {
        const paint = await paintOf(control);
        expect(paint, await control.innerText()).toMatchObject({
          fill,
          border: fill,
          label,
          // Geometry is the Button contract's and is the same in every theme: 1px border, pill, no shadow.
          borderWidth: '1px',
          radius: '980px',
          shadow: 'none',
        });
        expect(paint.contrast, `label contrast of "${await control.innerText()}"`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      }
    });

    test('hover and keyboard focus keep a readable label', async ({ page, baseURL }) => {
      await openHome(page, baseURL, primaryCase);
      const headerBook = page.getByRole('navigation').locator(`a${PRIMARY}`).filter({ visible: true }).first();
      const heroAction = page.getByRole('main').locator(`button${PRIMARY}`).filter({ visible: true }).first();

      for (const control of [headerBook, heroAction]) {
        await control.hover();
        await expect.poll(async () => (await paintOf(control)).fill).toBe(hoverFill);
        const hovered = await paintOf(control);
        expect(hovered).toMatchObject({ border: hoverFill, label });
        expect(hovered.contrast).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
        await page.mouse.move(0, 0);

        // Leave and re-enter with the keyboard so the browser applies :focus-visible.
        await control.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        const focused = await paintOf(control);
        expect(focused).toMatchObject({ focusVisible: true, fill, border: fill, label });
        expect(focused.contrast).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
        await control.blur();
      }
    });

    test('axe judges every primary control and finds no colour-contrast failure', async ({ page, baseURL }) => {
      await openHome(page, baseURL, primaryCase);

      const axe = await new AxeBuilder({ page }).include(PRIMARY).withTags(WCAG_A_AA_TAGS).analyze();
      const targets = (results: typeof axe.violations) =>
        results.filter((result) => result.id === 'color-contrast').flatMap((result) => result.nodes.map((node) => node.target.join(' ')));
      expect(targets(axe.violations), 'axe color-contrast violations on primary controls').toEqual([]);
      // An "incomplete" result would mean axe skipped the control instead of measuring it.
      expect(targets(axe.incomplete), 'axe could not determine the colours of these primary controls').toEqual([]);
      expect(targets(axe.passes).length, 'axe measured the primary controls').toBeGreaterThanOrEqual(2);
    });
  });
}
