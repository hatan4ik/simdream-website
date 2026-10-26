import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../support/http';

/** `isProduction` is evaluated at import time, so every case re-imports the module. */
async function loadServerEnv(env: Record<string, string>) {
  vi.resetModules();
  for (const [name, value] of Object.entries({ NODE_ENV: 'test', ...env })) vi.stubEnv(name, value);
  return import('@/lib/config/server-env');
}

const PLACEHOLDERS = ['your_', 'your-', 'example', 'placeholder', 'changeme', '...'];

describe('hasUsableValue', () => {
  it.each([
    ['undefined', undefined],
    ['an empty string', ''],
    ['whitespace', '   \t'],
    ['a your_ template', 'your_stripe_key'],
    ['a your- template', 'your-project-ref'],
    ['an example URL', 'https://example.com'],
    ['a placeholder', 'placeholder'],
    ['changeme', 'changeme'],
    ['an elided key', 'sk_live_...'],
  ])('rejects %s', async (_label, value) => {
    const { hasUsableValue } = await loadServerEnv({});
    expect(hasUsableValue(value)).toBe(false);
  });

  it('rejects any value that contains a placeholder marker', async () => {
    const { hasUsableValue } = await loadServerEnv({});
    fc.assert(
      fc.property(fc.string(), fc.constantFrom(...PLACEHOLDERS), fc.string(), (before, marker, after) => {
        expect(hasUsableValue(before + marker + after)).toBe(false);
      })
    );
  });

  it('accepts any non-blank value without a placeholder marker', async () => {
    const { hasUsableValue } = await loadServerEnv({});
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((value) => value.trim() !== '' && !PLACEHOLDERS.some((marker) => value.includes(marker))),
        (value) => {
          expect(hasUsableValue(value)).toBe(true);
        }
      )
    );
  });
});

describe('isProduction', () => {
  it.each([
    ['production', true],
    ['test', false],
    ['development', false],
  ])('is evaluated from NODE_ENV=%s as %s', async (nodeEnv, expected) => {
    const { isProduction } = await loadServerEnv({ NODE_ENV: nodeEnv });
    expect(isProduction).toBe(expected);
  });
});

describe('getRequiredProductionEnv', () => {
  it('returns a configured value', async () => {
    const { getRequiredProductionEnv } = await loadServerEnv({ SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret' });
    expect(getRequiredProductionEnv('SUPABASE_SERVICE_ROLE_KEY')).toBe('service-role-secret');
  });

  it.each(['', 'your_service_role_key'])('names the missing variable when it is %j', async (value) => {
    const { getRequiredProductionEnv } = await loadServerEnv({ SUPABASE_SERVICE_ROLE_KEY: value });
    expect(() => getRequiredProductionEnv('SUPABASE_SERVICE_ROLE_KEY')).toThrow(
      'SUPABASE_SERVICE_ROLE_KEY must be configured in production.'
    );
  });
});

describe('getApplicationOrigin in production', () => {
  it('returns the origin of an HTTPS application URL, dropping any path', async () => {
    const { getApplicationOrigin } = await loadServerEnv({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://www.simdream.co.il/he/book?x=1',
    });
    expect(getApplicationOrigin()).toBe('https://www.simdream.co.il');
  });

  it('refuses a plain-HTTP application URL', async () => {
    const { getApplicationOrigin } = await loadServerEnv({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'http://www.simdream.co.il' });
    expect(() => getApplicationOrigin()).toThrow('NEXT_PUBLIC_APP_URL must use HTTPS in production.');
  });

  it.each(['', 'https://example.com'])('refuses a missing or placeholder application URL %j', async (url) => {
    const { getApplicationOrigin } = await loadServerEnv({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: url });
    expect(() => getApplicationOrigin(apiRequest('/api/checkout'))).toThrow(
      'NEXT_PUBLIC_APP_URL must be configured in production.'
    );
  });

  it('never trusts the request Host header in place of configuration', async () => {
    const { getApplicationOrigin } = await loadServerEnv({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: '' });
    const spoofed = new Request('https://attacker.example/api/checkout', { headers: { host: 'attacker.example' } });
    expect(() => getApplicationOrigin(spoofed)).toThrow('NEXT_PUBLIC_APP_URL must be configured in production.');
  });
});

describe('getApplicationOrigin outside production', () => {
  it('accepts a plain-HTTP application URL for local work', async () => {
    const { getApplicationOrigin } = await loadServerEnv({ NEXT_PUBLIC_APP_URL: 'http://localhost:4000/path' });
    expect(getApplicationOrigin()).toBe('http://localhost:4000');
  });

  it('falls back to the request origin when no URL is configured', async () => {
    const { getApplicationOrigin } = await loadServerEnv({ NEXT_PUBLIC_APP_URL: '' });
    expect(getApplicationOrigin(new Request('http://127.0.0.1:3201/api/checkout'))).toBe('http://127.0.0.1:3201');
  });

  it('falls back to localhost:3000 without a request', async () => {
    const { getApplicationOrigin } = await loadServerEnv({ NEXT_PUBLIC_APP_URL: '' });
    expect(getApplicationOrigin()).toBe('http://localhost:3000');
  });
});
