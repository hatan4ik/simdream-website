'use client';

import { wixBirthdayPricingAdditionalFields, type WixBirthdayPricingClaimField } from './booking-additional-fields';
import { blockingCheckoutViolationMessage, createWixCartForBooking } from './booking-cart-create';
import {
  isHttpsCheckoutUrl,
  postWixJson,
  readWixResponseError,
  resolveWixPostFailureMessage,
  wixCartUrl,
  type WixCartCalculationResponse,
  type WixCartCouponResponse,
  type WixCartGiftCardResponse,
  type WixCheckoutUrlResponse,
} from './cart-v2-shared';
import { wixAddonProductIdFor } from './catalog';
import {
  normalizeWixEmail,
  normalizeWixPhone,
  patchWixCartCustomerInfo,
  patchWixCheckoutShippingContact,
  splitWixContactName,
} from './checkout-prefill';

export { createWixCartForBooking };

const WIX_TIME_SLOT_GET_URL = 'https://www.wixapis.com/_api/service-availability/v2/time-slots/get';
const WIX_CREATE_BOOKING_URL = 'https://www.wixapis.com/bookings/v2/bookings';

export interface WixBrowserClient { fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response>; }

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
  pilotBirthDate?: string;
  notes?: string;
  couponCode?: string;
  birthdayPricingClaim?: WixBirthdayPricingClaimField;
  addonIds?: readonly string[];
}

export class WixBookingCheckoutClientError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export interface WixCartPrice {
  /** Wix's calculated cart discount. React never derives this amount itself. */
  discountIls: number;
  /** Wix's calculated payable total, including any tax or fee configured in Wix. */
  totalIls: number;
  /** Amount of native Wix Gift Card credit allocated to this cart, if any. */
  giftCardAppliedIls?: number;
}

export interface WixBookingCheckoutDraft {
  cartId: string;
  price: WixCartPrice;
}

export interface WixAppliedCoupon {
  couponId: string;
  price: WixCartPrice;
  percentageOff?: number;
}

/** A Wix-managed stored-value Gift Card applied to the visitor-owned cart. */
export interface WixAppliedGiftCard {
  giftCardId: string;
  /** Wix intentionally returns this masked value instead of the bearer code. */
  obfuscatedCode: string;
  price: WixCartPrice;
}

interface WixSlotResponse {
  timeSlot?: WixNativeCheckoutSlot;
}

interface WixBookingResponse {
  booking?: { id?: string };
}

async function wixPost<T>(client: WixBrowserClient, url: string, body: unknown): Promise<T> {
  const { response, payload } = await postWixJson((input, init) => client.fetchWithAuth(input, init), url, body);
  if (!response.ok) {
    throw new WixBookingCheckoutClientError(resolveWixPostFailureMessage(url, response.status, payload), response.status);
  }
  return payload as T;
}

/**
 * Adds the visitor's already-completed booking form details to the cart that
 * owns the hosted checkout. `customerInfo` carries the identity details and
 * `paymentInfo.billingContact` carries the invoice contact used by payment
 * providers. Supplying both prevents the hosted payment page from asking the
 * customer to enter the same name and phone a second time.
 */
async function wixUpdateCartCustomerInfo(
  client: WixBrowserClient,
  cartId: string,
  customerInfo: { firstName: string; lastName: string; email: string; phone: string; birthDate?: string }
): Promise<void> {
  const response = await patchWixCartCustomerInfo((req, init) => client.fetchWithAuth(req, init), cartId, customerInfo);
  if (!response.ok) {
    throw new WixBookingCheckoutClientError(
      await readWixResponseError(response, 'We could not securely prepare your checkout')
    );
  }
}

