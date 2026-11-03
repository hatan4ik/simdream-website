import { z } from 'zod';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { WIX_TIME_ZONE } from './config';
import { wixPost } from './client';
import { WIX_SERVICE_IDS } from './catalog';

// Endpoints confirmed against the Wix REST reference:
// https://dev.wix.com/docs/api-reference/business-solutions/bookings/services/services-v2/query-services
// https://dev.wix.com/docs/api-reference/business-solutions/bookings/time-slots/time-slots-v2/list-availability-time-slots
const QUERY_SERVICES_URL = 'https://www.wixapis.com/bookings/v2/services/query';
const LIST_TIME_SLOTS_URL = 'https://www.wixapis.com/_api/service-availability/v2/time-slots';

const priceSchema = z.object({ value: z.string(), currency: z.string().optional() });

export const wixServiceSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    hidden: z.boolean().optional(),
    schedule: z
      .object({
        availabilityConstraints: z
          .object({ sessionDurations: z.array(z.number()).optional() })
          .optional(),
      })
      .optional(),
    payment: z
      .object({
        rateType: z.string().optional(),
        fixed: z.object({ price: priceSchema.optional() }).optional(),
        varied: z
          .object({ minPrice: priceSchema.optional(), maxPrice: priceSchema.optional() })
          .optional(),
      })
      .optional(),
    category: z.object({ id: z.string().optional(), name: z.string().optional() }).optional(),
  })
  .loose();

export type WixService = z.infer<typeof wixServiceSchema>;

const queryServicesResponse = z.object({ services: z.array(wixServiceSchema).default([]) }).loose();

export const wixTimeSlotSchema = z
  .object({
    serviceId: z.string().optional(),
    localStartDate: z.string(),
    localEndDate: z.string(),
    bookable: z.boolean().optional(),
  })
  .loose();

export type WixTimeSlot = z.infer<typeof wixTimeSlotSchema>;

const listTimeSlotsResponse = z
  .object({
    timeSlots: z.array(wixTimeSlotSchema).default([]),
    timeZone: z.string().optional(),
    cursorPagingMetadata: z.object({ hasNext: z.boolean().optional() }).loose().optional(),
  })
  .loose();

/** Every Bookings service on the headless site (one page; the catalog is far below 100). */
export async function listWixServices(): Promise<WixService[]> {
  const data = await wixPost(QUERY_SERVICES_URL, { query: { paging: { limit: 100 } } });
  return queryServicesResponse.parse(data).services;
}

export interface AvailabilityWindow {
  serviceId: string;
  /** Local wall-clock bounds in the business time zone, e.g. 2026-11-04T00:00:00. */
  fromLocalDate: string;
  toLocalDate: string;
}

/** Bookable appointment slots for one service, as Wix computes them from staff hours. */
export async function listWixAvailability(window: AvailabilityWindow): Promise<{
  timeSlots: WixTimeSlot[];
  timeZone: string;
}> {
  const data = await wixPost(LIST_TIME_SLOTS_URL, {
    serviceId: window.serviceId,
    fromLocalDate: window.fromLocalDate,
    toLocalDate: window.toLocalDate,
    timeZone: WIX_TIME_ZONE,
    bookable: true,
    cursorPaging: { limit: 200 },
  });
  const parsed = listTimeSlotsResponse.parse(data);
  return { timeSlots: parsed.timeSlots, timeZone: parsed.timeZone ?? WIX_TIME_ZONE };
}

export interface CatalogMismatch {
  packageId: string;
  serviceId: string;
  field: 'missing' | 'name' | 'duration' | 'price' | 'hidden' | 'type';
  expected: string;
  actual: string;
}

function servicePrice(service: WixService): string {
  const fixed = service.payment?.fixed?.price?.value;
  if (fixed) return fixed;
  const varied = service.payment?.varied;
  if (varied?.minPrice?.value) return `${varied.minPrice.value}-${varied.maxPrice?.value ?? '?'}`;
  return service.payment?.rateType ?? 'none';
}

/**
 * Compares the local catalog with the live Wix services it maps to. A varied
 * price counts as matching when the local price equals its minimum (the 90m
 * Odyssey is ₪850 off-peak and ₪950 prime-time).
 */
export function reconcileCatalog(services: WixService[]): CatalogMismatch[] {
  const byId = new Map(services.map((service) => [service.id, service]));
  const mismatches: CatalogMismatch[] = [];

  for (const pkg of SIMULATOR_PACKAGES) {
    const serviceId = WIX_SERVICE_IDS[pkg.id];
    if (!serviceId) continue;
    const service = byId.get(serviceId);
    const report = (field: CatalogMismatch['field'], expected: string, actual: string) =>
      mismatches.push({ packageId: pkg.id, serviceId, field, expected, actual });

    if (!service) {
      report('missing', pkg.title, 'no such service');
      continue;
    }
    if (service.type !== 'APPOINTMENT') report('type', 'APPOINTMENT', service.type);
    if (service.hidden) report('hidden', 'visible', 'hidden');
    if (service.name !== pkg.title) report('name', pkg.title, service.name);

    const durations = service.schedule?.availabilityConstraints?.sessionDurations ?? [];
    if (!durations.includes(pkg.durationMinutes)) {
      report('duration', String(pkg.durationMinutes), durations.join(',') || 'none');
    }

    const price = servicePrice(service);
    const expectedPrice = String(pkg.priceIls);
    const priceMatches = price === expectedPrice || price.startsWith(`${expectedPrice}-`);
    if (!priceMatches) report('price', expectedPrice, price);
  }

  return mismatches;
}
