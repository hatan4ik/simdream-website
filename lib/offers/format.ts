import type { SupportedLanguage } from '@/lib/i18n/translations';

/** Date locales shared with the booking calendar (CALENDAR_LOCALIZATION.md). */
const DATE_LOCALES: Record<SupportedLanguage, string> = {
  he: 'he-IL',
  en: 'en-GB',
  ru: 'ru-RU',
  fr: 'fr-FR',
  ar: 'ar-IL',
  es: 'es-ES',
  de: 'de-DE',
};

/** Whole shekels as the site prints them elsewhere (₪1,290). */
export function formatIls(amount: number): string {
  return `₪${amount.toLocaleString('en-US')}`;
}

/** A YYYY-MM-DD calendar date in the page language, free of any time zone shift. */
export function formatCalendarDate(isoDate: string, language: SupportedLanguage): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(DATE_LOCALES[language] || DATE_LOCALES.en, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(instant);
}
