import type { SimulatorPackage } from '@/types';
import type { Language } from '@/lib/i18n/translations';

type FormulaKey = 'training' | 'fear_of_flying' | '20' | '45' | '60' | '90' | 'default';

export interface PackageFormulaBadge {
  text: string;
  cls: string;
}

const PACKAGE_FORMULA_COPY: Record<Language, Record<FormulaKey, string>> = {
  en: {
    training: '🎯 Airline Checkride • Raw Data & V1 Failure',
    fear_of_flying: '🕊️ Private Therapy & Captain Coaching • Gentle Pacing',
    20: '🛫 1 Airport Takeoff & Landing Circuit',
    45: '🌤️ Daytime Flight • 2 Landings (until 18:00)',
    60: '⭐ Takeoff/Landing + 1 World Trio (3 Airports Included)',
    90: '⚡ Takeoff/Landing + 2 World Trios + Emergencies (1–2 Pilots)',
    default: '✈️ Boeing 737 Flight Session',
  },
  he: {
    training: '🎯 הכנה למבדקי חברות תעופה • Raw Data ותקלות V1',
    fear_of_flying: '🕊️ טיפול מותאם והדרכת קברניט • בקצב רגוע ואישי',
    20: '🛫 תרגול המראה ונחיתה בשדה תעופה בודד',
    45: '🌤️ מבצע יום • 2 נחיתות (עד 18:00)',
    60: '⭐ המראה/נחיתה + שלישיית שדות תעופה עולמית (3 יעדים)',
    90: '⚡ המראה/נחיתה + 2 שלישיות Trio + תקלות (1–2 טייסים)',
    default: '✈️ סשן טיסה בבואינג 737',
  },
  ru: {
    training: '🎯 Скрининг в авиакомпании • Raw Data и отказ V1',
    fear_of_flying: '🕊️ Терапия страха полетов и коучинг с капитаном',
    20: '🛫 Взлет и посадка по кругу в 1 аэропорту',
    45: '🌤️ Дневной полет • 2 посадки (до 18:00)',
    60: '⭐ Взлет/посадка + 1 World Trio (3 аэропорта мира)',
    90: '⚡ Взлет/посадка + 2 World Trios + особые случаи (1–2 пилота)',
    default: '✈️ Полетная сессия Boeing 737',
  },
  fr: {
    training: '🎯 Sélection Compagnie • Raw Data & Panne V1',
    fear_of_flying: '🕊️ Gestion de la peur de l’avion • Rythme bienveillant',
    20: '🛫 Tour de piste décollage et atterrissage sur 1 aéroport',
    45: '🌤️ Vol journée • 2 atterrissages (jusqu’à 18h00)',
    60: '⭐ Décollage/atterrissage + 1 trio mondial (3 aéroports)',
    90: '⚡ Décollage/atterrissage + 2 trios mondiaux + pannes (1–2 pilotes)',
    default: '✈️ Session de vol Boeing 737',
  },
  ar: {
    training: '🎯 اختبارات شركات الطيران • Raw Data وطوارئ V1',
    fear_of_flying: '🕊️ علاج الخوف من الطيران مع القبطان • وتيرة مريحة',
    20: '🛫 تمرين إقلاع وهبوط ودوران في مطار واحد',
    45: '🌤️ رحلة نهارية • هبوطان كاملان (حتى 18:00)',
    60: '⭐ إقلاع/هبوط + باقة ثلاثية مطارات عالمية (3 مطارات)',
    90: '⚡ إقلاع/هبوط + باقتان ثلاثيتان + طوارئ (طيار أو طياران)',
    default: '✈️ جلسة طيران بوينغ 737',
  },
};

const PACKAGE_FORMULA_CLASSES: Record<FormulaKey, string> = {
  training: 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-bold',
  fear_of_flying: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold',
  20: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  45: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  60: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold',
  90: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold',
  default: 'bg-slate-800 text-slate-300 border-slate-700',
};

function formulaKeyFor(durationMinutes: number, category: SimulatorPackage['category']): FormulaKey {
  if (category === 'training') return 'training';
  if (category === 'fear_of_flying') return 'fear_of_flying';
  if (durationMinutes === 20 || durationMinutes === 45 || durationMinutes === 60 || durationMinutes === 90) {
    return String(durationMinutes) as Extract<FormulaKey, '20' | '45' | '60' | '90'>;
  }
  return 'default';
}

/** Shared customer-facing package summary used by both booking experiences. */
export function getPackageFormulaBadge(
  durationMinutes: number,
  category: SimulatorPackage['category'],
  language: Language
): PackageFormulaBadge {
  const key = formulaKeyFor(durationMinutes, category);
  const copy = PACKAGE_FORMULA_COPY[language] ?? PACKAGE_FORMULA_COPY.en;
  const text = key === 'default' ? `${copy.default} (${durationMinutes}m)` : copy[key];
  return { text, cls: PACKAGE_FORMULA_CLASSES[key] };
}