/** Calculate Cart with `refreshCart: true`: Wix's price for the cart as it now stands. */
function calculateWixCart(client: WixBrowserClient, cartId: string): Promise<WixCartCalculationResponse> {
  return wixPost<WixCartCalculationResponse>(client, wixCartUrl(cartId, 'calculate'), { refreshCart: true });
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
  const violationMessage = blockingCheckoutViolationMessage(calculation.summary?.violations);
  if (violationMessage) throw new WixBookingCheckoutClientError(violationMessage);
  // Wix represents a zero cart-level discount either as `0` or, for some
  // booking configurations, by omitting the optional field entirely.
  const discountIls = wixMoneyAmount(calculation.summary?.priceSummary?.discount?.amount) ?? 0;
  const totalIls = wixMoneyAmount(calculation.summary?.priceSummary?.total?.amount);
  if (totalIls === null) {
    throw new WixBookingCheckoutClientError('Wix did not return a complete checkout total. Please try again.');
  }
  const payment = calculation.summary?.paymentSummary;
  const giftCardAppliedIls = (payment?.giftCards ?? []).reduce(
    (sum, giftCard) => sum + (wixMoneyAmount(giftCard.redeemAmount?.amount) ?? 0),
    0
  );
  if (giftCardAppliedIls <= 0) return { discountIls, totalIls };
  const totalAfterGiftCards =
    wixMoneyAmount(payment?.totalAfterGiftCards?.amount) ??
    wixMoneyAmount(payment?.payNow?.amount) ??
    Math.max(0, Number((totalIls - giftCardAppliedIls).toFixed(3)));
  return { discountIls, totalIls: totalAfterGiftCards, giftCardAppliedIls };
}

/**
 * Wix Bookings coupons may be applied as a line-item discount. In that case
 * `summary.priceSummary.discount` remains zero even though the authoritative
 * calculated total has decreased. Compare the same cart before and after the
 * coupon so the customer sees the actual payable total in either shape.
 */
function priceAfterCoupon(calculation: WixCartCalculationResponse, previousTotalIls?: number): WixCartPrice {
  const price = priceFromCalculation(calculation);
  const preGiftCardTotal = wixMoneyAmount(calculation.summary?.priceSummary?.total?.amount) ?? price.totalIls;
  if (previousTotalIls === undefined || !Number.isFinite(previousTotalIls)) return price;
  const effectiveDiscount = Math.max(0, Number((previousTotalIls - preGiftCardTotal).toFixed(3)));
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

function requirePresent<T>(value: T | null, message: string): T {
  if (!value) throw new WixBookingCheckoutClientError(message);
  return value;
}

/** Wix Bookings requires E.164; retain international numbers and normalize Israeli local numbers. */
export const normalizeWixBookingPhone = (value: string): string =>
  requirePresent(normalizeWixPhone(value), 'Enter a phone number with a country code, for example +972…');

const splitPilotName = (fullName: string) =>
  requirePresent(splitWixContactName(fullName, true), 'Please enter your first and last name for the Wix booking form.');

const normalizeWixBookingEmail = (value: string) =>
  requirePresent(normalizeWixEmail(value), 'Enter a valid email address (for example name@example.com) for the Wix booking form.');

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
    email: normalizeWixBookingEmail(input.pilotEmail),
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
      ...wixBirthdayPricingAdditionalFields(input.birthdayPricingClaim, customerInfo),
    },
    ...(input.birthdayPricingClaim ? {} : { formSubmission }),
    participantNotification: { notifyParticipants: true },
  });
  const bookingId = booking.booking?.id;
  if (!bookingId) throw new WixBookingCheckoutClientError('Wix did not create the flight reservation. Please try again.');

  const cartId = await createWixCartForBooking(client, bookingId, input.addonIds);

  // The booking form and the cart are separate Wix business objects. Without
  // this Cart V2 update, the hosted checkout cannot inherit the already
  // supplied customer details and presents an avoidable duplicate form.
  await wixUpdateCartCustomerInfo(client, cartId, {
    ...customerInfo,
    birthDate: input.pilotBirthDate,
  });

  const hasShippableAddon = (input.addonIds ?? []).some((addonId) => wixAddonProductIdFor(addonId) !== null);
  if (hasShippableAddon) {
    await patchWixCheckoutShippingContact((req, init) => client.fetchWithAuth(req, init), cartId, {
      firstName: customerInfo.firstName,
      lastName: customerInfo.lastName,
      phone: customerInfo.phone,
    });
  }

  const calculation = await calculateWixCart(client, cartId);
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

  let coupon: WixCartCouponResponse;
  try {
    coupon = await wixPost<WixCartCouponResponse>(client, wixCartUrl(cartId, 'add-coupon'), {
      coupon: { code },
    });
  } catch {
    throw new WixBookingCheckoutClientError('Wix could not apply this coupon.');
  }

  const appliedCoupon = coupon.cart?.coupons?.find((candidate) => candidate.code === code) ?? coupon.cart?.coupons?.[0];
  const couponId = appliedCoupon?.id ?? appliedCoupon?._id;
  if (!couponId) throw new WixBookingCheckoutClientError('Wix could not apply this coupon.');

  const calculation = await calculateWixCart(client, cartId);
  const tcCoupon =
    calculation.cart?.tcAppliedDiscounts?.find((d) => d.coupon?.id === couponId)?.coupon ??
    coupon.cart?.tcAppliedDiscounts?.find((d) => d.coupon?.id === couponId)?.coupon ??
    calculation.cart?.tcAppliedDiscounts?.[0]?.coupon ??
    coupon.cart?.tcAppliedDiscounts?.[0]?.coupon;
  const pct = tcCoupon?.percentage ? Number(tcCoupon.percentage) : NaN;
  const percentageOff = Number.isFinite(pct) && pct > 0 ? pct : undefined;
  return { couponId, price: priceAfterCoupon(calculation, previousTotalIls), ...(percentageOff ? { percentageOff } : {}) };
}

