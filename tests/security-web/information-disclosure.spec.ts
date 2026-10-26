import { get } from 'node:http';
import { expect, PUBLIC_ROUTES, test } from '../support/e2e';

/** GET with the request target sent byte-for-byte, without URL normalization or redirect following. */
function rawGet(baseURL: string, path: string): Promise<{ status: number; location: string | null }> {
  const { hostname, port } = new URL(baseURL);
  return new Promise((resolve, reject) => {
    get({ hostname, port, path }, (response) => {
      response.resume();
      resolve({ status: response.statusCode ?? 0, location: response.headers.location ?? null });
    }).on('error', reject);
  });
}

/** Stack frames, source locations and dependency paths that must never reach a visitor. */
const INTERNAL_DETAILS = [
  /(?:\n|\\n)\s+at\s+(?:async\s+)?[\w$.<>[\]]+\s/,
  /\bat\s+(?:async\s+)?[\w$.<>[\]]+\s+\([^()]*:\d+:\d+\)/,
  /\.(?:ts|tsx):\d+/,
  /node_modules/,
  /"stack"\s*:/,
];

function internalDetailsIn(text: string): string[] {
  return INTERNAL_DETAILS.filter((pattern) => pattern.test(text)).map(String);
}

test.describe('error responses', () => {
  test('the not-found page answers 404 without stack traces or source paths', async ({ page }) => {
    const response = await page.goto('/security-web-route-that-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.getByText(/could not be found/i).first()).toBeVisible();
    expect(internalDetailsIn((await response?.text()) ?? '')).toEqual([]);
    expect(internalDetailsIn(await page.locator('body').innerText())).toEqual([]);
  });

  const API_ERRORS: Array<{ label: string; send: (request: import('@playwright/test').APIRequestContext) => Promise<import('@playwright/test').APIResponse>; status: number }> = [
    {
      label: 'malformed JSON to /api/checkout',
      status: 400,
      send: (request) => request.post('/api/checkout', { headers: { 'content-type': 'application/json' }, data: '{"kind":' }),
    },
    {
      label: 'schema-invalid checkout',
      status: 400,
      send: (request) => request.post('/api/checkout', { data: { kind: 'booking', packageId: { $ne: null } } }),
    },
    { label: 'invalid slot query', status: 400, send: (request) => request.get('/api/slots?date=%3Cscript%3E&duration=999') },
    { label: 'malformed booking reference', status: 404, send: (request) => request.get("/api/bookings?ref=' OR 1=1 --") },
    {
      label: 'malformed JSON to /api/vouchers',
      status: 400,
      send: (request) => request.post('/api/vouchers', { headers: { 'content-type': 'application/json' }, data: '\u0000' }),
    },
    {
      label: 'unsigned Stripe webhook',
      status: 503,
      send: (request) => request.post('/api/webhooks/stripe', { data: { type: 'checkout.session.completed' } }),
    },
  ];

  for (const { label, send, status } of API_ERRORS) {
    test(`${label} returns a JSON error (${status}) without internals`, async ({ request }) => {
      const response = await send(request);
      const text = await response.text();

      expect(response.status()).toBe(status);
      expect(response.headers()['content-type']).toContain('application/json');
      expect(JSON.parse(text)).toMatchObject({ error: expect.any(String) });
      expect(internalDetailsIn(text)).toEqual([]);
    });
  }
});

test.describe('files that must never be served', () => {
  const SENSITIVE_PATHS = [
    '/.env',
    '/.env.local',
    '/.env.example',
    '/.git/HEAD',
    '/.git/config',
    '/package.json',
    '/next.config.mjs',
    '/tsconfig.json',
    '/proxy.ts',
    '/lib/db/schema.sql',
    '/.next/BUILD_ID',
    '/.next/server/app/api/checkout/route.js',
    '/_next/static/..%2f..%2f.env.local',
    '/_next/static/%2e%2e/%2e%2e/package.json',
  ];

  for (const path of SENSITIVE_PATHS) {
    test(`does not serve ${path}`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      const body = await response.text();

      expect(response.status()).toBe(404);
      expect(body).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|"dependencies"|ref: refs\/|CREATE TABLE|\[core\]/);
    });
  }
});

