'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  ChevronRight,
  Check,
  Users,
  Award,
  ShoppingCart,
  Plus,
  X,
  Tag,
  CreditCard,
  ShieldCheck,
  Plane,
  CloudLightning,
  Mountain,
  Zap,
  Globe,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BookingMonthPager } from '@/components/scheduler/BookingMonthPager';
import { BookingWeekPager } from '@/components/scheduler/BookingWeekPager';
import {
  FlightSlot,
  SimulatorPackage,
  FlightAddon,
  PilotExperienceLevel,
  MissionManifestCalculation,
  SlotBlockPeriod,
} from '@/types';
import { addDaysToYmd, formatCurrency } from '@/lib/utils';
import { useModalFocus } from '@/lib/ui/use-modal-focus';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language, LocalizedRecord } from '@/lib/i18n/translations';
import {
  calendarMonthCells,
  calendarWeekDays,
  calendarWeekdayNames,
  formatCalendarDate,
  formatCalendarDayNumber,
  formatCalendarMonth,
  monthStartForYmd,
} from '@/lib/i18n/calendar-presentation';
import { isBeyondBookingHorizon, maxBookableDate } from '@/lib/scheduler/booking-horizon';
import { canAddonFitInSlot, packageFromPriceIls, sanitizePackageTitle } from '@/lib/scheduler/mission-calculator';
import { getPackageFormulaBadge } from '@/lib/scheduler/package-presentation';
import { BOOKING_BLUEPRINT_COPY } from '@/lib/i18n/booking-blueprint-copy';

interface AmazonFlightStorefrontProps {
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
  durationAvailability: Record<number, { availableCount: number; minPriceIls: number }>;
  loadingSlots: boolean;
  /** The last slots request failed; show a load error with a retry instead of a sold-out day. */
  slotsLoadFailed?: boolean;
  onRetrySlots?: () => void;
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
  /** Guest-checkout or signed-in notice, rendered under the checkout button. */
  accountNotice?: React.ReactNode;
  /** Active Wix subscription redemption uses Wix-hosted Bookings checkout. */
  subscriptionCheckout?: { notice: string; cta: string };
}

