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
  DailyEfficiencyReport,
  SlotBlockPeriod,
} from '@/types';
import { formatCurrency, formatDate, formatLocalYMD } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { addMinutesToTime } from '@/lib/scheduler/mission-calculator';

interface KantorovichCalendarSchedulerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedPackage: SimulatorPackage;
  packages: SimulatorPackage[];
  onSelectPackage: (pkg: SimulatorPackage) => void;
  slots: FlightSlot[];
  selectedSlot: FlightSlot | null;
  onSelectSlot: (slot: FlightSlot) => void;
  efficiencyReport: DailyEfficiencyReport | null;
  durationAvailability?: Record<number, { availableCount: number; minPriceIls: number }>;
  loading: boolean;
}

const CLEAN_COPY: Record<
  string,
  {
    selectDuration: string;
    selectDate: string;
    selectTime: string;
    viewStrip: string;
    viewMonth: string;
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
    viewStrip: '14 Days',
    viewMonth: 'Full Month',
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
    viewStrip: '14 ימים',
    viewMonth: 'חודש מלא',
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
    viewStrip: '14 дней',
    viewMonth: 'Месяц',
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
    viewStrip: '14 Jours',
    viewMonth: 'Mois',
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
    viewStrip: '14 يوماً',
    viewMonth: 'الشهر',
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

function getPackageFormulaBadge(duration: number, category: string) {
  if (category === 'training') {
    return {
      text: '🎯 Airline Checkride • Raw Data & V1 Failure',
      cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    };
  }
  if (duration === 20) {
    return {
      text: '🛫 1 Airport Takeoff & Landing Circuit',
      cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    };
  }
  if (duration === 30) {
    return {
      text: '✈️ Discovery Flight • 2 Iconic Landings',
      cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    };
  }
  if (duration === 45) {
    return {
      text: '🌤️ Daytime Flight • 2 Landings (until 18:00)',
      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }
  if (duration === 60) {
    return {
      text: '⭐ Takeoff/Landing + 1 World Trio (3 Airports Included)',
      cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold',
    };
  }
  if (duration === 90) {
    return {
      text: '⚡ Takeoff/Landing + 2 World Trios + Emergencies (1–2 Pilots)',
      cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold',
    };
  }
  return {
    text: `✈️ ${duration}m Boeing 737 Flight Session`,
    cls: 'bg-slate-800 text-slate-300 border-slate-700',
  };
}

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

  const [calendarMode, setCalendarMode] = useState<'horizon' | 'month'>('horizon');
  const [blueprintModalPackage, setBlueprintModalPackage] = useState<SimulatorPackage | null>(null);

  // Month cursor for Full Month Grid view
  const [viewMonthDate, setViewMonthDate] = useState<Date>(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d || 1);
  });

  // Deduplicate packages by duration and ONLY keep durations that actually fit in the selected day's schedule!
  const durationOptions = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const isSaturday = new Date(y, (m || 1) - 1, d || 1).getDay() === 6;

    const nonCorp = packages.filter((p) => p.category !== 'corporate');
    const byDuration = new Map<number, SimulatorPackage>();
    for (const pkg of nonCorp) {
      // 1. Immediate rule: 45m Daytime Special is never available on Saturday
      if (isSaturday && pkg.durationMinutes === 45) continue;

      // 2. Live Kantorovich availability check: if durationAvailability is loaded for this date,
      // hide any duration that has 0 open time slots able to fit it on this day
      if (
        durationAvailability &&
        Object.keys(durationAvailability).length > 0 &&
        durationAvailability[pkg.durationMinutes] &&
        durationAvailability[pkg.durationMinutes].availableCount === 0
      ) {
        continue;
      }

      const existing = byDuration.get(pkg.durationMinutes);
      if (!existing || pkg.id === selectedPackage.id) {
        byDuration.set(pkg.durationMinutes, pkg);
      }
    }
    return Array.from(byDuration.values()).sort(
      (a, b) => a.durationMinutes - b.durationMinutes
    );
  }, [packages, selectedPackage.id, selectedDate, durationAvailability]);

  // 14-day swipeable strip
  const horizonDays = useMemo(() => {
    const list: {
      dateStr: string;
      dayNum: number;
      dowIndex: number;
      monthShort: string;
    }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let i = 0; i < 14; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      list.push({
        dateStr: formatLocalYMD(d),
        dayNum: d.getDate(),
        dowIndex: d.getDay(),
        monthShort: copy.monthNames[d.getMonth()]?.slice(0, 3) || '',
      });
    }
    return list;
  }, [copy.monthNames]);

  // Full Month Calendar Grid
  const monthGridDays = useMemo(() => {
    const year = viewMonthDate.getFullYear();
    const month = viewMonthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDow = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: Array<{
      dateStr: string | null;
      dayNum: number | null;
      isPast: boolean;
    }> = [];

    for (let i = 0; i < startDow; i++) {
      cells.push({ dateStr: null, dayNum: null, isPast: true });
    }

    for (let day = 1; day <= totalDays; day++) {
      const cellDate = new Date(year, month, day);
      cells.push({
        dateStr: formatLocalYMD(cellDate),
        dayNum: day,
        isPast: cellDate < today,
      });
    }

    return cells;
  }, [viewMonthDate]);

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

  return (
    <div className="space-y-6 select-none" style={{ touchAction: 'manipulation' }}>
      {/* SECTION 1: MOBILE-OPTIMIZED CALENDAR PICKER */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{copy.selectDate}</span>
          </h2>

          {/* Clean 14-Day vs Month Switcher */}
          <div className="inline-flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setCalendarMode('horizon')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                calendarMode === 'horizon'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {copy.viewStrip}
            </button>
            <button
              type="button"
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

        {/* 14-DAY STRIP: Horizontal swipe on iPhone/Mobile, 7-col grid on Desktop */}
        {calendarMode === 'horizon' && (
          <div className="flex md:grid md:grid-cols-7 gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
            {horizonDays.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => onSelectDate(day.dateStr)}
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
                    {copy.dayNamesShort[day.dowIndex]}
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white leading-tight my-0.5">
                    {day.dayNum}
                  </span>
                  <span className="text-[10px] text-slate-500">{day.monthShort}</span>
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
                {copy.monthNames[viewMonthDate.getMonth()]} {viewMonthDate.getFullYear()}
              </span>
              <button
                type="button"
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
              {copy.dayNamesShort.map((dName, idx) => (
                <div key={idx} className="py-1">
                  {dName}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {monthGridDays.map((cell, idx) => {
                if (!cell.dateStr || !cell.dayNum) {
                  return <div key={`empty-${idx}`} className="h-11 sm:h-12" />;
                }
                const isSelected = cell.dateStr === selectedDate;
                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    disabled={cell.isPast}
                    onClick={() => onSelectDate(cell.dateStr!)}
                    className={`h-11 sm:h-12 rounded-xl border text-center font-semibold text-sm transition-all flex items-center justify-center ${
                      cell.isPast
                        ? 'opacity-25 border-transparent text-slate-600 cursor-not-allowed'
                        : isSelected
                        ? 'border-sky-400 bg-sky-500 text-slate-950 font-black shadow-glow'
                        : 'border-slate-800/80 bg-slate-950/70 text-white hover:border-slate-700'
                    }`}
                  >
                    {cell.dayNum}
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
            <span>{language === 'he' ? 'מה כוללת הטיסה? תוכנית משימה ↗' : "What's Included / Mission Blueprint ↗"}</span>
          </button>
        </div>

        {/* Responsive Touch-Friendly Duration Grid (shows ONLY durations that fit in the selected day's schedule) */}
        <div className="grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr gap-2 sm:gap-2.5">
          {durationOptions.map((pkg) => {
            const isSelected = pkg.durationMinutes === selectedPackage.durationMinutes;
            const effectivePrice =
              durationAvailability?.[pkg.durationMinutes]?.minPriceIls || pkg.priceIls;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onSelectPackage(pkg)}
                className={`min-h-[64px] px-3 py-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'border-sky-400 bg-sky-500/20 text-white ring-2 ring-sky-400 shadow-glow'
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
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                  {pkg.durationMinutes === 20
                    ? '1 Airport Circuit'
                    : pkg.durationMinutes === 60
                    ? '+1 World Trio'
                    : pkg.durationMinutes === 90
                    ? '+2 World Trios'
                    : `${pkg.durationMinutes}m flight`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Clean package summary & formula pill */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${getPackageFormulaBadge(selectedPackage.durationMinutes, selectedPackage.category).cls}`}>
                {getPackageFormulaBadge(selectedPackage.durationMinutes, selectedPackage.category).text}
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
              {copy.selectTime} — <span className="text-sky-400">{formatDate(selectedDate)}</span>
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
          <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-3">
            <p className="text-sm text-slate-300">{copy.noSlotsForDuration}</p>
            <div className="flex flex-wrap justify-center gap-2">
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
                    const slotPrice = slot.dynamicPriceIls || selectedPackage.priceIls;

                    if (!slot.available) {
                      return (
                        <div
                          key={slot.id}
                          className="min-h-[60px] px-3 py-2.5 rounded-xl border border-slate-800/50 bg-slate-950/40 opacity-45 flex items-center justify-between cursor-not-allowed"
                        >
                          <span
                            className="text-sm font-mono text-slate-500 line-through"
                            dir="ltr"
                          >
                            {slot.startTime}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
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
            className="relative max-w-2xl w-full rounded-2xl border-2 border-sky-500/40 bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-left rtl:text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'he' ? 'תוכנית משימה רשמית • מה כולל הסשן' : "OFFICIAL FLIGHT BLUEPRINT • WHAT'S INCLUDED"}</span>
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
                  <span>{language === 'he' ? 'מבנה משימת הטיסה בקוקפיט' : 'Cockpit Mission Architecture'}</span>
                </h4>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{language === 'he' ? 'הטסה בידיים שלכם (Pilot-in-Command):' : 'Hands-On Pilot-in-Command:'}</strong>{' '}
                      {blueprintModalPackage.durationMinutes} {language === 'he' ? 'דקות מלאות בכיסא הקברניט עם מצערות ממונעות, מסך פנורמי 220° ושליטה מלאה בהגאים.' : 'minutes in the Captain or First Officer seat with active controls feedback and 220° 4K visuals.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{language === 'he' ? 'תרגול המראה ונחיתה:' : 'Takeoff & Landing Foundation:'}</strong>{' '}
                      {language === 'he' ? 'ריצת המראה מודרכת, המראה, ניווט בהקפה ونחיתה ידנית בשדה תעופה בינלאומי.' : 'Guided takeoff roll, climbout navigation, visual pattern circuit, and manual touchdown.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{language === 'he' ? 'שדות תעופה ויעדים בעולם:' : 'World Route Inclusions:'}</strong>{' '}
                      {blueprintModalPackage.durationMinutes === 60
                        ? (language === 'he' ? 'כולל תרגול המראה ונחיתה + שלישיית שדות תעופה עולמית אחת (Trio) לבחירתכם (3 יעדים כגון שדות תעופה קלאסיים באירופה, איים יווניים, או אלפים).' : 'Includes Takeoff & Landing exercise + 1 full World Trio theme of your choice (fly 3 iconic airports such as London Heathrow/Paris CDG/Amsterdam Schiphol, or Mediterranean Islands, or Innsbruck Alps).')
                        : blueprintModalPackage.durationMinutes === 90
                        ? (language === 'he' ? 'כולל תרגול המראה ונחיתה + 2 שלישיות Trio עולמיות (4 עד 6 נחיתות בעולם) + תרגול תקלות מנוע V1 או Cold & Dark. ניתן לחלוק בין 1 או 2 טייסים!' : 'Includes Takeoff & Landing exercise + up to 2 World Trio themes (4 to 6 dramatic international landings) + Cold & Dark Startup or V1 Engine-Out emergencies. Can be shared between 1 or 2 pilots!')
                        : blueprintModalPackage.category === 'training'
                        ? (language === 'he' ? 'הטסה ידנית ללא Flight Director (Raw Data), פניות 45°, תרגול V1 Cut, גישת ILS במנוע בודד ונוהלי QRH.' : 'Raw Data manual flying (FD OFF), steep 45° turns, V1 Cut engine failure, Single-Engine ILS, and QRH checklist drills.')
                        : (language === 'he' ? 'תרגול המראה ונחיתה ממוקד בשדה תעופה בודד (כמו נתב״ג LLBG) עם תדריך קברניט אישי.' : 'Focused takeoff and landing flight session at a single international airport (such as Ben Gurion LLBG).')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{language === 'he' ? 'מלווים בקוקפיט חינם:' : 'Free Cockpit Observers:'}</strong>{' '}
                      {language === 'he' ? 'עד 2 מלווים (משפחה או חברים) יושבים בתוך תא הטייס ללא תשלום, צופים ומצלמים.' : 'Up to 2 observers inside cockpit jumpseats free of charge (photos & video welcome!).'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{language === 'he' ? 'מדריך טיסה צמוד:' : 'Commercial Pilot Guidance:'}</strong>{' '}
                      {language === 'he' ? 'ליווי 1-על-1 של טייס מסחרי מקצועי לכל אורך הטיסה.' : '1-on-1 personalized pre-flight briefing and active cockpit mentoring from commercial pilots.'}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Package Features List */}
              <div className="space-y-2">
                <p className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                  {language === 'he' ? 'עיקרי החבילה והטבות:' : 'Highlights & Amenities:'}
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
                {language === 'he' ? 'סגור תוכנית' : 'Close Blueprint'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onSelectPackage(blueprintModalPackage);
                  setBlueprintModalPackage(null);
                }}
                className="w-full sm:w-auto font-black bg-sky-500 hover:bg-sky-400 text-slate-950 px-6 shadow-glow"
              >
                <span>{language === 'he' ? `בחר חבילה זו (${formatCurrency(blueprintModalPackage.priceIls)})` : `Select This Package (${formatCurrency(blueprintModalPackage.priceIls)})`}</span>
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