/** Removes an applied coupon, then returns Wix's recalculated original total. */
export async function removeWixCoupon(
  client: WixBrowserClient,
  cartId: string,
  couponId: string
): Promise<WixCartPrice> {
  await wixPost<WixCartCouponResponse>(client, wixCartUrl(cartId, 'remove-coupon'), { couponId });
  const calculation = await calculateWixCart(client, cartId);
  return priceFromCalculation(calculation);
}

/**
 * Applies one Wix-managed Gift Card to the already-created booking cart.
 * The raw bearer code never leaves this request path or client input state;
 * Wix returns only an obfuscated code for subsequent display/removal.
 */
export async function applyWixGiftCard(
  client: WixBrowserClient,
  cartId: string,
  giftCardCode: string
): Promise<WixAppliedGiftCard> {
  const code = giftCardCode.trim();
  if (!code) throw new WixBookingCheckoutClientError('Enter a Gift Card code before applying it.');

  let giftCard: WixCartGiftCardResponse;
  try {
    giftCard = await wixPost<WixCartGiftCardResponse>(client, wixCartUrl(cartId, 'add-gift-card'), {
      giftCard: { code },
    });
  } catch {
    throw new WixBookingCheckoutClientError('Wix could not apply this Gift Card.');
  }

  const appliedGiftCard = giftCard.cart?.paymentInfo?.giftCards?.[0];
  const giftCardId = appliedGiftCard?.id ?? appliedGiftCard?._id;
  if (!giftCardId || !appliedGiftCard?.obfuscatedCode) {
    throw new WixBookingCheckoutClientError('Wix could not apply this Gift Card.');
  }

  const calculation = await calculateWixCart(client, cartId);
  const price = priceFromCalculation(calculation);
  if (!price.giftCardAppliedIls || price.giftCardAppliedIls <= 0) {
    await removeWixGiftCard(client, cartId, giftCardId);
    throw new WixBookingCheckoutClientError('This Gift Card has no available balance for this booking.');
  }

  return { giftCardId, obfuscatedCode: appliedGiftCard.obfuscatedCode, price };
}

/** Removes one native Gift Card from a visitor-owned cart and recalculates it. */
export async function removeWixGiftCard(
  client: WixBrowserClient,
  cartId: string,
  giftCardId: string
): Promise<WixCartPrice> {
  await wixPost<WixCartGiftCardResponse>(client, wixCartUrl(cartId, 'remove-gift-card'), { giftCardId });
  const calculation = await calculateWixCart(client, cartId);
  return priceFromCalculation(calculation);
}

/** Cart V2 has no documented locale/return field; redirect sessions carry `preferences.additionalQueryParameters.lang`. */
export async function getWixBookingCheckoutUrl(client: WixBrowserClient, cartId: string): Promise<{ checkoutUrl: string }> {
  const checkout = await wixPost<WixCheckoutUrlResponse>(client, wixCartUrl(cartId, 'get-checkout-url'), {});
  if (!checkout.checkoutUrl) throw new WixBookingCheckoutClientError('Wix did not return a checkout page. Please try again.');
  try {
    // An unparseable URL throws inside the check and is reported as insecure too.
    if (!isHttpsCheckoutUrl(checkout.checkoutUrl)) throw new Error('insecure checkout URL');
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
