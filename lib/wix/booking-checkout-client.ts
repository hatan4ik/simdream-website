'use client';

const WIX_TIME_SLOT_GET_URL = 'https://www.wixapis.com/_api/service-availability/v2/time-slots/get';
const WIX_CREATE_BOOKING_URL = 'https://www.wixapis.com/bookings/v2/bookings';
const WIX_CREATE_CART_URL = 'https://www.wixapis.com/ecom/v2/carts';
const WIX_BOOKINGS_APP_ID = '13d21c63-b5ec-5912-8397-c3a5ddb27a97';

export interface WixBrowserClient {
  fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface WixNativeCheckoutSlot {
  serviceId?: string;
  scheduleId?: string;
  localStartDate?: string;
  localEndDate?: string;
  bookable?: boolean;
  availableResources?: Array<{
    resources?: Array<{ id?: string; name?: string }>;
  }>;
}

export interface WixNativeCheckoutLocation {
  id: string;
  locationType: 'BUSINESS' | 'CUSTOMER' | 'CUSTOM';
}

export interface WixNativeCheckoutCandidate {
  slotAvailability: WixNativeCheckoutSlot;
  timeZone: string;
  location: WixNativeCheckoutLocation;
  paymentOptions: {
    online: boolean;
    inPerson: boolean;
  };
}

export interface StartWixBookingCheckoutInput extends WixNativeCheckoutCandidate {
  pilotName: string;
  pilotEmail: string;
  pilotPhone: string;
  notes?: string;
  couponCode?: string;
}

export class WixBookingCheckoutClientError extends Error {}

interface WixSlotResponse {
  timeSlot?: WixNativeCheckoutSlot;
}

interface WixBookingResponse {
  booking?: { id?: string };
}

interface WixCartResponse {
  cart?: { id?: string };
}

interface WixCartCalculationResponse {
  summary?: { violations?: unknown[] };
}

interface WixCheckoutUrlResponse {
  checkoutUrl?: string;
}

function errorDetail(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as { message?: unknown; details?: { applicationError?: { description?: unknown } } };
  if (typeof candidate.message === 'string') return candidate.message;
  const nested = candidate.details?.applicationError?.description;
  return typeof nested === 'string' ? nested : null;
}

async function wixPost<T>(client: WixBrowserClient, url: string, body: unknown): Promise<T> {
  const response = await client.fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = errorDetail(payload)?.toLowerCase() ?? '';
    if (detail.includes('availability') || detail.includes('slot') || detail.includes('taken')) {
      throw new WixBookingCheckoutClientError('That departure is no longer available. Please choose another time.');
    }
    throw new WixBookingCheckoutClientError('We could not open Wix checkout. Please try again.');
  }
  return payload as T;
}

function dateTimeParts(localDateTime: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localDateTime);
  if (!match) throw new WixBookingCheckoutClientError('Wix returned an invalid appointment time. Please choose another time.');
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? '0'),
  };
}

function timeZoneOffsetAt(timestamp: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  const year = Number(part('year'));
  const month = Number(part('month'));
  const day = Number(part('day'));
  const hour = Number(part('hour'));
  const minute = Number(part('minute'));
  const second = Number(part('second'));
  return Date.UTC(year, month - 1, day, hour, minute, second) - timestamp;
}

/** Converts Wix's local appointment time to an absolute ISO timestamp with DST-safe offsets. */
export function wixLocalDateTimeToIso(localDateTime: string, timeZone: string): string {
  const value = dateTimeParts(localDateTime);
  const requestedWallClock = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second);
  let timestamp = requestedWallClock;
  // A second pass handles a DST transition between the UTC guess and the actual local instant.
  timestamp = requestedWallClock - timeZoneOffsetAt(timestamp, timeZone);
  timestamp = requestedWallClock - timeZoneOffsetAt(timestamp, timeZone);
  return new Date(timestamp).toISOString();
}

function splitPilotName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    throw new WixBookingCheckoutClientError('Please enter your first and last name for the Wix booking form.');
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** Wix Bookings requires E.164; retain international numbers and normalize Israeli local numbers. */
export function normalizeWixBookingPhone(value: string): string {
  const compact = value.trim().replace(/[\s()\-]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^0\d{8,9}$/.test(compact)) return `+972${compact.slice(1)}`;
  throw new WixBookingCheckoutClientError('Enter a phone number with a country code, for example +972…');
}

function paymentOption(options: WixNativeCheckoutCandidate['paymentOptions']): 'ONLINE' | 'OFFLINE' {
  if (options.online) return 'ONLINE';
  if (options.inPerson) return 'OFFLINE';
  throw new WixBookingCheckoutClientError('This flight is not currently configured for online checkout.');
}

