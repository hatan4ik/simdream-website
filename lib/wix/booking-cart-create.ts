'use client';

import { WIX_STORES_APP_ID, wixAddonProductIdFor } from './catalog';
import {
  WIX_BOOKINGS_APP_ID,
  WIX_CART_V2_URL,
  postWixJson,
  wixCatalogLineItem,
  wixCreateCartBody,
  wixErrorFields,
  type WixCartCreateResponse,
} from './cart-v2-shared';

const FALLBACK_CART_CREATE_ERROR = 'Wix did not create a checkout cart. Please try again.';

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function formatWixCartCreateError(status: number, payload: unknown): string {
  const fields = wixErrorFields(payload);
  if (!fields) return FALLBACK_CART_CREATE_ERROR;
  const code = nonEmptyString(fields.code);
  const message = nonEmptyString(fields.message);
  const description = nonEmptyString(fields.description);
  const parts = [code, message, description && description !== message ? description : null].filter(
    (part): part is string => part !== null
  );
  if (parts.length === 0) return FALLBACK_CART_CREATE_ERROR;
  return `Wix did not create a checkout cart (${status}): ${parts.join(' — ')}`;
}

function blockingCheckoutViolations(violations: readonly unknown[] | undefined): unknown[] {
  if (!violations || violations.length === 0) return [];
  return violations.filter((entry) => {
    if (!entry || typeof entry !== 'object') return true;
    const { scope, code } = entry as { scope?: unknown; code?: unknown };
    return !(scope === 'DELIVERY' && code === 'MISSING_DELIVERY_METHOD');
  });
}

export function hasBlockingCheckoutViolations(violations: readonly unknown[] | undefined): boolean {
  return blockingCheckoutViolations(violations).length > 0;
}

/** Formats non-delivery Cart V2 calculate violations so checkout errors surface the real Wix reason. */
export function formatBlockingCheckoutViolations(violations: readonly unknown[] | undefined): string | null {
  const blocking = blockingCheckoutViolations(violations);
  if (blocking.length === 0) return null;
  const parts = blocking
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const { scope, code, description, message } = entry as Record<string, unknown>;
      const label = [nonEmptyString(scope), nonEmptyString(code)].filter(Boolean).join('/');
      const detail = nonEmptyString(description) ?? nonEmptyString(message);
      return [label, detail && detail !== label ? detail : null].filter(Boolean).join(': ') || null;
    })
    .filter((item): item is string => item !== null);
  return parts.length > 0 ? parts.join('; ') : null;
}

/** Returns the user-facing error message when Cart V2 calculate reports blocking violations, or null. */
export function blockingCheckoutViolationMessage(violations: readonly unknown[] | undefined): string | null {
  if (!hasBlockingCheckoutViolations(violations)) return null;
  const details = formatBlockingCheckoutViolations(violations);
  console.error('Wix Cart calculate blocking violations', violations);
  return details
    ? `Wix could not validate this checkout (${details}). Please choose another option or time.`
    : 'Wix could not validate this checkout. Please choose another time.';
}

/**
 * Creates a Cart V2 cart containing the Wix Bookings reservation and any mapped
 * Wix Stores add-on products (`quantity: 1`, `appId: WIX_STORES_APP_ID`).
 */
export async function createWixCartForBooking(
  client: { fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> },
  bookingId: string,
  addonIds?: readonly string[]
): Promise<string> {
  const addonCatalogItems = (addonIds ?? []).flatMap((addonId) => {
    const productId = wixAddonProductIdFor(addonId);
    return productId ? [wixCatalogLineItem(WIX_STORES_APP_ID, productId)] : [];
  });

  const { response, payload } = await postWixJson(
    (input, init) => client.fetchWithAuth(input, init),
    WIX_CART_V2_URL,
    wixCreateCartBody([wixCatalogLineItem(WIX_BOOKINGS_APP_ID, bookingId), ...addonCatalogItems])
  );
  const cart = (payload as WixCartCreateResponse | null)?.cart;
  if (!response.ok || !cart?.id) {
    throw new Error(formatWixCartCreateError(response.status, payload));
  }
  return cart.id;
}
