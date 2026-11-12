import type { Language } from '@/lib/i18n/translations';
import { REFUND_POLICY } from './refund-policy';

/**
 * Dates for the refund form in the page language. Western digits everywhere (Arabic uses the
 * Latin-digit variant, as the rest of the site does) and the Gregorian calendar.
 */
const LOCALES: Record<Language, string> = {
  he: 'he-IL',
  en: 'en-GB',
  ru: 'ru-RU',
  fr: 'fr-FR',
  ar: 'ar-u-ca-gregory-nu-latn',
  es: 'es-ES',
};

const localeFor = (language: Language) => LOCALES[language] || LOCALES.en;

/** A calendar date (`YYYY-MM-DD`) as, for example, "Sat, 14 Nov 2026". Time zones cannot shift it. */
export function formatSessionDate(language: Language, ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Intl.DateTimeFormat(localeFor(language), {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/** An instant on the Israel clock as, for example, "Sat, 14 Nov, 10:00". */
export function formatInstantInIsrael(language: Language, iso: string): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    timeZone: REFUND_POLICY.timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}
