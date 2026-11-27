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

/** A full UTC instant such as 2026-11-27T13:00:00Z; nothing looser, so a typo cannot open the route. */
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const LONGEST_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * True while `CLIENT_ADDRESS_DIAGNOSTIC_UNTIL` names an instant that is still ahead and at most 48
 * hours away. The diagnostic therefore closes by itself: a deployer cannot leave it on by forgetting
 * a second step, and a far-future date does not open it at all.
 */
export function clientAddressDiagnosticIsOpen(env: Environment, now: Date = new Date()): boolean {
  const value = env.CLIENT_ADDRESS_DIAGNOSTIC_UNTIL;
  if (value === undefined || !UTC_INSTANT.test(value)) return false;
  const remaining = Date.parse(value) - now.getTime();
  return remaining > 0 && remaining <= LONGEST_WINDOW_MS;
}

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
  /** Where the caller's forged address sits counted from the right, or null when it did not arrive. */
  spoofEntryFromRight: number | null;
}

export interface ClientAddressDiagnostic {
  /** RATE_LIMIT_CLIENT_IP_HEADER names an allowed header (or the deployment is Vercel). */
  configured: boolean;
  /** The header the application reads on this deployment. */
  resolvedFrom: ClientAddressHeader;
  resolved: 'address' | typeof UNKNOWN_CLIENT;
  resolvedMatchesExpected: boolean | null;
  /** The application would have counted this request under the caller's forged address. */
  resolvedIsSpoof: boolean | null;
  /** The caller supplied an expectation with the shape of an address. */
  expectationUsable: boolean;
  /** The caller named the forged address it sent, with the shape of an address. */
  spoofUsable: boolean;
  headers: Record<ClientAddressHeader, HeaderReport>;
}

export interface ClientAddressProbe {
  /** The caller's own public address, as it expects the application to see it. */
  expected: string | null;
  /** A false address the caller wrote into the forwarding headers of this same request. */
  spoof: string | null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function usableAddress(value: string | null): string | null {
  const candidate = normalize(value);
  return ADDRESS_FORMAT.test(candidate) ? candidate : null;
}

function entryFromRight(entries: readonly string[], address: string | null): number | null {
  if (address === null) return null;
  const index = entries.lastIndexOf(address);
  return index === -1 ? null : entries.length - index;
}

function describeHeader(name: ClientAddressHeader, value: string | null, expected: string | null, spoof: string | null): HeaderReport {
  if (value === null) {
    return { present: false, entries: 0, validAddress: false, matchesExpected: null, expectedEntryFromRight: null, spoofEntryFromRight: null };
  }
  const entries = value.split(',').map(normalize);
  // Only x-forwarded-for is a list by design; for it the entry the nearest proxy appended is judged.
  const judged = name === 'x-forwarded-for' ? entries[entries.length - 1] : normalize(value);
  return {
    present: true,
    entries: entries.length,
    validAddress: ADDRESS_FORMAT.test(judged),
    matchesExpected: expected === null ? null : judged === expected,
    expectedEntryFromRight: entryFromRight(entries, expected),
    spoofEntryFromRight: entryFromRight(entries, spoof),
  };
}

/**
 * Describes the forwarding headers of one request so a deployer can tell which of them carries the
 * visitor's address on this host, and whether a value the client forged survives the edge. It never
 * returns a header value: only presence, shape, counts and comparisons with two addresses the caller
 * already knows, its own and the false one it sent.
 */
export function describeClientAddressHeaders(headers: Headers, env: Environment, probe: ClientAddressProbe): ClientAddressDiagnostic {
  const expected = usableAddress(probe.expected);
  const spoof = usableAddress(probe.spoof);
  const resolved = resolveClientAddress(headers, env);
  const report = {} as Record<ClientAddressHeader, HeaderReport>;
  for (const name of CONFIGURABLE_HEADERS) report[name] = describeHeader(name, headers.get(name), expected, spoof);
  return {
    configured: clientAddressIsConfigured(env),
    resolvedFrom: clientAddressHeader(env),
    resolved: resolved === UNKNOWN_CLIENT ? UNKNOWN_CLIENT : 'address',
    resolvedMatchesExpected: expected === null ? null : resolved === expected,
    resolvedIsSpoof: spoof === null ? null : resolved === spoof,
    expectationUsable: expected !== null,
    spoofUsable: spoof !== null,
    headers: report,
  };
}
