'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Plane,
  Calendar,
  Clock,
  MapPin,
  Download,
  Share2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Booking } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { getLocalizedAddons, getLocalizedPackages } from '@/lib/i18n/translations';
import {
  addMinutesToTime,
  calculateMissionManifest,
  sanitizePackageTitle,
} from '@/lib/scheduler/mission-calculator';

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const { t, language, isRTL } = useLanguage();
  const localizedAddons = getLocalizedAddons(language);
  const localizedPackages = getLocalizedPackages(language);

  const bookingRef = searchParams.get('ref') || 'SD-737-8492';
  const bookingIdParam = searchParams.get('booking_id');

  const [booking, setBooking] = useState<Booking | null>(() => {
    // Immediate hydration from URL query params if present
    const startParam = searchParams.get('start');
    const dateParam = searchParams.get('date');
    if (startParam && dateParam) {
      const addonsParam = searchParams.get('addons');
      const addonsList = addonsParam ? addonsParam.split(',').filter(Boolean) : [];
      const durParam = Number(searchParams.get('dur')) || 60;
      const endParam = searchParams.get('end') || addMinutesToTime(startParam, durParam);
      const totalParam = Number(searchParams.get('total')) || 690;
      return {
        id: bookingIdParam || 'book-live',
        bookingReference: bookingRef,
        packageId: searchParams.get('pkg_id') || 'pkg-captain-60',
        packageTitle:
          searchParams.get('pkg') || "Captain's Command Flight (60m)",
        durationMinutes: durParam,
        bookingDate: dateParam,
        startTime: startParam,
        endTime: endParam,
        pilotName: searchParams.get('pilot') || 'Nathanel S.',
        pilotEmail: '',
        pilotPhone: '',
        experienceLevel: 'beginner',
        addons: addonsList,
        subtotalIls: totalParam,
        discountIls: 0,
        totalIls: totalParam,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  });

  useEffect(() => {
    // Fire celebratory flight clearance confetti
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#0284c7', '#10b981', '#ffffff'],
      });
    } catch {}

    // Check sessionStorage first for instant zero-latency hydration
    try {
      const cached = sessionStorage.getItem('simdream_last_booking');
      if (cached) {
        const parsed = JSON.parse(cached) as Booking;
        if (
          parsed &&
          (!bookingRef || parsed.bookingReference === bookingRef || parsed.id === bookingIdParam)
        ) {
          setBooking(parsed);
        }
      }
    } catch {}

    // Also fetch from API by booking reference OR booking_id
    async function fetchBooking() {
      try {
        const refQuery =
          bookingRef && bookingRef !== 'SD-737-8492'
            ? `ref=${encodeURIComponent(bookingRef)}`
            : bookingIdParam
            ? `id=${encodeURIComponent(bookingIdParam)}`
            : `ref=${encodeURIComponent(bookingRef)}`;

        const res = await fetch(`/api/bookings?${refQuery}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setBooking(data);
          }
        }
      } catch (err) {
        console.error('Failed to load booking details', err);
      }
    }
    fetchBooking();
  }, [bookingRef, bookingIdParam]);

  // Canonical Single-Source-of-Truth Mission Manifest calculation
  const matchedPkg =
    localizedPackages.find((p) => p.id === booking?.packageId) ||
    localizedPackages.find((p) => p.title === booking?.packageTitle) ||
    localizedPackages[0];

  const activeAddonsList = booking?.addons || [];
  const addonsExtraMinutes = activeAddonsList.reduce((sum, id) => {
    const a = localizedAddons.find((item) => item.id === id);
    return sum + (a?.durationMinutes || 0);
  }, 0);

  // Exact real session duration:
  // If booking.durationMinutes is present, it is the master total duration.
  // Otherwise, use URL param 'dur' or sum base + addons.
  const realTotalDuration =
    booking?.durationMinutes ||
    Number(searchParams.get('dur')) ||
    (matchedPkg ? matchedPkg.durationMinutes + addonsExtraMinutes : 60);

  const baseDuration =
    Number(searchParams.get('base_dur')) ||
    (matchedPkg ? matchedPkg.durationMinutes : Math.max(20, realTotalDuration - addonsExtraMinutes));

  const basePriceIls =
    Number(searchParams.get('base_price')) ||
    (matchedPkg ? matchedPkg.priceIls : (booking?.subtotalIls || 690));

  const realStartTime = booking?.startTime || searchParams.get('start') || '10:00';
  const realEndTime =
    booking?.endTime ||
    searchParams.get('end') ||
    addMinutesToTime(realStartTime, realTotalDuration);

  const cleanTitle = sanitizePackageTitle(
    booking?.packageTitle || matchedPkg?.title || searchParams.get('pkg') || 'Boeing 737 Flight Session'
  );

  return (
    <div className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12 text-center">
      {/* Top Banner */}
      <div className="space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-glowGreen">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <Badge variant="emerald">{t.bookingSuccess.badge}</Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {t.bookingSuccess.title}
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto">
          {t.bookingSuccess.subtitle}
        </p>
      </div>

      {/* Boarding Pass Ticket Card */}
      <div className="rounded-2xl border-2 border-sky-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950/70 p-6 sm:p-8 text-left rtl:text-right shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-glow">
              <Plane className="w-5 h-5 text-white -rotate-45" />
            </div>
            <div>
              <p className="font-black text-white text-lg tracking-tight">SIM DREAM LTD</p>
              <p className="text-[10px] font-mono text-sky-400 uppercase">
                {t.bookingSuccess.manifestBadge}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right rtl:text-right sm:rtl:text-left">
            <p className="text-[10px] font-mono text-slate-400 uppercase">{t.bookingSuccess.clearanceRef}</p>
            <p className="text-2xl font-black text-sky-400 font-mono tracking-wider" dir="ltr">{bookingRef}</p>
          </div>
        </div>

        {/* Flight Details Grid (5-Column Manifest including Explicit Session Duration & Real Flight Time) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-5 text-xs font-mono">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-slate-500 uppercase text-[10px]">{t.bookingSuccess.missionPackage}</p>
            <p className="text-white font-bold text-sm mt-0.5 leading-snug">
              {cleanTitle}
            </p>
          </div>

          <div>
            <p className="text-slate-500 uppercase text-[10px]">{t.bookingSuccess.date}</p>
            <p className="text-white font-bold text-sm mt-0.5">
              {booking ? formatDate(booking.bookingDate) : 'Upcoming'}
            </p>
          </div>

          <div>
            <p className="text-slate-500 uppercase text-[10px]">{t.bookingSuccess.time}</p>
            <p className="text-sky-400 font-black text-sm mt-0.5" dir="ltr">
              {realStartTime} - {realEndTime} (IST)
            </p>
          </div>

          <div>
            <p className="text-slate-500 uppercase text-[10px]">{t.bookingSuccess.duration}</p>
            <p className="text-emerald-400 font-black text-sm mt-0.5">
              {realTotalDuration} min
              {addonsExtraMinutes > 0 && (
                <span className="block text-[10px] text-slate-400 font-normal">
                  ({baseDuration}m + {addonsExtraMinutes}m add-ons)
                </span>
              )}
            </p>
          </div>

          <div>
            <p className="text-slate-500 uppercase text-[10px]">{t.bookingSuccess.pilotInCommand}</p>
            <p className="text-white font-bold text-sm mt-0.5">
              {booking?.pilotName || 'Nathanel S.'}
            </p>
          </div>
        </div>

        {/* Itemized Flight Session & Add-Ons Breakdown on Boarding Pass */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-sky-500/30 space-y-2.5 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sky-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
            <span>
              {t.bookingSuccess.duration}: {realTotalDuration} min ({realStartTime}–{realEndTime})
            </span>
            <span className="text-emerald-400">
              {t.bookingSuccess.totalPaid}: {formatCurrency(booking?.totalIls || basePriceIls)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {/* Base Flight Item */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-200">
              <span className="truncate font-semibold">{cleanTitle}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30">
                  {baseDuration} min
                </span>
                <span className="text-emerald-400 font-bold">
                  {formatCurrency(basePriceIls)}
                </span>
              </div>
            </div>

            {/* Selected Add-On Items */}
            {activeAddonsList.map((addonId) => {
              const addon = localizedAddons.find((a) => a.id === addonId);
              if (!addon) return null;
              return (
                <div
                  key={addonId}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-200"
                >
                  <span className="truncate">+ {addon.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {addon.durationMinutes ? (
                      <span className="text-[10px] text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30">
                        +{addon.durationMinutes} min
                      </span>
                    ) : null}
                    <span className="text-emerald-400 font-bold">
                      {formatCurrency(addon.priceIls)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Checklist */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
          <p className="font-bold text-sky-400 font-mono uppercase">{t.bookingSuccess.instructionsTitle}:</p>
          <ul className="space-y-1.5 text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>{t.bookingSuccess.pointArrival}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>{t.bookingSuccess.pointGuests}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>{t.bookingSuccess.pointClothing}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>{t.bookingSuccess.pointReschedule}</span>
            </li>
          </ul>
        </div>

        {/* Location Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-slate-800/80 gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Gershon Shatz St 36, Tel Aviv-Yafo (4 min from Yehudit Light Rail, 8 min from HaShalom Station)</span>
          </div>
          <div className="font-mono text-[10px] text-slate-500" dir="ltr">
            |||| || | |||| ||| |||| | | |||
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link href="/dashboard">
          <Button size="lg" className="w-full sm:w-auto font-bold shadow-glow">
            <span>{t.bookingSuccess.viewDashboard}</span>
            <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </Link>
        <Button
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4" />
          <span>{t.bookingSuccess.downloadPdf}</span>
        </Button>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-slate-400 font-mono text-sm">Loading Boarding Pass...</div>}>
      <BookingSuccessContent />
    </Suspense>
  );
}

