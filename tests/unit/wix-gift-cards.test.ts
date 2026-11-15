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
      senderPhone: '+972-54-123-4567',
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

    expect(fetchWithAuthMock).toHaveBeenCalledWith(
      'https://www.wixapis.com/ecom/v2/carts/cart-500-sunset',
      expect.objectContaining({
        method: 'PATCH',
      })
    );
    const patchBody = JSON.parse(String((fetchWithAuthMock.mock.calls[0]?.[1] as { body: string }).body));
    expect(patchBody).toEqual({
      cart: {
        id: 'cart-500-sunset',
        customerInfo: {
          firstName: 'Danielle',
          lastName: 'Cohen',
          email: 'danielle@example.com',
          phone: '+972541234567',
        },
        deliveryInfo: {
          address: {
            country: 'IL',
            subdivision: '',
            postalCode: '',
          },
        },
        paymentInfo: {
          billingContact: {
            firstName: 'Danielle',
            lastName: 'Cohen',
            phone: '+972541234567',
          },
          billingAddress: {
            country: 'IL',
            subdivision: '',
            postalCode: '',
          },
        },
      },
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

    const fetchWithAuthMock = vi.fn().mockResolvedValue({ ok: true });
    vi.spyOn(clientModule, 'getWixClient').mockReturnValue({
      fetchWithAuth: fetchWithAuthMock,
    } as unknown as ReturnType<typeof clientModule.getWixClient>);

    const result = await createWixGiftCardCheckout({
      amountIls: 400,
      recipientName: 'Aviad Stern',
      recipientEmail: '',
      senderName: 'Danielle Cohen',
      senderEmail: 'danielle@example.com',
      senderPhone: '054-123-4567',
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

    const patchBody = JSON.parse(String((fetchWithAuthMock.mock.calls[0]?.[1] as { body: string }).body));
    expect(patchBody.cart.customerInfo.phone).toBe('+972541234567');
    expect(patchBody.cart.paymentInfo.billingContact.phone).toBe('+972541234567');
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
          senderPhone: '+972541234567',
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

  it('rejects an invalid senderPhone with a 400 CheckoutError before calling Wix', async () => {
    const wixPostSpy = vi.spyOn(clientModule, 'wixPost');

    await expect(
      createWixGiftCardCheckout({
        amountIls: 300,
        giftCardDesignId: 'sunset',
        recipientName: 'Aviad Stern',
        recipientEmail: 'aviad@example.com',
        senderName: 'Danielle Cohen',
        senderEmail: 'danielle@example.com',
        senderPhone: '12345',
        personalMessage: '',
      })
    ).rejects.toMatchObject({
      status: 400,
    });

    expect(wixPostSpy).not.toHaveBeenCalled();
  });

  it('warns without failing checkout when the cart prefill PATCH returns non-ok', async () => {
    vi.spyOn(clientModule, 'wixPost')
      .mockResolvedValueOnce({ giftCardProducts: [] })
      .mockResolvedValueOnce({ cart: { id: 'cart-warn-500' } })
      .mockResolvedValueOnce({
        checkoutUrl: 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com/checkout?checkoutId=cart-warn-500',
      });
    vi.spyOn(clientModule, 'getWixClient').mockReturnValue({
      fetchWithAuth: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'upstream error',
      }),
    } as unknown as ReturnType<typeof clientModule.getWixClient>);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await createWixGiftCardCheckout({
      amountIls: 500,
      giftCardDesignId: 'sunset',
      recipientName: 'Aviad Stern',
      recipientEmail: 'aviad@example.com',
      senderName: 'Danielle Cohen',
      senderEmail: 'danielle@example.com',
      senderPhone: '+972541234567',
      personalMessage: '',
    });

    expect(result.cartId).toBe('cart-warn-500');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[wix:gift-cards] Non-fatal customerInfo prefill error'),
      500,
      'upstream error'
    );
  });

  it('forwards optional senderBirthDate to Wix _user_fields and falls back without it on rejection', async () => {
    vi.spyOn(clientModule, 'wixPost')
      .mockResolvedValueOnce({ giftCardProducts: [] })
      .mockResolvedValueOnce({ cart: { id: 'cart-bday-500' } })
      .mockResolvedValueOnce({
        checkoutUrl: 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com/checkout?checkoutId=cart-bday-500',
      });
    const fetchWithAuthMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'unknown extended field',
      })
      .mockResolvedValueOnce({ ok: true });
    vi.spyOn(clientModule, 'getWixClient').mockReturnValue({
      fetchWithAuth: fetchWithAuthMock,
    } as unknown as ReturnType<typeof clientModule.getWixClient>);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await createWixGiftCardCheckout({
      amountIls: 500,
      giftCardDesignId: 'sunset',
      recipientName: 'Aviad Stern',
      recipientEmail: 'aviad@example.com',
      senderName: 'Danielle Cohen',
      senderEmail: 'danielle@example.com',
      senderPhone: '054-765-4321',
      senderBirthDate: '1990-05-15',
      personalMessage: '',
    });

    expect(fetchWithAuthMock).toHaveBeenCalledTimes(2);
    const firstPatch = JSON.parse(String((fetchWithAuthMock.mock.calls[0]?.[1] as { body: string }).body));
    expect(firstPatch.cart.extendedFields).toEqual({
      namespaces: {
        _user_fields: {
          form_field: '1990-05-15',
        },
      },
    });
    expect(firstPatch.cart.paymentInfo.billingAddress.country).toBe('IL');

    const fallbackPatch = JSON.parse(String((fetchWithAuthMock.mock.calls[1]?.[1] as { body: string }).body));
    expect(fallbackPatch.cart.extendedFields).toBeUndefined();
    expect(fallbackPatch.cart.customerInfo.email).toBe('danielle@example.com');
    expect(fallbackPatch.cart.paymentInfo.billingAddress).toEqual({
      country: 'IL',
      subdivision: '',
      postalCode: '',
    });
  });
});

