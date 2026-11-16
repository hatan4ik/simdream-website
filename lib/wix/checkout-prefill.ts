import { wixCartUrl, type WixFetchWithAuth } from './cart-v2-shared';

export type { WixFetchWithAuth };

const WIX_CHECKOUT_V1_URL = 'https://www.wixapis.com/ecom/v1/checkouts';
export const WIX_DEFAULT_COUNTRY_CODE = 'IL';

// Explicitly clearing `subdivision` and `postalCode` overrides any server-side IP geo-default
// (for example US-VA / 22031) so Hosted Checkout opens on Israel with clean address fields.
const WIX_DEFAULT_ADDRESS = {
  country: WIX_DEFAULT_COUNTRY_CODE,
  subdivision: '',
  postalCode: '',
} as const;

export interface WixContactName {
  firstName: string;
  lastName: string;
}

export interface WixCustomerPrefill extends WixContactName {
  email: string;
  phone: string;
  /** Optional ISO YYYY-MM-DD birth date forwarded to Wix Checkout's custom birthday field only. */
  birthDate?: string;
}

export interface WixShippingContactPrefill extends WixContactName {
  phone: string;
}

function validIsoBirthDate(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [year, month, day] = trimmed.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isCalendarDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isCalendarDate ? trimmed : null;
}

/** Matches `zod`'s `email()` rule and Wix Bookings' email format requirement (`user@domain.tld`, <= 254 chars). */
export const WIX_EMAIL_PATTERN =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

/** Trim and validate an email address against Wix Bookings' email format requirement. */
export function normalizeWixEmail(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length <= 254 && WIX_EMAIL_PATTERN.test(trimmed) ? trimmed : null;
}

/** Normalize international E.164 or local Israeli phone numbers to E.164 for Wix APIs. */
export function normalizeWixPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s()\-]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^0\d{8,9}$/.test(compact)) return `+972${compact.slice(1)}`;
  return null;
}

/** Split a full name into Wix `firstName` and `lastName`, returning `null` if fewer parts exist than required. */
export function splitWixContactName(fullName: string, requireLastName = false): WixContactName | null {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return requireLastName ? null : { firstName: 'SimDream', lastName: 'Guest' };
  }
  if (parts.length === 1) {
    return requireLastName ? null : { firstName: parts[0]!, lastName: parts[0]! };
  }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

/**
 * Patches Cart V2 `customerInfo`, `deliveryInfo.address`, `paymentInfo.billingContact`,
 * `paymentInfo.billingAddress`, and (when present) the Wix Checkout birthday extended field
 * so Wix Hosted Checkout pre-fills Customer Details and defaults Country to Israel (`IL`).
 * Note: Cart V2 `billingContact` does not accept `email`; email belongs on `customerInfo`.
 */
export async function patchWixCartCustomerInfo(
  fetchWithAuth: WixFetchWithAuth,
  cartId: string,
  customerInfo: WixCustomerPrefill
): Promise<Response> {
  const birthDate = validIsoBirthDate(customerInfo.birthDate);
  const baseCart = {
    id: cartId,
    customerInfo: {
      firstName: customerInfo.firstName,
      lastName: customerInfo.lastName,
      email: customerInfo.email,
      phone: customerInfo.phone,
    },
    deliveryInfo: {
      address: WIX_DEFAULT_ADDRESS,
    },
    paymentInfo: {
      billingContact: {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        phone: customerInfo.phone,
      },
      billingAddress: WIX_DEFAULT_ADDRESS,
    },
  };

  const patchCart = (cartPayload: Record<string, unknown>) =>
    fetchWithAuth(wixCartUrl(cartId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      // Cart V2 requires the ID both in the URL and the partial cart payload.
      // Do not pass a contact ID: Wix resolves or creates the matching contact from cart context.
      body: JSON.stringify({ cart: cartPayload }),
    });

  if (!birthDate) {
    return patchCart(baseCart);
  }

  const response = await patchCart({
    ...baseCart,
    extendedFields: {
      namespaces: {
        _user_fields: {
          form_field: birthDate,
        },
      },
    },
  });
  if (response.ok) return response;

  // Fail-open retry without custom extendedFields if Wix rejects the site-configured field schema,
  // so Customer Details and Country = Israel still reach Hosted Checkout.
  const detail = await response.text().catch(() => '');
  console.warn('[wix:checkout-prefill] Non-fatal extendedFields birthDate prefill error:', response.status, detail.slice(0, 200));
  return patchCart(baseCart);
}

/**
 * Best-effort Checkout V1 patch setting billingInfo and shippingDestination contact details + Country (`IL`).
 * Cart V2 `deliveryInfo` only holds `address` (no `contactDetails`), so when a cart includes
 * shippable Wix Stores items (e.g. simulator add-ons), Checkout V1 preserves contact details and
 * Israel default address across both Delivery Details and Billing Info.
 */
export async function patchWixCheckoutShippingContact(
  fetchWithAuth: WixFetchWithAuth,
  cartId: string,
  contactDetails: WixShippingContactPrefill
): Promise<void> {
  try {
    const response = await fetchWithAuth(`${WIX_CHECKOUT_V1_URL}/${cartId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkout: {
          billingInfo: {
            address: WIX_DEFAULT_ADDRESS,
            contactDetails,
          },
          shippingInfo: {
            shippingDestination: {
              address: WIX_DEFAULT_ADDRESS,
              contactDetails,
            },
          },
        },
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn('[wix:checkout-prefill] Non-fatal shipping contactDetails prefill error:', response.status, detail.slice(0, 200));
    }
  } catch (err) {
    console.warn('[wix:checkout-prefill] Non-fatal shipping contactDetails prefill error:', err);
  }
}
