'use client';

import type { WixBrowserClient } from './booking-checkout-client';

/**
 * Sets the visitor-owned Wix cart's `note` through Cart V2 Update Cart
 * (`PATCH https://www.wixapis.com/ecom/v2/carts/{cart.id}`, body `{ cart: { id, note } }`, `note` at most
 * 1000 characters, permission scope `SCOPE.ECOM.WRITE-CARTS-V2_LIMITED`: the same call and visitor session
 * `wixUpdateCartCustomerInfo` already uses for the customer details).
 * Docs: https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/cart-v2/update-cart
 * It only sets that one field; every other cart field is left as it is.
 */
export async function setWixCartNote(
  client: WixBrowserClient,
  cartId: string,
  note: string,
  failureMessage: string
): Promise<void> {
  const response = await client.fetchWithAuth(`https://www.wixapis.com/ecom/v2/carts/${cartId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cart: { id: cartId, note } }),
  });
  // The caller passes the localized message: nothing is sent on to Wix checkout until the note is recorded.
  if (!response.ok) throw new Error(failureMessage);
}
