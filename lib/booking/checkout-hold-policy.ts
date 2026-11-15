import 'server-only';

import { normalizeMemberEmail } from '@/lib/auth/member-ownership';
import { CheckoutError } from './checkout-error';
import type { CardCheckoutSession, CheckoutDependencies } from './checkout-ports';

/** One pilot email may hold at most this many unpaid card bookings at a time. */
const MAX_UNPAID_HOLDS_PER_EMAIL = 2;

const UNPAID_HOLD_CAP_MESSAGE =
  'You already have unpaid reservations in progress. Complete or cancel one first.';
const HOLD_IN_PROGRESS_MESSAGE =
  'You already have an unpaid reservation for this departure. Complete that payment, or wait until it expires to change it.';
const ALREADY_PAID_MESSAGE = 'This departure is already paid. Your confirmation is on its way.';

/** A card checkout about to create a pending booking, as the server resolved it. */
export interface HoldCandidate {
  pilotEmail: string;
  packageId: string;
  bookingDate: string;
  startTime: string;
  addonIds: readonly string[];
  /**
   * What this checkout would charge. Computed only when the pilot already holds this departure, and
   * before anything is released, so a request the pricing refuses (400) never costs the pilot their hold.
   */
  payableIls: () => number;
  now: Date;
}

function sameAddonSet(held: readonly string[], requested: readonly string[]): boolean {
  const heldSet = new Set(held);
  const requestedSet = new Set(requested);
  return heldSet.size === requestedSet.size && [...requestedSet].every((id) => heldSet.has(id));
}

/** Whole agorot, so a total read back from a NUMERIC column compares equal to the one computed now. */
function sameAmount(left: number, right: number): boolean {
  return Math.round(left * 100) === Math.round(right * 100);
}

/**
 * The unpaid-hold rules, applied before a card checkout reserves a departure. The pilot email is not
 * verified, so a retry may resume a hold but never release a live one or expire its open payment page.
 *
 * When the same normalized email already holds this exact departure (same package, date and start):
 * 1. its stored hosted checkout is still open and the add-on set and payable total are the same:
 *    that checkout is resumed (returned);
 * 2. its stored checkout has passed its expiry time: the provider is asked to expire it.
 *    - `complete` (paid, webhook not yet processed): nothing is released, 409 "already paid";
 *    - `expired`: the hold is dead, so it is cancelled and the caller continues with a new
 *      checkout (null), whatever the add-ons. This is the only way a retry releases a hold;
 *    - a provider failure propagates (503) and releases nothing;
 * 3. anything else (a differing retry while the checkout is open, or no stored checkout to verify):
 *    nothing is released or expired, 409 "unpaid reservation in progress".
 *
 * Any other departure is a new hold: refused with a 429 once the email already holds
 * MAX_UNPAID_HOLDS_PER_EMAIL unpaid bookings. A retry of a held departure never reaches that cap.
 */
export async function resolveUnpaidHold(
  dependencies: Pick<CheckoutDependencies, 'repository' | 'cardCheckout'>,
  candidate: HoldCandidate
): Promise<CardCheckoutSession | null> {
  const holds = await dependencies.repository.listUnpaidPendingBookings(normalizeMemberEmail(candidate.pilotEmail));
  const held = holds.find(
    (hold) =>
      hold.packageId === candidate.packageId &&
      hold.bookingDate === candidate.bookingDate &&
      hold.startTime === candidate.startTime
  );

  if (!held) {
    if (holds.length >= MAX_UNPAID_HOLDS_PER_EMAIL) throw new CheckoutError(UNPAID_HOLD_CAP_MESSAGE, 429);
    return null;
  }

  const payableIls = candidate.payableIls();
  const { stripeCheckoutSessionId: sessionId, stripeCheckoutUrl: url, stripeCheckoutExpiresAt: expiresAt } = held;
  // Without a stored session and expiry nothing can be verified, so the hold stays until Stripe's own expiry releases it.
  if (!sessionId || !expiresAt) throw new CheckoutError(HOLD_IN_PROGRESS_MESSAGE, 409);

  if (Date.parse(expiresAt) > candidate.now.getTime()) {
    if (url && sameAddonSet(held.addons, candidate.addonIds) && sameAmount(held.totalIls, payableIls)) {
      return { sessionId, url, expiresAt };
    }
    throw new CheckoutError(HOLD_IN_PROGRESS_MESSAGE, 409);
  }

  // Past its expiry time: only the provider's word that the checkout can no longer be paid frees the hold.
  if ((await dependencies.cardCheckout.expireHostedCheckout(sessionId)) === 'complete') {
    throw new CheckoutError(ALREADY_PAID_MESSAGE, 409);
  }
  await dependencies.repository.cancelPendingBooking(held.id);
  return null;
}
