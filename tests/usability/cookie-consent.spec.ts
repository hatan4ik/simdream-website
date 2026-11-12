import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { WCAG_A_AA_TAGS } from '../a11y/support/axe-baseline';
import { CONSENT_COPY } from '../../components/consent/consent-copy';
import { CONSENT_LINK_LABEL } from '../../components/consent/link-label';
import { CONSENT_STORAGE_KEY } from '../../lib/consent/config';
import { NO_SEEDED_CONSENT } from '../support/consent';
import { expectThemeApplied, LANGUAGES, preferLanguage, preferTheme, RTL_LANGUAGES, type UiTheme } from '../support/e2e';
import { expect, test } from './support/fixtures';
import { afterNextPaint, freezeCssMotion, gotoSettled, isolateFromThirdParties } from './support/page';

/**
 * Cookie consent, from a blank browser profile. The Playwright config pre-seeds every other test
 * with a current decision (tests/support/consent.ts) so the banner never appears elsewhere; this
 * file opts out to exercise the first-visit experience.
 *
 * The banner has two modes (lib/consent/config.ts). The shipped build is the informational notice:
 * those tests run by default. The choice tests need a build with NEXT_PUBLIC_CONSENT_CATEGORIES_IN_USE
 * set (for example `analytics`) and skip themselves when the page reports notice mode.
 */
test.use({ storageState: NO_SEEDED_CONSENT, reducedMotion: 'reduce' });
test.describe.configure({ timeout: 90_000 });

const banner = (page: Page): Locator => page.locator('[data-consent-banner]');
const dialog = (page: Page): Locator => page.locator('[data-consent-dialog]');
const storedRecord = (page: Page) =>
  page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { version: number; decidedAt: string; categories: Record<string, boolean> }) : null;
  }, CONSENT_STORAGE_KEY);

async function openHome(page: Page, baseURL: string | undefined): Promise<void> {
  await isolateFromThirdParties(page, baseURL);
  await gotoSettled(page, '/');
  await expect(banner(page)).toBeVisible();
}

async function mode(page: Page): Promise<'notice' | 'choice'> {
  return (await banner(page).getAttribute('data-consent-mode')) === 'choice' ? 'choice' : 'notice';
}

/** The footer entry exists from the md breakpoint up (the footer is hidden on phones). */
const footerSettingsLink = (page: Page): Locator => page.locator('footer [data-consent-settings-link]');

