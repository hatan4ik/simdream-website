'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { addDaysToYmd, formatCurrency } from '@/lib/utils';
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
import { getPackageFormulaBadge } from '@/lib/scheduler/package-presentation';
import { BOOKING_BLUEPRINT_COPY } from '@/lib/i18n/booking-blueprint-copy';

interface KantorovichCalendarSchedulerProps {
  selectedDate: string;
  /** Hydration-safe Israel business date supplied by the booking page. */
  calendarTodayYmd: string;
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
    previousWeek: string;
    nextWeek: string;
    previousMonth: string;
    nextMonth: string;
    checkNextDay: string;
    morning: string;
    afternoon: string;
    evening: string;
    recommended: string;
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
    previousWeek: 'Previous week',
    nextWeek: 'Next week',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    checkNextDay: 'Check Next Day →',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    recommended: 'Best Match',
    availableCount: 'slots available',
    noSlotsForDuration: 'No open times for this duration on the selected date.',
    try60Min: 'Switch to 60 Min Flight',
    try30Min: 'Switch to 30 Min Flight',
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
    previousWeek: 'השבוע הקודם',
    nextWeek: 'השבוע הבא',
    previousMonth: 'החודש הקודם',
    nextMonth: 'החודש הבא',
    checkNextDay: 'בדיקת היום הבא ←',
    morning: 'בוקר',
    afternoon: 'צהריים',
    evening: 'ערב',
    recommended: 'מומלץ',
    availableCount: 'שעות פנויות',
    noSlotsForDuration: 'אין שעות פנויות למשך טיסה זה בתאריך שנבחר.',
    try60Min: 'עבור לטיסת 60 דקות',
    try30Min: 'עבור לטיסת 30 דקות',
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
    previousWeek: 'Предыдущая неделя',
    nextWeek: 'Следующая неделя',
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    checkNextDay: 'Следующий день →',
    morning: 'Утро',
    afternoon: 'День',
    evening: 'Вечер',
    recommended: 'Рекомендуем',
    availableCount: 'свободных слотов',
    noSlotsForDuration: 'На выбранную дату нет свободных окон для этой длительности.',
    try60Min: 'Переключить на 60 минут',
    try30Min: 'Переключить на 30 минут',
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
    previousWeek: 'Semaine précédente',
    nextWeek: 'Semaine suivante',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    checkNextDay: 'Jour suivant →',
    morning: 'Matin',
    afternoon: 'Après-midi',
    evening: 'Soirée',
    recommended: 'Recommandé',
    availableCount: 'créneaux disponibles',
    noSlotsForDuration: 'Aucun créneau disponible pour cette durée à cette date.',
    try60Min: 'Passer au vol 60 min',
    try30Min: 'Passer au vol 30 min',
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
    previousWeek: 'الأسبوع السابق',
    nextWeek: 'الأسبوع التالي',
    previousMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    checkNextDay: 'فحص اليوم التالي ←',
    morning: 'الصباح',
    afternoon: 'الظهيرة',
    evening: 'المساء',
    recommended: 'موصى به',
    availableCount: 'مواعيد متاحة',
    noSlotsForDuration: 'لا توجد مواعيد متاحة لهذه المدة في التاريخ المختار.',
    try60Min: 'التبديل إلى رحلة 60 دقيقة',
    try30Min: 'التبديل إلى رحلة 30 دقيقة',
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

export function KantorovichCalendarScheduler({
  selectedDate,
  calendarTodayYmd,
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
  const bpCopy = BOOKING_BLUEPRINT_COPY[language] || BOOKING_BLUEPRINT_COPY.en;

  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('month');
  const [blueprintModalPackage, setBlueprintModalPackage] = useState<SimulatorPackage | null>(null);
  const blueprintPanelRef = useModalFocus<HTMLDivElement>(blueprintModalPackage !== null, () =>
    setBlueprintModalPackage(null)
  );

  // Keep only a manually browsed month in state. The normal month derives from the
  // selected day so a post-hydration date update cannot leave a stale placeholder month.
  const [viewMonthOverride, setViewMonthOverride] = useState<Date | null>(null);
  const viewMonthDate = viewMonthOverride ?? monthStartForYmd(selectedDate);
  const slotsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewMonthOverride(null);
  }, [selectedDate]);

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
  const previousWeekDate = addDaysToYmd(selectedDate, -7);
  const canNavigateToPreviousWeek = previousWeekDate >= calendarTodayYmd;
  const weekdayNames = useMemo(() => calendarWeekdayNames(language), [language]);
  const monthGridDays = useMemo(
    () => calendarMonthCells(viewMonthDate, language, calendarTodayYmd),
    [calendarTodayYmd, language, viewMonthDate]
  );

