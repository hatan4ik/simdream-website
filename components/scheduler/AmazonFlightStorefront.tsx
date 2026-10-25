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
  ShoppingCart,
  Star,
  Plus,
  X,
  Tag,
  CreditCard,
  ShieldCheck,
  Plane,
  CloudLightning,
  Mountain,
  Video,
  Zap,
  Globe,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  FlightSlot,
  SimulatorPackage,
  FlightAddon,
  PilotExperienceLevel,
  MissionManifestCalculation,
  SlotBlockPeriod,
} from '@/types';
import { formatCurrency, formatDate, formatLocalYMD } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { canAddonFitInSlot, sanitizePackageTitle } from '@/lib/scheduler/mission-calculator';
import { FACILITY_INFO } from '@/lib/config/facility-info';

interface AmazonFlightStorefrontProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedPackage: SimulatorPackage;
  packages: SimulatorPackage[];
  onSelectPackage: (pkg: SimulatorPackage) => void;
  slots: FlightSlot[];
  selectedSlot: FlightSlot | null;
  onSelectSlot: (slot: FlightSlot) => void;
  durationAvailability: Record<number, { availableCount: number; minPriceIls: number }>;
  loadingSlots: boolean;
  addons: FlightAddon[];
  selectedAddons: string[];
  onToggleAddon: (addonId: string) => void;
  onSetAddons: (addonIds: string[]) => void;
  manifest: MissionManifestCalculation;
  // Pilot Form State
  pilotName: string;
  onChangePilotName: (val: string) => void;
  pilotEmail: string;
  onChangePilotEmail: (val: string) => void;
  pilotPhone: string;
  onChangePilotPhone: (val: string) => void;
  experienceLevel: PilotExperienceLevel;
  onChangeExperienceLevel: (val: PilotExperienceLevel) => void;
  notes: string;
  onChangeNotes: (val: string) => void;
  // Voucher State
  voucherCode: string;
  onChangeVoucherCode: (val: string) => void;
  voucherDiscount: number;
  voucherError: string;
  voucherSuccess: string;
  isVerifyingVoucher: boolean;
  onVerifyVoucher: () => void;
  onRemoveVoucher?: () => void;
  cachedVoucherCode?: string;
  onReapplyCachedVoucher?: (code: string) => void;
  // Submit
  isSubmitting: boolean;
  checkoutError?: string;
  onSubmitBooking: (e: React.FormEvent) => void;
}

type AddonFilterTab = 'all' | 'world_bundles' | 'cockpit_ops' | 'media_vip';

interface QuickComboPreset {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  addonIds: string[];
}

const QUICK_COMBOS: QuickComboPreset[] = [
  {
    id: 'combo-eu-captain',
    badge: 'MOST POPULAR BUNDLE',
    title: 'Cold & Dark Startup + Classical EU Trio',
    subtitle: 'Power up the 737 MAX from a dark cockpit (+20m) & fly Heathrow, CDG & Schiphol (+40m)',
    addonIds: ['addon-cold-dark', 'addon-classical-eu'],
  },
  {
    id: 'combo-extreme-ops',
    badge: 'PRO PILOT CHALLENGE',
    title: 'Crosswind/IFR Storm + Extreme World Approaches',
    subtitle: 'Battle live gusts & low-visibility ILS (+15m) plus Paro Valley, Lukla & Madeira (+25m)',
    addonIds: ['addon-xwind-ifr', 'addon-extreme-airports'],
  },
  {
    id: 'combo-med-video',
    badge: 'GIFT & VLOG FAVORITE',
    title: 'Mediterranean Islands Trio + Multi-Angle Video',
    subtitle: 'Skiathos, Corfu & Santorini approaches (+40m) with full 1080p cockpit recording',
    addonIds: ['addon-med-islands', 'addon-video'],
  },
];

const WORLD_BUNDLE_IDS = new Set([
  'addon-classical-eu',
  'addon-med-islands',
  'addon-us-megacities',
  'addon-night-neon',
  'addon-alpine-mountains',
  'addon-tropical-ocean',
  'addon-middle-east-legends',
]);

const COCKPIT_OPS_IDS = new Set(['addon-cold-dark', 'addon-xwind-ifr', 'addon-extreme-airports']);

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
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
];

