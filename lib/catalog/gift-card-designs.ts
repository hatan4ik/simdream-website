/**
 * Locally served art for the digital gift-card preview and the activation email.
 *
 * Every design ships twice, both built from the master renders by
 * `scripts/build-gift-card-art.mjs`: a transparent WebP for the voucher page (the card trimmed to
 * its exact edge with clean rounded corners) and a JPEG on white for email clients. All of them
 * share one canvas, so the preview needs no per-design cropping and never cuts the logo.
 */
export const GIFT_CARD_ART = { width: 1280, height: 711 } as const;

export const GIFT_CARD_DESIGNS = [
  {
    id: 'skyline',
    nameKey: 'cardDesignSkyline',
    image: '/gift-cards/skyline.webp',
    emailImage: '/gift-cards/skyline.jpg',
    swatch: 'linear-gradient(135deg, #5aa3d0 0%, #2a5579 50%, #12304d 100%)',
  },
  {
    id: 'ivory',
    nameKey: 'cardDesignIvory',
    image: '/gift-cards/ivory.webp',
    emailImage: '/gift-cards/ivory.jpg',
    swatch: 'linear-gradient(135deg, #f6f0e4 0%, #d6c8b2 50%, #b09e84 100%)',
  },
  {
    id: 'moonlight',
    nameKey: 'cardDesignMoonlight',
    image: '/gift-cards/moonlight.webp',
    emailImage: '/gift-cards/moonlight.jpg',
    swatch: 'linear-gradient(135deg, #4a515c 0%, #2a2f38 50%, #14171d 100%)',
  },
  {
    id: 'aurora',
    nameKey: 'cardDesignAurora',
    image: '/gift-cards/aurora.webp',
    emailImage: '/gift-cards/aurora.jpg',
    swatch: 'linear-gradient(135deg, #ff6a13 0%, #ff8a3d 35%, #0aa0d8 70%, #057db0 100%)',
  },
  {
    id: 'sunset',
    nameKey: 'cardDesignSunset',
    image: '/gift-cards/sunset.webp',
    emailImage: '/gift-cards/sunset.jpg',
    swatch: 'linear-gradient(135deg, #7d8ea3 0%, #d98a3a 45%, #6b2f12 100%)',
  },
  {
    id: 'dusk',
    nameKey: 'cardDesignDusk',
    image: '/gift-cards/dusk.webp',
    emailImage: '/gift-cards/dusk.jpg',
    swatch: 'linear-gradient(135deg, #4c5a85 0%, #5b5876 45%, #b0784f 100%)',
  },
  {
    id: 'pearl',
    nameKey: 'cardDesignPearl',
    image: '/gift-cards/pearl.webp',
    emailImage: '/gift-cards/pearl.jpg',
    swatch: 'linear-gradient(135deg, #f4f2ef 0%, #d3cfc9 55%, #b3aea7 100%)',
  },
] as const;

export type GiftCardDesignId = (typeof GIFT_CARD_DESIGNS)[number]['id'];

// Pearl is the clearest high-contrast default when the gift-card panel first opens.
export const DEFAULT_GIFT_CARD_DESIGN_ID: GiftCardDesignId = 'pearl';

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
