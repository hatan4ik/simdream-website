import 'server-only';

import { normalizeMemberEmail } from '@/lib/auth/member-ownership';
import { store } from '@/lib/db/store';
import { israelDateOf } from './israel-time';
import type { RefundProductKind } from './refund-types';

/**
 * Checks, against the local order store, that a booking reference or voucher code belongs to the
 * email the customer typed. BOTH must match; anything else answers the same "not verified".
 * The answer carries only what the form needs to explain the rules (the package title, the
 * session date and time, the order date), never an amount, a name, a payment detail or any other
 * order. Anonymous lookups must never expose purchase history (AGENTS.md section 6.5).
 *
 * Orders that live only in Wix (bookings and flight tracks sold through Wix) are not in this
 * store, so they come back unverified and the request goes to staff to check by hand.
 */
export type RefundOrderCheck =
  | {
      verified: true;
      productKind: RefundProductKind;
      /** Id of the matched booking or voucher, kept on the request for staff; never sent to the browser. */
      orderId: string;
      packageTitle: string | null;
      sessionDate: string | null;
      sessionTime: string | null;
      /** Israel calendar date of the order. */
      orderDate: string;
    }
  | { verified: false };

const NOT_VERIFIED: RefundOrderCheck = { verified: false };

function orderDateOf(createdAt: string): string | null {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? null : israelDateOf(date);
}

async function checkBooking(reference: string, email: string): Promise<RefundOrderCheck> {
  const booking = await store.getBookingByRef(reference);
  if (!booking || booking.paymentStatus !== 'paid') return NOT_VERIFIED;
  if (normalizeMemberEmail(booking.pilotEmail) !== email) return NOT_VERIFIED;
  const orderDate = orderDateOf(booking.createdAt);
  if (!orderDate) return NOT_VERIFIED;
  return {
    verified: true,
    productKind: 'flight',
    orderId: booking.id,
    packageTitle: booking.packageTitle,
    sessionDate: booking.bookingDate,
    sessionTime: booking.startTime,
    orderDate,
  };
}

async function checkVoucher(code: string, email: string): Promise<RefundOrderCheck> {
  const voucher = await store.getVoucherByCode(code);
  if (!voucher || voucher.paymentStatus !== 'paid') return NOT_VERIFIED;
  // The buyer asks for the refund; the recipient's address is not the purchaser's identity.
  if (normalizeMemberEmail(voucher.senderEmail) !== email) return NOT_VERIFIED;
  const orderDate = orderDateOf(voucher.createdAt);
  if (!orderDate) return NOT_VERIFIED;
  return {
    verified: true,
    productKind: 'voucher',
    orderId: voucher.id,
    packageTitle: voucher.packageTitle ?? null,
    sessionDate: null,
    sessionTime: null,
    orderDate,
  };
}

export async function lookupRefundOrder(input: {
  productKind: RefundProductKind;
  orderReference: string;
  email: string;
}): Promise<RefundOrderCheck> {
  const reference = input.orderReference.trim().toUpperCase();
  const email = normalizeMemberEmail(input.email);
  try {
    // The reference format names the store; the product the customer picked decides otherwise.
    if (reference.startsWith('SD-VOUCH-')) return await checkVoucher(reference, email);
    if (reference.startsWith('SD-737-')) return await checkBooking(reference, email);
    if (input.productKind === 'flight') return await checkBooking(reference, email);
    if (input.productKind === 'voucher') return await checkVoucher(reference, email);
    return NOT_VERIFIED;
  } catch (error) {
    // Storage is down or not configured (a Wix worker without Supabase): the request still goes to staff.
    console.error('Refund order lookup unavailable', error instanceof Error ? error.name : 'unknown');
    return NOT_VERIFIED;
  }
}