test.describe('first visit', () => {
  test('shows a named, non-blocking banner and records nothing before the visitor decides', async ({ page, baseURL }) => {
    await openHome(page, baseURL);
    const region = page.getByRole('region', { name: CONSENT_COPY.en.bannerLabel });
    await expect(region).toBeVisible();
    expect(await storedRecord(page)).toBeNull();
    // Non-blocking: the page behind stays usable (no modal, nothing inert, links still reachable).
    await expect(page.locator('[data-consent-dialog]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /privacy policy/i }).first()).toBeVisible();
    expect(await banner(page).evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
  });

  test('is an informational notice while nothing optional is in use: "Got it" persists across a reload', async ({
    page,
    baseURL,
    context,
  }) => {
    await openHome(page, baseURL);
    test.skip((await mode(page)) !== 'notice', 'build is in choice mode');

    await expect(banner(page).getByRole('button', { name: CONSENT_COPY.en.gotIt })).toBeVisible();
    await expect(banner(page).getByRole('button', { name: CONSENT_COPY.en.acceptAll })).toHaveCount(0);
    await expect(banner(page).locator('[role="switch"]')).toHaveCount(0);

    await banner(page).getByRole('button', { name: CONSENT_COPY.en.gotIt }).click();
    await expect(banner(page)).toHaveCount(0);
    const record = await storedRecord(page);
    expect(record).toMatchObject({ version: 1, categories: { necessary: true, preferences: false, analytics: false, marketing: false } });
    expect(Number.isNaN(Date.parse(record?.decidedAt ?? ''))).toBe(false);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await afterNextPaint(page);
    await expect(banner(page)).toHaveCount(0);
    // The consent record is storage, not a cookie: the site still sets none.
    expect(await context.cookies()).toEqual([]);
  });

  test('the banner can open the settings dialog and closing it leaves the banner (nothing was decided)', async ({ page, baseURL }) => {
    await openHome(page, baseURL);
    const open = (await mode(page)) === 'choice' ? CONSENT_COPY.en.customize : CONSENT_LINK_LABEL.en;
    await banner(page).getByRole('button', { name: open }).click();
    await expect(page.getByRole('dialog', { name: CONSENT_COPY.en.dialogTitle })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    await expect(banner(page)).toBeVisible();
    expect(await storedRecord(page)).toBeNull();
  });
});

test.describe('choice banner (build with an optional category in use)', () => {
  test('"Reject non-essential" persists, survives a reload, and Cookie settings reopens it', async ({ page, baseURL }) => {
    await openHome(page, baseURL);
    test.skip((await mode(page)) !== 'choice', 'build is in notice mode (no optional category in use)');

    // Equal prominence: same size, same style.
    const accept = banner(page).getByRole('button', { name: CONSENT_COPY.en.acceptAll });
    const reject = banner(page).getByRole('button', { name: CONSENT_COPY.en.rejectNonEssential });
    const [acceptBox, rejectBox] = [await accept.boundingBox(), await reject.boundingBox()];
    expect(acceptBox?.height).toBe(rejectBox?.height);
    expect(await accept.getAttribute('data-button-variant')).toBe(await reject.getAttribute('data-button-variant'));

    await reject.click();
    await expect(banner(page)).toHaveCount(0);
    expect(await storedRecord(page)).toMatchObject({ categories: { necessary: true, analytics: false, marketing: false } });

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await afterNextPaint(page);
    await expect(banner(page)).toHaveCount(0);

    await footerSettingsLink(page).click();
    await expect(page.getByRole('dialog', { name: CONSENT_COPY.en.dialogTitle })).toBeVisible();
  });

  test('withdrawing a previous "accept all" updates the record', async ({ page, baseURL }) => {
    await openHome(page, baseURL);
    test.skip((await mode(page)) !== 'choice', 'build is in notice mode (no optional category in use)');

    await banner(page).getByRole('button', { name: CONSENT_COPY.en.acceptAll }).click();
    const accepted = await storedRecord(page);
    expect(Object.entries(accepted?.categories ?? {}).filter(([name, on]) => name !== 'necessary' && on).length).toBeGreaterThan(0);

    await page.waitForTimeout(20);
    await footerSettingsLink(page).click();
    await expect(dialog(page)).toBeVisible();
    const switches = dialog(page).getByRole('switch');
    await expect(switches.first()).toBeChecked();
    for (let index = 0; index < (await switches.count()); index += 1) await switches.nth(index).setChecked(false);
    await dialog(page).getByRole('button', { name: CONSENT_COPY.en.save }).click();
    await expect(dialog(page)).toHaveCount(0);

    const withdrawn = await storedRecord(page);
    expect(withdrawn?.categories).toMatchObject({ necessary: true, analytics: false, marketing: false, preferences: false });
    expect(withdrawn?.decidedAt).not.toBe(accepted?.decidedAt);
  });
});

test.describe('settings dialog', () => {
  test('the footer entry reopens it after a decision; it traps focus, closes on Escape and returns focus', async ({ page, baseURL }) => {
    await openHome(page, baseURL);
    // Decide first, so the footer link is the only way back in.
    if ((await mode(page)) === 'choice') await banner(page).getByRole('button', { name: CONSENT_COPY.en.rejectNonEssential }).click();
    else await banner(page).getByRole('button', { name: CONSENT_COPY.en.gotIt }).click();
    await expect(banner(page)).toHaveCount(0);

    const link = footerSettingsLink(page);
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: CONSENT_COPY.en.dialogTitle });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: CONSENT_COPY.en.storedHeading })).toBeVisible();
    for (const item of CONSENT_COPY.en.storedItems) await expect(panel).toContainText(item.title);
    await expect(panel.getByRole('link', { name: CONSENT_COPY.en.privacyPolicy })).toHaveAttribute('href', '/privacy-policy');

    // Focus stays inside the dialog however long the visitor tabs, in both directions.
    for (let presses = 0; presses < 12; presses += 1) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-consent-dialog]')))).toBe(true);
    }
    for (let presses = 0; presses < 12; presses += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-consent-dialog]')))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    expect(await link.evaluate((element) => element === document.activeElement)).toBe(true);
  });

  test('the same entry is reachable by event for code outside React', async ({ page, baseURL }) => {
    await openHome(page, baseURL);
    await page.evaluate(() => window.dispatchEvent(new Event('simdream:consent-open')));
    await expect(page.getByRole('dialog', { name: CONSENT_COPY.en.dialogTitle })).toBeVisible();
  });
});

