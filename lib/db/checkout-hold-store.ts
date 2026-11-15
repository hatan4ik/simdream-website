import 'server-only';

import { isProduction } from '@/lib/config/server-env';
import type { Booking } from '@/types';
import { PersistenceError, store } from './store';
import { getSupabaseAdmin, requireSupabaseAdmin } from './supabase-admin';

/**
 * Unpaid card holds: pending bookings whose payment has not completed, with the hosted checkout
 * stored on them (migration 013) so a pilot who returns from Stripe can resume it. The same storage
 * rules as the order store (AGENTS.md section 6): Supabase in production, the process memory in
 * development and tests, and production without Supabase fails closed unless
 * ALLOW_IN_MEMORY_STORE=true opts a demo or test server in.
 */

export interface StoredHostedCheckout {
  sessionId: string;
  url: string;
  /** ISO time after which the session can no longer be paid. */
  expiresAt: string;
}

function isUnpaidHold(booking: Booking): boolean {
  return booking.status === 'pending' && booking.paymentStatus === 'pending';
}

/** True when bookings live in Supabase; throws when production has no storage (mirrors the order store). */
function persistent(): boolean {
  if (!isProduction) return false;
  if (getSupabaseAdmin()) return true;
  if (process.env.ALLOW_IN_MEMORY_STORE === 'true') return false;
  throw new PersistenceError('Persistent storage is not configured.');
}

/** The unpaid holds of one pilot email; the store compares the email normalized. */
export async function listUnpaidPendingBookings(pilotEmail: string): Promise<Booking[]> {
  return (await store.getBookingsByEmail(pilotEmail)).filter(isUnpaidHold);
}

/** Stores the hosted checkout on a booking that is still an unpaid hold; any other booking is left untouched. */
export async function attachHostedCheckout(bookingId: string, checkout: StoredHostedCheckout): Promise<void> {
  if (!persistent()) {
    // In memory the store hands out its own records, so the change is made on the record itself.
    const booking = await store.getBookingById(bookingId);
    if (!booking || !isUnpaidHold(booking)) return;
    booking.stripeCheckoutSessionId = checkout.sessionId;
    booking.stripeCheckoutUrl = checkout.url;
    booking.stripeCheckoutExpiresAt = checkout.expiresAt;
    return;
  }
  const { error } = await requireSupabaseAdmin()
    .from('bookings')
    .update({
      stripe_checkout_session_id: checkout.sessionId,
      stripe_checkout_url: checkout.url,
      stripe_checkout_expires_at: checkout.expiresAt,
    })
    .eq('id', bookingId)
    .eq('status', 'pending')
    .eq('payment_status', 'pending');
  if (error) {
    console.error('Hosted checkout could not be stored', error.code);
    throw new PersistenceError('Persistent storage operation failed.');
  }
}
