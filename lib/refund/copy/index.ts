import type { Language } from '@/lib/i18n/translations';
import { AR } from './ar';
import { EN } from './en';
import { ES } from './es';
import { FR } from './fr';
import { HE } from './he';
import { RU } from './ru';
import type { RefundCopy } from './refund-copy-types';

export type { RefundCopy, RefundEmailCopy } from './refund-copy-types';
export { fillCopy } from './fill-copy';

/** Form copy per language. Resolve with `refundCopyFor(language)`; English is the fallback. */
export const REFUND_COPY: Record<Language, RefundCopy> = { he: HE, en: EN, ru: RU, fr: FR, ar: AR, es: ES };

export function refundCopyFor(language: Language): RefundCopy {
  return REFUND_COPY[language] || REFUND_COPY.en;
}
