import 'server-only';

import type { Booking } from '@/types';
import { normalizeMemberEmail } from '@/lib/auth/member-ownership';
import { CheckoutError } from './checkout-error';
import type { CardCheckoutSession, CheckoutDependencies } from './checkout-ports';

/** One pilot email may hold at most this many unpaid card bookings at a time. */
const MAX_UNPAID_HOLDS_PER_EMAIL = 2;

const UNPAID_HOLD_CAP_MESSAGE =
  'You already have unpaid reservations in progress. Complete or cancel one first.';

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

/** The hold's hosted checkout while it can still be paid; null when it is missing or has expired. */
function openHostedCheckout(hold: Booking, now: Date): CardCheckoutSession | null {
  const { stripeCheckoutSessionId: sessionId, stripeCheckoutUrl: url, stripeCheckoutExpiresAt: expiresAt } = hold;
  if (!sessionId || !url || !expiresAt) return null;
  return Date.parse(expiresAt) > now.getTime() ? { sessionId, url, expiresAt } : null;
}

/**
 * The unpaid-hold rules, applied before a card checkout reserves a departure:
 *
 * 1. The pilot already holds this exact departure (same package, date and start, same email):
 *    with the same add-ons and the same payable total, and its hosted checkout still open, that
 *    checkout is resumed (returned). Otherwise the hold is released, its hosted checkout expired
 *    first so it can no longer be paid, and the caller continues with a new checkout (null).
 *    A retry of a held departure is never refused by the cap below.
 * 2. Any other departure is a new hold: refused with a 429 once the email already holds
 *    MAX_UNPAID_HOLDS_PER_EMAIL unpaid bookings.
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
  const open = openHostedCheckout(held, candidate.now);
  if (open && sameAddonSet(held.addons, candidate.addonIds) && sameAmount(held.totalIls, payableIls)) {
    return open;
  }

  // Expire before cancelling, so the released hold's checkout cannot take a payment afterwards.
  // Should the cancel then fail, Stripe's checkout.session.expired webhook releases the hold.
  if (held.stripeCheckoutSessionId) {
    await dependencies.cardCheckout.expireHostedCheckout(held.stripeCheckoutSessionId);
  }
  await dependencies.repository.cancelPendingBooking(held.id);
  return null;
}
