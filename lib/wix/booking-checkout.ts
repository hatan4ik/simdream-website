import 'server-only';

import { z } from 'zod';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { closeDepartedSlots, generateKantorovichSlots } from '@/lib/scheduler/kantorovich-engine';
import { isoDate } from '@/lib/validation';
import { listWixAvailability, listWixServices, wixResourceTypeIdsForService, type WixTimeSlot } from './bookings';
import { wixServiceIdFor } from './catalog';
import { isWixConfigured, WIX_TIME_ZONE } from './config';

const startTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

function isMappedPackage(packageId: string): boolean {
  return SIMULATOR_PACKAGES.some((pkg) => pkg.id === packageId) && Boolean(wixServiceIdFor(packageId));
}

export const wixBookingCheckoutSchema = z.object({
  packageId: z.string().refine(isMappedPackage),
  bookingDate: isoDate,
  startTime: startTimeSchema,
});

export type WixBookingCheckoutInput = z.infer<typeof wixBookingCheckoutSchema>;

export interface WixBookingLocation {
  id: string;
  locationType: 'BUSINESS' | 'CUSTOMER' | 'CUSTOM';
}

export interface WixBookingCheckoutSlot {
  slotAvailability: WixTimeSlot;
  timeZone: string;
  location: WixBookingLocation;
  paymentOptions: {
    online: boolean;
    inPerson: boolean;
  };
}

export class WixBookingUnavailableError extends Error {}

function packageDuration(packageId: string): number {
  const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === packageId);
  if (!pkg) throw new Error(`No SimDream package maps to Wix booking package ${packageId}.`);
  return pkg.durationMinutes;
}

function matchesLocalStart(slot: WixTimeSlot, bookingDate: string, startTime: string): boolean {
  return slot.localStartDate === `${bookingDate}T${startTime}:00` || slot.localStartDate === `${bookingDate}T${startTime}`;
}

function wixLocationForCheckout(service: Awaited<ReturnType<typeof listWixServices>>[number]): WixBookingLocation | null {
  const location = service.locations?.find(
    (candidate) =>
      Boolean(candidate.id) &&
      (candidate.type === 'BUSINESS' || candidate.type === 'CUSTOMER' || candidate.type === 'CUSTOM')
  );
  if (!location?.id || !location.type) return null;
  return { id: location.id, locationType: location.type as WixBookingLocation['locationType'] };
}

/**
 * Resolves an exact native-Wix appointment slot only after both scheduling engines agree.
 * Booking and cart creation remain in the browser's own Wix visitor session so guests,
 * members, native coupons, and Wix order ownership all stay attached to one identity.
 */
export async function resolveWixBookingCheckout(input: WixBookingCheckoutInput): Promise<WixBookingCheckoutSlot> {
  if (!isWixConfigured()) throw new Error('Wix Bookings is not configured.');

  const durationMinutes = packageDuration(input.packageId);
  const serviceId = wixServiceIdFor(input.packageId);
  if (!serviceId) throw new Error(`No Wix service maps to ${input.packageId}.`);

  const services = await listWixServices();
  const service = services.find((candidate) => candidate.id === serviceId);
  if (!service) throw new Error(`Wix service ${serviceId} could not be read.`);

  const location = wixLocationForCheckout(service);
  if (!location) throw new Error(`Wix service ${serviceId} has no supported bookable location.`);

  const [availability, strictGrid] = await Promise.all([
    listWixAvailability({
      serviceId,
      fromLocalDate: `${input.bookingDate}T00:00:00`,
      toLocalDate: `${input.bookingDate}T23:59:59`,
      includeResourceTypeIds: wixResourceTypeIdsForService(service),
    }),
    Promise.resolve(closeDepartedSlots(generateKantorovichSlots(input.bookingDate, durationMinutes, []), new Date())),
  ]);

  const canonicalSlot = strictGrid.find((slot) => slot.startTime === input.startTime && slot.available);
  const wixSlot = availability.timeSlots.find(
    (slot) => slot.bookable !== false && matchesLocalStart(slot, input.bookingDate, input.startTime)
  );
  if (!canonicalSlot || !wixSlot) {
    throw new WixBookingUnavailableError('The requested Wix booking slot is no longer available.');
  }

  return {
    slotAvailability: wixSlot,
    timeZone: availability.timeZone || WIX_TIME_ZONE,
    location,
    paymentOptions: {
      online: Boolean(service.payment?.options?.online),
      inPerson: Boolean(service.payment?.options?.inPerson),
    },
  };
}