function getPackageFormulaBadge(duration: number, category: string) {
  if (category === 'training') {
    return {
      text: '🎯 Airline Checkride • Raw Data & V1 Failure',
      cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-bold',
    };
  }
  if (category === 'fear_of_flying') {
    return {
      text: '🕊️ Private Therapy & Captain Coaching • Gentle Pacing',
      cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold',
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

export function AmazonFlightStorefront({
  selectedDate,
  onSelectDate,
  selectedPackage,
  packages,
  onSelectPackage,
  slots,
  selectedSlot,
  onSelectSlot,
  durationAvailability,
  loadingSlots,
  addons,
  selectedAddons,
  onToggleAddon,
  onSetAddons,
  manifest,
  pilotName,
  onChangePilotName,
  pilotEmail,
  onChangePilotEmail,
  pilotPhone,
  onChangePilotPhone,
  experienceLevel,
  onChangeExperienceLevel,
  notes,
  onChangeNotes,
  voucherCode,
  onChangeVoucherCode,
  voucherDiscount,
  voucherError,
  voucherSuccess,
  isVerifyingVoucher,
  onVerifyVoucher,
  onRemoveVoucher,
  cachedVoucherCode,
  onReapplyCachedVoucher,
  isSubmitting,
  checkoutError,
  onSubmitBooking,
}: AmazonFlightStorefrontProps) {
  const { t, isRTL } = useLanguage();
  const [addonFilter, setAddonFilter] = useState<AddonFilterTab>('all');
  const [calendarMode, setCalendarMode] = useState<'strip' | 'month'>('strip');
  const [blueprintPackage, setBlueprintPackage] = useState<SimulatorPackage | null>(null);

  const [viewMonthDate, setViewMonthDate] = useState<Date>(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y || new Date().getFullYear(), (m || 1) - 1, 1);
  });

  // 14-day quick strip
  const horizonDays = useMemo(() => {
    const list: { dateStr: string; dayName: string; dayNum: number; monthShort: string; isSat: boolean }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      const dateStr = formatLocalYMD(d);
      const dow = d.getDay();
      list.push({
        dateStr,
        dayName: DAY_NAMES_SHORT[dow],
        dayNum: d.getDate(),
        monthShort: MONTH_NAMES[d.getMonth()].slice(0, 3),
        isSat: dow === 6,
      });
    }
    return list;
  }, []);

  // Full month grid
  const monthGridDays = useMemo(() => {
    const year = viewMonthDate.getFullYear();
    const month = viewMonthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDow = firstDayOfMonth.getDay();

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
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      cellDate.setHours(0, 0, 0, 0);
      cells.push({
        dateStr: formatLocalYMD(cellDate),
        dayNum: d,
        isPast: cellDate < today,
      });
    }
    return cells;
  }, [viewMonthDate]);

  // Filter packages that are available on the selected date
  const nonCorporatePackages = useMemo(
    () => packages.filter((p) => p.category !== 'corporate'),
    [packages]
  );

  const visiblePackages = useMemo(() => {
    return nonCorporatePackages;
  }, [nonCorporatePackages]);

  const availableSlotCount = useMemo(() => slots.filter((s) => s.available).length, [slots]);

  // Group visible slots by Morning, Afternoon, Evening
  const groupedSlots = useMemo(() => {
    const visible = slots.filter((s) => s.available || s.disabledReason === 'booked');
    const groups: Record<'morning' | 'afternoon' | 'evening', FlightSlot[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    for (const slot of visible) {
      const hour = parseInt(slot.startTime.split(':')[0], 10);
      if (hour < 15) {
        groups.morning.push(slot);
      } else if (hour < 18) {
        groups.afternoon.push(slot);
      } else {
        groups.evening.push(slot);
      }
    }
    return groups;
  }, [slots]);

  // Categorized Add-ons
  const filteredAddons = useMemo(() => {
    if (addonFilter === 'world_bundles') {
      return addons.filter((a) => WORLD_BUNDLE_IDS.has(a.id));
    }
    if (addonFilter === 'cockpit_ops') {
      return addons.filter((a) => COCKPIT_OPS_IDS.has(a.id));
    }
    if (addonFilter === 'media_vip') {
      return addons.filter((a) => !WORLD_BUNDLE_IDS.has(a.id) && !COCKPIT_OPS_IDS.has(a.id));
    }
    return addons;
  }, [addons, addonFilter]);

  const {
    cleanPackageTitle,
    baseDurationMinutes,
    addonsDurationMinutes,
    totalDurationMinutes,
    effectiveEndTime,
    maxAvailableMinutes,
    basePriceIls,
    subtotalIls,
    totalIls,
  } = manifest;

  const slotCapacityPercent = Math.min(
    100,
    Math.round((totalDurationMinutes / Math.max(maxAvailableMinutes, totalDurationMinutes, 60)) * 100)
  );

  const getAddonIcon = (addon: FlightAddon) => {
    if (WORLD_BUNDLE_IDS.has(addon.id) || addon.icon === 'Globe') {
      return <Globe className="w-4 h-4 text-sky-400" />;
    }
    if (addon.icon === 'CloudLightning') return <CloudLightning className="w-4 h-4 text-amber-400" />;
    if (addon.icon === 'Compass') return <Mountain className="w-4 h-4 text-rose-400" />;
    if (addon.icon === 'Zap') return <Plane className="w-4 h-4 text-emerald-400" />;
    if (addon.icon === 'Video') return <Video className="w-4 h-4 text-purple-400" />;
    if (addon.icon === 'Users') return <Users className="w-4 h-4 text-sky-400" />;
    return <Sparkles className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* =====================================================================
          LEFT 8 COLUMNS: AMAZON-STYLE PRODUCT CONFIGURATOR & FLIGHT CATALOG
         ===================================================================== */}
      <div className="lg:col-span-8 space-y-8">
        {/* PRODUCT HERO BAR (Amazon Product Header + Aviation Telemetry) */}
        <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                PRIME FLIGHT DECK • INSTANT CONFIRMATION
              </span>
              <a
                href={FACILITY_INFO.googleReviewsDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:underline"
              >
                <Star aria-hidden="true" className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <Star aria-hidden="true" className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <Star aria-hidden="true" className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <Star aria-hidden="true" className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <Star aria-hidden="true" className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-slate-300 font-mono text-[11px] ml-1">
                  5.0 (390+ Google Reviews ↗)
                </span>
              </a>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
              ● 1:1 Scale Boeing 737 MAX-8 • Tel Aviv (Gershon Shatz 36) • Age 10+
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {cleanPackageTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {selectedPackage.shortDesc}
              </p>
            </div>
            <div className="shrink-0 flex sm:flex-col items-baseline sm:items-end justify-between gap-2 bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-slate-400">Base Package Price</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white">
                  {formatCurrency(basePriceIls)}
                </span>
                <span className="text-xs font-mono text-sky-400 font-bold">
                  / {baseDurationMinutes} min
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            SECTION 1: DEPARTURE DATE & RUNWAY TIME SLOT (1-CLICK SELECTION)
           =================================================================== */}
        <section className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 font-mono text-xs font-black flex items-center justify-center">
                1
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-sky-400" />
                  <span>Select Departure Date & Runway Slot</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time cockpit availability • Click any date and departure time
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setCalendarMode('strip')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
                  calendarMode === 'strip'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                14 Days
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('month')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
                  calendarMode === 'month'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Full Month
              </button>
            </div>
          </div>

          {/* 14-Day Horizontal Strip OR Full Month Grid */}
          {calendarMode === 'strip' ? (
            <div className="grid grid-cols-7 sm:grid-cols-7 md:grid-cols-14 gap-1.5">
              {horizonDays.map((day) => {
                const isSelected = day.dateStr === selectedDate;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => onSelectDate(day.dateStr)}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/15 text-white shadow-md ring-1 ring-amber-400/50'
                        : 'border-slate-800/90 bg-slate-950/70 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-[9px] font-mono uppercase text-slate-400">{day.dayName}</span>
                    <span className="text-sm font-black font-mono text-white my-0.5">{day.dayNum}</span>
                    <span className="text-[9px] font-mono text-slate-500">{day.monthShort}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setViewMonthDate(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() - 1, 1))
                  }
                  className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-white font-mono">
                  {MONTH_NAMES[viewMonthDate.getMonth()]} {viewMonthDate.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setViewMonthDate(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() + 1, 1))
                  }
                  className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAY_NAMES_SHORT.map((d) => (
                  <div key={d} className="text-[10px] font-mono text-slate-500 py-1">
                    {d}
                  </div>
                ))}
                {monthGridDays.map((cell, idx) => {
                  if (!cell.dateStr) return <div key={`empty-${idx}`} className="h-9" />;
                  const isSelected = cell.dateStr === selectedDate;
                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      disabled={cell.isPast}
                      onClick={() => onSelectDate(cell.dateStr!)}
                      className={`h-9 rounded-lg font-mono text-xs transition-all ${
                        cell.isPast
                          ? 'text-slate-700 cursor-not-allowed'
                          : isSelected
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {cell.dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Departure Time Slots */}
          <div className="pt-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Departure Slots for {formatDate(selectedDate)}:</span>
              </span>
              {selectedSlot && (
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  Selected Window: {selectedSlot.startTime}–{effectiveEndTime || selectedSlot.endTime} (Max{' '}
                  {maxAvailableMinutes}m available)
                </span>
              )}
            </div>

            {loadingSlots ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-14 rounded-xl bg-slate-950/60 border border-slate-800/60 animate-pulse"
                  />
                ))}
              </div>
            ) : availableSlotCount === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-amber-500/30 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    No open runway slots for {cleanPackageTitle} on {formatDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    All departure windows for this duration are currently booked or reserved. Choose another date or try an available duration today:
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {packages
                    .filter(
                      (p) =>
                        p.category !== 'corporate' &&
                        p.id !== selectedPackage.id &&
                        (durationAvailability[p.durationMinutes]?.availableCount ?? 0) > 0
                    )
                    .map((altPkg) => (
                      <Button
                        key={altPkg.id}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectPackage(altPkg)}
                        className="font-mono text-xs"
                      >
                        Try {altPkg.durationMinutes}m ({formatCurrency(durationAvailability[altPkg.durationMinutes]?.minPriceIls || altPkg.priceIls)})
                      </Button>
                    ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = new Date(new Date(selectedDate).getTime() + 86400000);
                      onSelectDate(formatLocalYMD(next));
                    }}
                    className="font-mono text-xs text-sky-400 border-sky-500/40 hover:bg-sky-500/10"
                  >
                    Check Next Day →
                  </Button>
                </div>

                {slots.some((s) => s.disabledReason === 'booked') && (
                  <div className="pt-3 border-t border-slate-900 text-left rtl:text-right">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1.5">
                      Booked Slots on this Date:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {slots
                        .filter((s) => s.disabledReason === 'booked')
                        .map((slot) => (
                          <span
                            key={slot.id}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-500 line-through"
                          >
                            {slot.startTime} ({slot.disabledNote || 'Booked'})
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                  const periodSlots = groupedSlots[period];
                  if (periodSlots.length === 0) return null;
                  const periodLabel =
                    period === 'morning' ? 'Morning' : period === 'afternoon' ? 'Afternoon' : 'Evening';

                  return (
                    <div key={period} className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        {periodLabel}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {periodSlots.map((slot) => {
                          const isSelected = selectedSlot?.id === slot.id;
                          const isOptimal =
                            slot.available && slot.smartRecommendation === 'optimal_150_pair';
                          const maxWin = slot.maxAvailableMinutes ?? slot.durationMinutes;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => onSelectSlot(slot)}
                              className={`relative px-3 py-2.5 rounded-xl border text-left rtl:text-right transition-all flex flex-col justify-between ${
                                !slot.available
                                  ? 'border-slate-800/40 bg-slate-950/30 opacity-40 cursor-not-allowed line-through'
                                  : isSelected
                                  ? 'border-amber-400 bg-amber-500/15 text-white shadow-md ring-1 ring-amber-400/50'
                                  : isOptimal
                                  ? 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400 text-white'
                                  : 'border-slate-800 bg-slate-950/80 hover:border-sky-500/50 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-sm font-black" dir="ltr">
                                  {slot.startTime}
                                </span>
                                {isSelected ? (
                                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                ) : isOptimal ? (
                                  <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : null}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                {slot.available ? `Up to ${maxWin}m fit` : 'Booked'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===================================================================
            SECTION 2: AMAZON VARIATION SWATCHES — BASE FLIGHT PACKAGE
           =================================================================== */}
        <section className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 font-mono text-xs font-black flex items-center justify-center">
                2
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Select Base Flight Package (Edition / Duration)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Showing packages with available runway time on {formatDate(selectedDate)}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Edition: <strong className="text-amber-400">{selectedPackage.durationMinutes} Minutes</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visiblePackages.map((pkg) => {
              const isSelected = pkg.id === selectedPackage.id;
              const availInfo = durationAvailability[pkg.durationMinutes];
              const slotCount = availInfo ? availInfo.availableCount : (pkg.id === selectedPackage.id ? slots.filter((s) => s.available).length : 0);
              const isAvailable = availInfo ? availInfo.availableCount > 0 : true;
              const displayPrice =
                availInfo && availInfo.minPriceIls > 0 ? availInfo.minPriceIls : pkg.priceIls;
              const cleanTitle = sanitizePackageTitle(pkg.title);
              const formulaBadge = getPackageFormulaBadge(pkg.durationMinutes, pkg.category);

              return (
                <div
                  key={pkg.id}
                  onClick={() => onSelectPackage(pkg)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectPackage(pkg);
                    }
                  }}
                  className={`p-4 rounded-xl border text-left rtl:text-right transition-all flex flex-col justify-between relative cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 shadow-lg ring-1 ring-amber-400/50'
                      : !isAvailable
                      ? 'border-slate-800/60 bg-slate-950/40 opacity-80 hover:border-slate-700'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {pkg.durationMinutes} MIN
                      </span>
                      {!isAvailable ? (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                          0 slots today
                        </span>
                      ) : pkg.badge ? (
                        <span className="text-[10px] font-mono font-bold text-amber-300 truncate">
                          {pkg.badge}
                        </span>
                      ) : null}
                    </div>

                    {/* Formula Pill (What is included at a glance) */}
                    <div
                      className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border leading-tight ${formulaBadge.cls}`}
                    >
                      <span>{formulaBadge.text}</span>
                    </div>

                    <div className="font-bold text-sm text-white leading-snug">{cleanTitle}</div>

                    <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                      {pkg.shortDesc}
                    </p>

                    {/* Mission Blueprint / What's Included Interactive Popup Trigger */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBlueprintPackage(pkg);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:text-sky-300 underline font-semibold transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>What&apos;s Included / Mission Blueprint ↗</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-black font-mono text-white">
                        {formatCurrency(displayPrice)}
                      </span>
                      <div className="text-[10px] font-mono">
                        {!isAvailable ? (
                          <span className="text-amber-400">● 0 slots open today</span>
                        ) : (
                          <span className="text-emerald-400">● {slotCount} slots open</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isSelected ? '✓ Selected' : 'Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3 & 4: RENDERED ONLY WHEN ADDONS EXIST.
            FOR NOISE-FREE PROFESSIONAL TRAINING & FEAR OF FLYING, ADDONS ARE EMPTY. */}
        {addons.length > 0 ? (
          <>
            <section className="p-5 sm:p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/15 via-slate-900/80 to-slate-950 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                ⚡ AMAZON-STYLE 1-CLICK BUNDLES
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Frequently Flown Together — Curated Mission Combos
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              1-click adds modules & auto-calculates runway time
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {QUICK_COMBOS.map((combo) => {
              const comboAddons = combo.addonIds
                .map((id) => addons.find((a) => a.id === id))
                .filter((a): a is FlightAddon => Boolean(a));
              const comboExtraMin = comboAddons.reduce((sum, a) => sum + a.durationMinutes, 0);
              const comboExtraPrice = comboAddons.reduce((sum, a) => sum + a.priceIls, 0);
              const combinedDuration = baseDurationMinutes + comboExtraMin;
              const combinedPrice = basePriceIls + comboExtraPrice;
              const fitsSlot = combinedDuration <= maxAvailableMinutes;
              const isComboActive =
                combo.addonIds.every((id) => selectedAddons.includes(id)) &&
                selectedAddons.length === combo.addonIds.length;

              return (
                <div
                  key={combo.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isComboActive
                      ? 'border-amber-400 bg-amber-500/15 shadow-lg'
                      : fitsSlot
                      ? 'border-slate-800 bg-slate-950/85 hover:border-amber-500/50'
                      : 'border-slate-800/50 bg-slate-950/40 opacity-55'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {combo.badge}
                      </span>
                      <span className="text-xs font-mono font-bold text-sky-400">
                        +{comboExtraMin}m
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug">{combo.title}</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{combo.subtitle}</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-baseline justify-between text-xs font-mono">
                      <span className="text-slate-400">Combo Total ({combinedDuration}m):</span>
                      <span className="text-base font-black text-emerald-400">
                        {formatCurrency(combinedPrice)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!fitsSlot}
                      onClick={() => onSetAddons(isComboActive ? [] : combo.addonIds)}
                      className={`w-full py-2 px-3 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        !fitsSlot
                          ? 'bg-slate-900 text-amber-400/80 cursor-not-allowed'
                          : isComboActive
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      }`}
                    >
                      {!fitsSlot ? (
                        <span>Needs {combinedDuration}m (Max {maxAvailableMinutes}m at slot)</span>
                      ) : isComboActive ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Combo Active (Click to Reset)</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Apply Combo (+{formatCurrency(comboExtraPrice)})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            SECTION 4: CATEGORIZED ADD-ON MARKETPLACE ("ADD TO FLIGHT CART")
           =================================================================== */}
        <section className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 font-mono text-xs font-black flex items-center justify-center">
                3
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Customize Flight Plan — World Airport Trios & Cockpit Modules
                </h2>
                <p className="text-xs text-slate-400">
                  Mix & match 3-airport global tours (+40m), Cold & Dark startup (+20m), or IFR weather (+15m)
                </p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: `All (${addons.length})` },
                { id: 'world_bundles', label: '🌍 3-Airport Trios (7)' },
                { id: 'cockpit_ops', label: '✈️ Cockpit & Weather (3)' },
                { id: 'media_vip', label: '🎥 Media & VIP (2)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAddonFilter(tab.id as AddonFilterTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    addonFilter === tab.id
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredAddons.map((addon) => {
              const isChecked = selectedAddons.includes(addon.id);
              const addonMin = addon.durationMinutes;
              const isWorldBundle = WORLD_BUNDLE_IDS.has(addon.id);
              const fitsSlot =
                isChecked || canAddonFitInSlot(addon, totalDurationMinutes, maxAvailableMinutes);

              return (
                <div
                  key={addon.id}
                  className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col justify-between ${
                    !fitsSlot
                      ? 'border-slate-800/50 bg-slate-950/40 opacity-55'
                      : isChecked
                      ? 'border-amber-400 bg-amber-500/10 shadow-lg ring-1 ring-amber-400/40'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {getAddonIcon(addon)}
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                          {isWorldBundle
                            ? '3-AIRPORT WORLD TOUR'
                            : addonMin > 0
                            ? 'COCKPIT MISSION MODULE'
                            : 'MEDIA & VIP UPGRADE'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {addonMin > 0 && (
                          <span className="text-xs font-mono font-bold text-sky-300 px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30">
                            +{addonMin} min
                          </span>
                        )}
                        <span className="text-sm font-mono font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          +{formatCurrency(addon.priceIls)}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {addon.name}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed">{addon.description}</p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    {!fitsSlot ? (
                      <span className="text-[11px] font-mono text-amber-400">
                        Exceeds {maxAvailableMinutes}m slot window at {selectedSlot?.startTime}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">
                        {addonMin > 0 ? `Extends flight by +${addonMin}m` : 'Included during session'}
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={!fitsSlot}
                      onClick={() => onToggleAddon(addon.id)}
                      className={`px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                        !fitsSlot
                          ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                          : isChecked
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-sm'
                      }`}
                    >
                      {isChecked ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added to Flight</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Flight</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </>
    ) : (
      /* NOISE-FREE REASSURANCE BANNER FOR SPECIALIZED SESSIONS (PRO TRAINING & FEAR OF FLYING) */
      <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {selectedPackage.category === 'training'
              ? '🎯 NOISE-FREE AIRLINE ASSESSMENT SCHEDULING'
              : selectedPackage.category === 'fear_of_flying'
              ? '🕊️ CALM & REASSURING FEAR OF FLYING SCHEDULING'
              : 'DIRECT FLIGHT SCHEDULING'}
          </span>
        </div>
        <p className="text-sm font-semibold text-white leading-relaxed">
          {selectedPackage.category === 'training'
            ? 'Your slot is dedicated strictly to professional airline assessment preparation (Raw Data, V1 Engine Cut, Single-Engine ILS & QRH flows). Recreational tourism add-ons are suppressed.'
            : selectedPackage.category === 'fear_of_flying'
            ? 'Your slot is dedicated to a calm, empowering experience overcoming flight anxiety with an airline captain at your own comfortable pace. Stunt weather and turbulence add-ons are completely suppressed.'
            : 'Direct flight reservation with dedicated cockpit time.'}
        </p>
      </div>
    )}
  </div>

      {/* =====================================================================
          RIGHT 4 COLUMNS: STICKY AMAZON "BUY BOX" & EXPRESS PILOT CHECKOUT
         ===================================================================== */}
      <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
        <form
          onSubmit={onSubmitBooking}
          className="rounded-2xl border-2 border-amber-500/40 bg-slate-900/95 p-5 sm:p-6 space-y-5 shadow-2xl"
        >
          {/* BUY BOX HEADER: LIVE TOTAL PRICE & DURATION */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase text-amber-400">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>FLIGHT DISPATCH BUY BOX</span>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                {formatCurrency(totalIls)}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Includes VAT • Certified Instructor Included
              </div>
            </div>

            <div className="text-right rtl:text-left bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl">
              <div className="text-[10px] font-mono uppercase text-slate-400">Total Flight</div>
              <div className="text-lg font-black font-mono text-sky-400">
                {totalDurationMinutes} MIN
              </div>
              {addonsDurationMinutes > 0 && (
                <div className="text-[10px] font-mono text-slate-400">
                  {baseDurationMinutes}m + {addonsDurationMinutes}m
                </div>
              )}
            </div>
          </div>

          {/* LIVE TELEMETRY & RUNWAY WINDOW */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">STATUS:</span>
              {selectedSlot?.available ? (
                <span className="text-emerald-400 font-bold">● In Stock — Cockpit Ready</span>
              ) : (
                <span className="text-amber-400 font-bold">Select a Departure Slot</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">DATE:</span>
              <span className="text-white font-bold">{formatDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">RUNWAY WINDOW:</span>
              <span className="text-sky-400 font-bold" dir="ltr">
                {selectedSlot
                  ? `${selectedSlot.startTime} – ${effectiveEndTime || selectedSlot.endTime} IST`
                  : '—'}
              </span>
            </div>

            {/* Visual Slot Capacity Meter */}
            {selectedSlot && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Slot Time Used: {totalDurationMinutes}m</span>
                  <span>Max Window: {maxAvailableMinutes}m</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${slotCapacityPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* INTERACTIVE ITEMIZED CART BREAKDOWN */}
          <div className="space-y-2 pt-1 border-t border-slate-800 text-xs">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Selected Flight Manifest ({1 + manifest.selectedAddonItems.length}{' '}
              {manifest.selectedAddonItems.length === 0 ? 'item' : 'items'})
            </div>

            {/* Base Package Line */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="min-w-0">
                <div className="font-bold text-white truncate">{cleanPackageTitle}</div>
                <div className="text-[10px] font-mono text-sky-400">
                  Base Package • {baseDurationMinutes} min
                </div>
              </div>
              <span className="font-mono font-bold text-white shrink-0">
                {formatCurrency(basePriceIls)}
              </span>
            </div>

            {/* Selected Add-On Lines with 1-Click Remove */}
            {manifest.selectedAddonItems.map((item) => (
              <div
                key={item.addon.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-sky-950/20 border border-sky-500/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-200 truncate">+ {item.addon.name}</div>
                  <div className="text-[10px] font-mono text-sky-300">
                    {item.durationMinutes > 0
                      ? `+${item.durationMinutes} min flight time`
                      : 'Session upgrade'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-emerald-400">
                    {formatCurrency(item.priceIls)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleAddon(item.addon.id)}
                    aria-label={`Remove ${item.addon.name}`}
                    className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {voucherDiscount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold px-1 pt-1">
                <span>
                  {t.booking.voucherDiscount} ({voucherCode})
                </span>
                <span className="font-mono">-{formatCurrency(voucherDiscount)}</span>
              </div>
            )}
          </div>

          {/* EXPRESS PILOT DETAILS FORM (INLINE IN BUY BOX) */}
          <fieldset className="space-y-3 pt-3 border-t border-slate-800">
            <legend className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold mb-1">
              4. Express Captain Manifest
            </legend>

            <div className="space-y-1">
              <label
                htmlFor="storefront-pilot-name"
                className="block text-[11px] font-mono uppercase text-slate-300 font-semibold"
              >
                {t.booking.pilotName} *
              </label>
              <input
                id="storefront-pilot-name"
                name="pilotName"
                type="text"
                required
                autoComplete="name"
                value={pilotName}
                onChange={(e) => onChangePilotName(e.target.value)}
                placeholder={t.booking.pilotNamePlaceholder}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-base text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="storefront-pilot-email"
                  className="block text-[11px] font-mono uppercase text-slate-300 font-semibold"
                >
                  {t.booking.pilotEmail} *
                </label>
                <input
                  id="storefront-pilot-email"
                  name="pilotEmail"
                  type="email"
                  required
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={pilotEmail}
                  onChange={(e) => onChangePilotEmail(e.target.value)}
                  placeholder="captain@example.com"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-base text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="storefront-pilot-phone"
                  className="block text-[11px] font-mono uppercase text-slate-300 font-semibold"
                >
                  {t.booking.pilotPhone} *
                </label>
                <input
                  id="storefront-pilot-phone"
                  name="pilotPhone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={pilotPhone}
                  onChange={(e) => onChangePilotPhone(e.target.value)}
                  placeholder="055-507-1307"
                  dir="ltr"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-base text-white focus:outline-none focus:border-amber-400 text-left rtl:text-right"
                />
              </div>
            </div>

            {/* Experience Level as 4 Visible Radio Options (Zero-Click Scanning per Modern Web Guidance) */}
            <div className="space-y-1.5 pt-1">
              <span className="block text-[11px] font-mono uppercase text-slate-300 font-semibold">
                {t.booking.pilotExperience}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { value: 'beginner', label: 'First-Timer' },
                    { value: 'enthusiast', label: 'Sim Enthusiast' },
                    { value: 'student_pilot', label: 'Student Pilot' },
                    { value: 'atpl', label: 'Licensed Pilot' },
                  ] as Array<{ value: PilotExperienceLevel; label: string }>
                ).map((opt) => {
                  const active = experienceLevel === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`px-2.5 py-2 rounded-lg border text-xs font-mono cursor-pointer flex items-center gap-2 transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-500/15 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="experienceLevel"
                        value={opt.value}
                        checked={active}
                        onChange={() => onChangeExperienceLevel(opt.value)}
                        className="accent-amber-400"
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Optional Promo / Gift Voucher */}
            <div className="pt-2 space-y-2">
              <label
                htmlFor="storefront-voucher-code"
                className="text-[11px] font-mono uppercase text-slate-300 font-semibold flex items-center justify-between"
              >
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.booking.voucherPromoTitle}</span>
                </span>
                {voucherDiscount > 0 && onRemoveVoucher && (
                  <button
                    type="button"
                    onClick={onRemoveVoucher}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-red-400 hover:text-red-300 underline font-bold"
                  >
                    <X className="w-3 h-3" />
                    <span>{t.booking.removeVoucher}</span>
                  </button>
                )}
              </label>

              {voucherDiscount > 0 ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{voucherCode}</span>
                    </p>
                    <p className="text-[11px] font-mono text-emerald-300">
                      -{formatCurrency(voucherDiscount)} ({t.booking.discountApplied})
                    </p>
                  </div>
                  {onRemoveVoucher && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onRemoveVoucher}
                      className="text-xs text-slate-400 hover:text-red-300 px-2 py-1 h-auto"
                    >
                      {t.booking.resetVoucher}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      id="storefront-voucher-code"
                      name="voucherCode"
                      type="text"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      placeholder={t.booking.voucherPlaceholder}
                      value={voucherCode}
                      onChange={(e) => onChangeVoucherCode(e.target.value)}
                      dir="ltr"
                      className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white uppercase font-mono focus:outline-none focus:border-amber-400"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      isLoading={isVerifyingVoucher}
                      onClick={onVerifyVoucher}
                    >
                      {isVerifyingVoucher ? '...' : t.booking.applyCode}
                    </Button>
                  </div>

                  {cachedVoucherCode && onReapplyCachedVoucher && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg">
                      <span>{t.booking.savedVoucher} <strong className="text-sky-300">{cachedVoucherCode}</strong></span>
                      <button
                        type="button"
                        onClick={() => onReapplyCachedVoucher(cachedVoucherCode)}
                        className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors"
                      >
                        {t.booking.reapplyVoucher}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {voucherSuccess && <p className="text-[11px] text-emerald-400 font-mono">{voucherSuccess}</p>}
              {voucherError && <p className="text-[11px] text-red-400 font-mono">{voucherError}</p>}
            </div>

            {/* Special Notes */}
            <div className="space-y-1 pt-1">
              <label
                htmlFor="storefront-notes"
                className="block text-[11px] font-mono uppercase text-slate-400"
              >
                {t.booking.specialRequests}
              </label>
              <textarea
                id="storefront-notes"
                name="notes"
                rows={2}
                value={notes}
                onChange={(e) => onChangeNotes(e.target.value)}
                placeholder={t.booking.specialRequestsPlaceholder}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </fieldset>

          {/* AMAZON-STYLE PRIMARY BUY BUTTON */}
          {checkoutError && (
            <div
              id="storefront-checkout-feedback"
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-red-500/40 bg-red-950/50 px-3 py-2.5 text-xs leading-relaxed text-red-200"
            >
              {checkoutError}
            </div>
          )}
          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            className="w-full font-black text-base py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xl border border-amber-300"
          >
            <CreditCard className="w-5 h-5" />
            <span>
              {isSubmitting
                ? t.booking.processing
                : `${t.booking.proceedToPayment} (${formatCurrency(totalIls)})`}
            </span>
          </Button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-center">{t.booking.secureNotice}</span>
          </div>
        </form>
      </div>

      {/* =====================================================================
          MISSION BLUEPRINT / WHAT'S INCLUDED INTERACTIVE MODAL DIALOG
         ===================================================================== */}
      {blueprintPackage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="blueprint-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setBlueprintPackage(null)}
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl border-2 border-sky-500/40 bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>OFFICIAL FLIGHT BLUEPRINT • WHAT&apos;S INCLUDED</span>
                </div>
                <h3 id="blueprint-modal-title" className="text-xl sm:text-2xl font-black text-white mt-1">
                  {blueprintPackage.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-mono mt-0.5">
                  Duration: <strong className="text-amber-400">{blueprintPackage.durationMinutes} Minutes</strong> • {formatCurrency(blueprintPackage.priceIls)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setBlueprintPackage(null)}
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
                  <span>Cockpit Mission Architecture</span>
                </h4>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Hands-On Pilot-in-Command:</strong> Full {blueprintPackage.durationMinutes} minutes in the Left Seat (Captain) or Right Seat with motorized throttle levers, dual flight directors, and 220° 4K panoramic horizon.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Takeoff &amp; Landing Foundation:</strong> Guided takeoff roll, climbout navigation, pattern circuits, and smooth landings.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">World Route Inclusions:</strong>{' '}
                      {blueprintPackage.durationMinutes === 60
                        ? 'Includes Takeoff & Landing exercise + 1 full World Trio theme of your choice (fly 3 iconic airports such as London Heathrow/Paris CDG/Amsterdam Schiphol, or Mediterranean Islands, or Innsbruck Alps) with customizable weather.'
                        : blueprintPackage.durationMinutes === 90
                        ? 'Includes Takeoff & Landing exercise + up to 2 World Trio themes (4 to 6 dramatic international landings) + your choice of Cold & Dark Startup or V1 Engine-Out emergencies. Can be shared between 1 or 2 pilots taking turns!'
                        : blueprintPackage.category === 'training'
                        ? 'Raw Data manual flying (FD OFF), steep 45° turns, V1 Cut engine failure, Single-Engine ILS, and QRH checklist drills.'
                        : 'Single or multi-landing flight session with real-time weather and ATC communication.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Free Cockpit Observers:</strong> Up to {blueprintPackage.guestSeats} family members or friends inside the cockpit jumpseats free of charge (photos &amp; video welcome!).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Personal Airline Instructor:</strong> 1-on-1 personalized pre-flight briefing and continuous cockpit guidance from certified commercial pilots.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Package Features List */}
              <div className="space-y-2">
                <p className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                  Highlights &amp; Amenities:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {blueprintPackage.features.map((feat, idx) => (
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
                onClick={() => setBlueprintPackage(null)}
                className="w-full sm:w-auto text-slate-400 hover:text-white"
              >
                Close Blueprint
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onSelectPackage(blueprintPackage);
                  setBlueprintPackage(null);
                }}
                className="w-full sm:w-auto font-black bg-amber-400 hover:bg-amber-300 text-slate-950 px-6"
              >
                <span>Select This Package ({formatCurrency(blueprintPackage.priceIls)})</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
