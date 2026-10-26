/**
 * Thin, suite-local conveniences over tests/support: they call route handlers
 * in-process exactly as Next.js would, and never reach into handler internals.
 */
import type { VerifiedMemberIdentity } from '@/lib/auth/member-ownership';
import { bookingCheckoutBody, type TestApp } from '../support/app';
import { adminHeaders, apiRequest, readJson, type ApiRequestInit } from '../support/http';
import { signedWebhookRequest } from '../support/stripe';
import { expectContract, slotList, type FlightSlotContract } from './contracts';

/** Paid seed voucher with a partial balance (initial 500 ILS). */
export const SEED_VOUCHER = { code: 'SD-VOUCH-DF7QK3MN8R2V6X9LPA', balanceIls: 400 } as const;
/** Paid seed voucher with its full balance. */
export const SEED_FULL_VOUCHER = { code: 'SD-VOUCH-H5TZR8K2V9M3Q7LNXB', balanceIls: 890 } as const;

/**
 * Dates beyond the seed horizon (the seed fills 35 days after DEFAULT_TEST_NOW),
 * so the only bookings on them are the ones a test creates.
 */
export const EMPTY_DAY = {
  friday: '2026-12-11',
  saturday: '2026-12-12',
  sunday: '2026-12-13',
} as const;

export const PRIVATE_NO_STORE = 'private, no-store';

export const MEMBERS = {
  'token-ada': { id: 'member-ada', email: 'ada@pilots.test', emailVerified: true, fullName: 'Ada Lovelace' },
  'token-grace': { id: 'member-grace', email: 'grace@pilots.test', emailVerified: true, fullName: 'Grace Hopper' },
  'token-unverified': { id: 'member-unverified', email: 'unverified@pilots.test', emailVerified: false },
} satisfies Record<string, VerifiedMemberIdentity>;
export type MemberToken = keyof typeof MEMBERS;

export function adminRequest(path: string, init: ApiRequestInit = {}): Request {
  return apiRequest(path, { ...init, headers: adminHeaders(init.headers) });
}

export async function postCheckout<T = Record<string, unknown>>(
  app: TestApp,
  body: unknown,
  headers: Record<string, string> = {}
) {
  const { POST } = await app.routes.checkout();
  return readJson<T>(await POST(apiRequest('/api/checkout', { body, headers })));
}

export async function deliverWebhook<T = Record<string, unknown>>(app: TestApp, event: object) {
  const { POST } = await app.routes.stripeWebhook();
  return readJson<T>(await POST(signedWebhookRequest(event)));
}

/** Slots exactly as the public API returns them, validated against the contract. */
export async function getSlots(app: TestApp, date: string, duration: number): Promise<FlightSlotContract[]> {
  const { GET } = await app.routes.slots();
  const response = await readJson(await GET(apiRequest(`/api/slots?date=${date}&duration=${duration}`)));
  if (response.status !== 200) throw new Error(`GET /api/slots returned ${response.status}`);
  return expectContract(slotList, response.body);
}

/** First slot matching a predicate; throws instead of letting a test pass vacuously. */
export async function findSlotWhere(
  app: TestApp,
  date: string,
  duration: number,
  predicate: (slot: FlightSlotContract) => boolean,
  description: string
): Promise<FlightSlotContract> {
  const slot = (await getSlots(app, date, duration)).find(predicate);
  if (!slot) throw new Error(`No ${duration}m slot on ${date} that is ${description}`);
  return slot;
}

export async function isSlotOpen(app: TestApp, date: string, duration: number, startTime: string): Promise<boolean> {
  const slots = await getSlots(app, date, duration);
  return slots.some((slot) => slot.startTime === startTime && slot.available);
}

export function addonPrice(app: TestApp, ids: readonly string[]): number {
  return ids.reduce((total, id) => {
    const addon = app.seed.FLIGHT_ADDONS.find((candidate) => candidate.id === id);
    if (!addon) throw new Error(`Unknown add-on ${id}`);
    return total + addon.priceIls;
  }, 0);
}

export function addonMinutes(app: TestApp, ids: readonly string[]): number {
  return ids.reduce((total, id) => total + (app.seed.FLIGHT_ADDONS.find((addon) => addon.id === id)?.durationMinutes ?? 0), 0);
}

export function packageDuration(app: TestApp, packageId: string): number {
  const pkg = app.seed.SIMULATOR_PACKAGES.find((candidate) => candidate.id === packageId);
  if (!pkg) throw new Error(`Unknown package ${packageId}`);
  return pkg.durationMinutes;
}

/**
 * Books the first open slot with the paid seed voucher (no Stripe needed) and
 * returns the stored booking. The package must cost no more than the voucher balance.
 */
export async function createVoucherFundedBooking(
  app: TestApp,
  { date, voucherCode = SEED_VOUCHER.code, headers, ...overrides }: { date: string; voucherCode?: string; headers?: Record<string, string> } & Record<string, unknown>
) {
  const packageId = typeof overrides.packageId === 'string' ? overrides.packageId : 'pkg-discovery-30';
  const slot = await findSlotWhere(app, date, packageDuration(app, packageId), (candidate) => candidate.available, 'open');
  const response = await postCheckout<{ bookingReference: string }>(
    app,
    bookingCheckoutBody({ bookingDate: date, startTime: slot.startTime, voucherCode, ...overrides }),
    headers
  );
  if (response.status !== 201) throw new Error(`Voucher checkout returned ${response.status}: ${JSON.stringify(response.body)}`);
  const booking = await app.store.getBookingByRef(response.body.bookingReference);
  if (!booking) throw new Error('Voucher-funded booking was not stored');
  return booking;
}

/** Starts a card checkout on the first open slot (requires `stripe: 'mocked'`) and returns the pending booking. */
export async function createPendingCardBooking(
  app: TestApp,
  { date, headers, ...overrides }: { date: string; headers?: Record<string, string> } & Record<string, unknown>
) {
  const packageId = typeof overrides.packageId === 'string' ? overrides.packageId : 'pkg-discovery-30';
  const slot = await findSlotWhere(app, date, packageDuration(app, packageId), (candidate) => candidate.available, 'open');
  const before = app.checkoutSessions.length;
  const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: date, startTime: slot.startTime, ...overrides }), headers);
  if (response.status !== 201 || app.checkoutSessions.length !== before + 1) {
    throw new Error(`Card checkout returned ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const session = app.checkoutSessions[before];
  const booking = session.bookingId ? await app.store.getBookingById(session.bookingId) : undefined;
  if (!booking) throw new Error('Card checkout did not store a pending booking');
  return { booking, session, slot };
}

/** Collects every key name in a JSON value, at any depth. */
export function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.add(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}
