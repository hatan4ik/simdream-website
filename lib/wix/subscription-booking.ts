import 'server-only';

import { z } from 'zod';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { closeDepartedSlots, generateKantorovichSlots } from '@/lib/scheduler/kantorovich-engine';
import { isoDate } from '@/lib/validation';
import { listWixAvailability, type WixTimeSlot } from './bookings';
import { wixServiceIdFor } from './catalog';
import { isWixConfigured, WIX_TIME_ZONE } from './config';
import { isWixSubscriptionBookingPackageId, type WixSubscriptionBookingPackageId } from './subscription-redemption';

const startTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const wixSubscriptionBookingCheckoutSchema = z.object({
  packageId: z.string().refine(isWixSubscriptionBookingPackageId),
  bookingDate: isoDate,
  startTime: startTimeSchema,
});

export type WixSubscriptionBookingCheckoutInput = z.infer<typeof wixSubscriptionBookingCheckoutSchema>;

export class WixSubscriptionBookingUnavailableError extends Error {}

function packageDuration(packageId: WixSubscriptionBookingPackageId): number {
  const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === packageId);
  if (!pkg) throw new Error(`No SimDream package maps to subscription booking package ${packageId}.`);
  return pkg.durationMinutes;
}

function matchesLocalStart(slot: WixTimeSlot, bookingDate: string, startTime: string): boolean {
  return slot.localStartDate === `${bookingDate}T${startTime}:00` || slot.localStartDate === `${bookingDate}T${startTime}`;
}

/**
 * Resolves one live Wix appointment slot for a paid Wix subscription. The
 * browser uses this exact object only to open Wix's hosted Bookings checkout;
 * it never creates a booking in this API route. Wix therefore validates the
 * member's active plan and consumes the session credit atomically at checkout.
 */
export async function resolveWixSubscriptionBookingCheckout(input: WixSubscriptionBookingCheckoutInput): Promise<{
  slotAvailability: WixTimeSlot;
  timeZone: string;
}> {
  if (!isWixConfigured()) throw new Error('Wix Bookings is not configured.');

  const durationMinutes = packageDuration(input.packageId);
  const serviceId = wixServiceIdFor(input.packageId);
  if (!serviceId) throw new Error(`No Wix service maps to ${input.packageId}.`);

  const [availability, strictGrid] = await Promise.all([
    listWixAvailability({
      serviceId,
      fromLocalDate: `${input.bookingDate}T00:00:00`,
      toLocalDate: `${input.bookingDate}T23:59:59`,
    }),
    Promise.resolve(closeDepartedSlots(generateKantorovichSlots(input.bookingDate, durationMinutes, []), new Date())),
  ]);

  const canonicalSlot = strictGrid.find((slot) => slot.startTime === input.startTime && slot.available);
  const wixSlot = availability.timeSlots.find(
    (slot) => slot.bookable !== false && matchesLocalStart(slot, input.bookingDate, input.startTime)
  );
  if (!canonicalSlot || !wixSlot) {
    throw new WixSubscriptionBookingUnavailableError('The requested subscription slot is no longer available.');
  }

  return { slotAvailability: wixSlot, timeZone: availability.timeZone || WIX_TIME_ZONE };
}
