import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { POST as checkoutPost } from '@/app/api/checkout/route';
import {
  WIX_GIFT_CARDS_APP_ID,
  WIX_GIFT_CARD_PRODUCT_ID,
  WIX_GIFT_CARD_VARIANT_IDS,
  createWixGiftCardCheckout,
  resolveWixGiftCardVariant,
} from '@/lib/wix/gift-cards';
import * as clientModule from '@/lib/wix/client';

describe('Wix Gift Cards catalog & checkout integration', () => {
  const originalClientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_WIX_CLIENT_ID = 'e03e8493-b29e-4681-9a76-30685ff52096';
  });

  afterEach(() => {
    if (originalClientId !== undefined) {
      process.env.NEXT_PUBLIC_WIX_CLIENT_ID = originalClientId;
    } else {
      delete process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
    }
    vi.restoreAllMocks();
  });

  it('resolves the exact Wix variantId for each of the 7 signature design tiers', async () => {
    vi.spyOn(clientModule, 'wixPost').mockResolvedValue({ giftCardProducts: [] });

    for (const [amount, expectedVariantId] of [
      [50, WIX_GIFT_CARD_VARIANT_IDS[50]],
      [100, WIX_GIFT_CARD_VARIANT_IDS[100]],
      [200, WIX_GIFT_CARD_VARIANT_IDS[200]],
      [300, WIX_GIFT_CARD_VARIANT_IDS[300]],
      [500, WIX_GIFT_CARD_VARIANT_IDS[500]],
      [700, WIX_GIFT_CARD_VARIANT_IDS[700]],
      [1000, WIX_GIFT_CARD_VARIANT_IDS[1000]],
    ] as const) {
      const resolved = await resolveWixGiftCardVariant({ amountIls: amount });
      expect(resolved).toEqual({
        productId: WIX_GIFT_CARD_PRODUCT_ID,
        variantId: expectedVariantId,
      });
    }
  });

  it('creates a Wix eCommerce Cart V2 with the chosen preset variantId and recipient metadata', async () => {
    const wixPostSpy = vi
      .spyOn(clientModule, 'wixPost')
      .mockResolvedValueOnce({
        giftCardProducts: [
          {
            id: WIX_GIFT_CARD_PRODUCT_ID,
            name: 'SimDream Gift Card',
            presetVariants: [
              {
                id: WIX_GIFT_CARD_VARIANT_IDS[500],
                price: { amount: '500' },
                value: { amount: '500' },
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        cart: { id: 'cart-500-sunset' },
      })
      .mockResolvedValueOnce({
        checkoutUrl: 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com/checkout?checkoutId=cart-500-sunset',
      });

    const fetchWithAuthMock = vi.fn().mockResolvedValue({ ok: true });
    vi.spyOn(clientModule, 'getWixClient').mockReturnValue({
      fetchWithAuth: fetchWithAuthMock,
    } as unknown as ReturnType<typeof clientModule.getWixClient>);

    const result = await createWixGiftCardCheckout({
      amountIls: 500,
      giftCardDesignId: 'sunset',
      recipientName: 'Aviad Stern',
      recipientEmail: 'aviad@example.com',
      senderName: 'Danielle Cohen',
      senderEmail: 'danielle@example.com',
      personalMessage: 'Happy Birthday Captain!',
    });

    expect(result).toEqual({
      kind: 'wix',
      url: 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com/checkout?checkoutId=cart-500-sunset',
      cartId: 'cart-500-sunset',
      variantId: WIX_GIFT_CARD_VARIANT_IDS[500],
      amountIls: 500,
    });

    expect(wixPostSpy).toHaveBeenCalledWith('https://www.wixapis.com/ecom/v2/carts', {
      cart: { source: { channelType: 'WEB' } },
      catalogItems: [
        {
          quantity: 1,
          catalogReference: {
            appId: WIX_GIFT_CARDS_APP_ID,
            catalogItemId: WIX_GIFT_CARD_PRODUCT_ID,
            options: {
              variantId: WIX_GIFT_CARD_VARIANT_IDS[500],
              recipientEmail: 'aviad@example.com',
              recipientName: 'Aviad Stern',
              senderName: 'Danielle Cohen',
              message: 'Happy Birthday Captain!',
            },
          },
        },
      ],
    });
  });

  it('uses customAmount and falls back to senderEmail when recipientEmail is omitted (print mode)', async () => {
    const wixPostSpy = vi
      .spyOn(clientModule, 'wixPost')
      .mockResolvedValueOnce({ giftCardProducts: [] })
      .mockResolvedValueOnce({ cart: { id: 'cart-custom-400' } })
      .mockResolvedValueOnce({
        checkoutUrl: 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com/checkout?checkoutId=cart-custom-400',
      });

    vi.spyOn(clientModule, 'getWixClient').mockReturnValue({
      fetchWithAuth: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as ReturnType<typeof clientModule.getWixClient>);

    const result = await createWixGiftCardCheckout({
      amountIls: 400,
      recipientName: 'Aviad Stern',
      recipientEmail: '',
      senderName: 'Danielle Cohen',
      senderEmail: 'danielle@example.com',
      personalMessage: '',
    });

    expect(result.variantId).toBeNull();
    expect(result.amountIls).toBe(400);
    expect(wixPostSpy).toHaveBeenCalledWith('https://www.wixapis.com/ecom/v2/carts', {
      cart: { source: { channelType: 'WEB' } },
      catalogItems: [
        {
          quantity: 1,
          catalogReference: {
            appId: WIX_GIFT_CARDS_APP_ID,
            catalogItemId: WIX_GIFT_CARD_PRODUCT_ID,
            options: {
              customAmount: 400,
              recipientEmail: 'danielle@example.com',
              recipientName: 'Aviad Stern',
              senderName: 'Danielle Cohen',
            },
          },
        },
      ],
    });
  });

  it('routes POST /api/checkout voucher requests to Wix Gift Cards when Stripe is not configured', async () => {
    vi.spyOn(clientModule, 'wixPost')
      .mockResolvedValueOnce({ giftCardProducts: [] })
      .mockResolvedValueOnce({ cart: { id: 'cart-route-300' } })
      .mockResolvedValueOnce({
        checkoutUrl: 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com/checkout?checkoutId=cart-route-300',
      });
    vi.spyOn(clientModule, 'getWixClient').mockReturnValue({
      fetchWithAuth: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as ReturnType<typeof clientModule.getWixClient>);

    const response = await checkoutPost(
      new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'voucher',
          amountIls: 300,
          giftCardDesignId: 'aurora',
          recipientName: 'Aviad Stern',
          recipientEmail: 'aviad@example.com',
          senderName: 'Danielle Cohen',
          senderEmail: 'danielle@example.com',
          personalMessage: 'Clear skies!',
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      kind: 'wix',
      cartId: 'cart-route-300',
      variantId: WIX_GIFT_CARD_VARIANT_IDS[300],
      amountIls: 300,
    });
  });
});

