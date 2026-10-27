'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Users,
  Award,
  Plane,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  FlightSlot,
  SimulatorPackage,
  PublicCapacityReport,
  SlotBlockPeriod,
} from '@/types';
import { formatCurrency, formatLocalYMD } from '@/lib/utils';
import { useModalFocus } from '@/lib/ui/use-modal-focus';
import { useLanguage } from '@/lib/i18n/language-context';
import { Language } from '@/lib/i18n/translations';
import {
  calendarMonthCells,
  calendarWeekDays,
  calendarWeekdayNames,
  formatCalendarDate,
  formatCalendarDayNumber,
  formatCalendarMonth,
  monthStartForYmd,
} from '@/lib/i18n/calendar-presentation';
import { addMinutesToTime, packageFromPriceIls, packagePriceForSlot } from '@/lib/scheduler/mission-calculator';

interface KantorovichCalendarSchedulerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedPackage: SimulatorPackage;
  packages: SimulatorPackage[];
  onSelectPackage: (pkg: SimulatorPackage) => void;
  slots: FlightSlot[];
  selectedSlot: FlightSlot | null;
  onSelectSlot: (slot: FlightSlot) => void;
  efficiencyReport: PublicCapacityReport | null;
  durationAvailability?: Record<number, { availableCount: number; minPriceIls: number }>;
  loading: boolean;
}

const CLEAN_COPY: Record<
  string,
  {
    selectDuration: string;
    selectDate: string;
    selectTime: string;
    viewWeek: string;
    viewMonth: string;
    previousMonth: string;
    nextMonth: string;
    checkNextDay: string;
    morning: string;
    afternoon: string;
    evening: string;
    recommended: string;
    booked: string;
    availableCount: string;
    noSlotsForDuration: string;
    try60Min: string;
    try30Min: string;
    guestsIncluded: string;
    captainIncluded: string;
    dayNamesShort: string[];
    monthNames: string[];
  }
> = {
  en: {
    selectDate: '1. Select Date',
    selectDuration: '2. Available Flight Durations',
    selectTime: '3. Select Departure Time',
    viewWeek: 'Week',
    viewMonth: 'Month',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    checkNextDay: 'Check Next Day →',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    recommended: 'Best Match',
    booked: 'Booked',
    availableCount: 'slots available',
    noSlotsForDuration: 'No open times for this duration on the selected date.',
    try60Min: 'Switch to 60 Min Flight',
    try30Min: 'Switch to 20 Min Flight',
    guestsIncluded: 'Up to 2 guests included',
    captainIncluded: '1-on-1 Airline Captain Instructor',
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthNames: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  },
  he: {
    selectDate: '1. בחירת תאריך',
    selectDuration: '2. משך הטיסה (זמין ליום זה)',
    selectTime: '3. בחירת שעת המראה',
    viewWeek: 'שבוע',
    viewMonth: 'חודש',
    previousMonth: 'החודש הקודם',
    nextMonth: 'החודש הבא',
    checkNextDay: 'בדיקת היום הבא ←',
    morning: 'בוקר',
    afternoon: 'צהריים',
    evening: 'ערב',
    recommended: 'מומלץ',
    booked: 'תפוס',
    availableCount: 'שעות פנויות',
    noSlotsForDuration: 'אין שעות פנויות למשך טיסה זה בתאריך שנבחר.',
    try60Min: 'עבור לטיסת 60 דקות',
    try30Min: 'עבור לטיסת 20 דקות',
    guestsIncluded: 'עד 2 מלווים בקוקפיט ללא תוספת',
    captainIncluded: 'הדרכה אישית עם קברניט',
    dayNamesShort: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
    monthNames: [
      'ינואר',
      'פברואר',
      'מרץ',
      'אפריל',
      'מאי',
      'יוני',
      'יולי',
      'אוגוסט',
      'ספטמבר',
      'אוקטובר',
      'נובמבר',
      'דצמבר',
    ],
  },
  ru: {
    selectDate: '1. Выберите дату',
    selectDuration: '2. Доступная длительность полёта',
    selectTime: '3. Время вылета',
    viewWeek: 'Неделя',
    viewMonth: 'Месяц',
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    checkNextDay: 'Следующий день →',
    morning: 'Утро',
    afternoon: 'День',
    evening: 'Вечер',
    recommended: 'Рекомендуем',
    booked: 'Занято',
    availableCount: 'свободных слотов',
    noSlotsForDuration: 'На выбранную дату нет свободных окон для этой длительности.',
    try60Min: 'Переключить на 60 минут',
    try30Min: 'Переключить на 20 минут',
    guestsIncluded: 'До 2 гостей в кабине бесплатно',
    captainIncluded: 'Инструктор — действующий пилот',
    dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    monthNames: [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ],
  },
  fr: {
    selectDate: '1. Choisir la Date',
    selectDuration: '2. Durées Disponibles',
    selectTime: '3. Heure de Départ',
    viewWeek: 'Semaine',
    viewMonth: 'Mois',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    checkNextDay: 'Jour suivant →',
    morning: 'Matin',
    afternoon: 'Après-midi',
    evening: 'Soirée',
    recommended: 'Recommandé',
    booked: 'Complet',
    availableCount: 'créneaux disponibles',
    noSlotsForDuration: 'Aucun créneau disponible pour cette durée à cette date.',
    try60Min: 'Passer au vol 60 min',
    try30Min: 'Passer au vol 20 min',
    guestsIncluded: 'Jusqu’à 2 accompagnants inclus',
    captainIncluded: 'Commandant de bord instructeur',
    dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    monthNames: [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ],
  },
  ar: {
    selectDate: '1. اختر التاريخ',
    selectDuration: '2. مدد الطيران المتاحة',
    selectTime: '3. وقت الإقلاع',
    viewWeek: 'أسبوع',
    viewMonth: 'الشهر',
    previousMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    checkNextDay: 'فحص اليوم التالي ←',
    morning: 'الصباح',
    afternoon: 'الظهيرة',
    evening: 'المساء',
    recommended: 'موصى به',
    booked: 'محجوز',
    availableCount: 'مواعيد متاحة',
    noSlotsForDuration: 'لا توجد مواعيد متاحة لهذه المدة في التاريخ المختار.',
    try60Min: 'التبديل إلى رحلة 60 دقيقة',
    try30Min: 'التبديل إلى رحلة 20 دقيقة',
    guestsIncluded: 'يشمل ضيفين في القمرة مجاناً',
    captainIncluded: 'مدرب طيران كابتن طائرة',
    dayNamesShort: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
    monthNames: [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ],
  },
};

