import { test as plainTest, type APIResponse } from '@playwright/test';
import { expect, nextIsraelWeekday, PUBLIC_ROUTES, test } from '../support/e2e';

interface Target {
  label: string;
  path: string;
  method?: 'GET' | 'POST';
  data?: unknown;
}

const PAGE_TARGETS: Target[] = [
  ...PUBLIC_ROUTES.map((path) => ({ label: `page ${path}`, path })),
  { label: 'admin page (unauthenticated 401)', path: '/admin' },
  { label: 'not-found page', path: '/security-web-missing-page' },
  { label: 'robots.txt', path: '/robots.txt' },
  { label: 'sitemap.xml', path: '/sitemap.xml' },
];

const API_TARGETS: Target[] = [
  { label: 'GET /api/packages', path: '/api/packages' },
  { label: 'GET /api/slots', path: `/api/slots?date=${nextIsraelWeekday(0)}&duration=60` },
  { label: 'GET /api/reviews', path: '/api/reviews' },
  { label: 'GET /api/bookings?ref= (not found)', path: '/api/bookings?ref=SD-737-ZZZZZZZZZZZZZZZZ' },
  { label: 'GET /api/bookings (401)', path: '/api/bookings' },
  { label: 'POST /api/checkout (400)', path: '/api/checkout', method: 'POST', data: {} },
  { label: 'POST /api/vouchers (404)', path: '/api/vouchers', method: 'POST', data: { action: 'verify', code: 'SD-VOUCH-ZZZZZZZZZZZZZZZZZZ' } },
];

const STRICT_REFERRER_POLICIES = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];

function fetchTarget(request: import('@playwright/test').APIRequestContext, target: Target): Promise<APIResponse> {
  return target.method === 'POST'
    ? request.post(target.path, { data: target.data, maxRedirects: 0 })
    : request.get(target.path, { maxRedirects: 0 });
}

test.describe('baseline security headers', () => {
  for (const target of [...PAGE_TARGETS, ...API_TARGETS]) {
    test(`${target.label} carries the baseline security headers`, async ({ request }) => {
      const response = await fetchTarget(request, target);
      const headers = response.headers();

      expect(response.status()).toBeLessThan(500);
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(STRICT_REFERRER_POLICIES).toContain(headers['referrer-policy']);
      expect(headers['permissions-policy']).toEqual(expect.stringContaining('camera=()'));
      expect(headers['permissions-policy']).toEqual(expect.stringContaining('microphone=()'));
      expect(headers['permissions-policy']).toEqual(expect.stringContaining('geolocation=()'));
      expect(headers['access-control-allow-origin']).toBeUndefined();
    });
  }
});

test.describe('technology disclosure and transport hardening', () => {
  test('omits X-Powered-By on every page and API response', async ({ request }) => {
    const disclosing: string[] = [];
    for (const target of [...PAGE_TARGETS, ...API_TARGETS]) {
      const response = await fetchTarget(request, target);
      if (response.headers()['x-powered-by'] !== undefined) disclosing.push(target.label);
    }

    expect(disclosing).toEqual([]);
  });

  test('sends a Content-Security-Policy that restricts scripts and framing on HTML pages', async ({ request }) => {
    const response = await request.get('/book');
    const csp = response.headers()['content-security-policy'] ?? '';

    expect(csp).toMatch(/(?:default-src|script-src)\s/);
    expect(csp).toMatch(/frame-ancestors\s+'none'/);
    expect(csp).toMatch(/object-src\s+'none'/);
    expect(csp).toMatch(/base-uri\s+'self'/);
  });

  test('forbids inline scripts in the Content-Security-Policy', async ({ request }) => {
    test.fail(
      true,
      "KNOWN-DEFECT SEC-8: script-src still allows 'unsafe-inline' because the App Router's inline RSC scripts cannot be hashed at build time; a strict policy needs per-request nonces (next.config.mjs)"
    );

    const response = await request.get('/book');
    const scriptSrc = /script-src([^;]*)/.exec(response.headers()['content-security-policy'] ?? '')?.[1] ?? '';

    expect(scriptSrc).not.toBe('');
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  // Plain test: this checks CSP only. Uncaught page errors (such as the E2E-12 hydration
  // mismatch) are owned by the e2e suite's page-error guard.
  plainTest('loads and hydrates pages without Content-Security-Policy violations', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
    });

    for (const path of ['/', '/book', '/vouchers', '/contact']) {
      await page.goto(path);
      // React attaches its fiber to interactive elements once hydration has run.
      await expect
        .poll(() =>
          page.evaluate(() =>
            Array.from(document.querySelectorAll('button')).some((node) =>
              Object.keys(node).some((key) => key.startsWith('__reactFiber'))
            )
          )
        )
        .toBe(true);
    }

    expect(violations).toEqual([]);
  });

  test('sends Strict-Transport-Security with a max-age of at least one year', async ({ request }) => {
    const response = await request.get('/');
    const hsts = response.headers()['strict-transport-security'] ?? '';
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0);

    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
    expect(hsts).toContain('includeSubDomains');
  });
});

test.describe('cross-origin resource sharing', () => {
  test('does not reflect a foreign Origin into Access-Control-Allow-Origin on API reads', async ({ request }) => {
    const response = await request.get('/api/packages', { headers: { origin: 'https://evil.example' } });

    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
    expect(response.headers()['access-control-allow-credentials']).toBeUndefined();
  });

  test('does not grant a foreign Origin a CORS preflight for checkout', async ({ request }) => {
    const response = await request.fetch('/api/checkout', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://evil.example',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.status()).toBeLessThan(500);
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
    expect(response.headers()['access-control-allow-headers']).toBeUndefined();
  });
});

test.describe('clickjacking', () => {
  test('a foreign page cannot frame the booking flow', async ({ page, baseURL }) => {
    const appOrigin = new URL(baseURL ?? '').origin;
    const framedResponse = page.waitForResponse((response) => response.url() === `${appOrigin}/book`);
    await page.setContent(`<iframe title="framed" src="${appOrigin}/book" width="800" height="600"></iframe>`);

    const response = await framedResponse;
    expect(response.headers()['x-frame-options']).toBe('DENY');
    // Wait for the frame to commit a navigation, then require that it is not the app document.
    const frameUrl = () => page.frames()[1]?.url() ?? '';
    await expect.poll(frameUrl).not.toMatch(/^(?:|about:blank)$/);
    // Chromium replaces a frame blocked by X-Frame-Options with its error document.
    expect(frameUrl()).toBe('chrome-error://chromewebdata/');
    await expect(page.frameLocator('iframe[title="framed"]').getByRole('heading')).toHaveCount(0);
  });
});
