'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock3, Download, MapPin, Plane } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { getLocalizedAddons } from '@/lib/i18n/translations';

interface PublicBooking {
  bookingReference: string;
  packageId: string;
  packageTitle: string;
  durationMinutes: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  pilotName: string;
  addons: string[];
  totalIls: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const { t, language, isRTL } = useLanguage();
  const addons = getLocalizedAddons(language);
  const bookingReference = searchParams.get('ref');
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingReference) {
      setError('A booking reference is required to view this boarding pass.');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const response = await fetch(`/api/bookings?ref=${encodeURIComponent(bookingReference)}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Booking not found.');
        if (cancelled) return;
        setBooking(data as PublicBooking);
        setError('');
        attempts += 1;
        if (data.paymentStatus === 'pending' && attempts < 12) {
          timeout = setTimeout(load, 2500);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load booking.');
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [bookingReference]);

  useEffect(() => {
    if (booking?.paymentStatus !== 'paid' || booking.status !== 'confirmed') return;
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#0284c7', '#10b981', '#ffffff'],
        disableForReducedMotion: true,
      });
    } catch {}
  }, [booking?.paymentStatus, booking?.status]);

  const paid = booking?.paymentStatus === 'paid' && booking.status === 'confirmed';
  // Without a booking there is no payment to confirm; say so instead of "confirming your payment".
  const notFound = Boolean(error) && !booking;
  const selectedAddons = booking?.addons ?? [];

  return (
    <div className="flex-1 w-full min-w-0 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10 text-center">
      <div className="space-y-4">
        <div className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto ${
          paid ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
        }`}>
          {paid ? <CheckCircle2 className="w-8 h-8" /> : <Clock3 className="w-8 h-8" />}
        </div>
        <Badge variant={paid ? 'emerald' : 'amber'}>
          {paid ? t.bookingSuccess.badge : notFound ? 'BOOKING NOT FOUND' : 'PAYMENT PROCESSING'}
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {paid ? t.bookingSuccess.title : notFound ? "We couldn't find this booking" : 'We are confirming your payment'}
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto">
          {paid
            ? t.bookingSuccess.subtitle
            : notFound
            ? 'Check the link in your confirmation email, or contact us and we will look it up for you.'
            : 'Your boarding pass will update automatically once the secure payment confirmation arrives.'}
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 p-5 text-red-200">
          {error}
        </div>
      ) : !booking ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-slate-300">Loading your booking…</div>
      ) : (
        <div className="rounded-2xl border-2 border-sky-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950/70 p-6 sm:p-8 text-left rtl:text-right shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center"><Plane className="w-5 h-5 text-white -rotate-45" /></div>
              <div><p className="font-black text-white text-lg">SIM DREAM LTD</p><p className="text-[10px] font-mono text-sky-400 uppercase">{t.bookingSuccess.manifestBadge}</p></div>
            </div>
            <div className="text-left sm:text-right rtl:text-right sm:rtl:text-left"><p className="text-[10px] font-mono text-slate-400 uppercase">{t.bookingSuccess.clearanceRef}</p><p className="text-xl font-black text-sky-400 font-mono" dir="ltr">{booking.bookingReference}</p></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-5 text-xs font-mono">
            <div className="col-span-2 sm:col-span-1"><p className="text-slate-400 uppercase text-[10px]">{t.bookingSuccess.missionPackage}</p><p className="text-white font-bold text-sm mt-1">{booking.packageTitle}</p></div>
            <div><p className="text-slate-400 uppercase text-[10px]">{t.bookingSuccess.date}</p><p className="text-white font-bold text-sm mt-1">{formatDate(booking.bookingDate)}</p></div>
            <div><p className="text-slate-400 uppercase text-[10px]">{t.bookingSuccess.time}</p><p className="text-sky-400 font-black text-sm mt-1" dir="ltr">{booking.startTime}–{booking.endTime} IST</p></div>
            <div><p className="text-slate-400 uppercase text-[10px]">{t.bookingSuccess.duration}</p><p className="text-emerald-400 font-black text-sm mt-1">{booking.durationMinutes} min</p></div>
            <div><p className="text-slate-400 uppercase text-[10px]">{t.bookingSuccess.pilotInCommand}</p><p className="text-white font-bold text-sm mt-1">{booking.pilotName}</p></div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-sky-500/30 space-y-3 text-xs font-mono">
            <div className="flex justify-between gap-3 text-sky-400 font-bold uppercase"><span>Mission add-ons</span><span className="text-emerald-400">{paid ? `Paid: ${formatCurrency(booking.totalIls)}` : 'Awaiting payment'}</span></div>
            {selectedAddons.length ? selectedAddons.map((id) => <p key={id} className="text-slate-300">+ {addons.find((addon) => addon.id === id)?.name || 'Mission add-on'}</p>) : <p className="text-slate-400">No add-ons selected.</p>}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-400"><MapPin className="w-4 h-4 text-sky-400 shrink-0" /><span>Gershon Shatz St 36, Tel Aviv-Yafo. Please arrive 15 minutes before departure.</span></div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link href="/book"><Button size="lg" className="w-full sm:w-auto">Book another mission</Button></Link>
        {paid && <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => window.print()}><Download className="w-4 h-4" /><span>{t.bookingSuccess.downloadPdf}</span></Button>}
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return <Suspense fallback={<div className="py-24 text-center text-slate-400 font-mono text-sm">Loading boarding pass…</div>}><BookingSuccessContent /></Suspense>;
}
