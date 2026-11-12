import { WIX_SUBSCRIPTION_BOOKING_COPY } from '@/lib/i18n/wix-subscription-booking-copy';
import { getWixMemberClient, wixMemberOAuthStorageKey } from '@/lib/wix/member-client';
import { wixSubscriptionBookingPackageForPlan } from '@/lib/wix/subscription-redemption';

const wixMemberOAuthKeyStorageKey = `${wixMemberOAuthStorageKey()}:key`;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getOrCreateOAuthCryptoKey(): Promise<CryptoKey> {
  const existing = window.sessionStorage.getItem(wixMemberOAuthKeyStorageKey);
  if (existing) {
    const raw = base64ToBytes(existing);
    return window.crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }
  const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const exported = new Uint8Array(await window.crypto.subtle.exportKey('raw', key));
  window.sessionStorage.setItem(wixMemberOAuthKeyStorageKey, bytesToBase64(exported));
  return key;
}

async function storeEncryptedOAuthData(storageKey: string, data: unknown): Promise<void> {
  const key = await getOrCreateOAuthCryptoKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = new Uint8Array(await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  window.sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      v: 1,
      alg: 'AES-GCM',
      iv: bytesToBase64(iv),
      data: bytesToBase64(ciphertext),
    })
  );
}

export type WixSubscriptionBookingCopy = (typeof WIX_SUBSCRIPTION_BOOKING_COPY)['en'];

export interface WixSubscriptionCheckoutInput {
  packageId: string;
  bookingDate: string;
  startTime: string;
  copy: Pick<WixSubscriptionBookingCopy, 'noEligiblePlan' | 'unavailable' | 'checkoutFailed'>;
}

interface WixSlotCheckoutResponse {
  error?: string;
  timeZone?: string;
  slotAvailability?: { serviceId?: string; localStartDate?: string; localEndDate?: string; bookable?: boolean };
}

/**
 * Redeems an active Wix subscription for one included flight: signs the visitor in to the Wix member
 * account when needed (redirecting away), checks that an active plan covers this package, resolves
 * the live Wix slot and redirects to the Wix-hosted Bookings checkout. Throws an `Error` with a
 * displayable message on failure; on success the browser navigates away.
 */
export async function startWixSubscriptionCheckout(input: WixSubscriptionCheckoutInput): Promise<void> {
  const { copy } = input;
  const wixClient = getWixMemberClient();
  if (!wixClient.auth.loggedIn()) {
    const redirectUri = `${window.location.origin}/wix/members/callback`;
    const oAuthData = wixClient.auth.generateOAuthData(redirectUri, window.location.href);
    await storeEncryptedOAuthData(wixMemberOAuthStorageKey(), oAuthData);
    const { authUrl } = await wixClient.auth.getAuthUrl(oAuthData);
    window.location.assign(authUrl);
    return;
  }

  const memberOrders = await wixClient.orders.memberListOrders({ limit: 50 });
  const hasCoveredSession = (memberOrders.orders ?? []).some(
    (order) =>
      order.status === 'ACTIVE' &&
      Boolean(order.planId && wixSubscriptionBookingPackageForPlan(order.planId) === input.packageId)
  );
  if (!hasCoveredSession) throw new Error(copy.noEligiblePlan);

  const slotResponse = await fetch('/api/wix/bookings/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packageId: input.packageId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
    }),
  });
  const checkout = (await slotResponse.json()) as WixSlotCheckoutResponse;
  if (!slotResponse.ok) {
    throw new Error(slotResponse.status === 409 ? copy.unavailable : copy.checkoutFailed);
  }
  const slotAvailability = checkout.slotAvailability;
  if (!slotAvailability?.serviceId || !slotAvailability.localStartDate || !slotAvailability.localEndDate) {
    throw new Error(copy.checkoutFailed);
  }

  const redirectSession = await wixClient.redirects.createRedirectSession({
    bookingsCheckout: {
      slotAvailability,
      timezone: checkout.timeZone || 'Asia/Jerusalem',
    },
    callbacks: {
      postFlowUrl: `${window.location.origin}/subscriptions#flight-deck`,
    },
  });
  const checkoutUrl = redirectSession.redirectSession?.fullUrl;
  if (!checkoutUrl) throw new Error(copy.checkoutFailed);
  window.location.assign(checkoutUrl);
}
