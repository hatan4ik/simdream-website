import type { Language } from '@/lib/i18n/translations';

export interface ReviewsBarCopy {
  sectionLabel: string;
  open: string;
  close: string;
  heading: string;
  readAll: string;
  unavailable: string;
  rating: (rating: string, count: string) => string;
  individualRating: (rating: number) => string;
  review: (current: number, total: number) => string;
  translatedByGoogle: string;
  showOriginal: string;
  showTranslation: string;
  orderingNotice: string;
  policyNote: string;
  policyLink: string;
  authorProfile: (name: string) => string;
}

export const GOOGLE_REVIEW_POLICY_URL = 'https://support.google.com/contributionpolicy/answer/7400114';

export const REVIEWS_BAR_COPY: Record<Language, ReviewsBarCopy> = {
  en: {
    sectionLabel: 'Google reviews and quick links',
    open: 'Show recent Google reviews',
    close: 'Close Google reviews',
    heading: 'Recent Google reviews',
    readAll: 'Read all reviews on Google',
    unavailable: 'Open Sim Dream reviews on Google',
    rating: (rating, count) => `${rating} stars from ${count} Google reviews`,
    individualRating: (rating) => `${rating} out of 5 stars`,
    review: (current, total) => `Review ${current} of ${total}`,
    translatedByGoogle: 'Translated by Google',
    showOriginal: 'Show original',
    showTranslation: 'Show translation',
    orderingNotice: 'The five newest Google reviews, newest first (updated twice a day).',
    policyNote: 'Reviews are not verified by Google; Google removes fake content it identifies.',
    policyLink: 'Google review policy',
    authorProfile: (name) => `Open ${name}’s Google profile`,
  },
  he: {
    sectionLabel: 'ביקורות Google וקישורים מהירים',
    open: 'הצגת ביקורות Google עדכניות',
    close: 'סגירת ביקורות Google',
    heading: 'ביקורות Google עדכניות',
    readAll: 'לכל הביקורות ב-Google',
    unavailable: 'לצפייה בביקורות Sim Dream ב-Google',
    rating: (rating, count) => `${rating} כוכבים מתוך ${count} ביקורות Google`,
    individualRating: (rating) => `${rating} מתוך 5 כוכבים`,
    review: (current, total) => `ביקורת ${current} מתוך ${total}`,
    translatedByGoogle: 'תורגם על ידי Google',
    showOriginal: 'הצגת המקור',
    showTranslation: 'הצגת התרגום',
    orderingNotice: 'חמש ביקורות Google החדשות ביותר, מהחדשה לישנה (מתעדכן פעמיים ביום).',
    policyNote: 'הביקורות אינן מאומתות על ידי Google; Google מסירה תוכן מזויף שהיא מזהה.',
    policyLink: 'מדיניות הביקורות של Google',
    authorProfile: (name) => `לפרופיל Google של ${name}`,
  },
  ru: {
    sectionLabel: 'Отзывы Google и быстрые ссылки',
    open: 'Показать свежие отзывы Google',
    close: 'Закрыть отзывы Google',
    heading: 'Свежие отзывы Google',
    readAll: 'Все отзывы в Google',
    unavailable: 'Открыть отзывы Sim Dream в Google',
    rating: (rating, count) => `${rating} звезды: ${count} отзывов Google`,
    individualRating: (rating) => `${rating} из 5 звёзд`,
    review: (current, total) => `Отзыв ${current} из ${total}`,
    translatedByGoogle: 'Переведено Google',
    showOriginal: 'Показать оригинал',
    showTranslation: 'Показать перевод',
    orderingNotice: 'Пять самых новых отзывов Google, сначала новые (обновляется дважды в день).',
    policyNote: 'Google не проверяет отзывы, но удаляет выявленный поддельный контент.',
    policyLink: 'Правила Google для отзывов',
    authorProfile: (name) => `Открыть профиль Google: ${name}`,
  },
  fr: {
    sectionLabel: 'Avis Google et liens rapides',
    open: 'Afficher les avis Google récents',
    close: 'Fermer les avis Google',
    heading: 'Avis Google récents',
    readAll: 'Voir tous les avis sur Google',
    unavailable: 'Ouvrir les avis Sim Dream sur Google',
    rating: (rating, count) => `${rating} étoiles sur ${count} avis Google`,
    individualRating: (rating) => `${rating} sur 5 étoiles`,
    review: (current, total) => `Avis ${current} sur ${total}`,
    translatedByGoogle: 'Traduit par Google',
    showOriginal: 'Afficher l’original',
    showTranslation: 'Afficher la traduction',
    orderingNotice: 'Les cinq avis Google les plus récents, du plus récent au plus ancien (mis à jour deux fois par jour).',
    policyNote: 'Les avis ne sont pas vérifiés par Google ; Google supprime les faux contenus qu’il détecte.',
    policyLink: 'Règles Google relatives aux avis',
    authorProfile: (name) => `Ouvrir le profil Google de ${name}`,
  },
  ar: {
    sectionLabel: 'تقييمات Google وروابط سريعة',
    open: 'عرض أحدث تقييمات Google',
    close: 'إغلاق تقييمات Google',
    heading: 'أحدث تقييمات Google',
    readAll: 'عرض جميع التقييمات على Google',
    unavailable: 'فتح تقييمات Sim Dream على Google',
    rating: (rating, count) => `${rating} نجوم من ${count} تقييمات Google`,
    individualRating: (rating) => `${rating} من 5 نجوم`,
    review: (current, total) => `التقييم ${current} من ${total}`,
    translatedByGoogle: 'ترجمة Google',
    showOriginal: 'عرض النص الأصلي',
    showTranslation: 'عرض الترجمة',
    orderingNotice: 'أحدث خمسة تقييمات على Google، الأحدث أولًا (يُحدَّث مرتين يوميًا).',
    policyNote: 'لا تتحقق Google من التقييمات، لكنها تزيل المحتوى المزيف الذي ترصده.',
    policyLink: 'سياسة التقييمات في Google',
    authorProfile: (name) => `فتح ملف ${name} على Google`,
  },
  es: {
    sectionLabel: 'Reseñas de Google y enlaces rápidos',
    open: 'Mostrar reseñas recientes de Google',
    close: 'Cerrar reseñas de Google',
    heading: 'Reseñas recientes de Google',
    readAll: 'Leer todas las reseñas en Google',
    unavailable: 'Abrir reseñas de Sim Dream en Google',
    rating: (rating, count) => `${rating} estrellas de ${count} reseñas de Google`,
    individualRating: (rating) => `${rating} de 5 estrellas`,
    review: (current, total) => `Reseña ${current} de ${total}`,
    translatedByGoogle: 'Traducido por Google',
    showOriginal: 'Mostrar original',
    showTranslation: 'Mostrar traducción',
    orderingNotice: 'Las cinco reseñas de Google más recientes, de la más reciente a la más antigua (se actualiza dos veces al día).',
    policyNote: 'Google no verifica las reseñas; elimina el contenido falso que detecta.',
    policyLink: 'Política de reseñas de Google',
    authorProfile: (name) => `Abrir el perfil de Google de ${name}`,
  },
  de: {
    sectionLabel: 'Google-Bewertungen',
    open: 'Aktuelle Google-Bewertungen öffnen',
    close: 'Aktuelle Google-Bewertungen schließen',
    heading: 'Neueste Google-Bewertungen',
    readAll: 'Alle auf Google lesen',
    unavailable: 'Neueste Bewertungen sind vorübergehend nicht verfügbar.',
    rating: (rating, count) => `Google-Bewertung ${rating} von 5 Sternen aus ${count} Bewertungen`,
    individualRating: (rating) => `${rating} von 5 Sternen`,
    review: (current, total) => `Bewertung ${current} von ${total}`,
    translatedByGoogle: 'Übersetzt von Google',
    showOriginal: 'Original anzeigen',
    showTranslation: 'Übersetzung anzeigen',
    orderingNotice: 'Die fünf neuesten Google-Bewertungen, sortiert von neu nach alt (zweimal täglich aktualisiert).',
    policyNote: 'Google überprüft Bewertungen nicht; erkannte Falschinhalte werden entfernt.',
    policyLink: 'Google-Richtlinie für Rezensionen',
    authorProfile: (name) => `Google-Profil von ${name} öffnen`,
  },
};

export const DROPDOWN_REVIEW_LIMIT = 3;

export type ReviewNouns = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/** "reviews" in each language, by CLDR plural category, so 1, 2, 5 and 21 all read correctly. */
export const REVIEW_NOUNS: Record<Language, ReviewNouns> = {
  en: { one: 'review', other: 'reviews' },
  he: { one: 'ביקורת', other: 'ביקורות' },
  ru: { one: 'отзыв', few: 'отзыва', many: 'отзывов', other: 'отзыва' },
  fr: { one: 'avis', other: 'avis' },
  ar: { zero: 'تقييم', one: 'تقييم', two: 'تقييمان', few: 'تقييمات', many: 'تقييمًا', other: 'تقييم' },
  es: { one: 'reseña', other: 'reseñas' },
  de: { one: 'Bewertung', other: 'Bewertungen' },
};
