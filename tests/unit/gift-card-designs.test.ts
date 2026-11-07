import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GIFT_CARD_DESIGN_ID,
  GIFT_CARD_DESIGNS,
  getGiftCardDesign,
  isGiftCardDesignId,
} from '@/lib/catalog/gift-card-designs';

describe('gift-card design registry', () => {
  it('offers seven locally served, optimized visual directions with a safe default', () => {
    expect(GIFT_CARD_DESIGNS).toHaveLength(7);
    expect(getGiftCardDesign(DEFAULT_GIFT_CARD_DESIGN_ID).id).toBe(DEFAULT_GIFT_CARD_DESIGN_ID);
    expect(GIFT_CARD_DESIGNS.every((design) => design.image.startsWith('/gift-cards/'))).toBe(true);
    expect(new Set(GIFT_CARD_DESIGNS.map((design) => design.id)).size).toBe(GIFT_CARD_DESIGNS.length);
  });

  it('only accepts registry IDs and safely falls back for an untrusted design value', () => {
    expect(isGiftCardDesignId('aurora')).toBe(true);
    expect(isGiftCardDesignId('https://untrusted.example.invalid/card.jpg')).toBe(false);
    expect(getGiftCardDesign('https://untrusted.example.invalid/card.jpg').id).toBe(DEFAULT_GIFT_CARD_DESIGN_ID);
  });
});
