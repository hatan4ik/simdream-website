import { z } from 'zod';
import { giftCertificateAmount, giftCertificatePackageById } from '@/lib/catalog/gift-voucher-packages';
import { GIFT_CARD_DESIGNS, getGiftCardDesign, type GiftCardDesignId } from '@/lib/catalog/gift-card-designs';
import { getWixClient, wixPost } from './client';
import { isWixConfigured } from './config';
import {
  WIX_GIFT_CARDS_APP_ID,
  WIX_GIFT_CARD_PRODUCT_ID,
  WIX_GIFT_CARD_VARIANT_IDS,
  wixGiftCardVariantIdFor,
} from './catalog';

export {
  WIX_GIFT_CARDS_APP_ID,
  WIX_GIFT_CARD_PRODUCT_ID,
  WIX_GIFT_CARD_VARIANT_IDS,
  wixGiftCardVariantIdFor,
};

const WIX_GIFT_CARD_PRODUCTS_QUERY_URL = 'https://www.wixapis.com/gift-cards/v1/gift-card-products/query';
const WIX_CREATE_CART_URL = 'https://www.wixapis.com/ecom/v2/carts';

const wixMoneySchema = z
  .object({
    amount: z.string(),
    formattedAmount: z.string().optional(),
  })
  .loose();

const wixImageSchema = z
  .object({
    id: z.string().optional(),
    url: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })
  .loose();

export const wixGiftCardPresetVariantSchema = z
  .object({
    id: z.string(),
    price: wixMoneySchema,
    value: wixMoneySchema.optional(),
    image: wixImageSchema.optional(),
  })
  .loose();

export const wixGiftCardProductSchema = z
  .object({
    id: z.string(),
    revision: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    image: wixImageSchema.optional(),
    presetVariants: z.array(wixGiftCardPresetVariantSchema).default([]),
    customVariant: z
      .object({
        minValue: wixMoneySchema.optional(),
        maxValue: wixMoneySchema.optional(),
        image: wixImageSchema.optional(),
      })
      .loose()
      .optional(),
  })
  .loose();

export type WixGiftCardProduct = z.infer<typeof wixGiftCardProductSchema>;
export type WixGiftCardPresetVariant = z.infer<typeof wixGiftCardPresetVariantSchema>;

const queryGiftCardProductsResponseSchema = z
  .object({
    giftCardProducts: z.array(wixGiftCardProductSchema).default([]),
  })
  .loose();

/**
 * Queries the Wix Gift Card product configured on the headless site.
 * Returns empty array if Wix is not configured or on network error.
 */
export async function listWixGiftCardProducts(): Promise<WixGiftCardProduct[]> {
  if (!isWixConfigured()) return [];
  try {
    const raw = await wixPost<unknown>(WIX_GIFT_CARD_PRODUCTS_QUERY_URL, {
      query: { cursorPaging: { limit: 10 } },
    });
    const parsed = queryGiftCardProductsResponseSchema.safeParse(raw);
    return parsed.success ? parsed.data.giftCardProducts : [];
  } catch (err) {
    console.warn('[wix:gift-cards] Failed to query Wix gift card products:', err);
    return [];
  }
}

export interface WixGiftCardCheckoutInput {
  amountIls: number;
  recipientName: string;
  recipientEmail?: string;
  senderName: string;
  senderEmail: string;
  personalMessage?: string;
  packageId?: string;
  giftCardDesignId?: GiftCardDesignId;
}

export interface WixGiftCardCheckoutResult {
  kind: 'wix';
  url: string;
  cartId: string;
  variantId: string | null;
  amountIls: number;
}

function splitSenderName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'SimDream', lastName: 'Guest' };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: parts[0]! };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

/**
 * Resolves the Wix Gift Card product ID and either the matching preset `variantId`
 * (which carries the tier's signature card design image in Wix's "Advanced images and prices")
 * or a `customAmount` when the buyer chooses an arbitrary custom amount.
 */
export async function resolveWixGiftCardVariant(options: {
  amountIls: number;
  giftCardDesignId?: GiftCardDesignId;
}): Promise<{ productId: string; variantId: string | null }> {
  const liveProducts = await listWixGiftCardProducts();
  const liveProduct = liveProducts[0];
  const productId = liveProduct?.id || WIX_GIFT_CARD_PRODUCT_ID;

  // 1. Check live product preset variants for an exact amount match
  if (liveProduct && liveProduct.presetVariants.length > 0) {
    const liveMatch = liveProduct.presetVariants.find(
      (variant) => Number(variant.price.amount) === options.amountIls
    );
    if (liveMatch) {
      return { productId, variantId: liveMatch.id };
    }
  }

  // 2. Check static catalog map for the exact amount
  const staticVariantId = wixGiftCardVariantIdFor(options.amountIls);
  if (staticVariantId) {
    return { productId, variantId: staticVariantId };
  }

  // 3. If a signature design matches the requested amount, use its wixVariantId
  if (options.giftCardDesignId) {
    const design = getGiftCardDesign(options.giftCardDesignId);
    if (design.amountIls === options.amountIls) {
      return { productId, variantId: design.wixVariantId };
    }
  }

  // 4. Otherwise it is a custom amount (uses Wix's customVariant)
  return { productId, variantId: null };
}

