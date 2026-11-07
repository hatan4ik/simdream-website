/**
 * Lightweight, locally served art directions for the digital gift-card preview.
 *
 * Each image is deliberately a 960px compressed source. Next/Image generates the
 * final responsive AVIF/WebP payload, so selecting a design never requires a
 * round-trip to a third-party image host.
 */
export const GIFT_CARD_DESIGNS = [
  {
    id: 'skyline',
    nameKey: 'cardDesignSkyline',
    image: '/gift-cards/skyline.jpg',
    swatch: 'linear-gradient(135deg, #d9f2ff 0%, #2096C7 48%, #061426 100%)',
  },
  {
    id: 'ivory',
    nameKey: 'cardDesignIvory',
    image: '/gift-cards/ivory.jpg',
    swatch: 'linear-gradient(135deg, #ffffff 0%, #ede7df 55%, #c7a78e 100%)',
  },
  {
    id: 'moonlight',
    nameKey: 'cardDesignMoonlight',
    image: '/gift-cards/moonlight.jpg',
    swatch: 'linear-gradient(135deg, #edf3fa 0%, #55677f 48%, #101827 100%)',
  },
  {
    id: 'aurora',
    nameKey: 'cardDesignAurora',
    image: '/gift-cards/aurora.jpg',
    swatch: 'linear-gradient(135deg, #ff4b2b 0%, #2096C7 52%, #1b153e 100%)',
  },
  {
    id: 'sunset',
    nameKey: 'cardDesignSunset',
    image: '/gift-cards/sunset.jpg',
    swatch: 'linear-gradient(135deg, #f09a4b 0%, #8a5544 48%, #0b2741 100%)',
  },
  {
    id: 'dusk',
    nameKey: 'cardDesignDusk',
    image: '/gift-cards/dusk.jpg',
    swatch: 'linear-gradient(135deg, #b8d8e5 0%, #d5a95f 52%, #172033 100%)',
  },
  {
    id: 'pearl',
    nameKey: 'cardDesignPearl',
    image: '/gift-cards/pearl.jpg',
    swatch: 'linear-gradient(135deg, #6e91b8 0%, #f8f4ed 52%, #d7ae67 100%)',
  },
] as const;

export type GiftCardDesignId = (typeof GIFT_CARD_DESIGNS)[number]['id'];

export const DEFAULT_GIFT_CARD_DESIGN_ID: GiftCardDesignId = 'skyline';

export function getGiftCardDesign(id: string | undefined) {
  return GIFT_CARD_DESIGNS.find((design) => design.id === id) ?? GIFT_CARD_DESIGNS[0];
}

export function isGiftCardDesignId(id: string): id is GiftCardDesignId {
  return GIFT_CARD_DESIGNS.some((design) => design.id === id);
}
