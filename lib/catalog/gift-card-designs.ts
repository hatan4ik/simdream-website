/**
 * Locally served art for the digital gift-card preview and the activation email.
 *
 * Every design ships twice, both built from the master renders by
 * `scripts/build-gift-card-art.mjs`: a transparent WebP for the voucher page (the card trimmed to
 * its exact edge with clean rounded corners) and a JPEG on white for email clients. All of them
 * share one canvas, so the preview needs no per-design cropping and never cuts the logo.
 */
export const GIFT_CARD_ART = { width: 1280, height: 711 } as const;

/**
 * Every card is sold at one balance, so the design and the credit are a single choice: picking a card
 * sets the credit and picking a credit shows its card. The cheapest card sets the minimum purchase.
 */
export const GIFT_CARD_DESIGNS = [
  {
    id: 'skyline',
    amountIls: 50,
    wixVariantId: '1110f759-2c10-48d0-8642-6440a873479a',
    wixMediaId: '35f77f_0ae5be7164b34fd198e7235dba41a250~mv2.jpg',
    nameKey: 'cardDesignSkyline',
    image: '/gift-cards/skyline.webp',
    emailImage: '/gift-cards/skyline.jpg',
    swatch: 'linear-gradient(135deg, #5aa3d0 0%, #2a5579 50%, #12304d 100%)',
  },
  {
    id: 'ivory',
    amountIls: 100,
    wixVariantId: 'c34da1c8-715f-4d6f-be19-a21eb070339b',
    wixMediaId: '35f77f_03840d97a17441bb9bd8dc3d3e9ee8cb~mv2.jpg',
    nameKey: 'cardDesignIvory',
    image: '/gift-cards/ivory.webp',
    emailImage: '/gift-cards/ivory.jpg',
    swatch: 'linear-gradient(135deg, #f6f0e4 0%, #d6c8b2 50%, #b09e84 100%)',
  },
  {
    id: 'moonlight',
    amountIls: 200,
    wixVariantId: 'eace71a8-411f-4a85-91d2-27e123def4f7',
    wixMediaId: '35f77f_429aa27e011d413d994f9f43cb566499~mv2.jpg',
    nameKey: 'cardDesignMoonlight',
    image: '/gift-cards/moonlight.webp',
    emailImage: '/gift-cards/moonlight.jpg',
    swatch: 'linear-gradient(135deg, #4a515c 0%, #2a2f38 50%, #14171d 100%)',
  },
  {
    id: 'aurora',
    amountIls: 300,
    wixVariantId: 'b7bc2dc9-133d-42ad-b729-f71e20ce560e',
    wixMediaId: '35f77f_d5047e5773b74deeb5226bdc3db79b73~mv2.jpg',
    nameKey: 'cardDesignAurora',
    image: '/gift-cards/aurora.webp',
    emailImage: '/gift-cards/aurora.jpg',
    swatch: 'linear-gradient(135deg, #ff6a13 0%, #ff8a3d 35%, #0aa0d8 70%, #057db0 100%)',
  },
  {
    id: 'sunset',
    amountIls: 500,
    wixVariantId: 'f9a449f3-8a4e-4661-8d52-4cd61f896a66',
    wixMediaId: '35f77f_c1482f572fef44818b1c3997769f08c9~mv2.jpg',
    nameKey: 'cardDesignSunset',
    image: '/gift-cards/sunset.webp',
    emailImage: '/gift-cards/sunset.jpg',
    swatch: 'linear-gradient(135deg, #7d8ea3 0%, #d98a3a 45%, #6b2f12 100%)',
  },
  {
    id: 'dusk',
    amountIls: 700,
    wixVariantId: 'f92531a5-dda1-46c6-82b6-8dcd739af8ff',
    wixMediaId: '35f77f_fb3c8442edce4d1abbca1928d31b9a58~mv2.jpg',
    nameKey: 'cardDesignDusk',
    image: '/gift-cards/dusk.webp',
    emailImage: '/gift-cards/dusk.jpg',
    swatch: 'linear-gradient(135deg, #4c5a85 0%, #5b5876 45%, #b0784f 100%)',
  },
  {
    id: 'pearl',
    amountIls: 1000,
    wixVariantId: 'ee1dc594-f0a8-48bf-bb0b-80afef7f4736',
    wixMediaId: '35f77f_77a32dc071b743569beca48030a7772c~mv2.jpg',
    nameKey: 'cardDesignPearl',
    image: '/gift-cards/pearl.webp',
    emailImage: '/gift-cards/pearl.jpg',
    swatch: 'linear-gradient(135deg, #f4f2ef 0%, #d3cfc9 55%, #b3aea7 100%)',
  },
] as const;

export const MIN_GIFT_VOUCHER_AMOUNT_ILS = 50;

export type GiftCardDesignId = (typeof GIFT_CARD_DESIGNS)[number]['id'];

// Pearl is the clearest high-contrast default when the gift-card panel first opens.
export const DEFAULT_GIFT_CARD_DESIGN_ID: GiftCardDesignId = 'pearl';

// Custom amounts on Wix Gift Cards use the default product image (Aurora).
export const GIFT_CARD_CUSTOM_DESIGN_ID: GiftCardDesignId = 'aurora';

export function getGiftCardDesign(id: string | undefined) {
  return (
    GIFT_CARD_DESIGNS.find((design) => design.id === id) ??
    GIFT_CARD_DESIGNS.find((design) => design.id === DEFAULT_GIFT_CARD_DESIGN_ID) ??
    GIFT_CARD_DESIGNS[0]
  );
}

export function isGiftCardDesignId(id: string): id is GiftCardDesignId {
  return GIFT_CARD_DESIGNS.some((design) => design.id === id);
}

/** The card sold at exactly this balance, or undefined for a custom amount. */
export function giftCardDesignForAmount(amountIls: number) {
  return GIFT_CARD_DESIGNS.find((design) => design.amountIls === amountIls);
}

export const getGiftCardDesignByAmount = giftCardDesignForAmount;