/**
 * Creates a native Wix eCommerce Cart V2 containing the Gift Card product with
 * the customer's chosen tier/design `variantId` (or `customAmount`) and recipient
 * notification details, pre-fills buyer contact details, and returns the hosted
 * Wix Checkout URL.
 */
export async function createWixGiftCardCheckout(
  input: WixGiftCardCheckoutInput
): Promise<WixGiftCardCheckoutResult> {
  const matchedPkg = giftCertificatePackageById(input.packageId);
  if (input.packageId && !matchedPkg) {
    throw new Error('Select a valid flight package for this gift certificate.');
  }

  const resolvedAmountIls = matchedPkg ? giftCertificateAmount(matchedPkg) : input.amountIls;
  const { productId, variantId } = await resolveWixGiftCardVariant({
    amountIls: resolvedAmountIls,
    giftCardDesignId: matchedPkg ? undefined : input.giftCardDesignId,
  });

  const deliveryEmail = (input.recipientEmail || '').trim() || input.senderEmail.trim();
  const catalogOptions: Record<string, unknown> = {
    ...(variantId ? { variantId } : { customAmount: resolvedAmountIls }),
    recipientEmail: deliveryEmail,
    recipientName: input.recipientName.trim(),
    senderName: input.senderName.trim(),
  };
  if (input.personalMessage?.trim()) {
    catalogOptions.message = input.personalMessage.trim();
  }

  const cartResponse = await wixPost<{ cart?: { id?: string } }>(WIX_CREATE_CART_URL, {
    cart: { source: { channelType: 'WEB' } },
    catalogItems: [
      {
        quantity: 1,
        catalogReference: {
          appId: WIX_GIFT_CARDS_APP_ID,
          catalogItemId: productId,
          options: catalogOptions,
        },
      },
    ],
  });

  const cartId = cartResponse.cart?.id;
  if (!cartId) {
    throw new Error('Wix did not create a gift card checkout cart.');
  }

  const sender = splitSenderName(input.senderName);
  try {
    await getWixClient().fetchWithAuth(`${WIX_CREATE_CART_URL}/${cartId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: {
          id: cartId,
          customerInfo: {
            firstName: sender.firstName,
            lastName: sender.lastName,
            email: input.senderEmail.trim(),
          },
          paymentInfo: {
            billingContact: {
              firstName: sender.firstName,
              lastName: sender.lastName,
            },
          },
        },
      }),
    });
  } catch (err) {
    console.warn('[wix:gift-cards] Non-fatal customerInfo prefill error:', err);
  }

  const checkoutResponse = await wixPost<{ checkoutUrl?: string }>(
    `${WIX_CREATE_CART_URL}/${cartId}/get-checkout-url`,
    {}
  );
  const checkoutUrl = checkoutResponse.checkoutUrl;
  if (!checkoutUrl || new URL(checkoutUrl).protocol !== 'https:') {
    throw new Error('Wix did not return a secure checkout URL for the gift card.');
  }

  return {
    kind: 'wix',
    url: checkoutUrl,
    cartId,
    variantId,
    amountIls: resolvedAmountIls,
  };
}

export interface GiftCardVariantMismatch {
  designId: string;
  amountIls: number;
  field: 'product_missing' | 'variant_missing' | 'variant_id' | 'price';
  expected: string;
  actual: string;
}

/**
 * Verifies that the live Wix Gift Card product exists and carries all 7
 * signature design preset variants (50, 100, 200, 300, 500, 700, 1000 ILS)
 * with their canonical Wix variant UUIDs.
 */
export function reconcileGiftCardProduct(
  products: readonly WixGiftCardProduct[]
): GiftCardVariantMismatch[] {
  const product =
    products.find((entry) => entry.id === WIX_GIFT_CARD_PRODUCT_ID) ?? products[0];

  if (!product) {
    return [
      {
        designId: 'product',
        amountIls: 0,
        field: 'product_missing',
        expected: WIX_GIFT_CARD_PRODUCT_ID,
        actual: 'no gift card product found',
      },
    ];
  }

  const mismatches: GiftCardVariantMismatch[] = [];
  for (const design of GIFT_CARD_DESIGNS) {
    const byId = product.presetVariants.find((variant) => variant.id === design.wixVariantId);
    const byAmount = product.presetVariants.find(
      (variant) => Number(variant.price.amount) === design.amountIls
    );
    const matched = byId ?? byAmount;

    if (!matched) {
      mismatches.push({
        designId: design.id,
        amountIls: design.amountIls,
        field: 'variant_missing',
        expected: design.wixVariantId,
        actual: 'missing',
      });
      continue;
    }

    if (matched.id !== design.wixVariantId) {
      mismatches.push({
        designId: design.id,
        amountIls: design.amountIls,
        field: 'variant_id',
        expected: design.wixVariantId,
        actual: matched.id,
      });
    }

    if (Number(matched.price.amount) !== design.amountIls) {
      mismatches.push({
        designId: design.id,
        amountIls: design.amountIls,
        field: 'price',
        expected: String(design.amountIls),
        actual: matched.price.amount,
      });
    }
  }

  return mismatches;
}


