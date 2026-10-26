import type { Locator, Page } from '@playwright/test';
import { translations } from '@/lib/i18n/translations';
import { blockThirdPartyRequests, expect, type Language } from '../../support/e2e';

/**
 * Waits until the page is rendered in `language`. The provider sets <html lang> in the
 * same effect that schedules the translated re-render, so the attribute alone can be
 * observed while the text is still English; the always-present METAR status line proves
 * the translated commit has landed.
 */
export async function expectLanguageRendered(page: Page, language: Language): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  await expect(page.getByText(translations[language].metar.statusReady, { exact: true }).first()).toBeAttached();
}

const THIRD_PARTY_FRAME_STUB =
  '<!doctype html><html lang="en"><head><title>Third-party embed (stubbed in tests)</title></head><body></body></html>';

/**
 * Keeps the page on the app origin (no Google Maps, fonts or analytics) for repeatable results.
 * Third-party frames (the /contact map) get an empty stub document instead of a network
 * error: an aborted frame has an opaque origin where the harness's localStorage init
 * scripts throw and would be reported as page errors.
 */
export async function isolateFromThirdParties(page: Page, baseURL: string | undefined): Promise<void> {
  if (!baseURL) throw new Error('baseURL must be configured in playwright.config.ts');
  await blockThirdPartyRequests(page, baseURL);
  const appOrigin = new URL(baseURL).origin;
  await page.route(
    (url) => url.origin !== appOrigin && url.protocol.startsWith('http'),
    (route) =>
      route.request().resourceType() === 'document'
        ? route.fulfill({ status: 200, contentType: 'text/html', body: THIRD_PARTY_FRAME_STUB })
        : route.fallback()
  );
}

/**
 * Freezes CSS motion so contrast, focus-style and geometry measurements do not
 * depend on the frame a transition or keyframe animation happens to be in.
 * Use only for measurements, never for the reduced-motion checks themselves.
 */
export async function freezeCssMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      '*, *::before, *::after { animation: none !important; transition: none !important; } html { scroll-behavior: auto !important; }',
  });
}

/** The single top-level page heading. Every public route renders one after hydration. */
export function pageHeading(page: Page): Locator {
  return page.getByRole('heading', { level: 1 });
}

/**
 * Opens a route and waits until client rendering has settled: the page heading is
 * visible and, on /book, the slot request has resolved into slots or the empty state.
 */
export async function gotoSettled(page: Page, route: string): Promise<void> {
  const response = await page.goto(route);
  expect(response?.status(), `HTTP status of ${route}`).toBe(200);
  await expect(pageHeading(page).first()).toBeVisible();
  if (route.startsWith('/book') && !route.startsWith('/book/success')) {
    await expect(storefrontSlotButtons(page).first().or(zeroSlotHeading(page))).toBeVisible();
  }
}

/** Departure-slot buttons of the default one-page storefront, e.g. "11:15 Up to 210m fit". */
export function storefrontSlotButtons(page: Page): Locator {
  return page.getByRole('button', { name: /^\d{2}:\d{2} Up to \d+m fit$/ });
}

/** Heading of the actionable zero-slots recovery panel in the storefront. */
export function zeroSlotHeading(page: Page): Locator {
  return page.getByRole('heading', { name: /^No open runway slots for / });
}

/** Text of the element that currently has keyboard focus, for failure messages. */
export async function describeActiveElement(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return '<body>';
    const name = active.getAttribute('aria-label') ?? active.textContent ?? active.getAttribute('placeholder') ?? '';
    return `<${active.tagName.toLowerCase()}> "${name.replace(/\s+/g, ' ').trim().slice(0, 60)}"`;
  });
}

/** Whether the given element currently holds keyboard focus. */
export async function isFocused(target: Locator): Promise<boolean> {
  return target.evaluate((element) => element === document.activeElement);
}

/**
 * Presses Tab (or Shift+Tab) until `target` has focus, exactly as a keyboard-only
 * user would, and fails with the visited focus path if it is never reached.
 */
export async function tabTo(
  page: Page,
  target: Locator,
  { backwards = false, maxPresses = 200 }: { backwards?: boolean; maxPresses?: number } = {}
): Promise<number> {
  const visited: string[] = [];
  for (let presses = 1; presses <= maxPresses; presses += 1) {
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
    if (await isFocused(target)) return presses;
    visited.push(await describeActiveElement(page));
  }
  throw new Error(
    `Keyboard focus never reached the target after ${maxPresses} presses. Last stops:\n${visited.slice(-12).join('\n')}`
  );
}

/** Resolves after two animation frames, by which time React has flushed effects for the last paint. */
export async function afterNextPaint(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  );
}
