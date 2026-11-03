import { activate } from '../e2e/pages/hydration';
import { expect } from '../support/e2e';
import { test } from './support/fixtures';
import { isolateFromThirdParties } from './support/page';

// iPhone and iPad conformance (UX-31), after .agents/skills/apple-web-app: the head opts into the
// notch edges without disabling pinch zoom, the browser chrome follows the interface theme, the
// Home Screen icon is an opaque 180px PNG, the manifest carries PNG icons, and the page clips
// horizontal overflow without turning <body> into a scroll container (which would detach the
// sticky navbar). Device-only outcomes (status-bar sampling, installed launch) stay unverified here.
test.use({ video: 'off' });

const COCKPIT = '#070b14';
const DAYLIGHT = '#f8fafc';

test('declares the viewport, theme colour and web-app metadata, and keeps pinch zoom', async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  await page.goto('/');

  const viewport = page.locator('meta[name="viewport"]');
  await expect(viewport).toHaveAttribute('content', /width=device-width/);
  await expect(viewport).toHaveAttribute('content', /viewport-fit=cover/);
  await expect(viewport).not.toHaveAttribute('content', /maximum-scale|user-scalable/);

  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', COCKPIT);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Sim Dream');
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'default');
  await expect(page.locator('meta[name="format-detection"]')).toHaveAttribute('content', /telephone=no/);
});

test('retints the browser chrome when the interface theme switches', async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  await page.goto('/');
  const themeColor = page.locator('meta[name="theme-color"]');
  await expect(themeColor).toHaveAttribute('content', COCKPIT);

  const headerSwitch = page.getByRole('navigation').locator('button[aria-label^="Cockpit Night,"]').first();
  await activate(headerSwitch);
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'brand');
  await expect(themeColor).toHaveAttribute('content', DAYLIGHT);

  await activate(page.getByRole('navigation').locator('button[aria-label^="SimDream Day,"]').first());
  await expect(themeColor).toHaveAttribute('content', COCKPIT);
});

test('serves an opaque 180px touch icon and a manifest whose PNG icons all resolve', async ({ page, request, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  await page.goto('/');

  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(touchIcon, 'apple-touch-icon link').toBeTruthy();
  const iconResponse = await request.get(touchIcon!);
  expect(iconResponse.status()).toBe(200);
  expect(iconResponse.headers()['content-type']).toContain('image/png');

  // iOS composites transparency on black and applies its own mask, so the tile must be opaque.
  const icon = await page.evaluate(async (src) => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`cannot decode ${src}`));
      image.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const last = image.naturalWidth - 1;
    const samples = [[0, 0], [last, 0], [0, last], [last, last], [Math.floor(last / 2), Math.floor(last / 2)]];
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      minAlpha: Math.min(...samples.map(([x, y]) => context.getImageData(x, y, 1, 1).data[3])),
    };
  }, touchIcon!);
  expect(icon).toEqual({ width: 180, height: 180, minAlpha: 255 });

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref, 'manifest link').toBeTruthy();
  const manifestResponse = await request.get(manifestHref!);
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({ short_name: 'Sim Dream', start_url: '/', display: 'standalone', theme_color: COCKPIT });
  expect(manifest.icons.map((entry: { sizes: string }) => entry.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((entry: { purpose?: string }) => entry.purpose === 'maskable')).toBe(true);
  for (const entry of manifest.icons as Array<{ src: string; type: string }>) {
    expect(entry.type).toBe('image/png');
    const response = await request.get(entry.src);
    expect(response.status(), entry.src).toBe(200);
    expect(response.headers()['content-type'], entry.src).toContain('image/png');
  }
});

test('clips horizontal overflow without detaching the sticky navbar, and lets fieldsets shrink', async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  await page.goto('/book');
  await expect(page.locator('fieldset').first()).toBeAttached();

  const css = await page.evaluate(() => ({
    html: getComputedStyle(document.documentElement).overflowX,
    body: getComputedStyle(document.body).overflowX,
    navbar: getComputedStyle(document.querySelector('nav')!).position,
    fieldset: getComputedStyle(document.querySelector('fieldset')!).minWidth,
    textSizeAdjust: getComputedStyle(document.body).getPropertyValue('-webkit-text-size-adjust') || 'n/a',
  }));
  expect(css).toMatchObject({ html: 'clip', body: 'clip', navbar: 'sticky', fieldset: '0px' });
});
