import type { Language } from '@/lib/i18n/translations';

export interface UpgradePromoCopy {
  /** Badge on a mission add-on card showing the tier bump-up when added (e.g. "PROMO UPGRADE → 90m"). */
  promoUpgradeBadge: (minutes: number) => string;
  /** Discount pill when 15%+ off (e.g. "15% OFF → 120m"). */
  percentOffTierBadge: (percent: number, minutes: number) => string;
  /** Compact savings label (e.g. "Save ₪212"). */
  saveAmount: (formattedAmount: string) => string;
  /** Hint on disabled 3rd mission add-on once 2 mission upgrades are selected. */
  maxUpgradesReached: string;
  /** Label for a mission add-on bundled into an active promotional tier upgrade. */
  includedInPromo: string;
  /** Banner title in Order Summary / Buy Box when upgraded to 60m or 90m. */
  promoUpgradedTitle: (minutes: number) => string;
  /** Banner title when upgraded to 120m Grand Odyssey with discount percent. */
  grandOdysseyBanner: (percent: number) => string;
  /** Subtitle under the promo banner noting how many upgrades are bundled. */
  promoBundledNote: (count: number, minutes: number) => string;
  /** Short badge on the sticky footer when promo upgrade is active. */
  promoFooterBadge: (minutes: number, percent: number) => string;
  /** Express shop add-on subtitle noting 30m Cold & Dark and IFR durations. */
  storefrontAddonsSubtitle: string;
}

