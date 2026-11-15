/**
 * Picks the client address that rate limits key on from exactly one request header, chosen by
 * server configuration and never by which headers a request happens to carry. A forwarding header
 * is only as trustworthy as the edge that overwrites or appends it, so the deployer names that
 * header in RATE_LIMIT_CLIENT_IP_HEADER (SECURITY.md, "Client address for rate limiting").
 *
 * Configuration is read on every call, not at module load: the OpenNext Worker copies its
 * bindings into process.env only when it serves its first request.
 */

/** What every request without a usable address resolves to; callers share one bucket for it. */
const UNKNOWN_CLIENT = 'unknown-client';

/** The headers a deployer may name. Only x-forwarded-for is a list; the others carry one address. */
const CONFIGURABLE_HEADERS = ['cf-connecting-ip', 'x-vercel-forwarded-for', 'x-real-ip', 'x-forwarded-for'] as const;
type ClientAddressHeader = (typeof CONFIGURABLE_HEADERS)[number];

/** 1 = the rightmost x-forwarded-for entry, the one the nearest proxy appended. */
const DEFAULT_TRUSTED_PROXY_HOPS = 1;
const TRUSTED_PROXY_HOPS_FORMAT = /^[1-5]$/;

/** The address shape check: hex digits, dots and colons only, so host names, brackets and lists fail. */
const ADDRESS_FORMAT = /^[0-9a-f:.]{3,64}$/i;

type Environment = Readonly<Record<string, string | undefined>>;

/** RATE_LIMIT_CLIENT_IP_HEADER when it names an allowed header, else the platform default. */
function clientAddressHeader(env: Environment): ClientAddressHeader {
  const configured = env.RATE_LIMIT_CLIENT_IP_HEADER?.trim().toLowerCase();
  const allowed = CONFIGURABLE_HEADERS.find((header) => header === configured);
  if (allowed) return allowed;
  // Vercel sets VERCEL=1 and documents x-vercel-forwarded-for as its own copy of the client
  // address, kept even where a proxy rewrites x-forwarded-for (SECURITY.md quotes both pages).
  return env.VERCEL === '1' ? 'x-vercel-forwarded-for' : 'x-forwarded-for';
}

/** RATE_LIMIT_TRUSTED_PROXY_HOPS as an integer from 1 to 5; any other value means the default. */
function trustedProxyHops(env: Environment): number {
  const configured = env.RATE_LIMIT_TRUSTED_PROXY_HOPS?.trim() ?? '';
  return TRUSTED_PROXY_HOPS_FORMAT.test(configured) ? Number(configured) : DEFAULT_TRUSTED_PROXY_HOPS;
}

/**
 * Proxies append to x-forwarded-for, so everything left of the trusted proxies' entries is
 * whatever the client sent. A list shorter than the hop count did not come through them.
 */
function entryAppendedByTrustedProxy(list: string, hops: number): string | undefined {
  const entries = list.split(',');
  return entries[entries.length - hops];
}

/** The normalized client address for rate limiting, or 'unknown-client'. */
export function resolveClientAddress(headers: Headers, env: Environment = process.env): string {
  const header = clientAddressHeader(env);
  const value = headers.get(header);
  if (value === null) return UNKNOWN_CLIENT;

  const entry = header === 'x-forwarded-for' ? entryAppendedByTrustedProxy(value, trustedProxyHops(env)) : value;
  const candidate = entry?.trim();
  return candidate && ADDRESS_FORMAT.test(candidate) ? candidate.toLowerCase() : UNKNOWN_CLIENT;
}
