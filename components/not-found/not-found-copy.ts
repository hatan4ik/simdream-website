import type { Language } from '@/lib/i18n/translations';

/**
 * Copy for the 404 page, in all seven languages. Only the words this page adds live here: the
 * "Book" and "Contact" labels are the header's own (`t.nav.bookFlight`, `t.nav.contact`), so the
 * page never names a destination differently from the navigation above it. Typed as a full
 * `Record<Language, …>`, a language added to the site without 404 copy fails the type check.
 */
export interface NotFoundCopy {
  /** The page's one h1 (the "404" code beside it is decorative). */
  title: string;
  /** One calm sentence: the link may be old or mistyped, and where to go instead. */
  intro: string;
  /** Label of the link to the home page. */
  home: string;
}

export const NOT_FOUND_COPY: Record<Language, NotFoundCopy> = {
  en: {
    title: 'Page not found',
    intro: 'This link may be outdated or mistyped. Pick up from one of these instead.',
    home: 'Home page',
  },
  he: {
    title: 'הדף לא נמצא',
    intro: 'ייתכן שהקישור ישן או שהוקלד בטעות. אפשר להמשיך מאחת האפשרויות האלה.',
    home: 'דף הבית',
  },
  ru: {
    title: 'Страница не найдена',
    intro: 'Возможно, ссылка устарела или в ней опечатка. Продолжите с одного из этих разделов.',
    home: 'Главная страница',
  },
  fr: {
    title: 'Page introuvable',
    intro: "Ce lien est peut-être périmé ou comporte une faute de frappe. Reprenez depuis l'un de ces accès.",
    home: "Page d'accueil",
  },
  ar: {
    title: 'الصفحة غير موجودة',
    intro: 'ربما يكون هذا الرابط قديمًا أو مكتوبًا بشكل خاطئ. تابع من أحد هذه الخيارات.',
    home: 'الصفحة الرئيسية',
  },
  es: {
    title: 'Página no encontrada',
    intro: 'Es posible que este enlace esté desactualizado o mal escrito. Continúa desde una de estas opciones.',
    home: 'Página de inicio',
  },
  de: {
    title: 'Seite nicht gefunden',
    intro: 'Dieser Link ist möglicherweise veraltet oder falsch geschrieben. Machen Sie stattdessen mit einer dieser Optionen weiter.',
    home: 'Startseite',
  },
};

/** The copy for `language`; English when the language is unknown. */
export function notFoundCopyFor(language: Language): NotFoundCopy {
  return NOT_FOUND_COPY[language] ?? NOT_FOUND_COPY.en;
}
