import { WIX_SUBSCRIPTION_BOOKING_COPY } from '@/lib/i18n/wix-subscription-booking-copy';
import { getWixMemberClient } from '@/lib/wix/member-client';
import { wixSubscriptionBookingPackageForPlan } from '@/lib/wix/subscription-redemption';

export type WixSubscriptionBookingCopy = (typeof WIX_SUBSCRIPTION_BOOKING_COPY)['en'];

export interface WixSubscriptionCheckoutInput {
  packageId: string;
  bookingDate: string;
  startTime: string;
  copy: Pick<WixSubscriptionBookingCopy, 'noEligiblePlan' | 'unavailable' | 'checkoutFailed'>;
  /**
   * The shared Wix member sign-in launcher (`startWixMemberSignIn` from the auth context). It owns the
   * short-lived PKCE state that must survive the redirect, so this module never touches web storage.
   */
  signIn: (returnPath: string) => Promise<void>;
}

interface WixSlotCheckoutResponse {
  error?: string;
  timeZone?: string;
  slotAvailability?: { serviceId?: string; localStartDate?: string; localEndDate?: string; bookable?: boolean };
}

/**
 * Redeems an active Wix subscription for one included flight: signs the visitor in to the Wix member
 * account when needed (redirecting away), checks that an active plan covers this package, resolves
 * the live Wix slot and redirects to the Wix-hosted Bookings checkout. Throws an `Error` with a
 * displayable message on failure; on success the browser navigates away.
 */
export async function startWixSubscriptionCheckout(input: WixSubscriptionCheckoutInput): Promise<void> {
  const { copy } = input;
  const wixClient = getWixMemberClient();
  if (!wixClient.auth.loggedIn()) {
    await input.signIn(window.location.href);
    return;
  }

  const memberOrders = await wixClient.orders.memberListOrders({ limit: 50 });
  const hasCoveredSession = (memberOrders.orders ?? []).some(
    (order) =>
      order.status === 'ACTIVE' &&
      Boolean(order.planId && wixSubscriptionBookingPackageForPlan(order.planId) === input.packageId)
  );
  if (!hasCoveredSession) throw new Error(copy.noEligiblePlan);

  const slotResponse = await fetch('/api/wix/bookings/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packageId: input.packageId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
    }),
  });
  const checkout = (await slotResponse.json()) as WixSlotCheckoutResponse;
  if (!slotResponse.ok) {
    throw new Error(slotResponse.status === 409 ? copy.unavailable : copy.checkoutFailed);
  }
  const slotAvailability = checkout.slotAvailability;
  if (!slotAvailability?.serviceId || !slotAvailability.localStartDate || !slotAvailability.localEndDate) {
    throw new Error(copy.checkoutFailed);
  }

  const redirectSession = await wixClient.redirects.createRedirectSession({
    bookingsCheckout: {
      slotAvailability,
      timezone: checkout.timeZone || 'Asia/Jerusalem',
    },
    callbacks: {
      postFlowUrl: `${window.location.origin}/subscriptions#flight-deck`,
    },
  });
  const checkoutUrl = redirectSession.redirectSession?.fullUrl;
  if (!checkoutUrl) throw new Error(copy.checkoutFailed);
  window.location.assign(checkoutUrl);
}
