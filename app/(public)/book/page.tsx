'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { formatCurrency, formatDate, formatLocalYMD, extractErrorMessage } from '@/lib/utils';
import { FlightSlot, SimulatorPackage, DailyEfficiencyReport, PilotExperienceLevel } from '@/types';
import { useLanguage } from '@/lib/i18n/language-context';
import { getLocalizedPackages, getLocalizedAddons } from '@/lib/i18n/translations';
import { KantorovichCalendarScheduler } from '@/components/scheduler/KantorovichCalendarScheduler';
import { AmazonFlightStorefront } from '@/components/scheduler/AmazonFlightStorefront';
import {
  calculateMissionManifest,
  canAddonFitInSlot,
  pruneAddonsExceedingSlot,
} from '@/lib/scheduler/mission-calculator';

function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language, isRTL } = useLanguage();

  const localizedPackages = getLocalizedPackages(language);
  const localizedAddons = getLocalizedAddons(language);

  // View Mode: Default to Amazon-Style 1-Page Storefront ('storefront') to eliminate multi-step friction,
  // with optional toggle to Guided 3-Step Wizard ('wizard').
  const [bookingViewMode, setBookingViewMode] = useState<'storefront' | 'wizard'>('storefront');

  // 3-Step Streamlined Calendar-First Wizard:
  // Step 1 = Smart Calendar, Duration & Time Slot
  // Step 2 = Cockpit Upgrades (Add-ons)
  // Step 3 = Pilot Manifest & Checkout
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Selected package (synced with ?package= query param when coming from Homepage or /experiences)
  const defaultPackageSlug = searchParams.get('package') || 'captains-command-60';
  const initialPackage =
    localizedPackages.find((p) => p.slug === defaultPackageSlug) || localizedPackages[2] || localizedPackages[0];
  const [selectedPackage, setSelectedPackage] = useState<SimulatorPackage>(initialPackage);

  useEffect(() => {
    const pkgSlug = searchParams.get('package');
    if (pkgSlug) {
      const matched = localizedPackages.find((p) => p.slug === pkgSlug);
      if (matched) {
        setSelectedPackage(matched);
      }
    }
  }, [searchParams]);

  const activePackage =
    localizedPackages.find((p) => p.id === selectedPackage.id) || selectedPackage;

  // Selected Date & Slot (using local calendar YYYY-MM-DD to prevent UTC timezone day-shift)
  const tomorrow = formatLocalYMD(new Date(Date.now() + 86400000));
  const [selectedDate, setSelectedDate] = useState<string>(tomorrow);
  const [availableSlots, setAvailableSlots] = useState<FlightSlot[]>([]);
  const [efficiencyReport, setEfficiencyReport] = useState<DailyEfficiencyReport | null>(null);
  const [durationAvailability, setDurationAvailability] = useState<
    Record<number, { availableCount: number; minPriceIls: number }>
  >({});
  const [selectedSlot, setSelectedSlot] = useState<FlightSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Add-ons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Pilot Details
  const [pilotName, setPilotName] = useState<string>('');
  const [pilotEmail, setPilotEmail] = useState<string>('');
  const [pilotPhone, setPilotPhone] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<PilotExperienceLevel>('beginner');
  const [notes, setNotes] = useState<string>('');

  // Voucher Code & Session Cache
  const initialVoucher = searchParams.get('voucher') || '';
  const [voucherCode, setVoucherCode] = useState<string>(initialVoucher);
  const [cachedVoucherCode, setCachedVoucherCode] = useState<string>('');
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [voucherError, setVoucherError] = useState<string>('');
  const [voucherSuccess, setVoucherSuccess] = useState<string>('');
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('simdream_cached_voucher');
      if (saved) {
        setCachedVoucherCode(saved);
        if (!voucherCode) setVoucherCode(saved);
      }
    } catch {}
  }, []);

  // Payment Processing
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string>('');

  // Fetch Kantorovich-optimized slots & daily efficiency whenever selected date or package changes
  useEffect(() => {
    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const res = await fetch(
          `/api/slots?date=${selectedDate}&duration=${selectedPackage.durationMinutes}&includeEfficiency=true`
        );
        const data = await res.json();
        const slotList: FlightSlot[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.slots)
          ? data.slots
          : [];

        if (data?.durationAvailability) {
          setDurationAvailability(data.durationAvailability);

          // If the currently selected duration has 0 available slots on this date (e.g. 45m or 120m on Saturday),
          // automatically switch to an available duration on this date so the user is never stuck!
          const currentDurInfo = data.durationAvailability[selectedPackage.durationMinutes];
          if (currentDurInfo && currentDurInfo.availableCount === 0) {
            const preferredOrder = [60, 90, 20, 30, 45, 120];
            const nextValidDuration = preferredOrder.find(
              (d) => data.durationAvailability[d]?.availableCount > 0
            );
            if (nextValidDuration) {
              const fallbackPkg = localizedPackages.find(
                (p) => p.category !== 'corporate' && p.durationMinutes === nextValidDuration
              );
              if (fallbackPkg && fallbackPkg.id !== selectedPackage.id) {
                setSelectedPackage(fallbackPkg);
                return;
              }
            }
          }
        }

        setAvailableSlots(slotList);
        if (data?.efficiency) {
          setEfficiencyReport(data.efficiency);
        }

        // Prefer smart 150m block pairing or first available slot
        const smartMatch = slotList.find(
          (s: FlightSlot) => s.available && s.smartRecommendation === 'optimal_150_pair'
        );
        const firstAvailable = smartMatch || slotList.find((s: FlightSlot) => s.available) || null;

        setSelectedSlot((prev) => {
          if (
            prev &&
            prev.date === selectedDate &&
            slotList.some((s) => s.id === prev.id && s.available)
          ) {
            return slotList.find((s) => s.id === prev.id) || firstAvailable;
          }
          return firstAvailable;
        });
      } catch (err) {
        console.error('Failed to load slots', err);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate, selectedPackage]);

  // Canonical Single-Source-of-Truth Mission Manifest calculation
  const manifest = React.useMemo(
    () =>
      calculateMissionManifest({
        pkg: activePackage,
        slot: selectedSlot,
        selectedAddonIds: selectedAddons,
        availableAddons: localizedAddons,
        voucherDiscountIls: voucherDiscount,
      }),
    [activePackage, selectedSlot, selectedAddons, localizedAddons, voucherDiscount]
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

  // Smart Window Guard: if user switches to a tighter time slot in Step 1, prune any time-extending add-ons that exceed maxSlotMinutes
  useEffect(() => {
    if (!selectedSlot) return;
    const pruned = pruneAddonsExceedingSlot(
      selectedAddons,
      localizedAddons,
      baseDuration,
      selectedSlot.maxAvailableMinutes ?? 180
    );
    if (pruned.length !== selectedAddons.length) {
      setSelectedAddons(pruned);
    }
  }, [selectedSlot, baseDuration]);

  // Voucher verification handler with 1-click reapply and session storage persistence
  const handleVerifyVoucher = async (codeOverride?: string) => {
    const code = (codeOverride ?? voucherCode).trim().toUpperCase();
    if (!code) return;
    setIsVerifyingVoucher(true);
    setVoucherError('');
    setVoucherSuccess('');

    try {
      const res = await fetch(`/api/vouchers?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid voucher code.');
      }

      const applicableDiscount = Math.min(data.currentBalanceIls, subtotal);
      setVoucherCode(code);
      setVoucherDiscount(applicableDiscount);
      setVoucherSuccess(`Voucher applied! ₪${applicableDiscount} discount applied.`);
      setCachedVoucherCode(code);
      try {
        sessionStorage.setItem('simdream_cached_voucher', code);
      } catch {}
    } catch (err: unknown) {
      setVoucherError(extractErrorMessage(err, 'Could not verify voucher.'));
      setVoucherDiscount(0);
    } finally {
      setIsVerifyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherDiscount(0);
    setVoucherSuccess('');
    setVoucherError('');
  };

  const toggleAddon = (addonId: string) => {
    if (selectedAddons.includes(addonId)) {
      setSelectedAddons(selectedAddons.filter((id) => id !== addonId));
    } else {
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

    if (!pilotName || !pilotEmail || !pilotPhone) {
      setBookingError(t.booking.errorFillFields);
      return;
    }

    setIsSubmitting(true);
    setBookingError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: activePackage.id,
          packageTitle: cleanPackageTitle,
          durationMinutes: totalDurationMinutes,
          bookingDate: selectedDate,
          startTime: selectedSlot.startTime,
          endTime: effectiveEndTime || selectedSlot.endTime,
          pilotName,
          pilotEmail,
          pilotPhone,
          experienceLevel,
          addons: selectedAddons,
          subtotalIls: subtotal,
          discountIls: voucherDiscount,
          totalIls: totalAmount,
          voucherCode: voucherDiscount > 0 ? voucherCode : undefined,
          notes,
        }),
      });

      const booking = await res.json();
      if (!res.ok) throw new Error(booking.error || 'Booking reservation failed');

      try {
        sessionStorage.setItem('simdream_last_booking', JSON.stringify(booking));
      } catch {}

      const successParams = new URLSearchParams({
        booking_id: booking.id,
        ref: booking.bookingReference,
        pkg: cleanPackageTitle,
        pkg_id: activePackage.id,
        date: selectedDate,
        start: selectedSlot.startTime,
        end: effectiveEndTime || selectedSlot.endTime,
        dur: String(totalDurationMinutes),
        base_dur: String(baseDuration),
        addon_dur: String(addonsDuration),
        base_price: String(basePrice),
        total: String(totalAmount),
        pilot: pilotName,
        addons: selectedAddons.join(','),
      });
      const successPath = `/book/success?${successParams.toString()}`;

      if (totalAmount === 0) {
        router.push(successPath);
        return;
      }

      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Sim Dream: ${cleanPackageTitle} (${totalDurationMinutes} min)`,
          description: `${totalDurationMinutes} min B737 MAX simulator on ${formatDate(selectedDate)} (${selectedSlot.startTime}–${effectiveEndTime || selectedSlot.endTime})`,
          amountIls: totalAmount,
          customerEmail: pilotEmail,
          bookingId: booking.id,
          returnUrl: `${window.location.origin}${successPath}`,
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        router.push(successPath);
      }
    } catch (err: unknown) {
      setBookingError(
        extractErrorMessage(err, 'An error occurred while creating your reservation.')
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top View-Mode Switcher: Amazon-Style 1-Page Express Storefront vs Guided 3-Step Wizard */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
            BOEING 737 MAX-8 FLIGHT DISPATCH & STOREFRONT
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure your base flight, departure slot, and global 3-airport bundles in one unified view.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setBookingViewMode('storefront')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              bookingViewMode === 'storefront'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Express Shop View (1-Page)</span>
          </button>
          <button
            type="button"
            onClick={() => setBookingViewMode('wizard')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              bookingViewMode === 'wizard'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Guided Wizard (3-Step)</span>
          </button>
        </div>
      </div>

      {bookingError && (
        <div
          role="alert"
          aria-live="assertive"
          className="max-w-4xl mx-auto p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{bookingError}</span>
        </div>
      )}

      {bookingViewMode === 'storefront' ? (
        <AmazonFlightStorefront
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          selectedPackage={activePackage}
          packages={localizedPackages}
          onSelectPackage={setSelectedPackage}
          slots={availableSlots}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          durationAvailability={durationAvailability}
          loadingSlots={loadingSlots}
          addons={localizedAddons}
          selectedAddons={selectedAddons}
          onToggleAddon={toggleAddon}
          onSetAddons={(ids) =>
            setSelectedAddons(
              pruneAddonsExceedingSlot(ids, localizedAddons, baseDuration, maxSlotMinutes)
            )
          }
          manifest={manifest}
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
          onSubmitBooking={handleCompleteBooking}
        />
      ) : (
        <>
          {/* 3-Step Calendar-First Wizard Progress Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-semibold">
              {[
                { step: 1, label: t.booking.step2 },
                { step: 2, label: t.booking.step3 },
                { step: 3, label: t.booking.step4 },
              ].map((item) => (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => item.step < currentStep && setCurrentStep(item.step)}
                  className={`py-2 border-b-2 transition-all ${
                    currentStep === item.step
                      ? 'border-sky-400 text-sky-400 font-bold'
                      : currentStep > item.step
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-slate-800 text-slate-600'
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
            onSelectDate={setSelectedDate}
            selectedPackage={activePackage}
            packages={localizedPackages}
            onSelectPackage={setSelectedPackage}
            slots={availableSlots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            efficiencyReport={efficiencyReport}
            durationAvailability={durationAvailability}
            loading={loadingSlots}
          />

          {/* Sticky Mobile-First Action Bar */}
          <div className="sticky bottom-3 z-30 p-3.5 sm:p-4 rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              {selectedSlot && selectedSlot.available ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    {totalDurationMinutes} min
                    {addonsDuration > 0 ? ` (${baseDuration}m + ${addonsDuration}m)` : ''} • {formatDate(selectedDate)}
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
              onClick={() => setCurrentStep(2)}
              className="shrink-0 font-bold"
            >
              <span>{t.booking.continueToAddons}</span>
              <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: FLIGHT ADD-ONS */}
      {currentStep === 2 && (
        <div className="space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-white">{t.booking.step3Title}</h1>
            <p className="text-slate-400 text-sm">
              {t.booking.step3Subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {localizedAddons.map((addon) => {
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
                      ? 'border-slate-800/50 bg-slate-950/40 opacity-55 cursor-not-allowed'
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
                            +{addonMin} min
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
                        Needs +{addonMin}m (Max {maxSlotMinutes}m available at {selectedSlot?.startTime})
                      </span>
                    ) : (
                      <span className={isChecked ? 'text-sky-400 font-bold' : 'text-slate-500'}>
                        {isChecked
                          ? `${t.booking.addedToFlight}${addonMin > 0 ? ` (+${addonMin} min)` : ''}`
                          : t.booking.clickToAdd}
                      </span>
                    )}
                    <input
                      type="checkbox"
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

          <div className="sticky bottom-3 z-30 p-3.5 sm:p-4 rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl flex flex-wrap justify-between items-center gap-3">
            <Button variant="secondary" onClick={() => setCurrentStep(1)}>
              <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              <span>{t.booking.back}</span>
            </Button>

            <div className="flex items-center gap-4">
              <div className="text-right rtl:text-left">
                <div className="text-[11px] font-mono text-slate-300">
                  <span className="text-sky-400 font-bold">
                    {totalDurationMinutes} min
                  </span>
                  {addonsDuration > 0 && (
                    <span className="text-slate-400">
                      {' '}({baseDuration}m + {addonsDuration}m)
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
              <h2 className="text-2xl font-black text-white">{t.booking.step4Title}</h2>
              <p className="text-xs text-slate-400">
                {t.booking.step4Subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-mono uppercase text-slate-400 font-semibold">
                  {t.booking.pilotName}
                </label>
                <input
                  type="text"
                  required
                  value={pilotName}
                  onChange={(e) => setPilotName(e.target.value)}
                  placeholder={t.booking.pilotNamePlaceholder}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-400 font-semibold">
                  {t.booking.pilotEmail}
                </label>
                <input
                  type="email"
                  required
                  value={pilotEmail}
                  onChange={(e) => setPilotEmail(e.target.value)}
                  placeholder="pilot@example.com"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-400 font-semibold">
                  {t.booking.pilotPhone}
                </label>
                <input
                  type="tel"
                  required
                  value={pilotPhone}
                  onChange={(e) => setPilotPhone(e.target.value)}
                  placeholder="+972-54-123-4567"
                  dir="ltr"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-sky-500 text-left rtl:text-right"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-slate-400 font-semibold">
                {t.booking.pilotExperience}
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as PilotExperienceLevel)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="beginner">{t.experienceLevels.beginner}</option>
                <option value="enthusiast">{t.experienceLevels.enthusiast}</option>
                <option value="student_pilot">{t.experienceLevels.student}</option>
                <option value="atpl">{t.experienceLevels.commercial}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-slate-400 font-semibold">
                {t.booking.specialRequests}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.booking.specialRequestsPlaceholder}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase text-slate-300 font-bold flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-sky-400" />
                  <span>{t.booking.voucherPromoTitle}</span>
                </label>
                {voucherDiscount > 0 && (
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    className="text-xs font-mono text-red-400 hover:text-red-300 underline font-bold"
                  >
                    {isRTL ? 'הסר שובר' : 'Remove Voucher'}
                  </button>
                )}
              </div>

              {voucherDiscount > 0 ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono font-bold text-emerald-400">
                      ✓ {voucherCode}
                    </p>
                    <p className="text-[11px] font-mono text-emerald-300">
                      -{formatCurrency(voucherDiscount)} {isRTL ? 'הנחה מופעלת' : 'discount applied'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveVoucher}
                    className="text-xs text-slate-400 hover:text-red-300 h-auto py-1 px-2"
                  >
                    {isRTL ? 'בטל שובר' : 'Reset'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t.booking.voucherPlaceholder}
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      dir="ltr"
                      className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white uppercase font-mono focus:outline-none focus:border-sky-500"
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

                  {cachedVoucherCode && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                      <span>{isRTL ? 'שובר שמור:' : 'Saved voucher:'} <strong className="text-sky-300">{cachedVoucherCode}</strong></span>
                      <button
                        type="button"
                        onClick={() => handleVerifyVoucher(cachedVoucherCode)}
                        className="text-amber-400 hover:text-amber-300 font-bold underline"
                      >
                        {isRTL ? 'החל שוב ↗' : '1-Click Reapply ↗'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {voucherSuccess && <p className="text-xs text-emerald-400 font-mono">{voucherSuccess}</p>}
              {voucherError && <p className="text-xs text-red-400 font-mono">{voucherError}</p>}
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
                      ({baseDuration}m base + {addonsDuration}m add-ons)
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
                  <span className="text-slate-400">CENTER:</span>
                  <span className="text-white">Gershon Shatz 36, Tel Aviv (Yehudit Light Rail)</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between gap-2 text-slate-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate font-semibold">{t.booking.baseFlight}</span>
                    <span className="text-[11px] font-mono text-sky-400 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 shrink-0">
                      {baseDuration} min
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
                            +{addonMin} min
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
                    <span>{t.booking.voucherDiscount} ({voucherCode})</span>
                    <span className="font-mono">-{formatCurrency(voucherDiscount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-300">
                    <span>{t.bookingSuccess.duration}:</span>
                    <span className="font-bold text-sky-400">
                      {totalDurationMinutes} min ({selectedSlot?.startTime}–{effectiveEndTime || selectedSlot?.endTime})
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-white">{t.booking.totalAmount}</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-bold text-base py-4 shadow-glow"
              >
                <CreditCard className="w-5 h-5" />
                <span>{isSubmitting ? t.booking.processing : `${t.booking.proceedToPayment} (${formatCurrency(totalAmount)})`}</span>
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-center">{t.booking.secureNotice}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(2)}
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
    <Suspense fallback={<div className="py-24 text-center text-slate-400 font-mono text-sm">Initializing Boeing 737 MAX Flight Deck...</div>}>
      <BookContent />
    </Suspense>
  );
}
