import {
  ADDRESS_FORMAT,
  CONFIGURABLE_HEADERS,
  UNKNOWN_CLIENT,
  clientAddressHeader,
  clientAddressIsConfigured,
  resolveClientAddress,
  type ClientAddressHeader,
} from './client-address';

type Environment = Readonly<Record<string, string | undefined>>;

interface HeaderReport {
  present: boolean;
  /** Comma-separated entries in the value: more than one in a single-address header means it is a list. */
  entries: number;
  /** The whole value (the rightmost entry for x-forwarded-for) has the shape of one address. */
  validAddress: boolean;
  /** That same value equals the expected address; null when no usable expectation was given. */
  matchesExpected: boolean | null;
  /** Where the expected address sits counted from the right (1 = rightmost), or null. */
  expectedEntryFromRight: number | null;
}

export interface ClientAddressDiagnostic {
  /** RATE_LIMIT_CLIENT_IP_HEADER names an allowed header (or the deployment is Vercel). */
  configured: boolean;
  /** The header the application reads on this deployment. */
  resolvedFrom: ClientAddressHeader;
  resolved: 'address' | typeof UNKNOWN_CLIENT;
  resolvedMatchesExpected: boolean | null;
  /** The caller supplied an expectation with the shape of an address. */
  expectationUsable: boolean;
  headers: Record<ClientAddressHeader, HeaderReport>;
}

function normalize(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function describeHeader(name: ClientAddressHeader, value: string | null, expected: string | null): HeaderReport {
  if (value === null) return { present: false, entries: 0, validAddress: false, matchesExpected: null, expectedEntryFromRight: null };
  const entries = value.split(',').map(normalize);
  // Only x-forwarded-for is a list by design; for it the entry the nearest proxy appended is judged.
  const judged = name === 'x-forwarded-for' ? entries[entries.length - 1] : normalize(value);
  const fromRight = expected === null ? -1 : [...entries].reverse().indexOf(expected);
  return {
    present: true,
    entries: entries.length,
    validAddress: ADDRESS_FORMAT.test(judged),
    matchesExpected: expected === null ? null : judged === expected,
    expectedEntryFromRight: fromRight === -1 ? null : fromRight + 1,
  };
}

/**
 * Describes the forwarding headers of one request so a deployer can tell which of them carries the
 * visitor's address on this host, and whether the edge overwrites a value the client sent. It never
 * returns a header value: only presence, shape, counts and comparisons with `expectedAddress`, an
 * address the caller already knows (its own).
 */
export function describeClientAddressHeaders(
  headers: Headers,
  env: Environment,
  expectedAddress: string | null
): ClientAddressDiagnostic {
  const candidate = normalize(expectedAddress ?? undefined);
  const expected = ADDRESS_FORMAT.test(candidate) ? candidate : null;
  const resolved = resolveClientAddress(headers, env);
  const report = {} as Record<ClientAddressHeader, HeaderReport>;
  for (const name of CONFIGURABLE_HEADERS) report[name] = describeHeader(name, headers.get(name), expected);
  return {
    configured: clientAddressIsConfigured(env),
    resolvedFrom: clientAddressHeader(env),
    resolved: resolved === UNKNOWN_CLIENT ? UNKNOWN_CLIENT : 'address',
    resolvedMatchesExpected: expected === null ? null : resolved === expected,
    expectationUsable: expected !== null,
    headers: report,
  };
}
