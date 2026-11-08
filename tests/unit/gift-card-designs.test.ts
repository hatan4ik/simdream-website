import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  DEFAULT_GIFT_CARD_DESIGN_ID,
  GIFT_CARD_ART,
  GIFT_CARD_DESIGNS,
  MIN_GIFT_VOUCHER_AMOUNT_ILS,
  getGiftCardDesign,
  giftCardDesignForAmount,
  isGiftCardDesignId,
} from '@/lib/catalog/gift-card-designs';

describe('gift-card design registry', () => {
  it('offers seven locally served, optimized visual directions with a safe default', () => {
    expect(GIFT_CARD_DESIGNS).toHaveLength(7);
    expect(getGiftCardDesign(DEFAULT_GIFT_CARD_DESIGN_ID).id).toBe(DEFAULT_GIFT_CARD_DESIGN_ID);
    expect(GIFT_CARD_DESIGNS.every((design) => design.image.startsWith('/gift-cards/') && design.emailImage.startsWith('/gift-cards/'))).toBe(true);
    expect(new Set(GIFT_CARD_DESIGNS.map((design) => design.id)).size).toBe(GIFT_CARD_DESIGNS.length);
  });

  it('only accepts registry IDs and safely falls back for an untrusted design value', () => {
    expect(isGiftCardDesignId('aurora')).toBe(true);
    expect(isGiftCardDesignId('https://untrusted.example.invalid/card.jpg')).toBe(false);
    expect(getGiftCardDesign('https://untrusted.example.invalid/card.jpg').id).toBe(DEFAULT_GIFT_CARD_DESIGN_ID);
  });

  it('sells every design at one balance, from the minimum purchase up', () => {
    expect(Object.fromEntries(GIFT_CARD_DESIGNS.map((design) => [design.id, design.amountIls]))).toEqual({
      skyline: 50,
      ivory: 100,
      moonlight: 200,
      aurora: 300,
      sunset: 500,
      dusk: 700,
      pearl: 1000,
    });
    expect(Math.min(...GIFT_CARD_DESIGNS.map((design) => design.amountIls))).toBe(MIN_GIFT_VOUCHER_AMOUNT_ILS);
    expect(new Set(GIFT_CARD_DESIGNS.map((design) => design.amountIls)).size).toBe(GIFT_CARD_DESIGNS.length);
    expect(giftCardDesignForAmount(300)?.id).toBe('aurora');
    expect(giftCardDesignForAmount(250)).toBeUndefined();
  });

  // The preview shows each card whole at its natural proportions, with no per-design cropping, so
  // every file must share one canvas and the web art must keep its transparent rounded corners.
  describe('art files', () => {
    const publicFile = (path: string) => join(process.cwd(), 'public', path);

    it.each(GIFT_CARD_DESIGNS.map((design) => [design.id, design] as const))('ships %s with matching web and email art', async (_id, design) => {
      expect(existsSync(publicFile(design.image)), design.image).toBe(true);
      expect(existsSync(publicFile(design.emailImage)), design.emailImage).toBe(true);

      const web = await sharp(publicFile(design.image)).metadata();
      expect(web.format).toBe('webp');
      expect([web.width, web.height]).toEqual([GIFT_CARD_ART.width, GIFT_CARD_ART.height]);
      expect(web.hasAlpha).toBe(true);

      const email = await sharp(publicFile(design.emailImage)).metadata();
      expect(email.format).toBe('jpeg');
      // Same proportions as the web art, so the email shows the same composition.
      expect(email.width! / email.height!).toBeCloseTo(GIFT_CARD_ART.width / GIFT_CARD_ART.height, 2);
    });

    it.each(GIFT_CARD_DESIGNS.map((design) => [design.id, design] as const))('leaves the corners of %s transparent and the card body opaque', async (_id, design) => {
      const { data, info } = await sharp(publicFile(design.image)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
      expect(alphaAt(0, 0)).toBe(0);
      expect(alphaAt(info.width - 1, info.height - 1)).toBe(0);
      expect(alphaAt(Math.floor(info.width / 2), Math.floor(info.height / 2))).toBe(255);
    });

    it('keeps the web art light enough for a phone', () => {
      for (const design of GIFT_CARD_DESIGNS) {
        expect(statSizeKb(publicFile(design.image)), design.image).toBeLessThan(150);
      }
    });
  });
});

function statSizeKb(path: string): number {
  return statSync(path).size / 1024;
}
