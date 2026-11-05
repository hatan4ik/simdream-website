import 'server-only';

import { z } from 'zod';
import {
  resolveWixBookingCheckout,
  WixBookingUnavailableError,
  wixBookingCheckoutSchema,
  type WixBookingCheckoutSlot,
} from './booking-checkout';
import { isWixSubscriptionBookingPackageId, type WixSubscriptionBookingPackageId } from './subscription-redemption';

export const wixSubscriptionBookingCheckoutSchema = wixBookingCheckoutSchema.extend({
  packageId: z.string().refine(isWixSubscriptionBookingPackageId),
});

export type WixSubscriptionBookingCheckoutInput = z.infer<typeof wixSubscriptionBookingCheckoutSchema>;

export class WixSubscriptionBookingUnavailableError extends WixBookingUnavailableError {}

/**
 * Resolves one live Wix appointment slot for a paid Wix subscription. The
 * browser uses this exact object only to open Wix's hosted Bookings checkout;
 * it never creates a booking in this API route. Wix therefore validates the
 * member's active plan and consumes the session credit atomically at checkout.
 */
export async function resolveWixSubscriptionBookingCheckout(input: WixSubscriptionBookingCheckoutInput): Promise<{
  slotAvailability: WixBookingCheckoutSlot['slotAvailability'];
  timeZone: string;
}> {
  try {
    const checkout = await resolveWixBookingCheckout(input);
    return { slotAvailability: checkout.slotAvailability, timeZone: checkout.timeZone };
  } catch (error) {
    if (error instanceof WixBookingUnavailableError) {
      throw new WixSubscriptionBookingUnavailableError(error.message);
    }
    throw error;
  }
}
