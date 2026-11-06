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

export interface WixCartPrice {
  /** Wix's calculated cart discount. React never derives this amount itself. */
  discountIls: number;
  /** Wix's calculated payable total, including any tax or fee configured in Wix. */
  totalIls: number;
}

export interface WixBookingCheckoutDraft {
  cartId: string;
  price: WixCartPrice;
}

export interface WixAppliedCoupon {
  couponId: string;
  price: WixCartPrice;
}

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
  summary?: {
    violations?: unknown[];
    priceSummary?: {
      discount?: { amount?: string };
      total?: { amount?: string };
    };
  };
}

interface WixCouponResponse {
  cart?: {
    coupons?: Array<{ id?: string; _id?: string; code?: string }>;
  };
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

/**
 * Adds the visitor's already-completed booking form details to the cart that
 * owns the hosted checkout. Wix Checkout reads `customerInfo` from the cart,
 * so this is the handoff that prevents a customer from having to type their
 * name, email and phone a second time after selecting a flight.
 */
async function wixUpdateCartCustomerInfo(
  client: WixBrowserClient,
  cartId: string,
  customerInfo: { firstName: string; lastName: string; email: string; phone: string }
): Promise<void> {
  const response = await client.fetchWithAuth(`${WIX_CREATE_CART_URL}/${cartId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    // Cart V2 requires the ID both in the URL and the partial cart payload.
    // Do not pass a contact ID from the browser: Wix resolves or creates the
    // matching contact from the same visitor-owned cart context.
    body: JSON.stringify({ cart: { id: cartId, customerInfo } }),
  });
  if (!response.ok) {
    throw new WixBookingCheckoutClientError('We could not securely prepare your checkout. Please try again.');
  }
}

function wixMoneyAmount(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/**
 * The Calculate Cart response is the only price authority for an in-progress
 * Wix booking. Do not replace this with package math: Wix may add tax, fees or
 * other promotions before the hosted checkout opens.
 */
function priceFromCalculation(calculation: WixCartCalculationResponse): WixCartPrice {
  if ((calculation.summary?.violations?.length ?? 0) > 0) {
    throw new WixBookingCheckoutClientError('Wix could not validate this checkout. Please choose another time.');
  }
  // Wix represents a zero cart-level discount either as `0` or, for some
  // booking configurations, by omitting the optional field entirely.
  const discountIls = wixMoneyAmount(calculation.summary?.priceSummary?.discount?.amount) ?? 0;
  const totalIls = wixMoneyAmount(calculation.summary?.priceSummary?.total?.amount);
  if (totalIls === null) {
    throw new WixBookingCheckoutClientError('Wix did not return a complete checkout total. Please try again.');
  }
  return { discountIls, totalIls };
}

/**
 * Wix Bookings coupons may be applied as a line-item discount. In that case
 * `summary.priceSummary.discount` remains zero even though the authoritative
 * calculated total has decreased. Compare the same cart before and after the
 * coupon so the customer sees the actual payable total in either shape.
 */
function priceAfterCoupon(calculation: WixCartCalculationResponse, previousTotalIls?: number): WixCartPrice {
  const price = priceFromCalculation(calculation);
  if (previousTotalIls === undefined || !Number.isFinite(previousTotalIls)) return price;
  const effectiveDiscount = Math.max(0, Number((previousTotalIls - price.totalIls).toFixed(3)));
  return { ...price, discountIls: Math.max(price.discountIls, effectiveDiscount) };
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

function createBookingLocation(location: WixNativeCheckoutLocation): { id: string; locationType: 'OWNER_BUSINESS' | 'CUSTOMER' | 'CUSTOM' } {
  return {
    id: location.id,
    locationType: location.locationType === 'BUSINESS' ? 'OWNER_BUSINESS' : location.locationType,
  };
}

/**
 * Creates an unpaid Wix booking/cart in the visitor's session and returns Wix's
 * calculated total. A CREATED online booking expires when it is not paid; it does
 * not confirm or block the slot. Keeping the cart identity lets a coupon be
 * validated before checkout without creating a second booking later.
 */
export async function prepareWixBookingCheckout(
  client: WixBrowserClient,
  input: StartWixBookingCheckoutInput
): Promise<WixBookingCheckoutDraft> {
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
  const customerInfo = {
    firstName: name.firstName,
    lastName: name.lastName,
    email: input.pilotEmail.trim(),
    phone: normalizeWixBookingPhone(input.pilotPhone),
  };
  const formSubmission: Record<string, string> = {
    first_name: customerInfo.firstName,
    last_name: customerInfo.lastName,
    email: customerInfo.email,
    phone: customerInfo.phone,
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
          // The visitor selected a time, not a particular instructor. Omitting
          // `resource` applies Wix's automatic staff assignment. The availability
          // response also contains the physical simulator-capacity resource; using
          // that resource as an instructor makes Create Booking reject the slot.
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
  });
  const cartId = cart.cart?.id;
  if (!cartId) throw new WixBookingCheckoutClientError('Wix did not create a checkout cart. Please try again.');

  // The booking form and the cart are separate Wix business objects. Without
  // this Cart V2 update, the hosted checkout cannot inherit the already
  // supplied customer details and presents an avoidable duplicate form.
  await wixUpdateCartCustomerInfo(client, cartId, customerInfo);

  const calculation = await wixPost<WixCartCalculationResponse>(client, `${WIX_CREATE_CART_URL}/${cartId}/calculate`, {
    refreshCart: true,
  });
  return { cartId, price: priceFromCalculation(calculation) };
}

/** Applies one native Wix coupon and returns Wix's freshly calculated price. */
export async function applyWixCoupon(
  client: WixBrowserClient,
  cartId: string,
  couponCode: string,
  previousTotalIls?: number
): Promise<WixAppliedCoupon> {
  const code = couponCode.trim();
  if (!code) throw new WixBookingCheckoutClientError('Enter a coupon code before applying it.');

  let coupon: WixCouponResponse;
  try {
    coupon = await wixPost<WixCouponResponse>(client, `${WIX_CREATE_CART_URL}/${cartId}/add-coupon`, {
      coupon: { code },
    });
  } catch {
    throw new WixBookingCheckoutClientError('Wix could not apply this coupon.');
  }

  const appliedCoupon = coupon.cart?.coupons?.find((candidate) => candidate.code === code) ?? coupon.cart?.coupons?.[0];
  const couponId = appliedCoupon?.id ?? appliedCoupon?._id;
  if (!couponId) throw new WixBookingCheckoutClientError('Wix could not apply this coupon.');

  const calculation = await wixPost<WixCartCalculationResponse>(client, `${WIX_CREATE_CART_URL}/${cartId}/calculate`, {
    refreshCart: true,
  });
  return { couponId, price: priceAfterCoupon(calculation, previousTotalIls) };
}

/** Removes an applied coupon, then returns Wix's recalculated original total. */
export async function removeWixCoupon(
  client: WixBrowserClient,
  cartId: string,
  couponId: string
): Promise<WixCartPrice> {
  await wixPost<WixCouponResponse>(client, `${WIX_CREATE_CART_URL}/${cartId}/remove-coupon`, { couponId });
  const calculation = await wixPost<WixCartCalculationResponse>(client, `${WIX_CREATE_CART_URL}/${cartId}/calculate`, {
    refreshCart: true,
  });
  return priceFromCalculation(calculation);
}

/** Gets the final Wix-hosted payment URL for an already calculated visitor cart. */
export async function getWixBookingCheckoutUrl(client: WixBrowserClient, cartId: string): Promise<{ checkoutUrl: string }> {
  const checkout = await wixPost<WixCheckoutUrlResponse>(client, `${WIX_CREATE_CART_URL}/${cartId}/get-checkout-url`, {});
  if (!checkout.checkoutUrl) throw new WixBookingCheckoutClientError('Wix did not return a checkout page. Please try again.');
  try {
    if (new URL(checkout.checkoutUrl).protocol !== 'https:') throw new Error('insecure checkout URL');
  } catch {
    throw new WixBookingCheckoutClientError('Wix did not return a secure checkout page. Please try again.');
  }
  return { checkoutUrl: checkout.checkoutUrl };
}

/**
 * Backward-compatible one-shot path for a customer who skips the visible
 * coupon step. Couponed journeys use the same cart through prepare/apply/url so
 * the price displayed in SimDream stays identical to the Wix checkout price.
 */
export async function startWixBookingCheckout(
  client: WixBrowserClient,
  input: StartWixBookingCheckoutInput
): Promise<{ checkoutUrl: string }> {
  const draft = await prepareWixBookingCheckout(client, input);
  if (input.couponCode?.trim()) {
    await applyWixCoupon(client, draft.cartId, input.couponCode, draft.price.totalIls);
  }
  return getWixBookingCheckoutUrl(client, draft.cartId);
}