  // Group open slots into Morning, Afternoon, Evening. Booked and internal anti-gap locked
  // slots are not listed at all, so the visitor only sees departures they can pick.
  const cleanPeriodGroups = useMemo(() => {
    const visible = slots.filter((s) => s.available);

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
    setViewMonthOverride(null);
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
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                data-calendar-previous-week
                aria-label={copy.previousWeek}
                disabled={!canNavigateToPreviousWeek}
                onClick={() => handleSelectDate(previousWeekDate)}
                className="min-w-[48px] min-h-[48px] p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 flex items-center justify-center touch-manipulation cursor-pointer active:scale-95 transition-all"
              >
                <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
              <span className="text-xs sm:text-sm font-bold text-white">
                {formatCalendarDate(weekDays[0].dateStr, language)} – {formatCalendarDate(weekDays[6].dateStr, language)}
              </span>
              <button
                type="button"
                data-calendar-next-week
                aria-label={copy.nextWeek}
                onClick={() => handleSelectDate(addDaysToYmd(selectedDate, 7))}
                className="min-w-[48px] min-h-[48px] p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white flex items-center justify-center touch-manipulation cursor-pointer active:scale-95 transition-all"
              >
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>
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
                  setViewMonthOverride(
                    new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() - 1, 1)
                  )
                }
                className="min-w-[48px] min-h-[48px] p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white flex items-center justify-center touch-manipulation cursor-pointer active:scale-95 transition-all"
              >
                <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
              <span className="text-sm sm:text-base font-bold text-white">
                {formatCalendarMonth(viewMonthDate, language)}
              </span>
              <button
                type="button"
                data-calendar-next-month
                aria-label={copy.nextMonth}
                onClick={() =>
                  setViewMonthOverride(
                    new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() + 1, 1)
                  )
                }
                className="min-w-[48px] min-h-[48px] p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white flex items-center justify-center touch-manipulation cursor-pointer active:scale-95 transition-all"
              >
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
              <div className="grid min-w-[384px] grid-cols-7 gap-2 text-center text-[11px] font-medium text-slate-400">
                {weekdayNames.map((dName, idx) => (
                  <div key={idx} className="py-1">
                    {dName}
                  </div>
                ))}
              </div>

              <div className="grid min-w-[384px] grid-cols-7 gap-2">
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
                      className={`min-h-[48px] min-w-[48px] h-12 w-12 rounded-xl border text-center font-semibold text-sm transition-colors flex items-center justify-center touch-manipulation select-none ${
                        cell.isPast
                          ? 'opacity-25 border-transparent text-slate-600 cursor-not-allowed'
                          : isSelected
                          ? 'border-sky-400 bg-sky-500 text-slate-950 font-black shadow-glow cursor-pointer'
                          : cell.isCurrentMonth
                          ? 'border-slate-800/80 bg-slate-950/70 text-white hover:border-slate-700 cursor-pointer'
                          : 'border-slate-800/50 bg-slate-950/60 text-slate-400 hover:border-slate-700 cursor-pointer'
                      }`}
                    >
                      {formatCalendarDayNumber(cell.dayNumber, language)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Active Date Status & Quick-Jump Strip inside Wizard Calendar */}
            <div className="lg:hidden pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <div className="text-xs font-mono text-slate-300 flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-bold text-white truncate">{formatCalendarDate(selectedDate, language)}</span>
                <span className="text-emerald-400 shrink-0">• {openSlotCount} {copy.availableCount}</span>
              </div>
              <button
                type="button"
                onClick={() => slotsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-mono font-bold hover:bg-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 touch-manipulation cursor-pointer"
              >
                {copy.selectTime} ↓
              </button>
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
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 text-sm font-bold text-sky-200 hover:border-sky-400/60 hover:bg-sky-500/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 transition-colors touch-manipulation"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{bpCopy.whatIncludedBtn}</span>
            <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
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
                    {pkg.durationMinutes === 30
                      ? (language === 'he' ? 'משימת היכרות מודרכת' : language === 'ru' ? 'Ознакомительная миссия с инструктором' : language === 'fr' ? 'Mission découverte guidée' : language === 'ar' ? 'مهمة استكشافية بإرشاد مدرب' : 'Guided Discovery Mission')
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
      <div ref={slotsSectionRef} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6 space-y-5 shadow-lg">
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
                  handleSelectDate(addDaysToYmd(selectedDate, 1));
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
              {selectedPackage.durationMinutes !== 30 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSwitchDuration(30)}
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
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 px-safe-area-4 pb-safe-area-4 animate-in fade-in"
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
                  <strong className="text-amber-400">{bpCopy.duration(blueprintModalPackage.durationMinutes)}</strong> • {formatCurrency(blueprintModalPackage.priceIls)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setBlueprintModalPackage(null)}
                aria-label={bpCopy.closeDialogLabel}
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
