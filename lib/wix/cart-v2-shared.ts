/**
 * Wix eCommerce Cart V2 mechanics. The browser booking adapter (`booking-checkout-client.ts`,
 * `booking-cart-create.ts`) and the server Gift Card adapter (`gift-cards.ts`) both take the endpoint URLs,
 * the line-item and Create Cart bodies, the response shapes and the hosted-checkout URL rule from here; the
 * browser adapter also posts through `postWixJson` and reads errors with `wixErrorFields` (the server keeps
 * `client.ts`'s `wixPost`). Cart customer details are patched by `checkout-prefill.ts`, which both share.
 *
 * Environment-neutral by contract (tests/unit/wix-browser-boundary.test.ts): this module imports no value,
 * reads no `process.env` and creates no Wix client. A function that talks to Wix takes the caller's
 * `fetchWithAuth`, so the browser keeps its member/visitor session and the server keeps its own client.
 */

/** The `fetchWithAuth` of a Wix SDK client: the browser member client or the server visitor client. */
export type WixFetchWithAuth = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** Cart V2 collection URL: Create Cart posts here; one cart and its actions live below it. */
export const WIX_CART_V2_URL = 'https://www.wixapis.com/ecom/v2/carts';

/** Wix Bookings' app id, the `catalogReference.appId` of a booking line item. */
export const WIX_BOOKINGS_APP_ID = '13d21c63-b5ec-5912-8397-c3a5ddb27a97';

export type WixCartAction =
  | 'calculate'
  | 'add-coupon'
  | 'remove-coupon'
  | 'add-gift-card'
  | 'remove-gift-card'
  | 'get-checkout-url';

/** `…/carts/{cartId}` (Update Cart), or `…/carts/{cartId}/{action}`. */
export function wixCartUrl(cartId: string, action?: WixCartAction): string {
  return action ? `${WIX_CART_V2_URL}/${cartId}/${action}` : `${WIX_CART_V2_URL}/${cartId}`;
}

export interface WixCatalogLineItem {
  quantity: number;
  catalogReference: { appId: string; catalogItemId: string; options?: Record<string, unknown> };
}

/** One unit of a catalog item. `options` is sent only when given (a Gift Card's variant and recipient). */
export function wixCatalogLineItem(
  appId: string,
  catalogItemId: string,
  options?: Record<string, unknown>
): WixCatalogLineItem {
  return {
    quantity: 1,
    catalogReference: options ? { appId, catalogItemId, options } : { appId, catalogItemId },
  };
}

/** Create Cart body: a web-channel cart holding `catalogItems`. */
export function wixCreateCartBody(catalogItems: readonly WixCatalogLineItem[]): {
  cart: { source: { channelType: 'WEB' } };
  catalogItems: readonly WixCatalogLineItem[];
} {
  return { cart: { source: { channelType: 'WEB' } }, catalogItems };
}

/**
 * POSTs a JSON body through the caller's `fetchWithAuth` and reads the reply leniently: a body that is not
 * JSON becomes `null`. The caller decides what a non-OK status means.
 */
export async function postWixJson(
  fetchWithAuth: WixFetchWithAuth,
  url: string,
  body: unknown
): Promise<{ response: Response; payload: unknown }> {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  return { response, payload };
}

/** The string fields of a Wix REST error, as sent (not trimmed); a field that is absent or not a string is null. */
export interface WixErrorFields {
  code: string | null;
  message: string | null;
  description: string | null;
}

/** Reads the Wix error envelope `{ message, details: { applicationError: { code, description } } }`. */
export function wixErrorFields(payload: unknown): WixErrorFields | null {
  if (!payload || typeof payload !== 'object') return null;
  const envelope = payload as {
    message?: unknown;
    details?: { applicationError?: { code?: unknown; description?: unknown } };
  };
  const applicationError = envelope.details?.applicationError;
  const text = (value: unknown) => (typeof value === 'string' ? value : null);
  return {
    code: text(applicationError?.code),
    message: text(envelope.message),
    description: text(applicationError?.description),
  };
}

/**
 * Formats a non-OK Wix REST error into `<prefix> (<status>): <parts>` when the response
 * carries error text, or returns `fallback` when empty / non-JSON.
 */
export function formatWixErrorMessage(prefix: string, status: number, payload: unknown, fallback: string): string {
  const fields = wixErrorFields(payload);
  if (!fields) return fallback;
  const trim = (value: string | null) => (value && value.trim().length > 0 ? value.trim() : null);
  const code = trim(fields.code);
  const message = trim(fields.message);
  const description = trim(fields.description);
  const parts = [code, message, description && description !== message ? description : null].filter(
    (part): part is string => part !== null
  );
  if (parts.length === 0) return fallback;
  return `${prefix} (${status}): ${parts.join(' — ')}`;
}

/**
 * Classifies and formats a non-OK Wix POST error so slot availability conflicts stay
 * user-friendly while all other REST failures surface status, code, and message.
 */
export function resolveWixPostFailureMessage(url: string, status: number, payload: unknown): string {
  const fields = wixErrorFields(payload);
  const detail = (fields?.message ?? fields?.description)?.toLowerCase() ?? '';
  console.error('Wix checkout request failed', { url, status, fields });
  if (detail.includes('availability') || detail.includes('slot') || detail.includes('taken')) {
    return 'That departure is no longer available. Please choose another time.';
  }
  const fallback = status >= 400 ? `We could not open Wix checkout (${status}). Please try again.` : 'We could not open Wix checkout. Please try again.';
  return formatWixErrorMessage('We could not open Wix checkout', status, payload, fallback);
}

/** Reads and formats a non-OK Wix cart/checkout PATCH error response. */
export async function readWixResponseError(response: Response, prefix: string): Promise<string> {
  const errorPayload = await response.json().catch(() => null);
  console.error('Wix checkout request failed', { url: response.url, status: response.status, errorPayload });
  const fallback = response.status >= 400 ? `${prefix} (${response.status}). Please try again.` : `${prefix}. Please try again.`;
  return formatWixErrorMessage(prefix, response.status, errorPayload, fallback);
}

/**
 * The hosted checkout opens only over HTTPS. A value that is not a URL at all makes the URL parser throw
 * its TypeError here; each adapter decides how to report that.
 */
export function isHttpsCheckoutUrl(checkoutUrl: string): boolean {
  return new URL(checkoutUrl).protocol === 'https:';
}

/** Create Cart reply. */
export interface WixCartCreateResponse {
  cart?: { id?: string };
}

/** Calculate Cart reply: the only price authority for a cart. */
export interface WixCartCalculationResponse {
  summary?: {
    violations?: unknown[];
    priceSummary?: {
      discount?: { amount?: string };
      total?: { amount?: string };
    };
    paymentSummary?: {
      giftCards?: Array<{
        giftCardId?: string;
        redeemAmount?: { amount?: string };
      }>;
      /** The authoritative payable remainder after native Gift Card credit. */
      totalAfterGiftCards?: { amount?: string };
      payNow?: { amount?: string };
    };
  };
}

/** Add Coupon / Remove Coupon reply. */
export interface WixCartCouponResponse {
  cart?: {
    coupons?: Array<{ id?: string; _id?: string; code?: string }>;
  };
}

/** Add Gift Card / Remove Gift Card reply. */
export interface WixCartGiftCardResponse {
  cart?: {
    paymentInfo?: {
      giftCards?: Array<{
        id?: string;
        _id?: string;
        obfuscatedCode?: string;
      }>;
    };
  };
}

/** Get Checkout URL reply (the request body is `{}`). */
export interface WixCheckoutUrlResponse {
  checkoutUrl?: string;
}
