import type { Language } from '@/lib/i18n/translations';

/**
 * The "Cookie settings" label, on its own so the footer link does not pull the whole copy file
 * into every page: the banner and dialog (consent-copy.ts) load lazily, only when they are needed.
 */
export const CONSENT_LINK_LABEL: Record<Language, string> = {
  he: 'הגדרות עוגיות',
  en: 'Cookie settings',
  ru: 'Настройки cookie',
  fr: 'Paramètres des cookies',
  ar: 'إعدادات ملفات تعريف الارتباط',
  es: 'Configuración de cookies',
  de: 'Cookie-Einstellungen',
};
