import type { Language } from '@/lib/i18n/translations';

/**
 * 7-language checkout copy for returning-captain loyalty tiers, non-stackable
 * discounted packages, single-winner promotion notices, and Gift Certificate /
 * prepaid flight mode. Kept pure and decoupled from heavy client bundles.
 */
export interface LoyaltyCheckoutCopy {
  /** Compact badge label for returning-captain loyalty discount. Supports `{percent}`. */
  returningTierBadge: string;
  /** Banner shown when a returning-captain loyalty tier is applied. Supports `{percent}`. */
  returningTierBanner: string;
  /** Alert shown when a discounted package (e.g. daytime promo) cannot stack with another discount. */
  nonStackablePackageAlert: string;
  /** Notice shown when a single promotion wins (e.g. birthday or coupon overrides loyalty). */
  singleWinnerNotice: string;
  /** Label for Gift Certificate / prepaid flight mode. */
  prepaidModeLabel: string;
  /** Notice explaining that prepaid flights take no discount and create no new loyalty purchase. */
  prepaidModeNotice: string;
}

export const LOYALTY_CHECKOUT_COPY: Record<Language, LoyaltyCheckoutCopy> = {
  en: {
    returningTierBadge: 'Returning Captain · {percent}% off',
    returningTierBanner: 'Welcome back — your {percent}% Returning Captain benefit is applied.',
    nonStackablePackageAlert:
      'This package already uses its special promotional price and cannot be combined with another discount.',
    singleWinnerNotice:
      'Only the highest eligible promotion applies per flight — discounts cannot be combined.',
    prepaidModeLabel: 'Gift Certificate / Prepaid Flight',
    prepaidModeNotice:
      'Prepaid flights and gift certificates do not combine with birthday, loyalty, or coupon discounts and do not count as a new paid flight.',
  },
  he: {
    returningTierBadge: 'קברניט חוזר · {percent}% הנחה',
    returningTierBanner: 'ברוך שובך — הטבת קברניט חוזר של {percent}% הופעלה עבורך.',
    nonStackablePackageAlert:
      'חבילה זו כבר כוללת מחיר מבצע מיוחד ואינה ניתנת לשילוב עם הנחה נוספת.',
    singleWinnerNotice:
      'ניתן לממש הטבה אחת בלבד בכל טיסה — ההטבה הגבוהה מבין הזכאיות מופעלת ללא כפל הנחות.',
    prepaidModeLabel: 'שובר מתנה / טיסה משולמת מראש',
    prepaidModeNotice:
      'מימוש שובר מתנה או טיסה משולמת מראש אינו כולל כפל עם הנחת יום הולדת, נאמנות או קופון ואינו נספר כרכישת טיסה חדשה.',
  },
  ru: {
    returningTierBadge: 'Постоянный капитан · скидка {percent}%',
    returningTierBanner:
      'С возвращением — ваша привилегия «Постоянный капитан» ({percent}%) уже применена.',
    nonStackablePackageAlert:
      'Этот пакет уже оформлен по специальной цене и не суммируется с другими скидками.',
    singleWinnerNotice:
      'На один полёт действует только одна максимальная скидка — акции не суммируются.',
    prepaidModeLabel: 'Подарочный сертификат / предоплаченный полёт',
    prepaidModeNotice:
      'Предоплаченные полёты и подарочные сертификаты не суммируются со скидками ко дню рождения, по программе лояльности или промокодам и не засчитываются как новая оплаченная покупка.',
  },
  fr: {
    returningTierBadge: 'Commandant fidèle · -{percent} %',
    returningTierBanner:
      'Bon retour — votre avantage Commandant fidèle de {percent} % est appliqué.',
    nonStackablePackageAlert:
      'Ce forfait bénéficie déjà d’un tarif promotionnel et ne peut pas être cumulé avec une autre remise.',
    singleWinnerNotice:
      'Une seule promotion s’applique par vol (la plus avantageuse) — les remises ne sont pas cumulables.',
    prepaidModeLabel: 'Bon cadeau / Vol prépayé',
    prepaidModeNotice:
      'Les vols prépayés et bons cadeaux ne se cumulent pas avec les remises anniversaire, fidélité ou coupon et ne génèrent pas de nouvel achat fidélité.',
  },
  ar: {
    returningTierBadge: 'قبطان عائد · خصم {percent}%',
    returningTierBanner:
      'مرحبًا بعودتك — تم تطبيق ميزة القبطان العائد بنسبة {percent}%.',
    nonStackablePackageAlert:
      'تتضمن هذه الباقة سعرًا ترويجيًا خاصًا بالفعل ولا يمكن دمجها مع خصم آخر.',
    singleWinnerNotice:
      'يُطبق عرض واحد فقط لكل رحلة (الأعلى قيمة) — لا يمكن جمع الخصومات.',
    prepaidModeLabel: 'قسيمة هدية / رحلة مدفوعة مسبقًا',
    prepaidModeNotice:
      'لا تجتمع الرحلات المدفوعة مسبقًا وقسائم الهدايا مع خصومات عيد الميلاد أو الولاء أو القسائم، ولا تُحتسب كعملية شراء مدفوعة جديدة.',
  },
  es: {
    returningTierBadge: 'Capitán recurrente · {percent}% dto.',
    returningTierBanner:
      'Bienvenido de nuevo — se ha aplicado tu beneficio de Capitán recurrente del {percent}%.',
    nonStackablePackageAlert:
      'Este paquete ya tiene un precio promocional especial y no puede combinarse con otro descuento.',
    singleWinnerNotice:
      'Solo se aplica una promoción por vuelo (la de mayor valor) — los descuentos no son acumulables.',
    prepaidModeLabel: 'Certificado de regalo / Vuelo prepagado',
    prepaidModeNotice:
      'Los vuelos prepagados y certificados de regalo no se combinan con descuentos de cumpleaños, fidelidad ni cupones, y no cuentan como una nueva compra pagada.',
  },
  de: {
    returningTierBadge: 'Wiederkehrender Kapitän · {percent} % Rabatt',
    returningTierBanner:
      'Willkommen zurück — Ihr Vorteil für wiederkehrende Kapitäne ({percent} %) wurde angewendet.',
    nonStackablePackageAlert:
      'Dieses Paket nutzt bereits einen Aktionspreis und kann nicht mit einem weiteren Rabatt kombiniert werden.',
    singleWinnerNotice:
      'Pro Flug gilt nur die jeweils höchste berechtigte Vergünstigung — Rabatte sind nicht kombinierbar.',
    prepaidModeLabel: 'Geschenkgutschein / Vorausbezahlter Flug',
    prepaidModeNotice:
      'Vorausbezahlte Flüge und Geschenkgutscheine sind nicht mit Geburtstags-, Treue- oder Gutscheinrabatten kombinierbar und zählen nicht als neuer bezahlter Treuekauf.',
  },
};

export function getLoyaltyCheckoutCopy(language: Language): LoyaltyCheckoutCopy {
  return LOYALTY_CHECKOUT_COPY[language] ?? LOYALTY_CHECKOUT_COPY.en;
}

export function formatLoyaltyPercent(template: string, percent: number): string {
  return template.replaceAll('{percent}', String(percent));
}
