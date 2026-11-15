import os from 'node:os';

/**
 * Origins `next dev` serves HMR and dev assets to. Plain ESM on purpose: `next.config.mjs`
 * imports it before any TypeScript or path alias exists, and a unit test imports it directly.
 *
 * Only loopback is open by default. Every other origin (LAN ranges, tunnel domains, the machine's
 * own hostname and interface addresses, the production domain) is opt-in, so a dev server started
 * on `0.0.0.0` on a shared network or a coffee-shop Wi-Fi does not hand its dev endpoints to
 * every neighbouring device. Set `DEV_ALLOW_REMOTE_ORIGINS=true` in `.env.local` (or the shell)
 * to test from a phone, a LAN device or a tunnel.
 */
export const REMOTE_ORIGINS_FLAG = 'DEV_ALLOW_REMOTE_ORIGINS';

/** Matched against the hostname of the request's Origin or Referer; Next already allows `localhost` itself. */
export const LOOPBACK_DEV_ORIGINS = ['127.0.0.1', 'localhost', '[::1]'];

/** `*` stands for exactly one hostname label and a leading `**` for one or more (Next's allowedDevOrigins rules). */
const REMOTE_DEV_ORIGIN_PATTERNS = [
  '127.*.*.*',
  '192.168.*.*',
  '10.*.*.*',
  '172.*.*.*',
  '100.*.*.*',
  '*.local',
  '**.local',
  '**.ngrok-free.app',
  '**.ngrok-free.dev',
  '**.ngrok.io',
  '**.ngrok.app',
  '**.trycloudflare.com',
  '**.loca.lt',
  '**.ts.net',
  'simdream.co.il',
  '**.simdream.co.il',
];

/**
 * @param {Record<string, string | undefined>} [env] the environment to read the opt-in from
 * @returns {string[]} the `allowedDevOrigins` list for next.config.mjs
 */
export function collectAllowedDevOrigins(env = process.env) {
  const origins = new Set(LOOPBACK_DEV_ORIGINS);
  if (env[REMOTE_ORIGINS_FLAG] !== 'true') return Array.from(origins);

  for (const pattern of REMOTE_DEV_ORIGIN_PATTERNS) origins.add(pattern);

  try {
    const hostname = os.hostname();
    if (hostname) {
      origins.add(hostname);
      origins.add(hostname.toLowerCase());
    }
    const interfaces = os.networkInterfaces();
    for (const entries of Object.values(interfaces)) {
      for (const entry of entries ?? []) {
        if (entry && entry.address && entry.family === 'IPv4') {
          origins.add(entry.address);
        }
      }
    }
  } catch {
    // Ignore restricted OS interface lookups
  }

  return Array.from(origins);
}
