import type { Language } from '@/lib/i18n/translations';

/** The site's six languages, which are also the languages review texts can be requested in. */
export const REVIEW_LANGUAGES = ['he', 'en', 'ru', 'fr', 'ar', 'es'] as const satisfies readonly Language[];

export type ReviewLanguage = (typeof REVIEW_LANGUAGES)[number];

export function isReviewLanguage(value: unknown): value is ReviewLanguage {
  return typeof value === 'string' && (REVIEW_LANGUAGES as readonly string[]).includes(value);
}

/** Hebrew and Arabic review texts read right to left whatever the page direction. */
export function reviewDirection(language: ReviewLanguage): 'rtl' | 'ltr' {
  return language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
}

const DATE_LOCALES: Record<ReviewLanguage, string> = {
  en: 'en-GB',
  he: 'he-IL',
  ru: 'ru-RU',
  fr: 'fr-FR',
  ar: 'ar-IL',
  es: 'es-ES',
};

/** "3 Nov 2026" in the visitor's language, or an empty string when Google supplied no publish time. */
export function formatReviewDate(publishedAt: string, language: ReviewLanguage): string {
  const time = Date.parse(publishedAt);
  if (!Number.isFinite(time)) return '';
  return new Intl.DateTimeFormat(DATE_LOCALES[language], { dateStyle: 'medium', timeZone: 'Asia/Jerusalem' }).format(time);
}
