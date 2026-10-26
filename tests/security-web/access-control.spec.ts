import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { ADMIN_CREDENTIALS, expect, test } from '../support/e2e';

const ADMIN_PAGES = ['/admin', '/admin/bookings', '/admin/vouchers', '/admin/workshops'];
const ADMIN_API_READS = ['/api/bookings', '/api/vouchers', '/api/workshops'];
const BASIC_CHALLENGE = /^Basic realm="Sim Dream Admin"/;

async function contextWith(baseURL: string | undefined, credentials?: { username: string; password: string }): Promise<APIRequestContext> {
  // send: 'always' attaches credentials pre-emptively, so mutations never depend on a challenge round trip.
  return playwrightRequest.newContext({ baseURL, httpCredentials: credentials && { ...credentials, send: 'always' } });
}

test.describe('admin shell (proxy.ts Basic auth)', () => {
  for (const path of ADMIN_PAGES) {
    test(`challenges an anonymous visitor to ${path} with 401 Basic and serves no admin UI`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      const body = await response.text();

      expect(response.status()).toBe(401);
      expect(response.headers()['www-authenticate']).toMatch(BASIC_CHALLENGE);
      expect(JSON.parse(body)).toEqual({ error: 'Admin authentication required' });
      expect(body).not.toMatch(/dispatch|manifest|voucher terminal/i);
    });
  }

  for (const path of ADMIN_PAGES) {
    test(`serves ${path} to the configured admin (200)`, async ({ baseURL }) => {
      const admin = await contextWith(baseURL, ADMIN_CREDENTIALS);
      try {
        const response = await admin.get(path, { maxRedirects: 0 });
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('text/html');
      } finally {
        await admin.dispose();
      }
    });
  }

  // Encoded, suffixed and case variants of the admin path must never slip around the proxy matcher.
  // Node's fetch sends these paths verbatim (percent-encoding and `..;` are not dot segments).
  const GUARDED_VARIANTS: Array<{ path: string; headers?: Record<string, string> }> = [
    { path: '/%61dmin' },
    { path: '/%61dmin/bookings' },
    { path: '/admin/..;/admin' },
    { path: '/admin%2Fbookings' },
    { path: '/admin.rsc' },
    { path: '/admin/bookings.rsc' },
    { path: '/_next/data/build/admin.json' },
    { path: '/admin', headers: { rsc: '1' } },
    { path: '/admin/bookings', headers: { rsc: '1', 'next-router-prefetch': '1' } },
    // CVE-2025-29927: a forged internal header once made Next.js skip middleware entirely.
    { path: '/admin', headers: { 'x-middleware-subrequest': 'proxy:proxy:proxy:proxy:proxy' } },
    { path: '/admin', headers: { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' } },
  ];

  for (const { path, headers } of GUARDED_VARIANTS) {
    const label = headers
      ? `${path} with ${Object.entries(headers).map(([name, value]) => `${name}: ${value}`).join(', ')}`
      : path;
    test(`challenges an anonymous request for the admin variant ${label} with 401 Basic`, async ({ baseURL }) => {
      const response = await fetch(`${new URL(baseURL ?? '').origin}${path}`, { headers, redirect: 'manual' });
      const body = await response.text();

      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate')).toMatch(BASIC_CHALLENGE);
      expect(body).not.toMatch(/dispatch command|voucher terminal/i);
    });
  }

  for (const path of ['/ADMIN', '/Admin/bookings', '/admin;x']) {
    test(`does not route the look-alike path ${path} to the admin shell (404)`, async ({ baseURL }) => {
      const response = await fetch(`${new URL(baseURL ?? '').origin}${path}`, { redirect: 'manual' });

      expect(response.status).toBe(404);
      expect(await response.text()).not.toMatch(/dispatch command|voucher terminal/i);
    });
  }

  for (const path of ['//admin', '/admin/']) {
    test(`canonicalises ${path} to the guarded /admin route, never serving the shell`, async ({ baseURL }) => {
      const origin = new URL(baseURL ?? '').origin;
      const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
      const location = new URL(response.headers.get('location') ?? '', origin);
      const followed = await fetch(location, { redirect: 'manual' });

      expect(response.status).toBe(308);
      expect(location.origin).toBe(origin);
      expect(location.pathname).toBe('/admin');
      expect(followed.status).toBe(401);
      expect(await followed.text()).not.toMatch(/dispatch command|voucher terminal/i);
    });
  }

  test('rejects wrong admin credentials with 401', async ({ baseURL }) => {
    const intruder = await contextWith(baseURL, { username: ADMIN_CREDENTIALS.username, password: 'not-the-password-0000000' });
    try {
      const response = await intruder.get('/admin', { maxRedirects: 0 });
      expect(response.status()).toBe(401);
      expect(response.headers()['www-authenticate']).toMatch(BASIC_CHALLENGE);
    } finally {
      await intruder.dispose();
    }
  });

  test.describe('in a browser with admin credentials', () => {
    test.use({ httpCredentials: ADMIN_CREDENTIALS });

    test('renders the dispatch command shell', async ({ page }) => {
      const response = await page.goto('/admin');

      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: /dispatch command/i })).toBeVisible();
    });
  });
});

