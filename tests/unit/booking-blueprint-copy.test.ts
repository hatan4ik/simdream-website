import { describe, expect, it } from 'vitest';
import { BOOKING_BLUEPRINT_COPY } from '@/lib/i18n/booking-blueprint-copy';
import type { Language } from '@/lib/i18n/translations';

const LANGUAGES: Language[] = ['en', 'he', 'ru', 'fr', 'ar', 'es'];

describe('booking blueprint copy', () => {
  it.each(LANGUAGES)('provides a complete, usable inclusions dialog in %s', (language) => {
    const copy = BOOKING_BLUEPRINT_COPY[language] ?? BOOKING_BLUEPRINT_COPY.en;

    expect(copy.whatIncludedBtn).not.toHaveLength(0);
    expect(copy.badge).not.toHaveLength(0);
    expect(copy.missionArch).not.toHaveLength(0);
    expect(copy.duration(60)).toContain('60');
    expect(copy.handsOnPic).not.toHaveLength(0);
    expect(copy.handsOnDesc(60)).toContain('60');
    expect(copy.takeoffTitle).not.toHaveLength(0);
    expect(copy.takeoffDesc).not.toHaveLength(0);
    expect(copy.worldTitle).not.toHaveLength(0);
    expect(copy.world60).not.toHaveLength(0);
    expect(copy.world90).not.toHaveLength(0);
    expect(copy.worldPro).not.toHaveLength(0);
    expect(copy.worldBasic).not.toHaveLength(0);
    expect(copy.observersTitle).not.toHaveLength(0);
    expect(copy.observersDesc).not.toHaveLength(0);
    expect(copy.guidanceTitle).not.toHaveLength(0);
    expect(copy.guidanceDesc).not.toHaveLength(0);
    expect(copy.highlightsTitle).not.toHaveLength(0);
    expect(copy.closeBtn).not.toHaveLength(0);
    expect(copy.closeDialogLabel).not.toHaveLength(0);
    expect(copy.selectBtn('₪690')).toContain('₪690');
  });
});
