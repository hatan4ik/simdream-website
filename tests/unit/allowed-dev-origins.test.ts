import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { collectAllowedDevOrigins, LOOPBACK_DEV_ORIGINS } from '@/lib/config/allowed-dev-origins.mjs';
import { REPO_ROOT } from './_support/source';

/** Every non-loopback origin the broad list names, by kind. */
const LAN_RANGES = ['192.168.*.*', '10.*.*.*', '172.*.*.*', '100.*.*.*'];
const TUNNEL_DOMAINS = ['**.ngrok-free.app', '**.ngrok.io', '**.trycloudflare.com', '**.loca.lt', '**.ts.net'];
const PRODUCTION_DOMAINS = ['simdream.co.il', '**.simdream.co.il'];

function machineOrigins(): string[] {
  const addresses = Object.values(os.networkInterfaces()).flatMap((entries) =>
    (entries ?? []).filter((entry) => entry.family === 'IPv4').map((entry) => entry.address)
  );
  return [os.hostname(), os.hostname().toLowerCase(), ...addresses].filter(Boolean);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('allowedDevOrigins', () => {
  it('lets only loopback origins reach the dev server by default', () => {
    expect(LOOPBACK_DEV_ORIGINS).toEqual(['127.0.0.1', 'localhost', '[::1]']);
    expect(collectAllowedDevOrigins({})).toEqual([...LOOPBACK_DEV_ORIGINS]);
  });

  it('treats anything but the exact value "true" as no opt-in', () => {
    for (const value of ['', 'false', '0', '1', 'yes', 'TRUE', ' true', 'true ']) {
      expect(collectAllowedDevOrigins({ DEV_ALLOW_REMOTE_ORIGINS: value }), JSON.stringify(value)).toEqual([...LOOPBACK_DEV_ORIGINS]);
    }
  });

  it('adds no LAN range, tunnel domain, production domain, hostname or interface address by default', () => {
    const origins = collectAllowedDevOrigins({});
    // The loopback interface's own address (127.0.0.1) is one of the machine's interface addresses.
    const remote = [...LAN_RANGES, ...TUNNEL_DOMAINS, ...PRODUCTION_DOMAINS, ...machineOrigins()].filter(
      (origin) => !LOOPBACK_DEV_ORIGINS.includes(origin)
    );
    expect(remote.length).toBeGreaterThan(0);
    for (const origin of remote) expect(origins, origin).not.toContain(origin);
  });

  it('returns the broad list, loopback included, only with DEV_ALLOW_REMOTE_ORIGINS=true', () => {
    const origins = collectAllowedDevOrigins({ DEV_ALLOW_REMOTE_ORIGINS: 'true' });

    for (const expected of [...LOOPBACK_DEV_ORIGINS, ...LAN_RANGES, ...TUNNEL_DOMAINS, ...PRODUCTION_DOMAINS, ...machineOrigins()]) {
      expect(origins, expected).toContain(expected);
    }
    expect(new Set(origins).size, 'no duplicates').toBe(origins.length);
  });

  it('reads the flag from the process environment when none is passed', () => {
    vi.stubEnv('DEV_ALLOW_REMOTE_ORIGINS', '');
    expect(collectAllowedDevOrigins()).toEqual([...LOOPBACK_DEV_ORIGINS]);
    vi.stubEnv('DEV_ALLOW_REMOTE_ORIGINS', 'true');
    expect(collectAllowedDevOrigins()).toContain('192.168.*.*');
  });

  it('is what next.config.mjs hands to Next, in both states', async () => {
    vi.stubEnv('DEV_ALLOW_REMOTE_ORIGINS', '');
    vi.resetModules();
    const closed = (await import('../../next.config.mjs')).default as { allowedDevOrigins: string[] };
    expect(closed.allowedDevOrigins).toEqual([...LOOPBACK_DEV_ORIGINS]);

    vi.stubEnv('DEV_ALLOW_REMOTE_ORIGINS', 'true');
    vi.resetModules();
    const open = (await import('../../next.config.mjs')).default as { allowedDevOrigins: string[] };
    expect(open.allowedDevOrigins).toEqual(expect.arrayContaining([...LOOPBACK_DEV_ORIGINS, ...LAN_RANGES, ...TUNNEL_DOMAINS]));
  });

  it('documents the flag in .env.example (off) and in the README phone and tunnel section', () => {
    const envExample = readFileSync(path.join(REPO_ROOT, '.env.example'), 'utf8');
    expect(envExample).toMatch(/^DEV_ALLOW_REMOTE_ORIGINS=$/m);
    const readme = readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');
    expect(readme).toContain('DEV_ALLOW_REMOTE_ORIGINS=true');
  });
});
