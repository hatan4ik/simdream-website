'use client';

import { WIX_STORES_APP_ID, wixAddonProductIdFor } from './catalog';

const WIX_CREATE_CART_URL = 'https://www.wixapis.com/ecom/v2/carts';
const WIX_BOOKINGS_APP_ID = '13d21c63-b5ec-5912-8397-c3a5ddb27a97';

interface WixCartCreateResponse {
  cart?: { id?: string };
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
    return productId
      ? [
          {
            quantity: 1,
            catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: productId },
          },
        ]
      : [];
  });

  const response = await client.fetchWithAuth(WIX_CREATE_CART_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart: { source: { channelType: 'WEB' } },
      catalogItems: [
        {
          quantity: 1,
          catalogReference: { appId: WIX_BOOKINGS_APP_ID, catalogItemId: bookingId },
        },
        ...addonCatalogItems,
      ],
    }),
  });
  const payload = (await response.json().catch(() => null)) as WixCartCreateResponse | null;
  if (!response.ok || !payload?.cart?.id) {
    throw new Error('Wix did not create a checkout cart. Please try again.');
  }
  return payload.cart.id;
}
