import { expect } from 'vitest';
import type { VerifiedMemberIdentity } from '@/lib/auth/member-ownership';
import type { Booking } from '@/types';
import type { TestApp } from '../support/app';
import { adminHeaders, basicAuth, bearer } from '../support/http';
import { TEST_ADMIN } from '../support/test-env';

/** Seed voucher with a 400 ILS balance (lib/db/seed-data.ts). */
export const SEED_VOUCHER_CODE = 'SD-VOUCH-DF7QK3MN8R2V6X9LPA';
export const BOOKING_DATE = '2026-11-01';
export const HOSTILE_ORIGIN = 'https://evil.example';
export const PRODUCTION_ORIGIN = 'https://www.simdream.co.il';

export const MEMBER_A: VerifiedMemberIdentity = {
  id: 'member-a',
  email: 'member.a@members.test',
  emailVerified: true,
  fullName: 'Member A',
};
export const MEMBER_B: VerifiedMemberIdentity = {
  id: 'member-b',
  email: 'member.b@members.test',
  emailVerified: true,
  fullName: 'Member B',
};
export const UNVERIFIED_MEMBER: VerifiedMemberIdentity = {
  id: 'member-unverified',
  email: 'member.unverified@members.test',
  emailVerified: false,
};

export const MEMBER_TOKENS = {
  a: 'token-member-a-verified',
  b: 'token-member-b-verified',
  unverified: 'token-member-unverified',
} as const;

/** Bearer token → identity map for loadApp({ members }). */
export const MEMBERS: Record<string, VerifiedMemberIdentity> = {
  [MEMBER_TOKENS.a]: MEMBER_A,
  [MEMBER_TOKENS.b]: MEMBER_B,
  [MEMBER_TOKENS.unverified]: UNVERIFIED_MEMBER,
};

export type Identity =
  | 'anonymous'
  | 'wrong Basic credentials'
  | 'malformed Authorization header'
  | 'admin'
  | 'admin from a cross-origin page'
  | 'garbage Bearer token'
  | 'verified member'
  | 'unverified member';

export const IDENTITY_HEADERS: Record<Identity, Record<string, string>> = {
  anonymous: {},
  'wrong Basic credentials': { authorization: basicAuth(TEST_ADMIN.user, 'not-the-admin-password-000') },
  'malformed Authorization header': { authorization: 'Basic !!!not-base64!!!' },
  admin: adminHeaders(),
  'admin from a cross-origin page': adminHeaders({ origin: HOSTILE_ORIGIN }),
  'garbage Bearer token': bearer('garbage.not-a.jwt'),
  'verified member': bearer(MEMBER_TOKENS.a),
  'unverified member': bearer(MEMBER_TOKENS.unverified),
};

export const IDENTITIES = Object.keys(IDENTITY_HEADERS) as Identity[];

/**
 * Signatures of server internals that must never reach a client: stack frames,
 * source locations, dependency paths, raw exception class names and parser errors.
 */
const INTERNAL_DETAIL_PATTERNS: readonly RegExp[] = [
  // Indented frame after a raw or JSON-escaped newline: "\n    at handler (".
  /(?:\n|\\n)\s+at\s+(?:async\s+)?[\w$.<>[\]]+\s/,
  // Frame with a source location: "at handler (/app/route.ts:12:5)".
  /\bat\s+(?:async\s+)?[\w$.<>[\]]+\s+\([^()]*:\d+:\d+\)/,
  /\.(?:ts|tsx|js|mjs|cjs):\d+/,
  /node_modules/,
  /"stack"\s*:/,
  /\b(?:TypeError|ReferenceError|SyntaxError|RangeError|PersistenceError)\b/,
  /Unexpected (?:token|end of JSON)/,
];

/** Returns every internal-detail pattern found in a response body. */
export function internalDetailsIn(text: string): string[] {
  return INTERNAL_DETAIL_PATTERNS.filter((pattern) => pattern.test(text)).map(String);
}

export interface RawResponse {
  status: number;
  headers: Headers;
  text: string;
  json: unknown;
}

/** Reads a response once, keeping both the raw text and the parsed JSON (or undefined). */
export async function readRaw(response: Response): Promise<RawResponse> {
  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { status: response.status, headers: response.headers, text, json };
}

/** Asserts the hygiene contract every API response must meet, whatever the input. */
export function expectSafeApiResponse(response: RawResponse): void {
  expect(response.status, `unexpected HTTP 500: ${response.text.slice(0, 300)}`).not.toBe(500);
  expect(response.headers.get('content-type') ?? '').toContain('application/json');
  expect(response.json, 'body must be JSON').not.toBeUndefined();
  expect(internalDetailsIn(response.text), response.text.slice(0, 300)).toEqual([]);
  if (response.status >= 400) {
    expect(response.json).toMatchObject({ error: expect.any(String) });
  }
}

/** Asserts that no hostile payload has added properties to Object.prototype. */
export function expectNoPrototypePollution(): void {
  const probe: Record<string, unknown> = {};
  expect(Object.getOwnPropertyNames(Object.prototype)).not.toContain('polluted');
  expect(probe.polluted).toBeUndefined();
  expect(probe.isAdmin).toBeUndefined();
}

/** Serialized persistent state, for proving that a denied request changed nothing. */
export async function snapshotState(app: TestApp): Promise<string> {
  const [bookings, vouchers, inquiries, users] = await Promise.all([
    app.store.getBookings(),
    app.store.getVouchers(),
    app.store.getCorporateInquiries(),
    app.store.getAllUsers(),
  ]);
  return JSON.stringify({ bookings, vouchers, inquiries, users });
}

/** Persists a booking directly, for arranging ownership scenarios. */
export async function seedBooking(app: TestApp, overrides: Partial<Booking> = {}): Promise<Booking> {
  return app.store.createBooking({
    packageId: 'pkg-captain-60',
    packageTitle: "Captain's Command Flight",
    durationMinutes: 60,
    bookingDate: '2026-11-04',
    startTime: '12:00',
    endTime: '13:00',
    pilotName: 'Seeded Pilot',
    pilotEmail: 'seeded.pilot@guests.test',
    pilotPhone: '+972501112233',
    experienceLevel: 'beginner',
    addons: [],
    subtotalIls: 690,
    discountIls: 0,
    totalIls: 690,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    stripePaymentIntentId: 'pi_test_seeded_owner_only',
    notes: 'internal ops note',
    ...overrides,
  });
}

/**
 * fast-check settings. A fixed default seed keeps runs reproducible in CI;
 * FC_SEED=<n> replays a reported failure or explores a different input set.
 */
export const PROPERTY_SEED = Number.parseInt(process.env.FC_SEED ?? '', 10) || 20_261_101;

export function propertyOptions(numRuns: number): { seed: number; numRuns: number } {
  return { seed: PROPERTY_SEED, numRuns };
}

/** A live-mode-shaped Stripe key built at runtime so source scans never see a secret-shaped literal. */
export const FAKE_LIVE_STRIPE_KEY = ['sk', 'live', 'simdreamQaNotARealKey000'].join('_');
