import AxeBuilder from '@axe-core/playwright';
import { expect, preferLanguage, preferTheme } from '../support/e2e';
import { WCAG_A_AA_TAGS } from '../a11y/support/axe-baseline';
import { test } from './support/fixtures';
import { freezeCssMotion, gotoSettled, isolateFromThirdParties } from './support/page';

test.use({ reducedMotion: 'reduce', video: 'off' });

test.describe('Cockpit Night palette tone switcher (Classic, Cobalt Navy, Squadron Mid-Navy)', () => {
  test('cycles from Daylight into Cobalt -> Squadron -> Classic, updates body/chrome/meta colors, and persists across reload', async ({
    page,
    baseURL,
  }) => {
    await isolateFromThirdParties(page, baseURL);
    await preferLanguage(page, 'en');
    await gotoSettled(page, '/');
    await freezeCssMotion(page);

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-ui', 'brand');
    const nav = page.locator('nav').first();
    const switcher = nav.locator('[data-navbar-actions] [data-cockpit-tone-switcher="compact"]');
    await expect(switcher).toBeVisible();
    await expect(switcher).toHaveAttribute('data-cockpit-active', 'false');
    await expect(switcher).toHaveAttribute('data-active-cockpit-tone', 'classic');

    // First click from Daylight jumps straight to Warmer Cobalt-Navy (#0C1A33)
    await switcher.click();
    await expect(html).toHaveAttribute('data-ui', 'cockpit');
    await expect(html).toHaveAttribute('data-cockpit-tone', 'cobalt');
    await expect(switcher).toHaveAttribute('data-cockpit-active', 'true');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0C1A33');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(12, 26, 51)');
    await expect.poll(() => nav.evaluate((el) => getComputedStyle(el).backgroundColor)).toContain('9, 20, 40');

    // Second click advances to Squadron Mid-Navy (#102547)
    await switcher.click();
    await expect(html).toHaveAttribute('data-cockpit-tone', 'squadron');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#102547');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(16, 37, 71)');
    await expect.poll(() => nav.evaluate((el) => getComputedStyle(el).backgroundColor)).toContain('12, 29, 56');

    // Persists across full reload (pre-paint bootstrap + React hydration)
    await page.reload();
    await expect(html).toHaveAttribute('data-ui', 'cockpit');
    await expect(html).toHaveAttribute('data-cockpit-tone', 'squadron');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#102547');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(16, 37, 71)');

    // Third click cycles back to Classic Night (#070b14)
    await switcher.click();
    await expect(html).toHaveAttribute('data-cockpit-tone', 'classic');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#070b14');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(7, 11, 20)');

    // Switching back to Cobalt then via main 3-theme switch preserves saved tone when re-entering cockpit
    await switcher.click();
    await expect(html).toHaveAttribute('data-cockpit-tone', 'cobalt');

    const mainSwitch = nav.locator('[data-navbar-actions] [data-ui-theme-switcher="compact"]');
    await mainSwitch.click(); // brand
    await expect(html).toHaveAttribute('data-ui', 'brand');
    expect(await html.getAttribute('data-cockpit-tone')).toBeNull();

    await mainSwitch.click(); // studio
    await expect(html).toHaveAttribute('data-look', 'studio');

    await mainSwitch.click(); // back to cockpit -> remembers cobalt!
    await expect(html).toHaveAttribute('data-ui', 'cockpit');
    await expect(html).toHaveAttribute('data-cockpit-tone', 'cobalt');
  });

  test('provides direct touch-friendly 3-tone pills inside the mobile navigation drawer', async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await isolateFromThirdParties(page, baseURL);
    await preferTheme(page, 'brand');
    await preferLanguage(page, 'en');
    await gotoSettled(page, '/');

    await page.locator('[data-mobile-menu-trigger]').click();
    const drawerGroup = page.locator('[data-cockpit-tone-switcher="full"]');
    await expect(drawerGroup).toBeVisible();

    for (const tone of ['classic', 'cobalt', 'squadron'] as const) {
      const btn = drawerGroup.locator(`[data-cockpit-tone-option="${tone}"]`);
      await expect(btn).toBeVisible();
      const box = await btn.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    await drawerGroup.locator('[data-cockpit-tone-option="squadron"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-ui', 'cockpit');
    await expect(page.locator('html')).toHaveAttribute('data-cockpit-tone', 'squadron');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(16, 37, 71)');

    await drawerGroup.locator('[data-cockpit-tone-option="cobalt"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-cockpit-tone', 'cobalt');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(12, 26, 51)');
  });

  for (const tone of ['cobalt', 'squadron'] as const) {
    for (const route of ['/', '/book', '/pro', '/vouchers', '/about', '/experiences', '/subscriptions', '/contact'] as const) {
      test(`${route} has zero WCAG 2.x A/AA violations in ${tone} Cockpit tone`, async ({
        page,
        baseURL,
      }) => {
        await page.addInitScript((savedTone) => {
          localStorage.setItem('simdream_ui_theme', 'cockpit');
          localStorage.setItem('simdream_cockpit_tone', savedTone);
        }, tone);
        await isolateFromThirdParties(page, baseURL);
        await preferLanguage(page, 'en');
        await gotoSettled(page, route);
        await expect(page.locator('html')).toHaveAttribute('data-ui', 'cockpit');
        await expect(page.locator('html')).toHaveAttribute('data-cockpit-tone', tone);
        await freezeCssMotion(page);

        const results = await new AxeBuilder({ page }).withTags(WCAG_A_AA_TAGS).analyze();
        const seriousOrCritical = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical'
        );
        expect(
          seriousOrCritical.map((v) => ({
            rule: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => ({ target: n.target.join(' '), summary: n.failureSummary })),
          }))
        ).toEqual([]);
      });
    }
  }
});