export const UPGRADE_PROMO_COPY: Record<Language, UpgradePromoCopy> = {
  en: {
    promoUpgradeBadge: (minutes) => `PROMO UPGRADE → ${minutes}m`,
    percentOffTierBadge: (percent, minutes) => `${percent}% OFF → ${minutes}m`,
    saveAmount: (amount) => `Save ${amount}`,
    maxUpgradesReached: '2 upgrades included in 120m Promo Pack — remove one to swap',
    includedInPromo: 'Included',
    promoUpgradedTitle: (minutes) => `Promotional Upgrade to ${minutes}m Session`,
    grandOdysseyBanner: (percent) => `120m Grand Odyssey • ${percent}% OFF`,
    promoBundledNote: (count, minutes) =>
      `${count} mission ${count === 1 ? 'upgrade' : 'upgrades'} bundled into a ${minutes}-minute session`,
    promoFooterBadge: (minutes, percent) =>
      percent >= 15 ? `${minutes}m Promo • ${percent}% OFF` : `${minutes}m Promo Upgrade`,
    storefrontAddonsSubtitle:
      'Add up to 2 upgrades (3-airport Trios +40m, Cold & Dark +30m, IFR weather +30m) for an instant promotional tier upgrade',
  },
  he: {
    promoUpgradeBadge: (minutes) => `שדרוג מבצע ← ${minutes} דק׳`,
    percentOffTierBadge: (percent, minutes) => `${percent}% הנחה ← ${minutes} דק׳`,
    saveAmount: (amount) => `חיסכון של ${amount}`,
    maxUpgradesReached: '2 שדרוגים כלולים בחבילת 120 דק׳ במבצע — הסירו אחד להחלפה',
    includedInPromo: 'כלול במבצע',
    promoUpgradedTitle: (minutes) => `שדרוג מבצע לסשן של ${minutes} דקות`,
    grandOdysseyBanner: (percent) => `אודיסיאת 120 דק׳ • ${percent}% הנחה`,
    promoBundledNote: (count, minutes) =>
      `${count === 1 ? 'שדרוג משימה 1 כלול' : `${count} שדרוגי משימה כלולים`} בסשן של ${minutes} דקות`,
    promoFooterBadge: (minutes, percent) =>
      percent >= 15 ? `מבצע ${minutes} דק׳ • ${percent}% הנחה` : `שדרוג מבצע ל-${minutes} דק׳`,
    storefrontAddonsSubtitle:
      'בחרו עד 2 שדרוגים (שלישיות שדות תעופה +40 דק׳, Cold & Dark +30 דק׳, מזג אוויר IFR +30 דק׳) לשדרוג אוטומטי במחיר מבצע',
  },
  ru: {
    promoUpgradeBadge: (minutes) => `ПРОМО-АПГРЕЙД → ${minutes} мин`,
    percentOffTierBadge: (percent, minutes) => `-${percent}% → ${minutes} мин`,
    saveAmount: (amount) => `Экономия ${amount}`,
    maxUpgradesReached: 'В промо-пакет 120 мин входят 2 модуля — удалите один, чтобы заменить',
    includedInPromo: 'Включено',
    promoUpgradedTitle: (minutes) => `Промо-апгрейд до сессии ${minutes} мин`,
    grandOdysseyBanner: (percent) => `Одиссея 120 мин • Скидка ${percent}%`,
    promoBundledNote: (count, minutes) =>
      `${count === 1 ? '1 модуль миссии включён' : `${count} модуля миссии включены`} в сессию ${minutes} мин`,
    promoFooterBadge: (minutes, percent) =>
      percent >= 15 ? `Промо ${minutes} мин • -${percent}%` : `Промо-апгрейд ${minutes} мин`,
    storefrontAddonsSubtitle:
      'Добавьте до 2 модулей (Трио аэропортов +40 мин, Cold & Dark +30 мин, IFR погода +30 мин) для мгновенного промо-апгрейда',
  },
  fr: {
    promoUpgradeBadge: (minutes) => `OFFRE UPGRADE → ${minutes} min`,
    percentOffTierBadge: (percent, minutes) => `-${percent}% → ${minutes} min`,
    saveAmount: (amount) => `Économisez ${amount}`,
    maxUpgradesReached: '2 modules inclus dans le pack promo 120 min — retirez-en un pour changer',
    includedInPromo: 'Inclus',
    promoUpgradedTitle: (minutes) => `Surclassement promo vers session ${minutes} min`,
    grandOdysseyBanner: (percent) => `Grande Odyssée 120 min • -${percent}%`,
    promoBundledNote: (count, minutes) =>
      `${count} ${count === 1 ? 'module de mission inclus' : 'modules de mission inclus'} dans la session de ${minutes} min`,
    promoFooterBadge: (minutes, percent) =>
      percent >= 15 ? `Promo ${minutes} min • -${percent}%` : `Upgrade promo ${minutes} min`,
    storefrontAddonsSubtitle:
      'Ajoutez jusqu’à 2 modules (Trios +40 min, Cold & Dark +30 min, météo IFR +30 min) pour un surclassement promo instantané',
  },
  ar: {
    promoUpgradeBadge: (minutes) => `ترقية عرض ← ${minutes} دقيقة`,
    percentOffTierBadge: (percent, minutes) => `خصم ${percent}% ← ${minutes} دقيقة`,
    saveAmount: (amount) => `وفّر ${amount}`,
    maxUpgradesReached: 'ترقيتان مشمولتان في باقة 120 دقيقة الترويجية — أزل واحدة للتبديل',
    includedInPromo: 'مشمول',
    promoUpgradedTitle: (minutes) => `ترقية ترويجية إلى جلسة ${minutes} دقيقة`,
    grandOdysseyBanner: (percent) => `ملحمة 120 دقيقة • خصم ${percent}%`,
    promoBundledNote: (count, minutes) =>
      `${count === 1 ? 'ترقية مهمة واحدة مشمولة' : `ترقيتا مهمة مشمولتان`} ضمن جلسة ${minutes} دقيقة`,
    promoFooterBadge: (minutes, percent) =>
      percent >= 15 ? `عرض ${minutes} د • خصم ${percent}%` : `ترقية عرض ${minutes} د`,
    storefrontAddonsSubtitle:
      'اختر حتى ترقيتين (ثلاثيات المطارات +40 د، Cold & Dark +30 د، طقس IFR +30 د) للحصول على ترقية فورية بسعر العرض',
  },
  es: {
    promoUpgradeBadge: (minutes) => `MEJORA PROMO → ${minutes} min`,
    percentOffTierBadge: (percent, minutes) => `${percent}% DTO → ${minutes} min`,
    saveAmount: (amount) => `Ahorra ${amount}`,
    maxUpgradesReached: '2 mejoras incluidas en el Pack Promo 120m — quita una para cambiar',
    includedInPromo: 'Incluido',
    promoUpgradedTitle: (minutes) => `Mejora promocional a sesión de ${minutes} min`,
    grandOdysseyBanner: (percent) => `Gran Odisea 120m • ${percent}% DTO`,
    promoBundledNote: (count, minutes) =>
      `${count} ${count === 1 ? 'mejora de misión incluida' : 'mejoras de misión incluidas'} en una sesión de ${minutes} min`,
    promoFooterBadge: (minutes, percent) =>
      percent >= 15 ? `Promo ${minutes}m • ${percent}% DTO` : `Mejora promo ${minutes}m`,
    storefrontAddonsSubtitle:
      'Elige hasta 2 mejoras (Tríos +40m, Cold & Dark +30m, clima IFR +30m) para subir de nivel con precio promocional',
  },
  de: {
    promoUpgradeBadge: (minutes) => `PROMO-UPGRADE → ${minutes} Min.`,
    percentOffTierBadge: (percent, minutes) => `${percent}% RABATT → ${minutes} Min.`,
    saveAmount: (amount) => `${amount} sparen`,
    maxUpgradesReached: '2 Upgrades im 120-Min.-Promo-Paket enthalten — eines entfernen zum Tauschen',
    includedInPromo: 'Inklusive',
    promoUpgradedTitle: (minutes) => `Promo-Upgrade auf ${minutes}-Min.-Session`,
    grandOdysseyBanner: (percent) => `120-Min. Große Odyssee • ${percent}% RABATT`,
    promoBundledNote: (count, minutes) =>
      `${count} ${count === 1 ? 'Missions-Upgrade' : 'Missions-Upgrades'} in der ${minutes}-Min.-Session enthalten`,
    promoFooterBadge: (minutes, percent) =>
      percent >= 15 ? `${minutes} Min. Promo • ${percent}% RABATT` : `${minutes} Min. Promo-Upgrade`,
    storefrontAddonsSubtitle:
      'Wählen Sie bis zu 2 Upgrades (3-Flughafen-Trios +40 Min., Cold & Dark +30 Min., IFR-Wetter +30 Min.) für ein sofortiges Promo-Upgrade',
  },
};

export function getUpgradePromoCopy(language: Language): UpgradePromoCopy {
  return UPGRADE_PROMO_COPY[language] || UPGRADE_PROMO_COPY.en;
}