type AddonFilterTab = 'all' | 'world_bundles' | 'cockpit_ops' | 'guest_extras';

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
    subtitle: 'Battle live gusts & low-visibility ILS (+15m) plus Paro, Hong Kong Kai Tak & Innsbruck (+25m)',
    addonIds: ['addon-xwind-ifr', 'addon-extreme-airports'],
  },
  {
    id: 'combo-med-guest',
    badge: 'SHARED FLIGHT FAVORITE',
    title: 'Mediterranean Islands Trio + Extra Cockpit Guest',
    subtitle: 'Corfu, Skiathos & Nice approaches (+40m), shared with one additional cockpit observer',
    addonIds: ['addon-med-islands', 'addon-extra-seat'],
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

interface StorefrontCalendarCopy {
  departureTitle: string;
  departureSubtitle: string;
  viewWeek: string;
  viewMonth: string;
  previousMonth: string;
  nextMonth: string;
  departureSlots: (date: string) => string;
  selectedWindow: string;
  maxAvailable: (minutes: number) => string;
  checkNextDay: string;
  noSlots: (packageTitle: string, date: string) => string;
  noSlotsHint: string;
  tryFlight: (minutes: number, price: string) => string;
  morning: string;
  afternoon: string;
  evening: string;
  upToFit: (minutes: number) => string;
  packagesAvailable: (date: string) => string;
  openSlotsCount: (count: number) => string;
  jumpToTimes: string;
  jumpToCheckout: string;
  customizeFlight: string;
  chooseTrainingDuration: string;
  reviewFlightDetails: string;
  basePackagePrice: string;
  selectPackageTitle: string;
  edition: string;
  minutes: (minutes: number) => string;
  noSlotsToday: string;
  slotsOpenToday: (count: number) => string;
  selected: string;
  select: string;
}

interface StorefrontAddonCopy {
  selectedPlanEyebrow: string;
  selectedPlanTitle: string;
  selectedPlanSubtitle: string;
  selected: string;
  remove: string;
  removeFromSelectedPlan: (addonName: string) => string;
}

const STOREFRONT_CALENDAR_COPY: LocalizedRecord<StorefrontCalendarCopy> = {
  en: {
    departureTitle: 'Select Departure Date & Runway Slot',
    departureSubtitle: 'Real-time cockpit availability • Choose a date and departure time',
    viewWeek: 'Week',
    viewMonth: 'Month',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    departureSlots: (date) => `Departure Slots for ${date}:`,
    selectedWindow: 'Selected Window:',
    maxAvailable: (minutes) => `Max ${minutes}m available`,
    checkNextDay: 'Check Next Day →',
    noSlots: (packageTitle, date) => `No open runway slots for ${packageTitle} on ${date}`,
    noSlotsHint: 'All departure windows for this duration are currently booked or reserved. Choose another date or try an available duration today:',
    tryFlight: (minutes, price) => `Try ${minutes}m (${price})`,
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    upToFit: (minutes) => `Up to ${minutes}m fit`,
    packagesAvailable: (date) => `Showing packages with available runway time on ${date}`,
    openSlotsCount: (count) => `${count} slots open`,
    jumpToTimes: 'Pick Time ↓',
    jumpToCheckout: 'Continue to Checkout ↓',
    customizeFlight: 'Packages & Add-ons ↓',
    chooseTrainingDuration: 'Choose Training Duration ↓',
    reviewFlightDetails: 'Review Flight Details ↓',
    basePackagePrice: 'Base package price',
    selectPackageTitle: 'Choose your flight package and duration',
    edition: 'Selected duration',
    minutes: (minutes) => `${minutes} min`,
    noSlotsToday: 'No open slots today',
    slotsOpenToday: (count) => `${count} slots open`,
    selected: 'Selected',
    select: 'Choose',
  },
  he: {
    departureTitle: 'בחירת תאריך המראה ומשבצת מסלול',
    departureSubtitle: 'זמינות תא טייס בזמן אמת • בחרו תאריך ושעת המראה',
    viewWeek: 'שבוע',
    viewMonth: 'חודש',
    previousMonth: 'החודש הקודם',
    nextMonth: 'החודש הבא',
    departureSlots: (date) => `משבצות המראה עבור ${date}:`,
    selectedWindow: 'חלון שנבחר:',
    maxAvailable: (minutes) => `עד ${minutes} דקות זמינות`,
    checkNextDay: 'בדיקת היום הבא ←',
    noSlots: (packageTitle, date) => `אין משבצות מסלול פנויות עבור ${packageTitle} בתאריך ${date}`,
    noSlotsHint: 'כל חלונות ההמראה למשך זה כבר תפוסים או שמורים. בחרו תאריך אחר או משך טיסה זמין להיום:',
    tryFlight: (minutes, price) => `נסו ${minutes} דקות (${price})`,
    morning: 'בוקר',
    afternoon: 'צהריים',
    evening: 'ערב',
    upToFit: (minutes) => `מתאים לעד ${minutes} דקות`,
    packagesAvailable: (date) => `הצגת חבילות עם זמן מסלול זמין בתאריך ${date}`,
    openSlotsCount: (count) => `${count} משבצות פנויות`,
    jumpToTimes: 'בחירת שעה ↓',
    jumpToCheckout: 'המשך לתשלום ↓',
    customizeFlight: 'חבילות ותוספות ↓',
    chooseTrainingDuration: 'בחירת משך אימון ↓',
    reviewFlightDetails: 'לפרטי הטיסה ↓',
    basePackagePrice: 'מחיר החבילה הבסיסית',
    selectPackageTitle: 'בחירת חבילת הטיסה ומשך הטיסה',
    edition: 'משך שנבחר',
    minutes: (minutes) => `${minutes} דק׳`,
    noSlotsToday: 'אין משבצות פנויות היום',
    slotsOpenToday: (count) => `${count} משבצות פנויות`,
    selected: 'נבחרה',
    select: 'לבחירה',
  },
  ru: {
    departureTitle: 'Выберите дату и время вылета',
    departureSubtitle: 'Доступность кабины в реальном времени • выберите дату и время вылета',
    viewWeek: 'Неделя',
    viewMonth: 'Месяц',
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    departureSlots: (date) => `Слоты вылета на ${date}:`,
    selectedWindow: 'Выбранное окно:',
    maxAvailable: (minutes) => `Доступно до ${minutes} мин.`,
    checkNextDay: 'Следующий день →',
    noSlots: (packageTitle, date) => `Нет свободных слотов для ${packageTitle} на ${date}`,
    noSlotsHint: 'Все окна вылета для этой длительности заняты или зарезервированы. Выберите другую дату или доступную длительность сегодня:',
    tryFlight: (minutes, price) => `Попробовать ${minutes} мин. (${price})`,
    morning: 'Утро',
    afternoon: 'День',
    evening: 'Вечер',
    upToFit: (minutes) => `Помещается до ${minutes} мин.`,
    packagesAvailable: (date) => `Пакеты с доступным временем на ${date}`,
    openSlotsCount: (count) => `${count} слотов свободно`,
    jumpToTimes: 'Выбрать время ↓',
    jumpToCheckout: 'Перейти к оплате ↓',
    customizeFlight: 'Пакеты и опции ↓',
    chooseTrainingDuration: 'Выбрать длительность подготовки ↓',
    reviewFlightDetails: 'Проверить детали полёта ↓',
    basePackagePrice: 'Цена базового пакета',
    selectPackageTitle: 'Выберите пакет и длительность полёта',
    edition: 'Выбранная длительность',
    minutes: (minutes) => `${minutes} мин.`,
    noSlotsToday: 'Сегодня нет свободных слотов',
    slotsOpenToday: (count) => `${count} слотов свободно`,
    selected: 'Выбрано',
    select: 'Выбрать',
  },
  fr: {
    departureTitle: 'Choisir la date et le créneau de départ',
    departureSubtitle: 'Disponibilités du cockpit en temps réel • choisissez une date et une heure de départ',
    viewWeek: 'Semaine',
    viewMonth: 'Mois',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    departureSlots: (date) => `Créneaux de départ pour le ${date} :`,
    selectedWindow: 'Créneau sélectionné :',
    maxAvailable: (minutes) => `Jusqu’à ${minutes} min disponibles`,
    checkNextDay: 'Jour suivant →',
    noSlots: (packageTitle, date) => `Aucun créneau de piste disponible pour ${packageTitle} le ${date}`,
    noSlotsHint: 'Tous les créneaux de cette durée sont réservés. Choisissez une autre date ou une durée disponible aujourd’hui :',
    tryFlight: (minutes, price) => `Essayer ${minutes} min (${price})`,
    morning: 'Matin',
    afternoon: 'Après-midi',
    evening: 'Soir',
    upToFit: (minutes) => `Jusqu’à ${minutes} min possibles`,
    packagesAvailable: (date) => `Forfaits avec temps de piste disponible le ${date}`,
    openSlotsCount: (count) => `${count} créneaux libres`,
    jumpToTimes: 'Choisir l’heure ↓',
    jumpToCheckout: 'Continuer vers le paiement ↓',
    customizeFlight: 'Forfaits et options ↓',
    chooseTrainingDuration: 'Choisir la durée de préparation ↓',
    reviewFlightDetails: 'Voir les détails du vol ↓',
    basePackagePrice: 'Prix de la formule de base',
    selectPackageTitle: 'Choisir votre formule et sa durée',
    edition: 'Durée sélectionnée',
    minutes: (minutes) => `${minutes} min`,
    noSlotsToday: 'Aucun créneau libre aujourd’hui',
    slotsOpenToday: (count) => `${count} créneaux libres`,
    selected: 'Sélectionné',
    select: 'Choisir',
  },
  ar: {
    departureTitle: 'اختر تاريخ وموعد الإقلاع',
    departureSubtitle: 'توفر قمرة القيادة في الوقت الفعلي • اختر التاريخ ووقت الإقلاع',
    viewWeek: 'أسبوع',
    viewMonth: 'الشهر',
    previousMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    departureSlots: (date) => `مواعيد الإقلاع ليوم ${date}:`,
    selectedWindow: 'النافذة المختارة:',
    maxAvailable: (minutes) => `متاح حتى ${minutes} دقيقة`,
    checkNextDay: 'فحص اليوم التالي ←',
    noSlots: (packageTitle, date) => `لا توجد مواعيد مسار متاحة لـ ${packageTitle} في ${date}`,
    noSlotsHint: 'جميع نوافذ الإقلاع لهذه المدة محجوزة أو محجوزة مسبقاً. اختر تاريخاً آخر أو مدة متاحة اليوم:',
    tryFlight: (minutes, price) => `جرّب ${minutes} دقيقة (${price})`,
    morning: 'صباح',
    afternoon: 'بعد الظهر',
    evening: 'مساء',
    upToFit: (minutes) => `يتسع حتى ${minutes} دقيقة`,
    packagesAvailable: (date) => `الباقات ذات وقت المسار المتاح في ${date}`,
    openSlotsCount: (count) => `${count} مواعيد متاحة`,
    jumpToTimes: 'اختر الوقت ↓',
    jumpToCheckout: 'المتابعة للدفع ↓',
    customizeFlight: 'الباقات والإضافات ↓',
    chooseTrainingDuration: 'اختيار مدة التدريب ↓',
    reviewFlightDetails: 'مراجعة تفاصيل الرحلة ↓',
    basePackagePrice: 'سعر الباقة الأساسية',
    selectPackageTitle: 'اختر باقة الرحلة ومدتها',
    edition: 'المدة المختارة',
    minutes: (minutes) => `${minutes} دقيقة`,
    noSlotsToday: 'لا توجد مواعيد متاحة اليوم',
    slotsOpenToday: (count) => `${count} مواعيد متاحة`,
    selected: 'تم الاختيار',
    select: 'اختيار',
  },
};

const STOREFRONT_ADDON_COPY: LocalizedRecord<StorefrontAddonCopy> = {
  en: {
    selectedPlanEyebrow: 'FLIGHT PLAN LOADED',
    selectedPlanTitle: 'Selected cockpit modules',
    selectedPlanSubtitle: 'These are included in your flight and itemized again in the checkout manifest.',
    selected: 'Selected',
    remove: 'Remove',
    removeFromSelectedPlan: (addonName) => `Remove ${addonName} from the selected flight plan`,
  },
  he: {
    selectedPlanEyebrow: 'תכנית הטיסה נטענה',
    selectedPlanTitle: 'מודולים שנבחרו לתא הטייס',
    selectedPlanSubtitle: 'אלה כלולים בטיסה שלכם ומופיעים שוב בפירוט ההזמנה לפני התשלום.',
    selected: 'נבחר',
    remove: 'הסרה',
    removeFromSelectedPlan: (addonName) => `הסרת ${addonName} מתכנית הטיסה שנבחרה`,
  },
  ru: {
    selectedPlanEyebrow: 'ПЛАН ПОЛЁТА ЗАГРУЖЕН',
    selectedPlanTitle: 'Выбранные модули кабины',
    selectedPlanSubtitle: 'Они включены в ваш полёт и снова показаны в составе заказа перед оплатой.',
    selected: 'Выбрано',
    remove: 'Удалить',
    removeFromSelectedPlan: (addonName) => `Удалить ${addonName} из выбранного плана полёта`,
  },
  fr: {
    selectedPlanEyebrow: 'PLAN DE VOL CHARGÉ',
    selectedPlanTitle: 'Modules de cockpit sélectionnés',
    selectedPlanSubtitle: 'Ils sont inclus dans votre vol et récapitulés dans le manifeste avant le paiement.',
    selected: 'Sélectionné',
    remove: 'Retirer',
    removeFromSelectedPlan: (addonName) => `Retirer ${addonName} du plan de vol sélectionné`,
  },
  ar: {
    selectedPlanEyebrow: 'تم تحميل خطة الرحلة',
    selectedPlanTitle: 'وحدات قمرة القيادة المختارة',
    selectedPlanSubtitle: 'هذه الوحدات مشمولة في رحلتك وتظهر مجدداً في ملخص الطلب قبل الدفع.',
    selected: 'تم الاختيار',
    remove: 'إزالة',
    removeFromSelectedPlan: (addonName) => `إزالة ${addonName} من خطة الرحلة المختارة`,
  },
};

export function AmazonFlightStorefront({
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
  loadingSlots,
  slotsLoadFailed = false,
  onRetrySlots,
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
  accountNotice,
  subscriptionCheckout,
}: AmazonFlightStorefrontProps) {
  const { t, language, isRTL } = useLanguage();
  const bpCopy = BOOKING_BLUEPRINT_COPY[language] || BOOKING_BLUEPRINT_COPY.en;
  const calendarCopy = STOREFRONT_CALENDAR_COPY[language] || STOREFRONT_CALENDAR_COPY.en;
  const addonCopy = STOREFRONT_ADDON_COPY[language] || STOREFRONT_ADDON_COPY.en;
  const packagesActionLabel =
    selectedPackage.category === 'training'
      ? calendarCopy.chooseTrainingDuration
      : selectedPackage.category === 'fear_of_flying'
        ? calendarCopy.reviewFlightDetails
        : calendarCopy.customizeFlight;
  const [addonFilter, setAddonFilter] = useState<AddonFilterTab>('all');
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week');
  const [blueprintPackage, setBlueprintPackage] = useState<SimulatorPackage | null>(null);
  const blueprintPanelRef = useModalFocus<HTMLDivElement>(blueprintPackage !== null, () => setBlueprintPackage(null));

  // A manually browsed month is an override. Otherwise derive from the selected day so
  // the calendar cannot briefly keep an SSR placeholder month while the booking date is live.
  const [viewMonthOverride, setViewMonthOverride] = useState<Date | null>(null);
  const viewMonthDate = viewMonthOverride ?? monthStartForYmd(selectedDate);
  const slotsContainerRef = useRef<HTMLDivElement>(null);
  const packagesSectionRef = useRef<HTMLElement>(null);
  const buyBoxFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setViewMonthOverride(null);
  }, [selectedDate]);

  const weekDays = useMemo(() => calendarWeekDays(selectedDate, language), [language, selectedDate]);
  const maxDate = maxBookableDate(calendarTodayYmd);
  const weekdayNames = useMemo(() => calendarWeekdayNames(language), [language]);
  const monthGridDays = useMemo(
    () => calendarMonthCells(viewMonthDate, language, calendarTodayYmd),
    [calendarTodayYmd, language, viewMonthDate]
  );

  const selectCalendarDate = (date: string) => {
    setViewMonthOverride(null);
    onSelectDate(date);
  };

  const scrollToSlotsPanel = () => {
    slotsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const scrollToPackagesSection = () => {
    packagesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToBuyBox = () => {
    buyBoxFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Filter packages that are available on the selected date
  const nonCorporatePackages = useMemo(
    () => packages.filter((p) => p.category !== 'corporate'),
    [packages]
  );

  const visiblePackages = useMemo(() => {
    return nonCorporatePackages;
  }, [nonCorporatePackages]);

  const availableSlotCount = useMemo(() => slots.filter((s) => s.available).length, [slots]);

  // Group open slots by Morning, Afternoon, Evening. Booked and internally locked slots are not
  // listed at all: the visitor only ever sees departures they can actually pick.
  const groupedSlots = useMemo(() => {
    const visible = slots.filter((s) => s.available);
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
    if (addonFilter === 'guest_extras') {
      return addons.filter((a) => a.id === 'addon-extra-seat');
    }
    return addons;
  }, [addons, addonFilter]);

  const selectedAddonItems = useMemo(
    () => addons.filter((addon) => selectedAddons.includes(addon.id)),
    [addons, selectedAddons]
  );
  const hasSelectedAddons = selectedAddonItems.length > 0;

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
    if (addon.icon === 'Users') return <Users className="w-4 h-4 text-sky-400" />;
    return <Sparkles className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* =====================================================================
          LEFT 8 COLUMNS: AMAZON-STYLE PRODUCT CONFIGURATOR & FLIGHT CATALOG
         ===================================================================== */}
      <div className="lg:col-span-8 min-w-0 space-y-4 sm:space-y-5">
        {/* PRODUCT HERO BAR (Amazon Product Header + Aviation Telemetry).
            Compact on purpose: the title, a one-line summary and the base price, so the departure
            calendar below starts inside the first desktop screen. */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950 shadow-xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider">
                <Zap className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                <span>PRIME FLIGHT DECK</span>
                <span className="hidden sm:inline">• INSTANT CONFIRMATION</span>
              </span>
            </div>
            <span className="hidden sm:inline-flex text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
              ● 1:1 Scale Boeing 737 MAX-8 • Tel Aviv (Gershon Shatz 36) • Age 10+
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {cleanPackageTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed line-clamp-2 lg:line-clamp-1">
                {selectedPackage.shortDesc}
              </p>
            </div>
            <div className="shrink-0 flex sm:flex-col items-baseline sm:items-end justify-between gap-2 sm:gap-0.5 bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-slate-400">{calendarCopy.basePackagePrice}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono text-white">
                  {formatCurrency(basePriceIls)}
                </span>
                <span className="text-xs font-mono text-sky-400 font-bold">
                  / {calendarCopy.minutes(baseDurationMinutes)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            SECTION 1: DEPARTURE DATE & RUNWAY TIME SLOT (1-CLICK SELECTION)
           =================================================================== */}
        <section className="p-4 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4 sm:space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{calendarCopy.departureTitle}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {calendarCopy.departureSubtitle}
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                aria-pressed={calendarMode === 'week'}
                onClick={() => setCalendarMode('week')}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all touch-manipulation cursor-pointer ${
                  calendarMode === 'week'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {calendarCopy.viewWeek}
              </button>
              <button
                type="button"
                aria-pressed={calendarMode === 'month'}
                onClick={() => setCalendarMode('month')}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all touch-manipulation cursor-pointer ${
                  calendarMode === 'month'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {calendarCopy.viewMonth}
              </button>
            </div>
          </div>

          {/* The seven-day view is primary; the month remains one tap away for longer-range planning. */}
          {calendarMode === 'week' ? (
            <div className="space-y-2.5">
              <BookingWeekPager
                selectedDate={selectedDate}
                calendarTodayYmd={calendarTodayYmd}
                weekStartDate={weekDays[0].dateStr}
                weekEndDate={weekDays[6].dateStr}
                language={language}
                isRTL={isRTL}
                onSelectDate={selectCalendarDate}
              />
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {weekDays.map((day) => {
                  const isSelected = day.dateStr === selectedDate;
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      data-calendar-date={day.dateStr}
                      aria-pressed={isSelected}
                      disabled={maxDate !== '' && day.dateStr > maxDate}
                      onClick={() => selectCalendarDate(day.dateStr)}
                      className={`min-h-[64px] py-2 px-1 sm:p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center touch-manipulation select-none cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/15 text-white shadow-md ring-1 ring-amber-400/50'
                          : 'border-slate-800/90 bg-slate-950/70 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="text-[9px] font-mono text-slate-400">{day.weekdayLabel}</span>
                      <span className="text-sm sm:text-base font-black font-mono text-white my-0.5">{formatCalendarDayNumber(day.dayNumber, language)}</span>
                      <span className="text-[9px] font-mono text-slate-400">{day.monthShortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 sm:p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-3">
              <BookingMonthPager
                viewMonthDate={viewMonthDate}
                selectedDate={selectedDate}
                calendarTodayYmd={calendarTodayYmd}
                language={language}
                isRTL={isRTL}
                previousLabel={calendarCopy.previousMonth}
                nextLabel={calendarCopy.nextMonth}
                onChangeMonth={setViewMonthOverride}
                onToday={() => selectCalendarDate(calendarTodayYmd)}
              />
              <div className="overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                <div className="grid min-w-[384px] grid-cols-7 gap-2 text-center">
                  {weekdayNames.map((d) => (
                    <div key={d} className="text-[10px] sm:text-[11px] font-mono font-semibold text-slate-400 py-1">
                      {d}
                    </div>
                  ))}
                  {monthGridDays.map((cell) => {
                    const isSelected = cell.dateStr === selectedDate;
                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        data-calendar-date={cell.dateStr}
                        aria-label={cell.dayLabel}
                        aria-pressed={isSelected}
                        disabled={cell.isPast || cell.isBeyondHorizon}
                        onClick={() => selectCalendarDate(cell.dateStr)}
                        className={`min-h-[48px] min-w-[48px] h-12 w-12 rounded-xl border font-mono text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center touch-manipulation select-none ${
                          cell.isPast || cell.isBeyondHorizon
                            ? 'border-transparent text-slate-700 opacity-35 cursor-not-allowed'
                          : isSelected
                          ? 'border-amber-300 bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-400/40 cursor-pointer'
                          : cell.isCurrentMonth
                          ? 'border-slate-800/80 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:border-slate-700 cursor-pointer'
                          : 'border-slate-800/40 bg-slate-950/60 text-slate-400 hover:bg-slate-800 cursor-pointer'
                        }`}
                      >
                        {formatCalendarDayNumber(cell.dayNumber, language)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Active Date Status & Quick-Jump Strip inside Calendar Box */}
              <div className="lg:hidden pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="text-xs font-mono text-slate-300 flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-bold text-white truncate">{formatCalendarDate(selectedDate, language)}</span>
                  <span className="text-emerald-400 shrink-0">• {calendarCopy.openSlotsCount(availableSlotCount)}</span>
                </div>
                <button
                  type="button"
                  onClick={scrollToSlotsPanel}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-mono font-bold hover:bg-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 touch-manipulation cursor-pointer"
                >
                  {calendarCopy.jumpToTimes}
                </button>
              </div>
            </div>
          )}

          {/* Departure Time Slots */}
          <div ref={slotsContainerRef} className="pt-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{calendarCopy.departureSlots(formatCalendarDate(selectedDate, language))}</span>
              </span>
              {selectedSlot && (
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {calendarCopy.selectedWindow}{' '}
                  <bdi dir="ltr">
                    {selectedSlot.startTime}–{effectiveEndTime || selectedSlot.endTime}
                  </bdi>{' '}
                  ({calendarCopy.maxAvailable(maxAvailableMinutes)})
                </span>
              )}
            </div>

            {loadingSlots ? (
              <div aria-busy="true" className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <span role="status" className="sr-only">
                  {t.booking.loadingDepartures}
                </span>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    aria-hidden="true"
                    className="h-14 rounded-xl bg-slate-950/60 border border-slate-800/60 animate-pulse"
                  />
                ))}
              </div>
            ) : slotsLoadFailed ? (
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-red-500/30 text-center space-y-4">
                <div role="alert" className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-white">{t.booking.slotsLoadError}</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">{t.booking.slotsLoadErrorHint}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {onRetrySlots && (
                    <Button type="button" variant="secondary" size="sm" onClick={onRetrySlots} className="font-mono text-xs">
                      {t.booking.retryLoad}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBeyondBookingHorizon(addDaysToYmd(selectedDate, 1), calendarTodayYmd)}
                    onClick={() => selectCalendarDate(addDaysToYmd(selectedDate, 1))}
                    className="font-mono text-xs text-sky-400 border-sky-500/40 hover:bg-sky-500/10"
                  >
                    {calendarCopy.checkNextDay}
                  </Button>
                </div>
              </div>
            ) : availableSlotCount === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-amber-500/30 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {calendarCopy.noSlots(cleanPackageTitle, formatCalendarDate(selectedDate, language))}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {calendarCopy.noSlotsHint}
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
                        {calendarCopy.tryFlight(
                          altPkg.durationMinutes,
                          formatCurrency(packageFromPriceIls(altPkg, durationAvailability[altPkg.durationMinutes]?.minPriceIls))
                        )}
                      </Button>
                    ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBeyondBookingHorizon(addDaysToYmd(selectedDate, 1), calendarTodayYmd)}
                    onClick={() => selectCalendarDate(addDaysToYmd(selectedDate, 1))}
                    className="font-mono text-xs text-sky-400 border-sky-500/40 hover:bg-sky-500/10"
                  >
                    {calendarCopy.checkNextDay}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                  const periodSlots = groupedSlots[period];
                  if (periodSlots.length === 0) return null;
                  const periodLabel = calendarCopy[period];

                  return (
                    <div key={period} className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        {periodLabel}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {periodSlots.map((slot) => {
                          const isSelected = selectedSlot?.id === slot.id;
                          const isOptimal = slot.smartRecommendation === 'optimal_150_pair';
                          const maxWin = slot.maxAvailableMinutes ?? slot.durationMinutes;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => onSelectSlot(slot)}
                              className={`relative min-h-[54px] px-3 py-2.5 rounded-xl border text-left rtl:text-right transition-all flex flex-col justify-between touch-manipulation select-none ${
                                isSelected
                                  ? 'border-amber-400 bg-amber-500/15 text-white shadow-md ring-1 ring-amber-400/50 cursor-pointer active:scale-95'
                                  : isOptimal
                                  ? 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400 text-white cursor-pointer active:scale-95'
                                  : 'border-slate-800 bg-slate-950/80 hover:border-sky-500/50 text-slate-200 cursor-pointer active:scale-95'
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
                                {calendarCopy.upToFit(maxWin)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Mobile Quick-Action Confirmation Bar Immediately Below Departure Slots */}
                {selectedSlot?.available && (
                  <div className="lg:hidden mt-3 p-3.5 rounded-xl border border-amber-500/40 bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs font-mono space-y-0.5">
                      <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatCalendarDate(selectedDate, language)}</span>
                        <bdi dir="ltr" className="text-amber-400">
                          • {selectedSlot.startTime}–{effectiveEndTime || selectedSlot.endTime}
                        </bdi>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {cleanPackageTitle} ({totalDurationMinutes}m • {formatCurrency(totalIls)})
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={scrollToPackagesSection}
                        className="flex-1 sm:flex-initial px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-xs font-mono font-semibold hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 touch-manipulation cursor-pointer"
                      >
                        {packagesActionLabel}
                      </button>
                      <button
                        type="button"
                        onClick={scrollToBuyBox}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-mono font-black shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 touch-manipulation cursor-pointer"
                      >
                        {calendarCopy.jumpToCheckout}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ===================================================================
            SECTION 2: AMAZON VARIATION SWATCHES — BASE FLIGHT PACKAGE
           =================================================================== */}
        <section ref={packagesSectionRef} className="p-4 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>{calendarCopy.selectPackageTitle}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {calendarCopy.packagesAvailable(formatCalendarDate(selectedDate, language))}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {calendarCopy.edition}: <strong className="text-amber-400">{calendarCopy.minutes(selectedPackage.durationMinutes)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visiblePackages.map((pkg) => {
              const isSelected = pkg.id === selectedPackage.id;
              const availInfo = durationAvailability[pkg.durationMinutes];
              const slotCount = availInfo ? availInfo.availableCount : (pkg.id === selectedPackage.id ? slots.filter((s) => s.available).length : 0);
              const isAvailable = availInfo ? availInfo.availableCount > 0 : true;
              const displayPrice = packageFromPriceIls(pkg, availInfo?.minPriceIls);
              const cleanTitle = sanitizePackageTitle(pkg.title);
              const formulaBadge = getPackageFormulaBadge(pkg.durationMinutes, pkg.category, language);

              return (
                // The card is a real button; the blueprint trigger sits beside it, never inside it,
                // so neither control is nested in the other (keyboard and screen readers work).
                <div key={pkg.id} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  data-booking-package-card={pkg.durationMinutes}
                  aria-pressed={isSelected}
                  onClick={() => onSelectPackage(pkg)}
                  className={`flex-1 min-h-72 p-4 rounded-2xl border text-left rtl:text-right transition-all flex flex-col justify-between relative cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 shadow-lg ring-1 ring-amber-400/50'
                      : !isAvailable
                      ? 'border-slate-800/60 bg-slate-950/40 hover:border-slate-700'
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
                        {calendarCopy.minutes(pkg.durationMinutes)}
                      </span>
                      {!isAvailable ? (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                          {calendarCopy.noSlotsToday}
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

                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-black font-mono text-white">
                        {formatCurrency(displayPrice)}
                      </span>
                      <div className="text-[10px] font-mono">
                        {!isAvailable ? (
                          <span className="text-amber-400">● {calendarCopy.noSlotsToday}</span>
                        ) : (
                          <span className="text-emerald-400">● {calendarCopy.slotsOpenToday(slotCount)}</span>
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
                      {isSelected ? `✓ ${calendarCopy.selected}` : calendarCopy.select}
                    </span>
                  </div>
                </button>
                {/* A visible, touch-friendly package-inclusions control separate from the card button. */}
                <button
                  type="button"
                  data-package-details-trigger
                  onClick={() => setBlueprintPackage(pkg)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 text-sm font-bold text-sky-200 hover:border-sky-400/60 hover:bg-sky-500/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 transition-colors touch-manipulation"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{bpCopy.whatIncludedBtn}</span>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
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
                      : 'border-slate-800/50 bg-slate-950/40'
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
        <section
          id="flight-customization"
          className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Customize Flight Plan — World Airport Trios & Cockpit Modules
              </h2>
              <p className="text-xs text-slate-400">
                Mix & match 3-airport global tours (+40m), Cold & Dark startup (+20m), or IFR weather (+15m)
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: `All (${addons.length})` },
                { id: 'world_bundles', label: '🌍 3-Airport Trios (7)' },
                { id: 'cockpit_ops', label: '✈️ Cockpit & Weather (3)' },
                { id: 'guest_extras', label: '👥 Guest Extras (1)' },
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

          {hasSelectedAddons && (
            <div
              data-selected-addons
              aria-live="polite"
              className="rounded-xl border border-amber-400/45 bg-amber-500/10 p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300">
                    {addonCopy.selectedPlanEyebrow}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">{addonCopy.selectedPlanTitle}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{addonCopy.selectedPlanSubtitle}</p>
                </div>
                <Badge variant="amber" className="shrink-0">
                  {selectedAddonItems.length} {addonCopy.selected}
                </Badge>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 list-none p-0 m-0">
                {selectedAddonItems.map((addon) => (
                  <li
                    key={addon.id}
                    data-selected-addon={addon.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/35 bg-slate-950/70 px-3 py-3"
                  >
                    <div className="min-w-0 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">{getAddonIcon(addon)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white leading-snug">{addon.name}</p>
                        <p className="text-[11px] font-mono text-sky-300" dir="ltr">
                          {addon.durationMinutes > 0 ? `+${addon.durationMinutes} min` : ''}
                          {addon.durationMinutes > 0 ? ' • ' : ''}
                          +{formatCurrency(addon.priceIls)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleAddon(addon.id)}
                      aria-label={addonCopy.removeFromSelectedPlan(addon.name)}
                      className="min-h-11 shrink-0 rounded-lg border border-slate-700 px-3 text-xs font-mono font-bold text-slate-200 transition-colors hover:border-red-400/70 hover:bg-red-500/10 hover:text-red-200"
                    >
                      {addonCopy.remove}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                  data-addon-card={addon.id}
                  data-addon-selected={isChecked ? 'true' : 'false'}
                  data-addon-deemphasized={!isChecked && hasSelectedAddons ? 'true' : 'false'}
                  className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col justify-between ${
                    !fitsSlot
                      ? 'border-slate-800/50 bg-slate-950/40'
                      : isChecked
                      ? 'border-amber-400 bg-amber-500/10 shadow-lg ring-1 ring-amber-400/40'
                      : hasSelectedAddons
                      ? 'border-slate-800/70 bg-slate-950/55 opacity-45 hover:opacity-80 hover:border-slate-700'
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
                            : 'GUEST EXPERIENCE'}
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
                      aria-pressed={isChecked}
                      className={`min-h-11 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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

        {/* STICKY MOBILE FLIGHT SUMMARY & QUICK-JUMP BAR (Parks above the Buy Box on scroll) */}
        <div className="lg:hidden sticky bottom-safe-area-3 z-30 p-3.5 rounded-2xl border border-amber-500/40 bg-slate-950/95 backdrop-blur-md shadow-2xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 truncate">
              <span className="font-bold text-sky-400">{totalDurationMinutes}m</span>
              <span>•</span>
              <span className="truncate">{formatCalendarDate(selectedDate, language)}</span>
              {selectedSlot?.available && (
                <bdi dir="ltr" className="text-amber-400 font-bold shrink-0">
                  • {selectedSlot.startTime}
                </bdi>
              )}
            </div>
            <div className="text-base font-mono font-black text-emerald-400 leading-tight">
              {formatCurrency(totalIls)}
            </div>
          </div>
          <button
            type="button"
            onClick={selectedSlot?.available ? scrollToBuyBox : scrollToSlotsPanel}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-xs font-black shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 touch-manipulation cursor-pointer"
          >
            {selectedSlot?.available ? calendarCopy.jumpToCheckout : calendarCopy.jumpToTimes}
          </button>
        </div>
  </div>

      {/* =====================================================================
          RIGHT 4 COLUMNS: STICKY AMAZON "BUY BOX" & EXPRESS PILOT CHECKOUT
         ===================================================================== */}
      <div className="lg:col-span-4 min-w-0 lg:sticky lg:top-24 space-y-5">
        <form
          ref={buyBoxFormRef}
          id="storefront-buy-box"
          onSubmit={onSubmitBooking}
          className="rounded-2xl border-2 border-amber-500/40 bg-slate-900/95 p-4 sm:p-6 space-y-5 shadow-2xl"
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
              <span className="text-white font-bold">{formatCalendarDate(selectedDate, language)}</span>
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
                required={!subscriptionCheckout}
                autoComplete="name"
                value={pilotName}
                onChange={(e) => onChangePilotName(e.target.value)}
                placeholder={t.booking.pilotNamePlaceholder}
                className="min-h-12 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-base text-white focus:outline-none focus:border-amber-400"
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
                  required={!subscriptionCheckout}
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                value={pilotEmail}
                onChange={(e) => onChangePilotEmail(e.target.value)}
                placeholder="captain@example.com"
                className="min-h-12 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-base text-white focus:outline-none focus:border-amber-400"
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
                  required={!subscriptionCheckout}
                  autoComplete="tel"
                  value={pilotPhone}
                  onChange={(e) => onChangePilotPhone(e.target.value)}
                placeholder="055-507-1307"
                dir="ltr"
                className="min-h-12 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-base text-white focus:outline-none focus:border-amber-400 text-left rtl:text-right"
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
                        className="size-6 shrink-0 accent-amber-400"
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
                      aria-invalid={voucherError ? true : undefined}
                      aria-describedby={voucherError ? 'storefront-voucher-error' : undefined}
                      value={voucherCode}
                      onChange={(e) => onChangeVoucherCode(e.target.value)}
                      dir="ltr"
                      className="flex-1 min-w-0 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-base sm:text-sm text-white uppercase font-mono focus:outline-none focus:border-amber-400"
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
              {voucherError && (
                <p id="storefront-voucher-error" role="alert" className="text-[11px] text-red-400 font-mono">
                  {voucherError}
                </p>
              )}
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
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400"
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
          {subscriptionCheckout && (
            <div
              data-wix-subscription-redemption="true"
              className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-xs leading-relaxed text-sky-100"
            >
              {subscriptionCheckout.notice}
            </div>
          )}
          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300"
          >
            <CreditCard className="w-5 h-5" />
            <span>
              {isSubmitting
                ? t.booking.processing
                : subscriptionCheckout?.cta ?? `${t.booking.proceedToPayment} (${formatCurrency(totalIls)})`}
            </span>
          </Button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-center">{t.booking.secureNotice}</span>
          </div>
          {accountNotice && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-xs text-slate-300 flex flex-col gap-1.5">
              {accountNotice}
            </div>
          )}
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
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 px-safe-area-4 pb-safe-area-4"
          onClick={() => setBlueprintPackage(null)}
        >
          <div
            ref={blueprintPanelRef}
            tabIndex={-1}
            className="relative max-w-2xl w-full rounded-2xl border-2 border-sky-500/40 bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto focus:outline-none"
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
                  {blueprintPackage.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-mono mt-0.5">
                  <strong className="text-amber-400">{bpCopy.duration(blueprintPackage.durationMinutes)}</strong> • {formatCurrency(blueprintPackage.priceIls)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setBlueprintPackage(null)}
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
                      {bpCopy.handsOnDesc(blueprintPackage.durationMinutes)}
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
                      {blueprintPackage.durationMinutes === 60
                        ? bpCopy.world60
                        : blueprintPackage.durationMinutes === 90
                        ? bpCopy.world90
                        : blueprintPackage.category === 'training'
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
                {bpCopy.closeBtn}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onSelectPackage(blueprintPackage);
                  setBlueprintPackage(null);
                }}
                className="w-full sm:w-auto font-black bg-amber-400 hover:bg-amber-300 text-slate-950 px-6"
              >
                <span>{bpCopy.selectBtn(formatCurrency(blueprintPackage.priceIls))}</span>
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
