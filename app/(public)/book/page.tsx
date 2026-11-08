'use client';

import React, { useState, useEffect, useId, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Tag,
  CreditCard,
  AlertCircle,
  ShieldCheck,
  ShoppingCart,
  ListOrdered,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { addDaysToYmd, formatCurrency, formatDate, extractErrorMessage } from '@/lib/utils';
import { FlightSlot, SimulatorPackage, PublicCapacityReport, PilotExperienceLevel } from '@/types';
import { useLanguage } from '@/lib/i18n/language-context';
import { getLocalizedPackages, getLocalizedAddons } from '@/lib/i18n/translations';
import { KantorovichCalendarScheduler } from '@/components/scheduler/KantorovichCalendarScheduler';
import { AmazonFlightStorefront } from '@/components/scheduler/AmazonFlightStorefront';
import { useAuth } from '@/lib/auth/auth-context';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import {
  calculateMissionManifest,
  canAddonFitInSlot,
  packageAllowsAddons,
  pruneAddonsExceedingSlot,
} from '@/lib/scheduler/mission-calculator';
import { clampToBookingHorizon } from '@/lib/scheduler/booking-horizon';
import { israelToday } from '@/lib/scheduler/israel-clock';
import { useClientValue } from '@/lib/ui/use-client-value';
import { WIX_SUBSCRIPTION_BOOKING_COPY } from '@/lib/i18n/wix-subscription-booking-copy';
import {
  getWixMemberClient,
  isWixBrowserClientConfigured,
  wixMemberOAuthStorageKey,
} from '@/lib/wix/member-client';
import { isWixSubscriptionBookingPackageId, wixSubscriptionBookingPackageForPlan } from '@/lib/wix/subscription-redemption';
import {
  applyWixCoupon,
  applyWixGiftCard,
  getWixBookingCheckoutUrl,
  prepareWixBookingCheckout,
  removeWixCoupon,
  removeWixGiftCard,
  type WixNativeCheckoutCandidate,
} from '@/lib/wix/booking-checkout-client';
import {
  EXPERIENCE_ROUTES_COPY,
  MINIMUM_ROUTE_REQUEST_MINUTES,
  WORLD_ROUTES,
  findOnRequestWorldRoute,
} from '@/lib/data/experience-routes';

// Documented deep links (AGENTS.md, official service pages) use these names for the PRO tiers.
const PACKAGE_SLUG_ALIASES: Record<string, string> = {
  'airline-interview-prep-60-pro': 'airline-prep-60-pro',
  'airline-interview-prep-90-pro': 'airline-prep-90-pro',
  'airline-interview-prep-120-pro': 'airline-assessment-prep',
};

function resolvePackageSlug(slug: string): string {
  return PACKAGE_SLUG_ALIASES[slug] ?? slug;
}

function formatBookingTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

/** An unpaid, visitor-owned Wix cart reused between coupon validation and checkout. */
type WixCheckoutCodeKind = 'coupon' | 'gift-card';

interface WixCheckoutDraftState {
  inputKey: string;
  cartId: string;
  totalIls: number;
  codeKind?: WixCheckoutCodeKind;
  couponId?: string;
  couponCode?: string;
  giftCardId?: string;
  /** Wix masks the bearer code; never retain a native Gift Card code after applying it. */
  giftCardObfuscatedCode?: string;
}

/** Query-string selections are customer intent only; the checkout API still validates catalog IDs and prices. */
function parseRequestedAddonIds(value: string | null): string[] {
  return [...new Set((value ?? '').split(',').map((id) => id.trim()).filter(Boolean))];
}

function BookContent() {
  const searchParams = useSearchParams();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const formId = useId();
  const browserIsraelToday = useClientValue(() => israelToday());
  // Do not place a fabricated date in the initial HTML. Static prerendering
  // cannot know today's Israel date, so the calendar renders only once the
  // browser supplies it. Until then the visitor sees the localized loading
  // state rather than a misleading future schedule.
  const calendarTodayYmd = browserIsraelToday ?? '';

  const localizedPackages = getLocalizedPackages(language);
  const localizedAddons = getLocalizedAddons(language);
  const selectedRoute = React.useMemo(
    () => WORLD_ROUTES.find((route) => route.id === searchParams.get('route')),
    [searchParams]
  );
  const requestedRoute = React.useMemo(
    () => findOnRequestWorldRoute(searchParams.get('route') ?? undefined),
    [searchParams]
  );
  const requestedAddonIds = React.useMemo(
    () =>
      [...new Set([
        ...parseRequestedAddonIds(searchParams.get('addons')),
        ...(selectedRoute?.addonId ? [selectedRoute.addonId] : []),
      ])],
    [searchParams, selectedRoute]
  );
  const preselectedAddonIds = React.useMemo(
    () => requestedAddonIds.filter((id) => localizedAddons.some((addon) => addon.id === id)),
    [localizedAddons, requestedAddonIds]
  );

  // Calendar-first guidance is the default booking experience. The optional desktop storefront
  // remains available for guests who prefer a one-page checkout, but is intentionally absent on phones.
  const [bookingViewMode, setBookingViewMode] = useState<'storefront' | 'wizard'>('wizard');

  // 3-Step Streamlined Calendar-First Wizard:
  // Step 1 = Smart Calendar, Duration & Time Slot
  // Step 2 = Cockpit Upgrades (Add-ons)
  // Step 3 = Pilot Manifest & Checkout
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Selected package (synced with ?package= query param when coming from Homepage or /experiences)
  const defaultPackageSlug = resolvePackageSlug(searchParams.get('package') || 'captains-command-60');
  const initialPackage =
    localizedPackages.find((p) => p.slug === defaultPackageSlug) || localizedPackages[2] || localizedPackages[0];
  const [selectedPackage, setSelectedPackage] = useState<SimulatorPackage>(initialPackage);

  useEffect(() => {
    const requestedSlug = searchParams.get('package');
    if (requestedSlug) {
      const pkgSlug = resolvePackageSlug(requestedSlug);
      const matched = localizedPackages.find((p) => p.slug === pkgSlug);
      if (matched) {
        setSelectedPackage(matched);
      }
    }
  }, [searchParams]);

  const activePackage =
    localizedPackages.find((p) => p.id === selectedPackage.id) || selectedPackage;
  const wixSubscriptionRequested = searchParams.get('subscription') === 'wix';
  const isWixSubscriptionRedemption = wixSubscriptionRequested && isWixSubscriptionBookingPackageId(activePackage.id);
  const wixSubscriptionCopy = WIX_SUBSCRIPTION_BOOKING_COPY[language] || WIX_SUBSCRIPTION_BOOKING_COPY.en;

  // The package category is authoritative (id/slug heuristics misclassified 'pkg-promo-45'
  // as PRO). The server enforces the same noise-free rule through packageAllowsAddons.
  const isProBooking = activePackage.category === 'training';
  const isFearOfFlyingBooking = activePackage.category === 'fear_of_flying';
  const isNoiseFreeBooking = !packageAllowsAddons(activePackage) || isWixSubscriptionRedemption;

  // Scoped packages:
  // - PRO: strictly show the 3 PRO training tiers (60, 90, 120 PRO)
  // - Fear of Flying: strictly show the Fear of Flying course
  // - Recreational: show recreational consumer packages (30m, 45m, 60m, 90m)
  const scopedPackages = React.useMemo(() => {
    if (isWixSubscriptionRedemption) return [activePackage];
    if (isProBooking) return localizedPackages.filter((p) => p.category === 'training');
    if (isFearOfFlyingBooking) return localizedPackages.filter((p) => p.category === 'fear_of_flying');
    return localizedPackages.filter(
      (p) =>
        p.category === 'recreational' &&
        (!requestedRoute || p.durationMinutes >= MINIMUM_ROUTE_REQUEST_MINUTES)
    );
  }, [activePackage, localizedPackages, isWixSubscriptionRedemption, isProBooking, isFearOfFlyingBooking, requestedRoute]);

  // An old or hand-edited URL must not leave a custom World Trio paired with a short flight.
  // The route request starts at 60 minutes, while customers may still choose a longer session.
  useEffect(() => {
    if (!requestedRoute || activePackage.durationMinutes >= MINIMUM_ROUTE_REQUEST_MINUTES) return;
    const eligiblePackage = localizedPackages.find(
      (pkg) => pkg.category === 'recreational' && pkg.durationMinutes >= MINIMUM_ROUTE_REQUEST_MINUTES
    );
    if (eligiblePackage) setSelectedPackage(eligiblePackage);
  }, [activePackage.durationMinutes, localizedPackages, requestedRoute]);

  // Scoped add-ons:
  // - PRO or Fear of Flying: strictly [] (empty array, zero add-on noise!)
  // - Recreational: all localized add-ons
  const scopedAddons = React.useMemo(() => {
    if (isNoiseFreeBooking) return [];
    return localizedAddons;
  }, [localizedAddons, isNoiseFreeBooking]);

  // Selected Date & Slot (using local calendar YYYY-MM-DD to prevent UTC timezone day-shift).
  //
  // Do not copy the SSR placeholder into state and replace it later. That created a brief
  // window where a visitor saw live slots for Israel but a 2099 calendar month and could
  // navigate away before the replacement effect ran. The default is instead derived from
  // the client clock; state exists only after an explicit customer selection.
  const [selectedDateOverride, setSelectedDateOverride] = useState<string | null>(null);
  const selectedDate =
    selectedDateOverride ??
    (browserIsraelToday ? addDaysToYmd(browserIsraelToday, 1) : '');
  // Whatever the control, a visitor can never land past the one-year booking horizon.
  const setSelectedDate = React.useCallback(
    (date: string) => {
      setSelectedDateOverride(clampToBookingHorizon(date, calendarTodayYmd));
    },
    [calendarTodayYmd]
  );
  const [availableSlots, setAvailableSlots] = useState<FlightSlot[]>([]);
  const [efficiencyReport, setEfficiencyReport] = useState<PublicCapacityReport | null>(null);
  const [durationAvailability, setDurationAvailability] = useState<
    Record<number, { availableCount: number; minPriceIls: number }>
  >({});
  const [wixBookingsAuthoritative, setWixBookingsAuthoritative] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<FlightSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsLoadFailed, setSlotsLoadFailed] = useState<boolean>(false);
  const [slotsReloadKey, setSlotsReloadKey] = useState<number>(0);
  // True once the first availability request has started, so the page can report
  // `data-slots-state` (idle → loading → ready | failed) to journeys and tests.
  const [slotsRequested, setSlotsRequested] = useState<boolean>(false);

  // Add-ons (strictly empty for noise-free specialized bookings)
  const [selectedAddons, setSelectedAddons] = useState<string[]>(preselectedAddonIds);
  const appliedAddonIntentRef = useRef<string | null>(null);

  // A deep-linked World Trio is an explicit customer choice, not a suggestion
  // that may disappear while the calendar hydrates. Use the whole manifest to
  // select and render only departures that can accommodate the base flight plus
  // every chosen add-on. The server remains the final pricing/capacity authority.
  const requiredMissionMinutes = React.useMemo(
    () =>
      activePackage.durationMinutes +
      selectedAddons.reduce(
        (total, addonId) => total + (scopedAddons.find((addon) => addon.id === addonId)?.durationMinutes ?? 0),
        0
      ),
    [activePackage.durationMinutes, scopedAddons, selectedAddons]
  );

  // Keep a deep link shareable across in-app navigation, but apply a given URL intent only once
  // so a customer may freely remove or alter an add-on afterwards.
  const addonIntentKey = requestedAddonIds.join(',');
  useEffect(() => {
    if (appliedAddonIntentRef.current === addonIntentKey) return;
    appliedAddonIntentRef.current = addonIntentKey;
    setSelectedAddons(preselectedAddonIds);
  }, [addonIntentKey, preselectedAddonIds]);

  const selectedRouteAddon = selectedRoute?.addonId
    ? scopedAddons.find((addon) => addon.id === selectedRoute.addonId)
    : undefined;
  const hasSelectedRouteAddon = Boolean(selectedRouteAddon && selectedAddons.includes(selectedRouteAddon.id));
  const routeCopy = EXPERIENCE_ROUTES_COPY[language] || EXPERIENCE_ROUTES_COPY.en;
  const selectedRouteText = selectedRoute?.copy[language] || selectedRoute?.copy.en;

  useEffect(() => {
    if (isNoiseFreeBooking && selectedAddons.length > 0) {
      setSelectedAddons([]);
    }
  }, [isNoiseFreeBooking, selectedAddons.length]);

  // Pilot Details
  const [pilotName, setPilotName] = useState<string>('');
  const [pilotEmail, setPilotEmail] = useState<string>('');
  const [pilotPhone, setPilotPhone] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<PilotExperienceLevel>(
    isProBooking ? 'atpl' : 'beginner'
  );
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    setPilotName((current) => current || user.fullName);
    setPilotEmail((current) => current || user.email);
  }, [user?.email, user?.fullName, user?.id]);

  useEffect(() => {
    if (isProBooking && experienceLevel === 'beginner') {
      setExperienceLevel('atpl');
    }
  }, [isProBooking, experienceLevel]);

  // Voucher Code & Session Cache
  const initialVoucher = searchParams.get('voucher') || '';
  const [voucherCode, setVoucherCode] = useState<string>(initialVoucher);
  const [cachedVoucherCode, setCachedVoucherCode] = useState<string>('');
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [voucherError, setVoucherError] = useState<string>('');
  const [voucherSuccess, setVoucherSuccess] = useState<string>('');
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState<boolean>(false);
  const [wixCheckoutCodeKind, setWixCheckoutCodeKind] = useState<WixCheckoutCodeKind>('coupon');
  const [wixCheckoutDraft, setWixCheckoutDraft] = useState<WixCheckoutDraftState | null>(null);

  // Wix is the native writer for simple single-service bookings. The local checkout
  // keeps ownership of multi-item missions, locally funded vouchers and route intent
  // until those catalog concepts have matching Wix Bookings entities.
  const wixBookingFrontendActive = isWixBrowserClientConfigured();
  const canUseWixNativeCheckout =
    !isWixSubscriptionRedemption &&
    wixBookingsAuthoritative &&
    wixBookingFrontendActive &&
    selectedAddons.length === 0 &&
    !requestedRoute;
  // A live Wix calendar has one reservation writer. Add-ons and captain-confirmed
  // route requests remain unavailable in that mode until they are represented by
  // native Wix catalog entities; falling back to local checkout would permit the
  // two calendars to sell the same simulator time.
  const requiresUnsupportedLocalCheckout =
    wixBookingsAuthoritative && !isWixSubscriptionRedemption && !canUseWixNativeCheckout;

  // A Wix cart is tied to the exact visitor, flight, departure and booking-form
  // data used to create it. Changing any of these starts a fresh unpaid draft.
  const wixCheckoutDraftKey = [
    activePackage.id,
    selectedDate,
    selectedSlot?.id ?? '',
    pilotName.trim(),
    pilotEmail.trim(),
    pilotPhone.trim(),
    notes.trim(),
  ].join('\u001f');
  const activeWixCheckoutDraft =
    wixCheckoutDraft?.inputKey === wixCheckoutDraftKey ? wixCheckoutDraft : null;

  useEffect(() => {
    if (!isWixSubscriptionRedemption) return;
    setVoucherCode('');
    setVoucherDiscount(0);
    setVoucherError('');
    setVoucherSuccess('');
    setWixCheckoutDraft(null);
    setWixCheckoutCodeKind('coupon');
  }, [isWixSubscriptionRedemption]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('simdream_cached_voucher');
      if (saved) {
        setCachedVoucherCode(saved);
        if (!voucherCode) setVoucherCode(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!wixCheckoutDraft || activeWixCheckoutDraft) return;
    setWixCheckoutDraft(null);
    setVoucherDiscount(0);
    setVoucherError('');
    setVoucherSuccess('');
  }, [activeWixCheckoutDraft, wixCheckoutDraft]);

  // Payment Processing
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string>('');

  // Fetch Kantorovich-optimized slots & daily efficiency whenever selected date or package changes
  useEffect(() => {
    // The first server/client hydration pass deliberately uses the stable snapshot
    // above. Do not request availability for that placeholder date; fetch only
    // once the browser has supplied Israel's current operating day.
    if (!browserIsraelToday) return;

    // A newer date or package selection aborts this request, so a slow, stale
    // response can never overwrite the slots of the current selection.
    const controller = new AbortController();
    async function fetchSlots() {
      setSlotsRequested(true);
      setLoadingSlots(true);
      setSlotsLoadFailed(false);
      try {
        const res = await fetch(
          `/api/slots?date=${selectedDate}&duration=${selectedPackage.durationMinutes}&includeEfficiency=true`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Slots request failed with ${res.status}`);
        const data = await res.json();
        const slotList: FlightSlot[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.slots)
          ? data.slots
          : [];

        if (data?.durationAvailability) {
          setDurationAvailability(data.durationAvailability);
        }
        setWixBookingsAuthoritative(data?.wixBookingsAuthoritative === true);

        setAvailableSlots(slotList);
        if (data?.efficiency) {
          setEfficiencyReport(data.efficiency);
        }

        // Prefer a smart pairing or an open departure which can accommodate
        // the entire selected mission. Selecting a short base-flight slot and
        // then pruning a URL-selected World Trio loses explicit customer intent.
        const compatibleSlots = slotList.filter(
          (slot: FlightSlot) => slot.available && (slot.maxAvailableMinutes ?? 0) >= requiredMissionMinutes
        );
        const smartMatch = compatibleSlots.find(
          (s: FlightSlot) => s.available && s.smartRecommendation === 'optimal_150_pair'
        );
        const firstAvailable = smartMatch || compatibleSlots[0] || null;

        setSelectedSlot((prev) => {
          if (
            prev &&
            prev.date === selectedDate &&
            compatibleSlots.some((s) => s.id === prev.id)
          ) {
            return slotList.find((s) => s.id === prev.id) || firstAvailable;
          }
          return firstAvailable;
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        // Show a load error with a retry, never an empty "sold out" day.
        console.error('Failed to load slots', err);
        setAvailableSlots([]);
        setWixBookingsAuthoritative(false);
        setSlotsLoadFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoadingSlots(false);
      }
    }
    fetchSlots();
    return () => controller.abort();
  }, [browserIsraelToday, requiredMissionMinutes, selectedDate, selectedPackage, slotsReloadKey]);

  // Both storefronts consume the same manifest-compatible departures. This
  // keeps a selected route or add-on visible rather than offering a departure
  // that would immediately invalidate it.
  const missionCompatibleSlots = React.useMemo(
    () =>
      availableSlots.filter(
        (slot) => slot.available && (slot.maxAvailableMinutes ?? 0) >= requiredMissionMinutes
      ),
    [availableSlots, requiredMissionMinutes]
  );

  // Canonical Single-Source-of-Truth Mission Manifest calculation
  const manifest = React.useMemo(
    () =>
      calculateMissionManifest({
        pkg: activePackage,
        slot: selectedSlot,
        selectedAddonIds: selectedAddons,
        availableAddons: scopedAddons,
        voucherDiscountIls: voucherDiscount,
      }),
    [activePackage, selectedSlot, selectedAddons, scopedAddons, voucherDiscount]
  );

  const {
    cleanPackageTitle,
    baseDurationMinutes: baseDuration,
    addonsDurationMinutes: addonsDuration,
    totalDurationMinutes,
    effectiveEndTime,
    maxAvailableMinutes: maxSlotMinutes,
    basePriceIls: basePrice,
    subtotalIls: subtotal,
    totalIls: totalAmount,
  } = manifest;
  // This is only a presentation override. The final price remains the Wix cart's
  // calculated amount and Wix recalculates it again in the hosted checkout.
  const displayTotalAmount = activeWixCheckoutDraft
    ? activeWixCheckoutDraft.totalIls
    : totalAmount;
  const displayManifest = activeWixCheckoutDraft
    ? { ...manifest, totalIls: activeWixCheckoutDraft.totalIls }
    : manifest;
  const isNativeGiftCardApplied = Boolean(activeWixCheckoutDraft?.giftCardId);
  const appliedCodeDisplay = isNativeGiftCardApplied
    ? activeWixCheckoutDraft?.giftCardObfuscatedCode
    : voucherCode;
  const appliedCodeLabel = isNativeGiftCardApplied
    ? t.booking.wixGiftCardCredit
    : t.booking.voucherDiscount;

  // Smart Window Guard: if user switches to a tighter time slot in Step 1, prune any time-extending add-ons that exceed maxSlotMinutes
  useEffect(() => {
    if (!selectedSlot) return;
    const pruned = pruneAddonsExceedingSlot(
      selectedAddons,
      scopedAddons,
      baseDuration,
      selectedSlot.maxAvailableMinutes ?? 180
    );
    if (pruned.length !== selectedAddons.length) {
      setSelectedAddons(pruned);
    }
  }, [selectedSlot, baseDuration, scopedAddons]);

  // Guard against step 2 in noise-free mode
  useEffect(() => {
    if (isNoiseFreeBooking && currentStep === 2) {
      setCurrentStep(3);
    }
  }, [isNoiseFreeBooking, currentStep]);

  const prepareCurrentWixCheckoutDraft = async (): Promise<WixCheckoutDraftState> => {
    if (!selectedSlot) throw new Error(t.booking.errorSelectSlot);

    const wixSlotResponse = await fetch('/api/wix/bookings/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: activePackage.id,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
      }),
    });
    const wixSlot = (await wixSlotResponse.json()) as Partial<WixNativeCheckoutCandidate> & { error?: string };
    if (!wixSlotResponse.ok || !wixSlot.slotAvailability || !wixSlot.timeZone || !wixSlot.location || !wixSlot.paymentOptions) {
      throw new Error(wixSlot.error || t.booking.paymentStartFailed);
    }

    const prepared = await prepareWixBookingCheckout(getWixMemberClient(), {
      slotAvailability: wixSlot.slotAvailability,
      timeZone: wixSlot.timeZone,
      location: wixSlot.location,
      paymentOptions: wixSlot.paymentOptions,
      pilotName,
      pilotEmail,
      pilotPhone,
      notes,
    });
    const draft: WixCheckoutDraftState = {
      inputKey: wixCheckoutDraftKey,
      cartId: prepared.cartId,
      totalIls: prepared.price.totalIls,
    };
    setWixCheckoutDraft(draft);
    return draft;
  };

  const ensureCurrentWixCheckoutDraft = async (): Promise<WixCheckoutDraftState> =>
    activeWixCheckoutDraft ?? prepareCurrentWixCheckoutDraft();

  const applyCouponToCurrentWixCheckout = async (code: string): Promise<WixCheckoutDraftState | null> => {
    const draft = await ensureCurrentWixCheckoutDraft();
    const applied = await applyWixCoupon(getWixMemberClient(), draft.cartId, code, draft.totalIls);
    if (applied.price.discountIls <= 0) {
      // Wix accepts some codes syntactically but calculates a zero discount when
      // the selected service does not meet the coupon's scope/minimum rules.
      const originalPrice = await removeWixCoupon(getWixMemberClient(), draft.cartId, applied.couponId);
      setWixCheckoutDraft({ ...draft, totalIls: originalPrice.totalIls });
      setVoucherDiscount(0);
      setVoucherError(t.booking.wixCouponNotEligible);
      return null;
    }

    const couponDraft: WixCheckoutDraftState = {
      ...draft,
      codeKind: 'coupon',
      couponId: applied.couponId,
      couponCode: code,
      giftCardId: undefined,
      giftCardObfuscatedCode: undefined,
      totalIls: applied.price.totalIls,
    };
    setWixCheckoutDraft(couponDraft);
    setVoucherCode(code);
    setVoucherDiscount(applied.price.discountIls);
    setVoucherSuccess(
      formatBookingTemplate(t.booking.wixCouponApplied, {
        amount: formatCurrency(applied.price.discountIls),
        total: formatCurrency(applied.price.totalIls),
      })
    );
    return couponDraft;
  };

  const applyGiftCardToCurrentWixCheckout = async (code: string): Promise<WixCheckoutDraftState> => {
    const draft = await ensureCurrentWixCheckoutDraft();
    const applied = await applyWixGiftCard(getWixMemberClient(), draft.cartId, code);
    const appliedCredit = applied.price.giftCardAppliedIls ?? 0;
    const giftCardDraft: WixCheckoutDraftState = {
      ...draft,
      codeKind: 'gift-card',
      couponId: undefined,
      couponCode: undefined,
      giftCardId: applied.giftCardId,
      giftCardObfuscatedCode: applied.obfuscatedCode,
      totalIls: applied.price.totalIls,
    };
    setWixCheckoutDraft(giftCardDraft);
    // A native Gift Card is a bearer credential. It must not remain in state,
    // browser storage, a URL, or any rendered booking summary after Wix applies it.
    setVoucherCode('');
    setVoucherDiscount(appliedCredit);
    setVoucherSuccess(
      formatBookingTemplate(t.booking.wixGiftCardApplied, {
        amount: formatCurrency(appliedCredit),
        total: formatCurrency(applied.price.totalIls),
      })
    );
    return giftCardDraft;
  };

  // Voucher verification handler with 1-click reapply and session storage persistence.
  // Wix coupons are validated inside the visitor-owned cart, rather than by React.
  const handleVerifyVoucher = async (codeOverride?: string) => {
    const enteredCode = (codeOverride ?? voucherCode).trim();
    if (!enteredCode) return;
    const code = canUseWixNativeCheckout ? enteredCode : enteredCode.toUpperCase();

    setIsVerifyingVoucher(true);
    setVoucherError('');
    setVoucherSuccess('');

    try {
      if (canUseWixNativeCheckout) {
        if (!pilotName.trim() || !pilotEmail.trim() || !pilotPhone.trim()) {
          setVoucherError(
            wixCheckoutCodeKind === 'gift-card'
              ? t.booking.wixGiftCardNeedsPilotDetails
              : t.booking.wixCouponNeedsPilotDetails
          );
          return;
        }
        if (wixCheckoutCodeKind === 'gift-card') {
          await applyGiftCardToCurrentWixCheckout(code);
        } else {
          await applyCouponToCurrentWixCheckout(code);
        }
        return;
      }

      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t.booking.voucherInvalid);
      }

      if (data.currentBalanceIls < subtotal) {
        throw new Error(t.booking.voucherInsufficientBalance);
      }
      const applicableDiscount = subtotal;
      setVoucherCode(code);
      setVoucherDiscount(applicableDiscount);
      setVoucherSuccess(
        formatBookingTemplate(t.booking.voucherApplied, { amount: formatCurrency(applicableDiscount) })
      );
      setCachedVoucherCode(code);
      try {
        sessionStorage.setItem('simdream_cached_voucher', code);
      } catch {}
    } catch (err: unknown) {
      setVoucherError(
        canUseWixNativeCheckout
          ? wixCheckoutCodeKind === 'gift-card'
            ? t.booking.wixGiftCardVerifyFailed
            : t.booking.wixCouponVerifyFailed
          : extractErrorMessage(err, t.booking.voucherVerifyFailed)
      );
      setVoucherDiscount(0);
    } finally {
      setIsVerifyingVoucher(false);
    }
  };

  const handleRemoveVoucher = async () => {
    if (activeWixCheckoutDraft?.couponId || activeWixCheckoutDraft?.giftCardId) {
      setIsVerifyingVoucher(true);
      setVoucherError('');
      try {
        const price = activeWixCheckoutDraft.giftCardId
          ? await removeWixGiftCard(
              getWixMemberClient(),
              activeWixCheckoutDraft.cartId,
              activeWixCheckoutDraft.giftCardId
            )
          : await removeWixCoupon(
              getWixMemberClient(),
              activeWixCheckoutDraft.cartId,
              activeWixCheckoutDraft.couponId as string
            );
        setWixCheckoutDraft({
          ...activeWixCheckoutDraft,
          totalIls: price.totalIls,
          codeKind: undefined,
          couponId: undefined,
          couponCode: undefined,
          giftCardId: undefined,
          giftCardObfuscatedCode: undefined,
        });
        setVoucherCode('');
      } catch {
        setVoucherError(
          activeWixCheckoutDraft.giftCardId ? t.booking.wixGiftCardVerifyFailed : t.booking.wixCouponVerifyFailed
        );
        return;
      } finally {
        setIsVerifyingVoucher(false);
      }
    }
    setVoucherDiscount(0);
    setVoucherSuccess('');
    setVoucherError('');
  };

  const toggleAddon = (addonId: string) => {
    if (selectedAddons.includes(addonId)) {
      setSelectedAddons(selectedAddons.filter((id) => id !== addonId));
    } else {
      if (wixBookingsAuthoritative && !isWixSubscriptionRedemption) {
        setBookingError(t.booking.wixBookingAuthorityRequired);
        return;
      }
      const addon = localizedAddons.find((a) => a.id === addonId);
      if (addon && !canAddonFitInSlot(addon, totalDurationMinutes, maxSlotMinutes)) {
        return; // Prevent overflowing the selected time slot window
      }
      setSelectedAddons([...selectedAddons, addonId]);
    }
  };

  // Complete Booking & Payment
  const handleCompleteBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setBookingError(t.booking.errorSelectSlot);
      setCurrentStep(1);
      return;
    }

    if (!isWixSubscriptionRedemption && (!pilotName || !pilotEmail || !pilotPhone)) {
      setBookingError(t.booking.errorFillFields);
      return;
    }

    if (requiresUnsupportedLocalCheckout) {
      setBookingError(t.booking.wixBookingAuthorityRequired);
      return;
    }

    setIsSubmitting(true);
    setBookingError('');

    try {
      if (isWixSubscriptionRedemption) {
        if (selectedAddons.length > 0 || voucherDiscount > 0) {
          throw new Error(wixSubscriptionCopy.description);
        }

        const wixClient = getWixMemberClient();
        if (!wixClient.auth.loggedIn()) {
          const redirectUri = `${window.location.origin}/wix/members/callback`;
          const oAuthData = wixClient.auth.generateOAuthData(redirectUri, window.location.href);
          window.sessionStorage.setItem(wixMemberOAuthStorageKey(), JSON.stringify(oAuthData));
          const { authUrl } = await wixClient.auth.getAuthUrl(oAuthData);
          window.location.assign(authUrl);
          return;
        }

        const memberOrders = await wixClient.orders.memberListOrders({ limit: 50 });
        const hasCoveredSession = (memberOrders.orders ?? []).some(
          (order) =>
            order.status === 'ACTIVE' &&
            Boolean(order.planId && wixSubscriptionBookingPackageForPlan(order.planId) === activePackage.id)
        );
        if (!hasCoveredSession) throw new Error(wixSubscriptionCopy.noEligiblePlan);

        const slotResponse = await fetch('/api/wix/bookings/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageId: activePackage.id,
            bookingDate: selectedDate,
            startTime: selectedSlot.startTime,
          }),
        });
        const checkout = (await slotResponse.json()) as {
          error?: string;
          timeZone?: string;
          slotAvailability?: { serviceId?: string; localStartDate?: string; localEndDate?: string; bookable?: boolean };
        };
        if (!slotResponse.ok) {
          throw new Error(slotResponse.status === 409 ? wixSubscriptionCopy.unavailable : wixSubscriptionCopy.checkoutFailed);
        }
        const slotAvailability = checkout.slotAvailability;
        if (!slotAvailability?.serviceId || !slotAvailability.localStartDate || !slotAvailability.localEndDate) {
          throw new Error(wixSubscriptionCopy.checkoutFailed);
        }

        const redirectSession = await wixClient.redirects.createRedirectSession({
          bookingsCheckout: {
            slotAvailability,
            timezone: checkout.timeZone || 'Asia/Jerusalem',
          },
          callbacks: {
            postFlowUrl: `${window.location.origin}/subscriptions#flight-deck`,
          },
        });
        const checkoutUrl = redirectSession.redirectSession?.fullUrl;
        if (!checkoutUrl) throw new Error(wixSubscriptionCopy.checkoutFailed);
        window.location.assign(checkoutUrl);
        return;
      }

      if (canUseWixNativeCheckout) {
        const enteredCode = voucherCode.trim();
        const hasAppliedCode = wixCheckoutCodeKind === 'gift-card'
          ? Boolean(activeWixCheckoutDraft?.giftCardId)
          : Boolean(activeWixCheckoutDraft?.couponId && activeWixCheckoutDraft.couponCode === enteredCode);
        if (enteredCode && !hasAppliedCode) {
          setVoucherError(
            wixCheckoutCodeKind === 'gift-card' ? t.booking.wixGiftCardApplyFirst : t.booking.wixCouponApplyFirst
          );
          setIsSubmitting(false);
          return;
        }
        const draft = await ensureCurrentWixCheckoutDraft();
        const wixCheckout = await getWixBookingCheckoutUrl(getWixMemberClient(), draft.cartId);
        window.location.assign(wixCheckout.checkoutUrl);
        return;
      }

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          headers.Authorization = `Bearer ${data.session.access_token}`;
        }
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          kind: 'booking',
          packageId: activePackage.id,
          bookingDate: selectedDate,
          startTime: selectedSlot.startTime,
          pilotName,
          pilotEmail,
          pilotPhone,
          experienceLevel,
          addons: selectedAddons,
          requestedRouteId: requestedRoute?.id,
          voucherCode: voucherDiscount > 0 ? voucherCode : undefined,
          notes,
        }),
      });

      const checkout = await res.json();
      if (!res.ok) throw new Error(checkout.error || t.booking.paymentStartFailed);
      if (checkout.kind === 'voucher' && typeof checkout.successUrl === 'string') {
        window.location.assign(checkout.successUrl);
        return;
      }
      if (checkout.kind === 'stripe' && typeof checkout.url === 'string') {
        window.location.assign(checkout.url);
        return;
      }
      throw new Error(t.booking.paymentInitializeFailed);
    } catch (err: unknown) {
      // fetch rejects with a TypeError on network loss; never show the raw "Failed to fetch".
      const offline = err instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine);
      setBookingError(
        offline ? t.booking.offlineError : extractErrorMessage(err, t.booking.reservationCreateFailed)
      );
      setIsSubmitting(false);
    }
  };

  const accountNotice = user ? (
    <>
      <span>
        {t.booking.bookingAs}{' '}
        <strong data-member-name className="text-white">{user.fullName || user.email}</strong>
        {user.fullName && user.email ? <span className="text-slate-400"> (<span dir="ltr">{user.email}</span>)</span> : null}.
        {' '}{t.booking.bookingAsSuffix}
      </span>
      <Link href="/dashboard" className="font-semibold text-sky-400 hover:text-sky-300 whitespace-nowrap">{t.booking.viewFlightDeck}</Link>
    </>
  ) : (
    <>
      <span>{t.booking.guestCheckoutNotice}</span>
      <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300 whitespace-nowrap">{t.booking.signInToSaveBookings}</Link>
    </>
  );

  return (
    // w-full min-w-0: with mx-auto inside the flex-column main, the page otherwise
    // shrink-wraps to calendar controls and becomes too wide on phones.
    // Desktop keeps the stack above the calendar short (slim kicker row, no banners), so the
    // departure grid and the buy box sit inside the first screen on a 900px laptop.
    <div
      className="flex-1 w-full min-w-0 py-5 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4 sm:space-y-5"
      data-slots-state={loadingSlots ? 'loading' : slotsLoadFailed ? 'failed' : slotsRequested ? 'ready' : 'idle'}
    >
      {/* Top View-Mode Switcher: Amazon-Style 1-Page Express Storefront vs Guided 3-Step Wizard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
            {t.booking.storefrontTitle}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 sm:hidden">
            {t.booking.storefrontSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 w-full sm:w-auto sm:inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 shrink-0 gap-1 sm:gap-0">
          <button
            type="button"
            data-booking-view="storefront"
            onClick={() => setBookingViewMode('storefront')}
            className={`hidden sm:flex min-h-[40px] px-2.5 sm:px-3.5 py-2 rounded-lg text-[11px] sm:text-xs font-mono font-bold transition-all items-center justify-center gap-1.5 touch-manipulation cursor-pointer ${
              bookingViewMode === 'storefront'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            {/* Phones wrap the label onto two lines; wider screens keep one line and clip. */}
            <span className="text-center leading-tight sm:truncate">{t.booking.storefrontView}</span>
          </button>
          <button
            type="button"
            data-booking-view="wizard"
            onClick={() => setBookingViewMode('wizard')}
            className={`min-h-[44px] px-3 sm:px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer whitespace-nowrap ${
              bookingViewMode === 'wizard'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 shrink-0" />
            <span className="text-center leading-tight sm:truncate">{t.booking.wizardView}</span>
          </button>
        </div>
      </div>

      {((hasSelectedRouteAddon && selectedRouteAddon) || requestedRoute) && selectedRouteText && !isNoiseFreeBooking && (
        <section
          data-route-booking-intent={requestedRoute ? undefined : true}
          data-route-request-intent={requestedRoute ? true : undefined}
          aria-live="polite"
          className="rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-300">
              {requestedRoute ? routeCopy.routeRequestEyebrow : routeCopy.bookingIntentEyebrow}
            </p>
            <h2 className="mt-1 text-base sm:text-lg font-bold text-white">{selectedRouteText.title}</h2>
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-300">
              {requestedRoute ? routeCopy.routeRequestDescription : routeCopy.bookingIntentDescription}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-sky-400/30 bg-slate-950/60 px-3 py-2 text-right rtl:text-left" dir="ltr">
            {requestedRoute ? (
              <>
                <p className="text-[10px] font-mono uppercase text-slate-400">{routeCopy.routeRequestSaved}</p>
                <p className="text-sm font-mono font-bold text-sky-300">{routeCopy.routeRequestConfirmation}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{routeCopy.routeRequestPriceNote}</p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-mono uppercase text-slate-400">{routeCopy.bookingIntentAddOn}</p>
                <p className="text-sm font-mono font-bold text-sky-300">
                  +{selectedRouteAddon!.durationMinutes} min · +{formatCurrency(selectedRouteAddon!.priceIls)}
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {/* The storefront announces checkout errors in its buy box; one alert per failure. */}
      {bookingError && bookingViewMode === 'wizard' && (
        <div
          role="alert"
          aria-live="assertive"
          className="max-w-4xl mx-auto p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{bookingError}</span>
        </div>
      )}

      {/* The storefront shows the account notice inside its buy box, next to checkout where it
          matters; the wizard keeps it here above the step bar. */}
      {bookingViewMode === 'wizard' && (
        <div className="max-w-4xl mx-auto rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {accountNotice}
        </div>
      )}

      {isWixSubscriptionRedemption && (
        <section
          data-wix-subscription-redemption="true"
          className="max-w-4xl mx-auto rounded-2xl border border-sky-500/35 bg-sky-500/10 p-4 sm:p-5"
        >
          <p className="text-xs font-semibold tracking-wide text-sky-300">{wixSubscriptionCopy.eyebrow}</p>
          <h1 className="mt-1 text-lg font-semibold text-white">{wixSubscriptionCopy.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{wixSubscriptionCopy.description}</p>
        </section>
      )}

      {!browserIsraelToday ? (
        <BookLoadingFallback />
      ) : bookingViewMode === 'storefront' ? (
        <AmazonFlightStorefront
          accountNotice={accountNotice}
          selectedDate={selectedDate}
          calendarTodayYmd={calendarTodayYmd}
          onSelectDate={setSelectedDate}
          selectedPackage={activePackage}
          packages={scopedPackages}
          onSelectPackage={setSelectedPackage}
          slots={missionCompatibleSlots}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          durationAvailability={durationAvailability}
          loadingSlots={loadingSlots}
          slotsLoadFailed={slotsLoadFailed}
          onRetrySlots={() => setSlotsReloadKey((key) => key + 1)}
          addons={scopedAddons}
          selectedAddons={selectedAddons}
          onToggleAddon={toggleAddon}
          onSetAddons={(ids) =>
            setSelectedAddons(
              pruneAddonsExceedingSlot(ids, scopedAddons, baseDuration, maxSlotMinutes)
            )
          }
          manifest={displayManifest}
          pilotName={pilotName}
          onChangePilotName={setPilotName}
          pilotEmail={pilotEmail}
          onChangePilotEmail={setPilotEmail}
          pilotPhone={pilotPhone}
          onChangePilotPhone={setPilotPhone}
          experienceLevel={experienceLevel}
          onChangeExperienceLevel={setExperienceLevel}
          notes={notes}
          onChangeNotes={setNotes}
          voucherCode={voucherCode}
          onChangeVoucherCode={setVoucherCode}
          voucherDiscount={voucherDiscount}
          voucherError={voucherError}
          voucherSuccess={voucherSuccess}
          isVerifyingVoucher={isVerifyingVoucher}
          onVerifyVoucher={() => handleVerifyVoucher()}
          onRemoveVoucher={handleRemoveVoucher}
          cachedVoucherCode={cachedVoucherCode}
          onReapplyCachedVoucher={(code) => handleVerifyVoucher(code)}
          isSubmitting={isSubmitting}
          checkoutError={bookingError}
          onSubmitBooking={handleCompleteBooking}
          subscriptionCheckout={
            isWixSubscriptionRedemption
              ? { notice: wixSubscriptionCopy.description, cta: wixSubscriptionCopy.checkoutLabel }
              : undefined
          }
        />
      ) : (
        <>
          {/* Calendar-First Wizard Progress Bar */}
          <div className="max-w-3xl mx-auto">
            <div
              className={`grid ${
                isNoiseFreeBooking ? 'grid-cols-2' : 'grid-cols-3'
              } gap-2 text-center text-xs font-mono font-semibold`}
            >
              {(isNoiseFreeBooking
                ? [
                    { step: 1, label: t.booking.step2 },
                    { step: 3, label: t.booking.step4 },
                  ]
                : [
                    { step: 1, label: t.booking.step2 },
                    { step: 2, label: t.booking.step3 },
                    { step: 3, label: t.booking.step4 },
                  ]
              ).map((item) => (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => item.step < currentStep && setCurrentStep(item.step)}
                  className={`py-2 border-b-2 transition-all ${
                    currentStep === item.step
                      ? 'border-sky-400 text-sky-400 font-bold'
                      : currentStep > item.step
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

      {/* STEP 1: KANTOROVICH CALENDAR, DURATION & SMART SLOT SCHEDULER */}
      {currentStep === 1 && (
        <div className="space-y-8 max-w-5xl mx-auto">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-white">{t.booking.step2Title}</h1>
            <p className="text-slate-400 text-sm">
              {t.booking.step2Subtitle}
            </p>
          </div>

          <KantorovichCalendarScheduler
            selectedDate={selectedDate}
            calendarTodayYmd={calendarTodayYmd}
            onSelectDate={setSelectedDate}
            selectedPackage={activePackage}
            packages={scopedPackages}
            onSelectPackage={setSelectedPackage}
            slots={missionCompatibleSlots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            efficiencyReport={efficiencyReport}
            durationAvailability={durationAvailability}
            loading={loadingSlots}
          />

          {/* Sticky Mobile-First Action Bar */}
          <div className="sticky bottom-safe-area-3 z-30 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0">
              {selectedSlot && selectedSlot.available ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    {totalDurationMinutes} {t.booking.minutesShort}
                    {addonsDuration > 0
                      ? ` (${formatBookingTemplate(t.booking.baseAndAddons, { base: baseDuration, addons: addonsDuration })})`
                      : ''}{' '}
                    • {formatDate(selectedDate)}
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-black text-sky-400" dir="ltr">
                    {selectedSlot.startTime}–{effectiveEndTime || selectedSlot.endTime}
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-black text-emerald-400">
                    ({formatCurrency(subtotal)})
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">{t.booking.errorSelectSlot}</span>
              )}
            </div>

            <Button
              size="lg"
              disabled={!selectedSlot || !selectedSlot.available}
              onClick={() => setCurrentStep(isNoiseFreeBooking ? 3 : 2)}
              className="w-full sm:w-auto sm:shrink-0"
            >
              <span>{isNoiseFreeBooking ? t.booking.continueToPilot : t.booking.continueToAddons}</span>
              <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: FLIGHT ADD-ONS (Skipped in noise-free PRO & Fear of Flying sessions) */}
      {!isNoiseFreeBooking && currentStep === 2 && (
        <div className="space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-white">{t.booking.step3Title}</h1>
            <p className="text-slate-400 text-sm">
              {t.booking.step3Subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scopedAddons.map((addon) => {
              const isChecked = selectedAddons.includes(addon.id);
              const addonMin = addon.durationMinutes || 0;
              const isMissionModule = addonMin > 0;
              const exceedsSlotWindow =
                !isChecked && addonMin > 0 && totalDurationMinutes + addonMin > maxSlotMinutes;

              return (
                <div
                  key={addon.id}
                  onClick={() => !exceedsSlotWindow && toggleAddon(addon.id)}
                  className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                    exceedsSlotWindow
                      ? 'border-slate-800/50 bg-slate-950/40 cursor-not-allowed'
                      : isChecked
                      ? 'border-sky-400 bg-sky-500/10 shadow-glow cursor-pointer'
                      : isMissionModule
                      ? 'border-sky-500/30 bg-slate-900/80 hover:border-sky-400/60 cursor-pointer'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-base font-bold text-white leading-snug">
                        {addon.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {addonMin > 0 && (
                          <span className="text-xs font-mono font-bold text-sky-300 px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30">
                            +{addonMin} {t.booking.minutesShort}
                          </span>
                        )}
                        <span className="text-sm font-mono font-black text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                          +{formatCurrency(addon.priceIls)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{addon.description}</p>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-800/70 flex items-center justify-between text-xs font-mono">
                    {exceedsSlotWindow ? (
                      <span className="text-amber-400 text-[11px]">
                        {formatBookingTemplate(t.booking.addonDoesNotFit, {
                          minutes: addonMin,
                          maxMinutes: maxSlotMinutes,
                          startTime: selectedSlot?.startTime ?? '',
                        })}
                      </span>
                    ) : (
                      <span className={isChecked ? 'text-sky-400 font-bold' : 'text-slate-400'}>
                        {isChecked
                          ? `${t.booking.addedToFlight}${addonMin > 0 ? ` (+${addonMin} ${t.booking.minutesShort})` : ''}`
                          : t.booking.clickToAdd}
                      </span>
                    )}
                    <input
                      type="checkbox"
                      aria-label={addon.name}
                      checked={isChecked}
                      disabled={exceedsSlotWindow}
                      onChange={() => {}}
                      className="rounded border-slate-700 text-sky-500 focus:ring-sky-400 disabled:opacity-40"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-safe-area-3 z-30 p-3.5 sm:p-4 rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl flex flex-wrap justify-between items-center gap-3">
            <Button variant="secondary" onClick={() => setCurrentStep(1)}>
              <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              <span>{t.booking.back}</span>
            </Button>

            <div className="flex items-center gap-4">
              <div className="text-right rtl:text-left">
                <div className="text-[11px] font-mono text-slate-300">
                  <span className="text-sky-400 font-bold">
                    {totalDurationMinutes} {t.booking.minutesShort}
                  </span>
                  {addonsDuration > 0 && (
                    <span className="text-slate-400">
                      {' '}({formatBookingTemplate(t.booking.baseAndAddons, { base: baseDuration, addons: addonsDuration })})
                    </span>
                  )}
                  {selectedSlot && (
                    <span className="text-slate-400" dir="ltr">
                      {' '}• {selectedSlot.startTime}–{effectiveEndTime}
                    </span>
                  )}
                </div>
                <div className="text-sm sm:text-base font-mono font-black text-emerald-400">
                  {formatCurrency(subtotal)}
                </div>
              </div>

              <Button size="lg" onClick={() => setCurrentStep(3)} className="font-bold">
                <span>{t.booking.continueToPilot}</span>
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PILOT DETAILS, VOUCHER, & CHECKOUT */}
      {currentStep === 3 && (
        <form onSubmit={handleCompleteBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start max-w-6xl mx-auto">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-1 border-b border-slate-800 pb-4">
              <h1 className="text-2xl font-black text-white">{t.booking.step4Title}</h1>
              <p className="text-xs text-slate-400">
                {t.booking.step4Subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor={`${formId}-pilot-name`} className="text-xs font-mono uppercase text-slate-400 font-semibold">
                  {t.booking.pilotName}
                </label>
                <input
                  id={`${formId}-pilot-name`}
                  type="text"
                  required={!isWixSubscriptionRedemption}
                  value={pilotName}
                  onChange={(e) => setPilotName(e.target.value)}
                  placeholder={t.booking.pilotNamePlaceholder}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`${formId}-pilot-email`} className="text-xs font-mono uppercase text-slate-400 font-semibold">
                  {t.booking.pilotEmail}
                </label>
                <input
                  id={`${formId}-pilot-email`}
                  type="email"
                  required={!isWixSubscriptionRedemption}
                  value={pilotEmail}
                  onChange={(e) => setPilotEmail(e.target.value)}
                  placeholder="pilot@example.com"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`${formId}-pilot-phone`} className="text-xs font-mono uppercase text-slate-400 font-semibold">
                  {t.booking.pilotPhone}
                </label>
                <input
                  id={`${formId}-pilot-phone`}
                  type="tel"
                  required={!isWixSubscriptionRedemption}
                  value={pilotPhone}
                  onChange={(e) => setPilotPhone(e.target.value)}
                  placeholder="+972-54-123-4567"
                  dir="ltr"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500 text-left rtl:text-right"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`${formId}-pilot-experience`} className="text-xs font-mono uppercase text-slate-400 font-semibold">
                {t.booking.pilotExperience}
              </label>
              <select
                id={`${formId}-pilot-experience`}
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as PilotExperienceLevel)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="beginner">{t.experienceLevels.beginner}</option>
                <option value="enthusiast">{t.experienceLevels.enthusiast}</option>
                <option value="student_pilot">{t.experienceLevels.student}</option>
                <option value="atpl">{t.experienceLevels.commercial}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`${formId}-special-requests`} className="text-xs font-mono uppercase text-slate-400 font-semibold">
                {t.booking.specialRequests}
              </label>
              <textarea
                id={`${formId}-special-requests`}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.booking.specialRequestsPlaceholder}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

          </div>

          <div className="lg:col-span-5 space-y-6 sticky top-28">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 shadow-2xl">
              <div className="border-b border-slate-800 pb-4">
                <Badge variant="sky">{t.booking.orderSummary}</Badge>
                <h3 className="text-xl font-bold text-white mt-2">{cleanPackageTitle}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30">
                    {totalDurationMinutes} {t.booking.minSessions}
                  </span>
                  {addonsDuration > 0 && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatBookingTemplate(t.booking.baseAndAddons, { base: baseDuration, addons: addonsDuration })}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.bookingSuccess.date}:</span>
                  <span className="font-bold text-white">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.bookingSuccess.time}:</span>
                  <span className="font-bold text-sky-400" dir="ltr">
                    {selectedSlot?.startTime} - {effectiveEndTime || selectedSlot?.endTime} ({totalDurationMinutes}m • IST)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.booking.centerLabel}:</span>
                  <span className="text-white">{t.booking.centerAddress}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between gap-2 text-slate-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate font-semibold">{t.booking.baseFlight}</span>
                    <span className="text-[11px] font-mono text-sky-400 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 shrink-0">
                      {baseDuration} {t.booking.minutesShort}
                    </span>
                  </div>
                  <span className="font-mono font-bold shrink-0">{formatCurrency(basePrice)}</span>
                </div>

                {selectedAddons.map((addonId) => {
                  const addon = localizedAddons.find((a) => a.id === addonId);
                  if (!addon) return null;
                  const addonMin = addon.durationMinutes || 0;
                  return (
                    <div key={addonId} className="flex items-start justify-between gap-2 text-slate-300">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="leading-snug">+ {addon.name}</span>
                        {addonMin > 0 && (
                          <span className="text-[10px] font-mono font-bold text-sky-300 px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 shrink-0">
                            +{addonMin} {t.booking.minutesShort}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-emerald-400 font-semibold shrink-0">
                        {formatCurrency(addon.priceIls)}
                      </span>
                    </div>
                  );
                })}

                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>{appliedCodeLabel} ({appliedCodeDisplay})</span>
                    <span className="font-mono">-{formatCurrency(voucherDiscount)}</span>
                  </div>
                )}

                <div className="p-4 rounded-xl border border-sky-500/30 bg-slate-950/60 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-mono uppercase text-slate-300 font-bold flex items-center gap-1.5 min-w-0">
                      <Tag className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{t.booking.voucherPromoTitle}</span>
                    </label>
                    {voucherDiscount > 0 && (
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="text-xs font-mono text-red-400 hover:text-red-300 underline font-bold shrink-0"
                      >
                        {t.booking.removeVoucher}
                      </button>
                    )}
                  </div>

                  {voucherDiscount > 0 ? (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono font-bold text-emerald-400">
                          ✓ {appliedCodeDisplay}
                        </p>
                        <p className="text-[11px] font-mono text-emerald-300">
                          -{formatCurrency(voucherDiscount)} ({isNativeGiftCardApplied ? t.booking.wixGiftCardCredit : t.booking.discountApplied})
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveVoucher}
                        className="text-xs text-slate-400 hover:text-red-300 h-auto py-1 px-2"
                      >
                        {t.booking.resetVoucher}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {canUseWixNativeCheckout && (
                        <fieldset
                          data-booking-code-type-selector
                          className="grid grid-cols-2 rounded-xl border border-slate-700 bg-slate-950 p-1"
                          aria-label={t.booking.wixCodeTypeLabel}
                        >
                          <button
                            type="button"
                            aria-pressed={wixCheckoutCodeKind === 'coupon'}
                            onClick={() => {
                              setWixCheckoutCodeKind('coupon');
                              setVoucherCode('');
                              setVoucherError('');
                              setVoucherSuccess('');
                            }}
                            className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                              wixCheckoutCodeKind === 'coupon'
                                ? 'border-sky-400 bg-sky-500 text-slate-950 hover:bg-sky-400'
                                : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            {t.booking.wixCouponCodeType}
                          </button>
                          <button
                            type="button"
                            aria-pressed={wixCheckoutCodeKind === 'gift-card'}
                            onClick={() => {
                              setWixCheckoutCodeKind('gift-card');
                              setVoucherCode('');
                              setVoucherError('');
                              setVoucherSuccess('');
                            }}
                            className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                              wixCheckoutCodeKind === 'gift-card'
                                ? 'border-sky-400 bg-sky-500 text-slate-950 hover:bg-sky-400'
                                : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            {t.booking.wixGiftCardCodeType}
                          </button>
                        </fieldset>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          aria-label={canUseWixNativeCheckout && wixCheckoutCodeKind === 'gift-card' ? t.booking.wixGiftCardCodeType : t.booking.voucherPromoTitle}
                          aria-invalid={voucherError ? true : undefined}
                          aria-describedby={voucherError ? `${formId}-voucher-error` : undefined}
                          placeholder={canUseWixNativeCheckout && wixCheckoutCodeKind === 'gift-card' ? t.booking.wixGiftCardPlaceholder : t.booking.voucherPlaceholder}
                          value={voucherCode}
                          onChange={(e) => setVoucherCode(e.target.value)}
                          dir="ltr"
                          className="flex-1 min-w-0 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-base sm:text-sm text-white uppercase font-mono focus:outline-none focus:border-sky-500"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          isLoading={isVerifyingVoucher}
                          onClick={() => handleVerifyVoucher()}
                        >
                          {isVerifyingVoucher ? t.booking.verifyingVoucher : t.booking.applyCode}
                        </Button>
                      </div>

                      {cachedVoucherCode && (!canUseWixNativeCheckout || wixCheckoutCodeKind === 'coupon') && (
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                          <span>{t.booking.savedVoucher} <strong className="text-sky-300">{cachedVoucherCode}</strong></span>
                          <button
                            type="button"
                            onClick={() => handleVerifyVoucher(cachedVoucherCode)}
                            className="text-amber-400 hover:text-amber-300 font-bold underline"
                          >
                            {t.booking.reapplyVoucher}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {voucherSuccess && <p className="text-xs text-emerald-400 font-mono">{voucherSuccess}</p>}
                  {voucherError && (
                    <p id={`${formId}-voucher-error`} role="alert" className="text-xs text-red-400 font-mono">
                      {voucherError}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-300">
                    <span>{t.bookingSuccess.duration}:</span>
                    <span className="font-bold text-sky-400">
                      {totalDurationMinutes} {t.booking.minutesShort} ({selectedSlot?.startTime}–{effectiveEndTime || selectedSlot?.endTime})
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-white">{t.booking.totalAmount}</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {formatCurrency(displayTotalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                className="w-full"
              >
                <CreditCard className="w-5 h-5" />
                <span>
                  {isSubmitting
                    ? t.booking.processing
                    : isWixSubscriptionRedemption
                      ? wixSubscriptionCopy.checkoutLabel
                      : `${t.booking.proceedToPayment} (${formatCurrency(displayTotalAmount)})`}
                </span>
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-center">
                  {canUseWixNativeCheckout ? t.booking.wixCheckoutNotice : t.booking.secureNotice}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(isNoiseFreeBooking ? 1 : 2)}
              className="text-xs"
            >
              <ChevronLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              <span>{t.booking.back}</span>
            </Button>
          </div>
        </form>
      )}
        </>
      )}
    </div>
  );
}

export default function BookPage() {
  return (
    // The fallback reserves a viewport of height so the storefront replacing it does not
    // shove the footer up the screen (cumulative layout shift).
    <Suspense fallback={<BookLoadingFallback />}>
      <BookContent />
    </Suspense>
  );
}

function BookLoadingFallback() {
  const { t } = useLanguage();
  return <div className="min-h-screen py-24 text-center text-slate-400 font-mono text-sm">{t.booking.initializing}</div>;
}