test.describe('layout', () => {
  test('the banner is out of flow: showing or hiding it moves no content', async ({ page, baseURL }) => {
    await openHome(page, baseURL);
    const positions = () =>
      page.evaluate(() =>
        ['header', 'main', 'main h1', 'main section'].map((selector) => {
          const box = document.querySelector(selector)?.getBoundingClientRect();
          return box ? [Math.round(box.top + window.scrollY), Math.round(box.height)] : null;
        })
      );
    const withBanner = await positions();
    if ((await mode(page)) === 'choice') await banner(page).getByRole('button', { name: CONSENT_COPY.en.rejectNonEssential }).click();
    else await banner(page).getByRole('button', { name: CONSENT_COPY.en.gotIt }).click();
    await expect(banner(page)).toHaveCount(0);
    expect(await positions()).toEqual(withBanner);
    // The banner's offset variable is released with it.
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--consent-banner-offset'))).toBe('');
  });

  test('on a phone it does not cover the sticky booking bar or the WhatsApp action, and fits 320px', async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await isolateFromThirdParties(page, baseURL);
    await gotoSettled(page, '/book');
    await expect(banner(page)).toBeVisible();
    await afterNextPaint(page);

    // A visitor scrolls: the sticky bar then sticks to the bottom of the viewport.
    await page.evaluate(() => window.scrollTo(0, 400));
    await afterNextPaint(page);
    const bannerBox = await banner(page).locator('> div').boundingBox();
    expect(bannerBox).not.toBeNull();
    // A banner that eats the screen is its own kind of cover: at most a third of a phone viewport.
    expect(bannerBox?.height ?? Infinity).toBeLessThanOrEqual(844 / 3);
    const stickyBar = page.locator('.sticky[class*="bottom-safe-area"]:visible').last();
    await expect(stickyBar).toBeVisible();
    const barBox = await stickyBar.boundingBox();
    expect(barBox).not.toBeNull();
    // The bar rises above the banner (components/consent publishes --consent-banner-offset).
    expect((barBox?.y ?? 0) + (barBox?.height ?? 0)).toBeLessThanOrEqual((bannerBox?.y ?? 0) + 1);

    const whatsapp = page.locator('[data-whatsapp-action]:visible').first();
    const whatsappBox = await whatsapp.boundingBox();
    expect(whatsappBox).not.toBeNull();
    expect((whatsappBox?.y ?? 0) + (whatsappBox?.height ?? 0)).toBeLessThanOrEqual(bannerBox?.y ?? 0);

    await page.setViewportSize({ width: 320, height: 640 });
    await afterNextPaint(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const narrowBox = await banner(page).locator('> div').boundingBox();
    expect((narrowBox?.x ?? -1) >= 0 && (narrowBox?.x ?? 0) + (narrowBox?.width ?? 0) <= 320).toBe(true);

    // 44px targets for every control in the banner.
    const controls = banner(page).locator('button, a');
    const count = await controls.count();
    expect(count).toBeGreaterThan(1);
    for (let index = 0; index < count; index += 1) {
      const box = await controls.nth(index).boundingBox();
      expect(box?.height ?? 0, `control ${index} height`).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('languages', () => {
  for (const language of LANGUAGES) {
    test(`renders the banner and dialog in ${language} with the right direction`, async ({ page, baseURL }) => {
      await isolateFromThirdParties(page, baseURL);
      await preferLanguage(page, language);
      await gotoSettled(page, '/');
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(banner(page)).toBeVisible();
      await expect(banner(page)).toHaveAttribute('aria-label', CONSENT_COPY[language].bannerLabel);
      await expect(banner(page)).toContainText(
        (await mode(page)) === 'choice' ? CONSENT_COPY[language].choiceBody : CONSENT_COPY[language].noticeBody
      );
      const direction = await banner(page).evaluate((element) => getComputedStyle(element).direction);
      expect(direction).toBe(RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      await page.evaluate(() => window.dispatchEvent(new Event('simdream:consent-open')));
      await expect(page.getByRole('dialog', { name: CONSENT_COPY[language].dialogTitle })).toBeVisible();
    });
  }
});

test.describe('accessibility (axe, WCAG 2.x A/AA, zero violations of any impact)', () => {
  const themes: UiTheme[] = ['cockpit', 'brand', 'studio'];

  async function scan(page: Page, selector: string) {
    await freezeCssMotion(page);
    const results = await new AxeBuilder({ page }).withTags(WCAG_A_AA_TAGS).include(selector).analyze();
    return results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`);
  }

  for (const theme of themes) {
    test(`the banner and the dialog have no violations in the ${theme} theme`, async ({ page, baseURL }) => {
      await isolateFromThirdParties(page, baseURL);
      await preferTheme(page, theme);
      await gotoSettled(page, '/');
      await expectThemeApplied(page, theme);
      await expect(banner(page)).toBeVisible();
      expect(await scan(page, '[data-consent-banner]')).toEqual([]);

      await page.evaluate(() => window.dispatchEvent(new Event('simdream:consent-open')));
      await expect(dialog(page)).toBeVisible();
      expect(await scan(page, '[data-consent-dialog]')).toEqual([]);
    });
  }

  for (const language of LANGUAGES.filter((code) => code !== 'en')) {
    test(`the banner and the dialog have no violations in ${language}`, async ({ page, baseURL }) => {
      await isolateFromThirdParties(page, baseURL);
      await preferLanguage(page, language);
      await gotoSettled(page, '/');
      await expect(banner(page)).toBeVisible();
      expect(await scan(page, '[data-consent-banner]')).toEqual([]);
      await page.evaluate(() => window.dispatchEvent(new Event('simdream:consent-open')));
      await expect(dialog(page)).toBeVisible();
      expect(await scan(page, '[data-consent-dialog]')).toEqual([]);
    });
  }
});
