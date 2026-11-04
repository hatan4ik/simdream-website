import 'server-only';

import { after } from 'next/server';
import type { CheckoutShadowCandidate, CheckoutShadowObserver } from '@/lib/booking/checkout-ports';
import { listWixAvailability, listWixServices, reconcileCatalog, type CatalogMismatch, type WixService, type WixTimeSlot } from './bookings';
import { wixServiceIdFor } from './catalog';
import { isWixShadowReadsEnabled } from './config';

/**
 * Read-only Wix surface used by the shadow observer. It intentionally exposes
 * no booking writer, checkout redirect, payment or member mutation method.
 */
export interface WixShadowReadClient {
  listServices(): Promise<WixService[]>;
  listAvailability(window: {
    serviceId: string;
    fromLocalDate: string;
    toLocalDate: string;
  }): Promise<{ timeSlots: WixTimeSlot[]; timeZone: string }>;
}

export type WixCheckoutShadowIssue = 'unmapped-package' | 'catalog-drift' | 'availability-mismatch';

/** Safe structured event: deliberately excludes all customer and payment data. */
export interface WixCheckoutShadowReport {
  event: 'wix_checkout_shadow';
  correlationId: string;
  packageId: string;
  bookingDate: string;
  startTime: string;
  durationMinutes: number;
  serviceId: string | null;
  localSchedulerAccepted: true;
  wixSlotAvailable: boolean | null;
  wixTimeZone: string | null;
  catalogMismatchFields: CatalogMismatch['field'][];
  issues: WixCheckoutShadowIssue[];
}

export interface WixCheckoutShadowFailure {
  event: 'wix_checkout_shadow_failed';
  correlationId: string;
  packageId: string;
  bookingDate: string;
  startTime: string;
  reason: 'read-failed';
}

export type WixCheckoutShadowEvent = WixCheckoutShadowReport | WixCheckoutShadowFailure;

export interface WixCheckoutShadowOptions {
  enabled?: boolean;
  reads?: WixShadowReadClient;
  emit?: (event: WixCheckoutShadowEvent) => void;
  createCorrelationId?: () => string;
}

const productionReads: WixShadowReadClient = {
  listServices: listWixServices,
  listAvailability: listWixAvailability,
};

function nextYmd(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function isSelectedWixSlot(slot: WixTimeSlot, candidate: CheckoutShadowCandidate, serviceId: string): boolean {
  return (
    (slot.serviceId === undefined || slot.serviceId === serviceId) &&
    slot.bookable !== false &&
    slot.localStartDate.slice(0, 16) === `${candidate.bookingDate}T${candidate.startTime}`
  );
}

/**
 * Reads Wix's public Bookings catalog and appointment availability for a local
 * departure that was already accepted by the current scheduler. The returned
 * DTO lets operations compare systems without transmitting customer details or
 * performing any Wix write.
 */
export async function runWixCheckoutShadow(
  candidate: CheckoutShadowCandidate,
  correlationId: string,
  reads: WixShadowReadClient = productionReads
): Promise<WixCheckoutShadowReport> {
  const serviceId = wixServiceIdFor(candidate.packageId);
  if (!serviceId) {
    return {
      event: 'wix_checkout_shadow',
      correlationId,
      packageId: candidate.packageId,
      bookingDate: candidate.bookingDate,
      startTime: candidate.startTime,
      durationMinutes: candidate.durationMinutes,
      serviceId: null,
      localSchedulerAccepted: true,
      wixSlotAvailable: null,
      wixTimeZone: null,
      catalogMismatchFields: [],
      issues: ['unmapped-package'],
    };
  }

  const services = await reads.listServices();
  const catalogMismatchFields = reconcileCatalog(services)
    .filter((mismatch) => mismatch.packageId === candidate.packageId)
    .map((mismatch) => mismatch.field);
  const mappedServiceExists = services.some((service) => service.id === serviceId);

  if (!mappedServiceExists) {
    return {
      event: 'wix_checkout_shadow',
      correlationId,
      packageId: candidate.packageId,
      bookingDate: candidate.bookingDate,
      startTime: candidate.startTime,
      durationMinutes: candidate.durationMinutes,
      serviceId,
      localSchedulerAccepted: true,
      wixSlotAvailable: false,
      wixTimeZone: null,
      catalogMismatchFields,
      issues: ['catalog-drift'],
    };
  }

  const availability = await reads.listAvailability({
    serviceId,
    fromLocalDate: `${candidate.bookingDate}T00:00:00`,
    toLocalDate: `${nextYmd(candidate.bookingDate)}T00:00:00`,
  });
  const wixSlotAvailable = availability.timeSlots.some((slot) => isSelectedWixSlot(slot, candidate, serviceId));
  const issues: WixCheckoutShadowIssue[] = [];
  if (catalogMismatchFields.length > 0) issues.push('catalog-drift');
  if (!wixSlotAvailable) issues.push('availability-mismatch');

  return {
    event: 'wix_checkout_shadow',
    correlationId,
    packageId: candidate.packageId,
    bookingDate: candidate.bookingDate,
    startTime: candidate.startTime,
    durationMinutes: candidate.durationMinutes,
    serviceId,
    localSchedulerAccepted: true,
    wixSlotAvailable,
    wixTimeZone: availability.timeZone,
    catalogMismatchFields,
    issues,
  };
}

/**
 * Builds the optional checkout observer. The strict opt-in flag prevents all
 * network activity unless operations explicitly enable shadow reads.
 */
export function createWixCheckoutShadowObserver(
  options: WixCheckoutShadowOptions = {}
): CheckoutShadowObserver | null {
  const enabled = options.enabled ?? isWixShadowReadsEnabled();
  if (!enabled) return null;

  const reads = options.reads ?? productionReads;
  const emit = options.emit ?? ((event: WixCheckoutShadowEvent) => console.info(JSON.stringify(event)));
  const createCorrelationId = options.createCorrelationId ?? crypto.randomUUID;

  return {
    async observeBookingCandidate(candidate) {
      const correlationId = createCorrelationId();
      try {
        emit(await runWixCheckoutShadow(candidate, correlationId, reads));
      } catch {
        // The shadow system can never delay, fail or reveal information about a
        // customer's current checkout. Emit only a redacted diagnostic event.
        emit({
          event: 'wix_checkout_shadow_failed',
          correlationId,
          packageId: candidate.packageId,
          bookingDate: candidate.bookingDate,
          startTime: candidate.startTime,
          reason: 'read-failed',
        });
      }
    },
  };
}

/**
 * Schedule an enabled observer after the HTTP response. Next.js preserves the
 * callback lifetime while keeping the current Supabase/Stripe checkout path
 * independent of Wix health and latency.
 */
export function scheduleWixCheckoutShadow(candidate: CheckoutShadowCandidate): void {
  const observer = createWixCheckoutShadowObserver();
  if (!observer) return;
  after(() => observer.observeBookingCandidate(candidate));
}