test.describe('image optimizer (/_next/image)', () => {
  const REMOTE_SOURCES = [
    'https://example.com/logo.png',
    'http://example.com/logo.png',
    '//evil.example/logo.png',
    'http://169.254.169.254/latest/meta-data/',
    'http://127.0.0.1:22/',
    'file:///etc/passwd',
  ];

  for (const source of REMOTE_SOURCES) {
    test(`refuses to fetch ${source}`, async ({ request }) => {
      const response = await request.get(`/_next/image?url=${encodeURIComponent(source)}&w=64&q=75`);

      expect(response.status()).toBe(400);
      expect(response.headers()['content-type'] ?? '').not.toMatch(/^image\//);
    });
  }
});

test.describe('robots.txt', () => {
  /** Google's matching rule for User-agent "*": the longest matching path rule wins; Allow wins ties. */
  function isCrawlable(robots: string, path: string): boolean {
    const groups: Array<{ agents: string[]; rules: Array<{ allow: boolean; prefix: string }> }> = [];
    let current: (typeof groups)[number] | undefined;
    let lastWasAgent = false;
    for (const rawLine of robots.split('\n')) {
      const [rawField, ...rest] = rawLine.split('#')[0].split(':');
      const field = rawField.trim().toLowerCase();
      const value = rest.join(':').trim();
      if (field === 'user-agent') {
        if (!current || !lastWasAgent) {
          current = { agents: [], rules: [] };
          groups.push(current);
        }
        current.agents.push(value.toLowerCase());
        lastWasAgent = true;
      } else if ((field === 'allow' || field === 'disallow') && current) {
        if (value) current.rules.push({ allow: field === 'allow', prefix: value });
        lastWasAgent = false;
      } else if (field) {
        lastWasAgent = false;
      }
    }
    const rules = groups.filter((group) => group.agents.includes('*')).flatMap((group) => group.rules);
    const matches = rules.filter((rule) => path.startsWith(rule.prefix));
    if (matches.length === 0) return true;
    const best = matches.sort((a, b) => b.prefix.length - a.prefix.length || Number(b.allow) - Number(a.allow))[0];
    return best.allow;
  }

  test('keeps admin subpages and API endpoints out of crawling', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const robots = await response.text();

    expect(response.status()).toBe(200);
    for (const path of ['/admin/bookings', '/admin/vouchers', '/api/bookings', '/api/checkout', '/api/my-bookings']) {
      expect(isCrawlable(robots, path), path).toBe(false);
    }
    expect(isCrawlable(robots, '/book'), 'public booking page stays crawlable').toBe(true);
  });

  test('keeps the /admin dashboard root out of crawling', async ({ request }) => {

    const robots = await (await request.get('/robots.txt')).text();

    expect(isCrawlable(robots, '/admin')).toBe(false);
  });
});

test.describe('cookies', () => {
  test('public pages and APIs set no cookies (nothing to steal or fixate)', async ({ request }) => {
    const paths = [...PUBLIC_ROUTES, '/api/packages', '/api/reviews', '/dashboard', '/auth/callback'];
    const setCookies: string[] = [];
    for (const path of paths) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBeLessThan(400);
      setCookies.push(
        ...response
          .headersArray()
          .filter((header) => header.name.toLowerCase() === 'set-cookie')
          .map((header) => `${path}: ${header.value}`)
      );
    }

    expect(setCookies).toEqual([]);
  });

  test('a browsing session through the public site leaves no cookies, so none can lack HttpOnly/Secure/SameSite', async ({ page, context }) => {
    for (const path of ['/', '/book', '/vouchers', '/login']) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
    }

    expect(await context.cookies()).toEqual([]);
  });
});

test.describe('redirects', () => {
  for (const alias of ['/about', '/simulator', '/training']) {
    test(`${alias} redirects permanently to /pro on the same origin, even with a hostile forwarded host`, async ({ request, baseURL }) => {
      const response = await request.get(alias, {
        maxRedirects: 0,
        headers: { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' },
      });
      const location = response.headers()['location'] ?? '';

      expect(response.status()).toBe(308);
      expect(new URL(location, baseURL).origin).toBe(new URL(baseURL ?? '').origin);
      expect(new URL(location, baseURL).pathname).toBe('/pro');
    });
  }

  // Protocol-relative and backslash paths are classic open-redirect vectors: each must either stay a
  // same-origin path redirect or simply not exist. Sent verbatim, since WHATWG URL parsing (fetch,
  // APIRequestContext) would rewrite "\" and "%2e%2e" before they reach the server.
  const OFFSITE_LOOKING_PATHS: Array<{ path: string; status: number; location: string | null }> = [
    { path: '//evil.example/', status: 308, location: '/evil.example/' },
    { path: '///evil.example', status: 308, location: '/evil.example' },
    { path: '//evil.example/%2e%2e', status: 308, location: '/' },
    { path: '/\\evil.example', status: 308, location: '/evil.example' },
    { path: '/\\/evil.example', status: 308, location: '/evil.example' },
    { path: '/%2F%2Fevil.example', status: 404, location: null },
    { path: '/%5Cevil.example', status: 404, location: null },
  ];

  for (const { path, status, location } of OFFSITE_LOOKING_PATHS) {
    test(`never redirects ${path} to another site`, async ({ baseURL }) => {
      const response = await rawGet(baseURL ?? '', path);

      expect(response.status).toBe(status);
      expect(response.location).toBe(location);
    });
  }
});