function resourceForSlot(slot: WixNativeCheckoutSlot): { id: string; name?: string } | undefined {
  for (const availableResource of slot.availableResources ?? []) {
    const resource = availableResource.resources?.find((candidate) => Boolean(candidate.id));
    if (resource?.id) return { id: resource.id, ...(resource.name ? { name: resource.name } : {}) };
  }
  return undefined;
}

function createBookingLocation(location: WixNativeCheckoutLocation): { id: string; locationType: 'OWNER_BUSINESS' | 'CUSTOMER' | 'CUSTOM' } {
  return {
    id: location.id,
    locationType: location.locationType === 'BUSINESS' ? 'OWNER_BUSINESS' : location.locationType,
  };
}

/**
 * Runs the documented visitor flow: revalidate the slot → create booking → create and
 * calculate the Wix cart → return Wix's hosted checkout URL. Every call uses the same
 * browser visitor session, retaining guest checkout, member ownership, and native coupons.
 */
export async function startWixBookingCheckout(
  client: WixBrowserClient,
  input: StartWixBookingCheckoutInput
): Promise<{ checkoutUrl: string }> {
  const slot = input.slotAvailability;
  if (!slot.serviceId || !slot.scheduleId || !slot.localStartDate || !slot.localEndDate) {
    throw new WixBookingCheckoutClientError('Wix could not confirm this departure. Please choose another time.');
  }

  const revalidated = await wixPost<WixSlotResponse>(client, WIX_TIME_SLOT_GET_URL, {
    serviceId: slot.serviceId,
    localStartDate: slot.localStartDate,
    localEndDate: slot.localEndDate,
    timeZone: input.timeZone,
    location: input.location,
  });
  const liveSlot = revalidated.timeSlot;
  if (!liveSlot?.bookable || !liveSlot.scheduleId) {
    throw new WixBookingCheckoutClientError('That departure is no longer available. Please choose another time.');
  }

  const name = splitPilotName(input.pilotName);
  const formSubmission: Record<string, string> = {
    first_name: name.firstName,
    last_name: name.lastName,
    email: input.pilotEmail.trim(),
    phone: normalizeWixBookingPhone(input.pilotPhone),
  };
  if (input.notes?.trim()) formSubmission.add_your_message = input.notes.trim();

  const booking = await wixPost<WixBookingResponse>(client, WIX_CREATE_BOOKING_URL, {
    booking: {
      bookedEntity: {
        slot: {
          serviceId: slot.serviceId,
          scheduleId: liveSlot.scheduleId,
          startDate: wixLocalDateTimeToIso(slot.localStartDate, input.timeZone),
          endDate: wixLocalDateTimeToIso(slot.localEndDate, input.timeZone),
          timezone: input.timeZone,
          ...(resourceForSlot(liveSlot) ? { resource: resourceForSlot(liveSlot) } : {}),
          location: createBookingLocation(input.location),
        },
      },
      totalParticipants: 1,
      selectedPaymentOption: paymentOption(input.paymentOptions),
    },
    formSubmission,
    participantNotification: { notifyParticipants: true },
  });
  const bookingId = booking.booking?.id;
  if (!bookingId) throw new WixBookingCheckoutClientError('Wix did not create the flight reservation. Please try again.');

  const cart = await wixPost<WixCartResponse>(client, WIX_CREATE_CART_URL, {
    cart: { source: { channelType: 'WEB' } },
    catalogItems: [
      {
        quantity: 1,
        catalogReference: { appId: WIX_BOOKINGS_APP_ID, catalogItemId: bookingId },
      },
    ],
    ...(input.couponCode?.trim() ? { coupons: [{ code: input.couponCode.trim() }] } : {}),
  });
  const cartId = cart.cart?.id;
  if (!cartId) throw new WixBookingCheckoutClientError('Wix did not create a checkout cart. Please try again.');

  const calculation = await wixPost<WixCartCalculationResponse>(client, `${WIX_CREATE_CART_URL}/${cartId}/calculate`, {
    refreshCart: true,
  });
  if ((calculation.summary?.violations?.length ?? 0) > 0) {
    throw new WixBookingCheckoutClientError('Wix could not validate this checkout. Please choose another time.');
  }

  const checkout = await wixPost<WixCheckoutUrlResponse>(client, `${WIX_CREATE_CART_URL}/${cartId}/get-checkout-url`, {});
  if (!checkout.checkoutUrl) throw new WixBookingCheckoutClientError('Wix did not return a checkout page. Please try again.');
  try {
    if (new URL(checkout.checkoutUrl).protocol !== 'https:') throw new Error('insecure checkout URL');
  } catch {
    throw new WixBookingCheckoutClientError('Wix did not return a secure checkout page. Please try again.');
  }
  return { checkoutUrl: checkout.checkoutUrl };
}
