import 'server-only';

import { z } from 'zod';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { computeRequiredMissionMinutes } from '@/lib/booking/client/slot-selection';
import { countSelectedMissionAddons, MAX_MISSION_ADDONS } from '@/lib/scheduler/mission-upgrade-promo';
import { isoDate } from '@/lib/validation';
import { getWixBackedKantorovichSlots, listWixBookableSlotsForDuration } from './availability-adapter';
import { listWixAvailability, listWixServices, wixResourceTypeIdsForService, type WixTimeSlot } from './bookings';
import { wixServiceIdFor } from './catalog';
import { isWixConfigured, WIX_TIME_ZONE } from './config';
import {
  wixAvailabilityAddOnIds,
  wixBookedAddOnsFor,
  wixNativeAddonIdsFor,
  type WixBookedAddOn,
} from './native-addons';

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
  /** The slot to book. With duration add-ons it already spans the whole mission, as Wix calculated it. */
  slotAvailability: WixTimeSlot;
  timeZone: string;
  location: WixBookingLocation;
  paymentOptions: {
    online: boolean;
    inPerson: boolean;
  };
  /** Sent as `bookedAddOns` on Create Booking, so Wix records the add-ons on the booking itself. */
  bookedAddOns: WixBookedAddOn[];
  /** Sent as `customerChoices.addOnIds` when Wix revalidates the slot (duration add-ons only). */
  availabilityAddOnIds: string[];
  /** SimDream add-on ids Wix books natively; the cart must not add their Stores product again. */
  nativeAddonIds: string[];
}

export interface ResolveWixBookingCheckoutOptions {
  /**
   * Book add-ons as native Wix Bookings add-ons (default). A subscription redemption opens Wix's
   * hosted checkout with the base slot only, so it keeps the preflight check and passes `false`.
   */
  nativeAddOns?: boolean;
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

function localDateTimeMs(localDateTime: string): number {
  const withSeconds = /T\d{2}:\d{2}$/.test(localDateTime) ? `${localDateTime}:00` : localDateTime;
  return Date.parse(`${withSeconds}Z`);
}

function slotMinutes(slot: WixTimeSlot): number {
  return Math.round((localDateTimeMs(slot.localEndDate) - localDateTimeMs(slot.localStartDate)) / 60_000);
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
export async function resolveWixBookingCheckout(
  input: WixBookingCheckoutInput,
  options: ResolveWixBookingCheckoutOptions = {}
): Promise<WixBookingCheckoutSlot> {
  if (!isWixConfigured()) throw new Error('Wix Bookings is not configured.');
  const useNativeAddOns = options.nativeAddOns !== false;

  const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === input.packageId);
  const durationMinutes = packageDuration(input.packageId);
  const addonIds = input.addonIds ?? [];
  if (countSelectedMissionAddons(addonIds, FLIGHT_ADDONS) > MAX_MISSION_ADDONS) {
    throw new WixBookingUnavailableError(`At most ${MAX_MISSION_ADDONS} mission upgrades may be selected.`);
  }
  const requiredMissionMinutes = computeRequiredMissionMinutes(durationMinutes, addonIds, FLIGHT_ADDONS, pkg?.category);
  const serviceId = wixServiceIdFor(input.packageId);
  if (!serviceId) throw new Error(`No Wix service maps to ${input.packageId}.`);
  const services = await listWixServices();
  const service = services.find((candidate) => candidate.id === serviceId);
  if (!service) throw new Error(`Wix service ${serviceId} could not be read.`);

  const location = wixLocationForCheckout(service);
  if (!location) throw new Error(`Wix service ${serviceId} has no supported bookable location.`);

  const bookedAddOns = useNativeAddOns ? wixBookedAddOnsFor(input.packageId, input.addonIds) : [];
  const availabilityAddOnIds = useNativeAddOns ? wixAvailabilityAddOnIds(input.packageId, input.addonIds) : [];
  const nativeAddonIds = useNativeAddOns ? wixNativeAddonIdsFor(input.packageId, input.addonIds) : [];
  const resourceTypeIds = wixResourceTypeIdsForService(service);
  const dayWindow = { serviceId, fromLocalDate: `${input.bookingDate}T00:00:00`, toLocalDate: `${input.bookingDate}T23:59:59` };

  // With native duration add-ons Wix itself lengthens the slot, so that one query replaces the
  // fixed-tier preflight probe, which is kept only for flows that book the base slot.
  const extendedTier =
    availabilityAddOnIds.length > 0 ? null : extendedWixDurationTier(requiredMissionMinutes, durationMinutes);
  const [availability, extendedSlots, nativeExtended] = await Promise.all([
    listWixAvailability({ ...dayWindow, includeResourceTypeIds: resourceTypeIds }),
    extendedTier ? listWixBookableSlotsForDuration(input.bookingDate, extendedTier) : Promise.resolve(null),
    availabilityAddOnIds.length > 0
      ? listWixAvailability({ ...dayWindow, includeResourceTypeIds: resourceTypeIds, addOnIds: availabilityAddOnIds })
      : Promise.resolve(null),
  ]);

  // The very list the calendar shows, so the checkout accepts exactly the departures a customer could pick.
  const offeredSlots = await getWixBackedKantorovichSlots(input.bookingDate, durationMinutes, availability.timeSlots);
  const canonicalSlot = offeredSlots.find((slot) => slot.startTime === input.startTime && slot.available);
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

  let slotAvailability = wixSlot;
  if (nativeExtended) {
    const extendedWixSlot = nativeExtended.timeSlots.find(
      (slot) => slot.bookable !== false && matchesLocalStart(slot, input.bookingDate, input.startTime)
    );
    if (!extendedWixSlot) {
      throw new WixBookingUnavailableError('The requested Wix booking slot cannot accommodate the selected add-on duration.');
    }
    // The registry and the Wix add-ons both own minutes. If they disagree, booking either figure would
    // mis-block the simulator, so refuse and let the mismatch surface instead of guessing.
    const wixMinutes = slotMinutes(extendedWixSlot);
    if (wixMinutes !== requiredMissionMinutes) {
      throw new Error(
        `Wix add-on duration mismatch for ${input.packageId}: Wix books ${wixMinutes} minutes, SimDream expects ${requiredMissionMinutes}.`
      );
    }
    slotAvailability = extendedWixSlot;
  }

  return {
    slotAvailability,
    bookedAddOns,
    availabilityAddOnIds,
    nativeAddonIds,
    timeZone: availability.timeZone || WIX_TIME_ZONE,
    location,
    paymentOptions: {
      online: Boolean(service.payment?.options?.online),
      inPerson: Boolean(service.payment?.options?.inPerson),
    },
  };
}
