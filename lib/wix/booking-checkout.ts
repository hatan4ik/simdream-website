import 'server-only';

import { z } from 'zod';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { closeDepartedSlots } from '@/lib/scheduler/kantorovich-engine';
import { computeRequiredMissionMinutes } from '@/lib/booking/client/slot-selection';
import { isoDate } from '@/lib/validation';
import { intersectKantorovichSlotsWithWix, listWixBookableSlotsForDuration } from './availability-adapter';
import { listWixAvailability, listWixServices, wixResourceTypeIdsForService, type WixTimeSlot } from './bookings';
import { isOnStrictWixGrid, strictWixGridSlots } from './booking-grid-policy';
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
  addonIds: z.array(z.string()).max(20).optional(),
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

const WIX_AVAILABILITY_TIERS = [30, 45, 60, 90, 120] as const;

function extendedWixDurationTier(requiredMinutes: number, baseDurationMinutes: number): number | null {
  if (requiredMinutes <= baseDurationMinutes) return null;
  return WIX_AVAILABILITY_TIERS.find((tier) => tier >= requiredMinutes) ?? 120;
}

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
  const requiredMissionMinutes = computeRequiredMissionMinutes(durationMinutes, input.addonIds ?? [], FLIGHT_ADDONS);
  const serviceId = wixServiceIdFor(input.packageId);
  if (!serviceId) throw new Error(`No Wix service maps to ${input.packageId}.`);
  // The same grid rule the Wix pricing provider applies when Wix prices the booking.
  if (!isOnStrictWixGrid(input.packageId, input.bookingDate, input.startTime)) {
    throw new WixBookingUnavailableError('The requested Wix booking slot is no longer available.');
  }

  const services = await listWixServices();
  const service = services.find((candidate) => candidate.id === serviceId);
  if (!service) throw new Error(`Wix service ${serviceId} could not be read.`);

  const location = wixLocationForCheckout(service);
  if (!location) throw new Error(`Wix service ${serviceId} has no supported bookable location.`);

  const extendedTier = extendedWixDurationTier(requiredMissionMinutes, durationMinutes);
  const [availability, strictGrid, extendedSlots] = await Promise.all([
    listWixAvailability({
      serviceId,
      fromLocalDate: `${input.bookingDate}T00:00:00`,
      toLocalDate: `${input.bookingDate}T23:59:59`,
      includeResourceTypeIds: wixResourceTypeIdsForService(service),
    }),
    Promise.resolve(closeDepartedSlots(strictWixGridSlots(input.packageId, input.bookingDate), new Date())),
    extendedTier ? listWixBookableSlotsForDuration(input.bookingDate, extendedTier) : Promise.resolve(null),
  ]);

  const intersectedGrid = intersectKantorovichSlotsWithWix(strictGrid, availability.timeSlots);
  const canonicalSlot = intersectedGrid.find((slot) => slot.startTime === input.startTime && slot.available);
  const wixSlot = availability.timeSlots.find(
    (slot) => slot.bookable !== false && matchesLocalStart(slot, input.bookingDate, input.startTime)
  );
  if (!canonicalSlot || !wixSlot) {
    throw new WixBookingUnavailableError('The requested Wix booking slot is no longer available.');
  }

  if ((canonicalSlot.maxAvailableMinutes ?? durationMinutes) < requiredMissionMinutes) {
    throw new WixBookingUnavailableError('The requested Wix booking slot cannot accommodate the selected add-on duration.');
  }

  if (extendedSlots) {
    const fitsExtendedWixSlot = extendedSlots.some(
      (slot) => slot.bookable !== false && matchesLocalStart(slot, input.bookingDate, input.startTime)
    );
    if (!fitsExtendedWixSlot) {
      throw new WixBookingUnavailableError('The requested Wix booking slot cannot accommodate the selected add-on duration.');
    }
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