function getPackageFormulaBadge(duration: number, category: string, lang: Language) {
  if (category === 'training') {
    const textMap: Record<Language, string> = {
      en: '🎯 Airline Checkride • Raw Data & V1 Failure',
      he: '🎯 הכנה למבדקי חברות תעופה • Raw Data ותקלות V1',
      ru: '🎯 Скрининг в авиакомпании • Raw Data и отказ V1',
      fr: '🎯 Sélection Compagnie • Raw Data & Panne V1',
      ar: '🎯 اختبارات شركات الطيران • Raw Data وطوارئ V1',
    };
    return {
      text: textMap[lang] || textMap.en,
      cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-bold',
    };
  }
  if (category === 'fear_of_flying') {
    const textMap: Record<Language, string> = {
      en: '🕊️ Private Therapy & Captain Coaching • Gentle Pacing',
      he: '🕊️ טיפול מותאם והדרכת קברניט • בקצב רגוע ואישי',
      ru: '🕊️ Терапия страха полетов и коучинг с капитаном',
      fr: '🕊️ Gestion de la peur de l’avion • Rythme bienveillant',
      ar: '🕊️ علاج الخوف من الطيران مع القبطان • وتيرة مريحة',
    };
    return {
      text: textMap[lang] || textMap.en,
      cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold',
    };
  }
  if (duration === 20) {
    const textMap: Record<Language, string> = {
      en: '🛫 1 Airport Takeoff & Landing Circuit',
      he: '🛫 תרגול המראה ונחיתה בשדה תעופה בודד',
      ru: '🛫 Взлет и посадка по кругу в 1 аэропорту',
      fr: '🛫 Tour de piste décollage et atterrissage sur 1 aéroport',
      ar: '🛫 تمرين إقلاع وهبوط ودوران في مطار واحد',
    };
    return {
      text: textMap[lang] || textMap.en,
      cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    };
  }
  if (duration === 45) {
    const textMap: Record<Language, string> = {
      en: '🌤️ Daytime Flight • 2 Landings (until 18:00)',
      he: '🌤️ מבצע יום • 2 נחיתות (עד 18:00)',
      ru: '🌤️ Дневной полет • 2 посадки (до 18:00)',
      fr: '🌤️ Vol journée • 2 atterrissages (jusqu’à 18h00)',
      ar: '🌤️ رحلة نهارية • هبوطان كاملان (حتى 18:00)',
    };
    return {
      text: textMap[lang] || textMap.en,
      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }
  if (duration === 60) {
    const textMap: Record<Language, string> = {
      en: '⭐ Takeoff/Landing + 1 World Trio (3 Airports Included)',
      he: '⭐ המראה/נחיתה + שלישיית שדות תעופה עולמית (3 יעדים)',
      ru: '⭐ Взлет/посадка + 1 World Trio (3 аэропорта мира)',
      fr: '⭐ Décollage/atterrissage + 1 trio mondial (3 aéroports)',
      ar: '⭐ إقلاع/هبوط + باقة ثلاثية مطارات عالمية (3 مطارات)',
    };
    return {
      text: textMap[lang] || textMap.en,
      cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold',
    };
  }
  if (duration === 90) {
    const textMap: Record<Language, string> = {
      en: '⚡ Takeoff/Landing + 2 World Trios + Emergencies (1–2 Pilots)',
      he: '⚡ המראה/נחיתה + 2 שלישיות Trio + תקלות (1–2 טייסים)',
      ru: '⚡ Взлет/посадка + 2 World Trios + особые случаи (1–2 пилота)',
      fr: '⚡ Décollage/atterrissage + 2 trios mondiaux + pannes (1–2 pilotes)',
      ar: '⚡ إقلاع/هبوط + باقتان ثلاثيتان + طوارئ (طيار أو طياران)',
    };
    return {
      text: textMap[lang] || textMap.en,
      cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold',
    };
  }
  return {
    text: `✈️ ${duration}m Boeing 737 Flight Session`,
    cls: 'bg-slate-800 text-slate-300 border-slate-700',
  };
}

const BLUEPRINT_COPY: Record<Language, {
  whatIncludedBtn: string;
  badge: string;
  missionArch: string;
  handsOnPic: string;
  handsOnDesc: (m: number) => string;
  takeoffTitle: string;
  takeoffDesc: string;
  worldTitle: string;
  world60: string;
  world90: string;
  worldPro: string;
  worldBasic: string;
  observersTitle: string;
  observersDesc: string;
  guidanceTitle: string;
  guidanceDesc: string;
  highlightsTitle: string;
  closeBtn: string;
  selectBtn: (price: string) => string;
}> = {
  en: {
    whatIncludedBtn: "What's Included / Mission Blueprint ↗",
    badge: "OFFICIAL FLIGHT BLUEPRINT • WHAT'S INCLUDED",
    missionArch: 'Cockpit Mission Architecture',
    handsOnPic: 'Hands-On Pilot-in-Command:',
    handsOnDesc: (m) => `${m} minutes in the Captain or First Officer seat with active controls feedback and 220° 4K visuals.`,
    takeoffTitle: 'Takeoff & Landing Foundation:',
    takeoffDesc: 'Guided takeoff roll, climbout navigation, visual pattern circuit, and manual touchdown.',
    worldTitle: 'World Route Inclusions:',
    world60: 'Includes Takeoff & Landing exercise + 1 full World Trio theme of your choice (fly 3 iconic airports such as London Heathrow/Paris CDG/Amsterdam Schiphol, or Mediterranean Islands, or Innsbruck Alps).',
    world90: 'Includes Takeoff & Landing exercise + up to 2 World Trio themes (4 to 6 dramatic international landings) + Cold & Dark Startup or V1 Engine-Out emergencies. Can be shared between 1 or 2 pilots!',
    worldPro: 'Raw Data manual flying (FD OFF), steep 45° turns, V1 Cut engine failure, Single-Engine ILS, and QRH checklist drills.',
    worldBasic: 'Focused takeoff and landing flight session at a single international airport (such as Ben Gurion LLBG).',
    observersTitle: 'Free Cockpit Observers:',
    observersDesc: 'Up to 2 observers inside cockpit jumpseats free of charge (photos & video welcome!).',
    guidanceTitle: 'Commercial Pilot Guidance:',
    guidanceDesc: '1-on-1 personalized pre-flight briefing and active cockpit mentoring from commercial pilots.',
    highlightsTitle: 'Highlights & Amenities:',
    closeBtn: 'Close Blueprint',
    selectBtn: (price) => `Select This Package (${price})`,
  },
  he: {
    whatIncludedBtn: 'מה כוללת הטיסה? תוכנית משימה ↗',
    badge: 'תוכנית משימה רשמית • מה כולל הסשן',
    missionArch: 'מבנה משימת הטיסה בקוקפיט',
    handsOnPic: 'הטסה בידיים שלכם (Pilot-in-Command):',
    handsOnDesc: (m) => `${m} דקות מלאות בכיסא הקברניט עם מצערות ממונעות, מסך פנורמי 220° ושליטה מלאה בהגאים.`,
    takeoffTitle: 'תרגול המראה ונחיתה:',
    takeoffDesc: 'ריצת המראה מודרכת, המראה, ניווט בהקפה ונחיתה ידנית בשדה תעופה בינלאומי.',
    worldTitle: 'שדות תעופה ויעדים בעולם:',
    world60: 'כולל תרגול המראה ונחיתה + שלישיית שדות תעופה עולמית אחת (Trio) לבחירתכם (3 יעדים כגון שדות תעופה קלאסיים באירופה, איים יווניים, או אלפים).',
    world90: 'כולל תרגול המראה ונחיתה + 2 שלישיות Trio עולמיות (4 עד 6 נחיתות בעולם) + תרגול תקלות מנוע V1 או Cold & Dark. ניתן לחלוק בין 1 או 2 טייסים!',
    worldPro: 'הטסה ידנית ללא Flight Director (Raw Data), פניות 45°, תרגול V1 Cut, גישת ILS במנוע בודד ונוהלי QRH.',
    worldBasic: 'תרגול המראה ונחיתה ממוקד בשדה תעופה בודד (כמו נתב״ג LLBG) עם תדריך קברניט אישי.',
    observersTitle: 'מלווים בקוקפיט חינם:',
    observersDesc: 'עד 2 מלווים (משפחה או חברים) יושבים בתוך תא הטייס ללא תשלום, צופים ומצלמים.',
    guidanceTitle: 'מדריך טיסה צמוד:',
    guidanceDesc: 'ליווי 1-על-1 של טייס מסחרי מקצועי לכל אורך הטיסה.',
    highlightsTitle: 'עיקרי החבילה והטבות:',
    closeBtn: 'סגור תוכנית',
    selectBtn: (price) => `בחר חבילה זו (${price})`,
  },
  ru: {
    whatIncludedBtn: 'Что входит в полёт? План миссии ↗',
    badge: 'ОФИЦИАЛЬНЫЙ ПЛАН ПОЛЁТА • ЧТО ВКЛЮЧЕНО',
    missionArch: 'Архитектура полётной сессии в кабине',
    handsOnPic: 'Пилотирование своими руками (КВС):',
    handsOnDesc: (m) => `${m} минут в кресле командира с моторизованным РУД, экраном 220° 4K и полной отдачей штурвала.`,
    takeoffTitle: 'Базовые упражнения взлёта и посадки:',
    takeoffDesc: 'Разбег, взлёт, полёт по аэродромному кругу и ручная посадка в международном аэропорту.',
    worldTitle: 'Маршруты и аэропорты мира:',
    world60: 'Взлёт и посадка + 1 комплект World Trio на выбор (3 аэропорта: Лондон/Париж/Амстердам, острова Средиземноморья или Альпы Инсбрука).',
    world90: 'Взлёт и посадка + 2 комплекта World Trio (4–6 посадок) + запуск Cold & Dark или отказ двигателя V1. Можно разделить на 1 или 2 пилотов!',
    worldPro: 'Ручное пилотирование Raw Data (FD OFF), виражи 45°, отказ двигателя V1 Cut, посадка по ILS на одном двигателе и работа по QRH.',
    worldBasic: 'Интенсивный тренинг взлёта и посадки в одном выбранном аэропорту (например, Бен-Гурион LLBG).',
    observersTitle: 'Гости в кабине бесплатно:',
    observersDesc: 'До 2 гостей на откидных креслах в кабине бесплатно (фото и видеосъёмка приветствуются!).',
    guidanceTitle: 'Сопровождение пилота-инструктора:',
    guidanceDesc: 'Индивидуальный предполётный инструктаж 1-на-1 и постоянное наставничество в полёте.',
    highlightsTitle: 'Преимущества и особенности пакета:',
    closeBtn: 'Закрыть программу',
    selectBtn: (price) => `Выбрать этот пакет (${price})`,
  },
  fr: {
    whatIncludedBtn: 'Programme du vol & Inclusions ↗',
    badge: 'PLAN DE VOL OFFICIEL • DÉTAIL DE LA SESSION',
    missionArch: 'Déroulement de la mission cockpit',
    handsOnPic: 'Aux commandes (Commandant de bord) :',
    handsOnDesc: (m) => `${m} minutes aux commandes en place gauche ou droite avec commandes dynamiques et visuel 220° 4K.`,
    takeoffTitle: 'Exercices de décollage et atterrissage :',
    takeoffDesc: 'Roulage, décollage assisté, tour de piste visuel et atterrissage manuel sur aéroport international.',
    worldTitle: 'Aéroports et destinations mondiales :',
    world60: 'Décollage et atterrissage + 1 trio mondial au choix (3 aéroports majeurs : Londres/Paris/Amsterdam, îles grecques ou Alpes).',
    world90: 'Décollage et atterrissage + 2 trios mondiaux (4 à 6 atterrissages) + démarrage Cold & Dark ou panne moteur V1. Partageable entre 1 ou 2 pilotes !',
    worldPro: 'Vol manuel Raw Data (sans directeur de vol), virages à 45°, panne moteur V1 Cut, ILS monomoteur et procédures QRH.',
    worldBasic: 'Session ciblée de décollage et atterrissage sur un aéroport unique (tel que Ben Gourion LLBG).',
    observersTitle: 'Accompagnateurs gratuits :',
    observersDesc: 'Jusqu’à 2 accompagnateurs dans le cockpit sans supplément (photos et vidéos bienvenues !).',
    guidanceTitle: 'Instructeur pilote de ligne :',
    guidanceDesc: 'Briefing pré-vol individuel et accompagnement actif par un pilote de ligne expérimenté.',
    highlightsTitle: 'Points forts et prestations :',
    closeBtn: 'Fermer le plan de vol',
    selectBtn: (price) => `Choisir cette formule (${price})`,
  },
  ar: {
    whatIncludedBtn: 'ماذا تشمل الرحلة؟ مخطط المهمة ↗',
    badge: 'مخطط الرحلة الرسمي • تفاصيل الجلسة',
    missionArch: 'هيكل مهمة الطيران في قمرة القيادة',
    handsOnPic: 'التحكم الفعلي بالقيادة (قائد الطائرة):',
    handsOnDesc: (m) => `${m} دقيقة كاملة في مقعد القبطان مع أذرع دفع آلية وشاشة بانورامية 220° بدقة 4K وتحكم كامل بالمقود.`,
    takeoffTitle: 'تمرين الإقلاع والهبوط الأساسي:',
    takeoffDesc: 'إقلاع موجه، ملاحة في مسار الدوران، وهبوط يدوي في مطار دولي.',
    worldTitle: 'المطارات والوجهات العالمية:',
    world60: 'تمرين الإقلاع والهبوط + باقة ثلاثية مطارات عالمية (3 مطارات كبرى مثل لندن/باريس/أمستردام أو جزر المتوسط أو الألب).',
    world90: 'تمرين الإقلاع والهبوط + باقتان ثلاثيتان (4 إلى 6 عمليات هبوط) + تشغيل Cold & Dark أو طوارئ محرك V1. يمكن تقاسمها بين طيارين اثنين!',
    worldPro: 'طيران يدوي كامل (Raw Data بدون Flight Director)، انعطافات حادة 45 درجة، عطل محرك V1 Cut، اقتراب ILS بمحرك واحد وقوائم QRH.',
    worldBasic: 'جلسة مركزة لتمارين الإقلاع والهبوط في مطار واحد (مثل بن غوريون LLBG).',
    observersTitle: 'مرافقون في القمرة مجاناً:',
    observersDesc: 'ما يصل إلى مرافقين اثنين داخل قمرة القيادة مجاناً (التقاط الصور والفيديو مرحب به!).',
    guidanceTitle: 'إشراف مدرب طيران معتمد:',
    guidanceDesc: 'إرشاد وتدريب فردي 1-على-1 من قبل طيار تجاري طوال فترة الرحلة.',
    highlightsTitle: 'أبرز مميزات ومزايا الباقة:',
    closeBtn: 'إغلاق الخطة',
    selectBtn: (price) => `اختيار هذه الباقة (${price})`,
  },
};

export function KantorovichCalendarScheduler({
  selectedDate,
  onSelectDate,
  selectedPackage,
  packages,
  onSelectPackage,
  slots,
  selectedSlot,
  onSelectSlot,
  durationAvailability,
  loading,
}: KantorovichCalendarSchedulerProps) {
  const { language, isRTL } = useLanguage();
  const copy = CLEAN_COPY[language] || CLEAN_COPY.en;
  const bpCopy = BLUEPRINT_COPY[language] || BLUEPRINT_COPY.en;

  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('month');
  const [blueprintModalPackage, setBlueprintModalPackage] = useState<SimulatorPackage | null>(null);
  const blueprintPanelRef = useModalFocus<HTMLDivElement>(blueprintModalPackage !== null, () =>
    setBlueprintModalPackage(null)
  );

  const [viewMonthDate, setViewMonthDate] = useState<Date>(() => monthStartForYmd(selectedDate));

  // Deduplicate packages by duration
  const durationOptions = useMemo(() => {
    const nonCorp = packages.filter((p) => p.category !== 'corporate');
    const byDuration = new Map<number, SimulatorPackage>();
    for (const pkg of nonCorp) {
      // Every duration stays visible (AGENTS.md §4 rule 1); the 45m promo on a Saturday shows
      // its "0 slots" badge from durationAvailability instead of disappearing.
      const existing = byDuration.get(pkg.durationMinutes);
      if (!existing || pkg.id === selectedPackage.id) {
        byDuration.set(pkg.durationMinutes, pkg);
      }
    }
    return Array.from(byDuration.values()).sort(
      (a, b) => a.durationMinutes - b.durationMinutes
    );
  }, [packages, selectedPackage.id]);

  const weekDays = useMemo(() => calendarWeekDays(selectedDate, language), [language, selectedDate]);
  const weekdayNames = useMemo(() => calendarWeekdayNames(language), [language]);
  const monthGridDays = useMemo(
    () => calendarMonthCells(viewMonthDate, language, formatLocalYMD(new Date())),
    [language, viewMonthDate]
  );

  // Group available & booked slots cleanly into Morning, Afternoon, Evening
  // (Silently filtering out internal anti-gap locked slots so the UI stays 100% clean)
  const cleanPeriodGroups = useMemo(() => {
    const visible = slots.filter(
      (s) => s.available || s.disabledReason === 'booked'
    );

    const morning: FlightSlot[] = [];
    const afternoon: FlightSlot[] = [];
    const evening: FlightSlot[] = [];

    for (const slot of visible) {
      const hour = parseInt(slot.startTime.split(':')[0], 10);
      if (hour < 15) {
        morning.push(slot);
      } else if (hour < 18) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    }

    return [
      { id: 'morning', label: copy.morning, items: morning },
      { id: 'afternoon', label: copy.afternoon, items: afternoon },
      { id: 'evening', label: copy.evening, items: evening },
    ].filter((g) => g.items.length > 0);
  }, [slots, copy.morning, copy.afternoon, copy.evening]);

  const openSlotCount = useMemo(
    () => slots.filter((s) => s.available).length,
    [slots]
  );

  const handleSwitchDuration = (mins: number) => {
    const target = packages.find(
      (p) => p.category !== 'corporate' && p.durationMinutes === mins
    );
    if (target) onSelectPackage(target);
  };

  const handleSelectDate = (date: string) => {
    setViewMonthDate(monthStartForYmd(date));
    onSelectDate(date);
  };

  return (
    <div className="space-y-6 select-none" style={{ touchAction: 'manipulation' }}>
      {/* SECTION 1: MOBILE-OPTIMIZED CALENDAR PICKER */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{copy.selectDate}</span>
          </h2>

          {/* Month is the default; a compact local-week view remains one tap away. */}
          <div className="inline-flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              aria-pressed={calendarMode === 'week'}
              onClick={() => setCalendarMode('week')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                calendarMode === 'week'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {copy.viewWeek}
            </button>
            <button
              type="button"
              aria-pressed={calendarMode === 'month'}
              onClick={() => setCalendarMode('month')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                calendarMode === 'month'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {copy.viewMonth}
            </button>
          </div>
        </div>

        {/* LOCAL WEEK: seven consecutive days, ordered for the active locale. */}
        {calendarMode === 'week' && (
          <div className="flex md:grid md:grid-cols-7 gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
            {weekDays.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  data-calendar-date={day.dateStr}
                  aria-label={day.dayLabel}
                  aria-pressed={isSelected}
                  onClick={() => handleSelectDate(day.dateStr)}
                  className={`snap-start shrink-0 min-w-[68px] sm:min-w-0 min-h-[72px] p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    isSelected
                      ? 'border-sky-400 bg-sky-500/20 text-white ring-2 ring-sky-400 shadow-glow'
                      : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`text-[11px] font-medium uppercase ${
                      isSelected ? 'text-sky-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {day.weekdayLabel}
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white leading-tight my-0.5">
                    {formatCalendarDayNumber(day.dayNumber, language)}
                  </span>
                  <span className="text-[10px] text-slate-400">{day.monthShortLabel}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* FULL MONTH CALENDAR GRID: Clean mobile-friendly cells */}
        {calendarMode === 'month' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                data-calendar-previous-month
                aria-label={copy.previousMonth}
                onClick={() =>
                  setViewMonthDate(
                    new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() - 1, 1)
                  )
                }
                className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white"
              >
                <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
              <span className="text-sm font-bold text-white">
                {formatCalendarMonth(viewMonthDate, language)}
              </span>
              <button
                type="button"
                data-calendar-next-month
                aria-label={copy.nextMonth}
                onClick={() =>
                  setViewMonthDate(
                    new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() + 1, 1)
                  )
                }
                className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white"
              >
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
              {weekdayNames.map((dName, idx) => (
                <div key={idx} className="py-1">
                  {dName}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {monthGridDays.map((cell) => {
                const isSelected = cell.dateStr === selectedDate;
                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    data-calendar-date={cell.dateStr}
                    aria-label={cell.dayLabel}
                    aria-pressed={isSelected}
                    disabled={cell.isPast}
                    onClick={() => handleSelectDate(cell.dateStr)}
                    className={`h-11 sm:h-12 rounded-xl border text-center font-semibold text-sm transition-all flex items-center justify-center ${
                      cell.isPast
                        ? 'opacity-25 border-transparent text-slate-600 cursor-not-allowed'
                        : isSelected
                        ? 'border-sky-400 bg-sky-500 text-slate-950 font-black shadow-glow'
                        : cell.isCurrentMonth
                        ? 'border-slate-800/80 bg-slate-950/70 text-white hover:border-slate-700'
                        : 'border-slate-800/50 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {formatCalendarDayNumber(cell.dayNumber, language)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: CLEAN DURATION PILLS (Shows ONLY durations that fit in the selected day's schedule) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6 space-y-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{copy.selectDuration}</span>
          </h2>
          <button
            type="button"
            onClick={() => setBlueprintModalPackage(selectedPackage)}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 hover:text-sky-300 underline font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{bpCopy.whatIncludedBtn}</span>
          </button>
        </div>

        {/* Responsive Touch-Friendly Duration Grid */}
        <div className="grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr gap-2 sm:gap-2.5">
          {durationOptions.map((pkg) => {
            const isSelected = pkg.durationMinutes === selectedPackage.durationMinutes;
            const durInfo = durationAvailability?.[pkg.durationMinutes];
            const isZeroAvailable = durInfo && durInfo.availableCount === 0;
            const effectivePrice = packageFromPriceIls(pkg, durInfo?.minPriceIls);
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onSelectPackage(pkg)}
                className={`min-h-[64px] px-3 py-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'border-sky-400 bg-sky-500/20 text-white ring-2 ring-sky-400 shadow-glow'
                    : isZeroAvailable
                    ? 'border-slate-800/60 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-black tracking-tight">
                    {pkg.durationMinutes} min
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isSelected ? 'text-sky-300' : 'text-slate-400'
                    }`}
                  >
                    {formatCurrency(effectivePrice)}
                  </span>
                </div>
                {isZeroAvailable ? (
                  <span className="text-[10px] font-mono text-amber-400/90 font-medium">
                    {language === 'he' ? '0 מקומות היום' : language === 'ru' ? '0 мест сегодня' : language === 'fr' ? '0 places ajd' : language === 'ar' ? '0 مواعيد اليوم' : '0 slots today'}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                    {pkg.durationMinutes === 20
                      ? (language === 'he' ? 'שדה בודד' : language === 'ru' ? '1 аэропорт' : language === 'fr' ? '1 aéroport' : language === 'ar' ? 'مطار واحد' : '1 Airport Circuit')
                      : pkg.durationMinutes === 60
                      ? '+1 World Trio'
                      : pkg.durationMinutes === 90
                      ? '+2 World Trios'
                      : `${pkg.durationMinutes}m`}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Clean package summary & formula pill */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${getPackageFormulaBadge(selectedPackage.durationMinutes, selectedPackage.category, language).cls}`}>
                {getPackageFormulaBadge(selectedPackage.durationMinutes, selectedPackage.category, language).text}
              </span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">{selectedPackage.shortDesc}</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-300 shrink-0">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              {copy.guestsIncluded}
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              {copy.captainIncluded}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: CLEAN DEPARTURE TIME SLOTS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6 space-y-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              {copy.selectTime} — <span className="text-sky-400">{formatCalendarDate(selectedDate, language)}</span>
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            {openSlotCount} {copy.availableCount}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="h-16 rounded-xl bg-slate-950/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : openSlotCount === 0 ? (
          <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-4">
            <p className="text-sm text-slate-300">{copy.noSlotsForDuration}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-sky-500/50 text-sky-300 hover:bg-sky-500/10"
                onClick={() => {
                  const [y, m, d] = selectedDate.split('-').map(Number);
                  const nextDate = new Date(y, (m || 1) - 1, (d || 1) + 1);
                  handleSelectDate(formatLocalYMD(nextDate));
                }}
              >
                {copy.checkNextDay}
              </Button>
              {selectedPackage.durationMinutes !== 60 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSwitchDuration(60)}
                >
                  {copy.try60Min}
                </Button>
              )}
              {selectedPackage.durationMinutes !== 20 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSwitchDuration(20)}
                >
                  {copy.try30Min}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {cleanPeriodGroups.map((group) => (
              <div key={group.id} className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </h3>

                {/* 2 columns on iPhone for generous tap targets, 3 on tablet, 4 on desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {group.items.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const isRecommended =
                      slot.smartRecommendation === 'optimal_150_pair' ||
                      slot.smartRecommendation === 'friday_30m_closer';
                    const slotPrice = packagePriceForSlot(selectedPackage, slot.isPrimeTime);

                    if (!slot.available) {
                      return (
                        <div
                          key={slot.id}
                          className="min-h-[60px] px-3 py-2.5 rounded-xl border border-slate-800/50 bg-slate-950/40 flex items-center justify-between cursor-not-allowed"
                        >
                          <span
                            className="text-sm font-mono text-slate-400 line-through"
                            dir="ltr"
                          >
                            {slot.startTime}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {copy.booked}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className={`relative min-h-[64px] px-3.5 py-3 rounded-xl border text-left transition-all flex flex-col justify-center ${
                          isSelected
                            ? 'border-sky-400 bg-sky-500/20 ring-2 ring-sky-400 shadow-glow'
                            : isRecommended
                            ? 'border-emerald-500/60 bg-emerald-950/20 hover:border-emerald-400'
                            : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                        }`}
                      >
                        {isRecommended && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mb-0.5">
                            <Sparkles className="w-3 h-3" />
                            {copy.recommended}
                          </span>
                        )}

                        <div className="flex items-center justify-between w-full gap-1">
                          <span
                            className="text-base sm:text-lg font-black text-white font-mono tracking-tight"
                            dir="ltr"
                          >
                            {slot.startTime}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs sm:text-sm font-mono font-bold ${
                                isSelected ? 'text-sky-300' : 'text-emerald-400'
                              }`}
                            >
                              {formatCurrency(slotPrice)}
                            </span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] font-mono text-slate-400" dir="ltr">
                          {slot.startTime} – {addMinutesToTime(slot.startTime, selectedPackage.durationMinutes)} ({selectedPackage.durationMinutes}m)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          MISSION BLUEPRINT / WHAT'S INCLUDED INTERACTIVE MODAL DIALOG
         ===================================================================== */}
      {blueprintModalPackage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="blueprint-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setBlueprintModalPackage(null)}
        >
          <div
            ref={blueprintPanelRef}
            tabIndex={-1}
            className="relative max-w-2xl w-full rounded-2xl border-2 border-sky-500/40 bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-left rtl:text-right focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{bpCopy.badge}</span>
                </div>
                <h3 id="blueprint-modal-title" className="text-xl sm:text-2xl font-black text-white mt-1">
                  {blueprintModalPackage.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-mono mt-0.5">
                  Duration: <strong className="text-amber-400">{blueprintModalPackage.durationMinutes} Minutes</strong> • {formatCurrency(blueprintModalPackage.priceIls)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setBlueprintModalPackage(null)}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inclusions Breakdown */}
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                  <Plane className="w-4 h-4 text-sky-400" />
                  <span>{bpCopy.missionArch}</span>
                </h4>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{bpCopy.handsOnPic}</strong>{' '}
                      {bpCopy.handsOnDesc(blueprintModalPackage.durationMinutes)}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{bpCopy.takeoffTitle}</strong>{' '}
                      {bpCopy.takeoffDesc}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{bpCopy.worldTitle}</strong>{' '}
                      {blueprintModalPackage.durationMinutes === 60
                        ? bpCopy.world60
                        : blueprintModalPackage.durationMinutes === 90
                        ? bpCopy.world90
                        : blueprintModalPackage.category === 'training'
                        ? bpCopy.worldPro
                        : bpCopy.worldBasic}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{bpCopy.observersTitle}</strong>{' '}
                      {bpCopy.observersDesc}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{bpCopy.guidanceTitle}</strong>{' '}
                      {bpCopy.guidanceDesc}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Package Features List */}
              <div className="space-y-2">
                <p className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                  {bpCopy.highlightsTitle}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {blueprintModalPackage.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 mt-1.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setBlueprintModalPackage(null)}
                className="w-full sm:w-auto text-slate-400 hover:text-white"
              >
                {bpCopy.closeBtn}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onSelectPackage(blueprintModalPackage);
                  setBlueprintModalPackage(null);
                }}
                className="w-full sm:w-auto font-black bg-sky-500 hover:bg-sky-400 text-slate-950 px-6 shadow-glow"
              >
                <span>{bpCopy.selectBtn(formatCurrency(blueprintModalPackage.priceIls))}</span>
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