test.describe('admin API methods', () => {
  for (const path of ADMIN_API_READS) {
    test(`refuses anonymous GET ${path} with 401 Basic`, async ({ request }) => {
      const response = await request.get(path);

      expect(response.status()).toBe(401);
      expect(response.headers()['www-authenticate']).toMatch(BASIC_CHALLENGE);
      expect(await response.json()).toEqual({ error: 'Admin authentication required' });
    });

    test(`serves GET ${path} to the admin as a private, uncached JSON array`, async ({ baseURL }) => {
      const admin = await contextWith(baseURL, ADMIN_CREDENTIALS);
      try {
        const response = await admin.get(path);
        expect(response.status()).toBe(200);
        expect(response.headers()['cache-control']).toBe('private, no-store');
        expect(Array.isArray(await response.json())).toBe(true);
      } finally {
        await admin.dispose();
      }
    });
  }

  test('refuses an authenticated admin mutation sent from a foreign Origin with 403', async ({ baseURL }) => {
    const admin = await contextWith(baseURL, ADMIN_CREDENTIALS);
    try {
      // A nonexistent id: if the origin check were missing this would be a harmless 404, never a mutation.
      const response = await admin.patch('/api/workshops', {
        headers: { origin: 'https://evil.example' },
        data: { id: 'security-web-nonexistent-inquiry', status: 'contacted' },
      });
      expect(response.status()).toBe(403);
      expect(await response.json()).toEqual({ error: 'Cross-origin admin mutations are not allowed.' });
    } finally {
      await admin.dispose();
    }
  });

  test('lets an authenticated admin script without an Origin header through (control: reaches the handler, 404)', async ({ baseURL }) => {
    const admin = await contextWith(baseURL, ADMIN_CREDENTIALS);
    try {
      const response = await admin.patch('/api/workshops', {
        data: { id: 'security-web-nonexistent-inquiry', status: 'contacted' },
      });
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: 'Inquiry not found.' });
    } finally {
      await admin.dispose();
    }
  });

  test.describe('from the admin UI in a browser', () => {
    test.use({ httpCredentials: ADMIN_CREDENTIALS });

    // Fixed SEC-11: the guard compared Origin with request.url, which next start reports as localhost.
    test('accepts a same-origin admin mutation sent by the admin page itself', async ({ page }) => {
      await page.goto('/admin/workshops');

      // The browser attaches its real Origin to this same-origin PATCH, exactly as the admin pages' own fetch calls do.
      const status = await page.evaluate(async () => {
        const response = await fetch('/api/workshops', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'security-web-nonexistent-inquiry', status: 'contacted' }),
        });
        return response.status;
      });

      // 404 proves the request passed authentication and the CSRF check; the id does not exist, so nothing changes.
      expect(status).toBe(404);
    });
  });
});

test.describe('member APIs in production', () => {
  test('ignores the x-simdream-demo-email header on /api/my-bookings (401)', async ({ request }) => {
    const response = await request.get('/api/my-bookings', { headers: { 'x-simdream-demo-email': 'pilot@simdream.co.il' } });

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required.' });
  });

  test('fails closed (401) for a Bearer token it cannot verify', async ({ request }) => {
    const response = await request.get('/api/my-bookings', { headers: { authorization: 'Bearer forged.jwt.token' } });

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required.' });
  });

  test('refuses anonymous membership activation (401)', async ({ request }) => {
    const response = await request.post('/api/membership/bootstrap');

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required.' });
  });

  test('refuses an anonymous receipt lookup (401)', async ({ request }) => {
    const response = await request.get('/api/my-bookings/SD-737-ZZZZZZZZZZZZZZZZ/receipt');

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ error: expect.any(String) });
  });
});
