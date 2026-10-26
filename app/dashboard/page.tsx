'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Plane,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth/auth-context';
import { useLanguage, type Language } from '@/lib/i18n/language-context';
import { getLocalizedPackages } from '@/lib/i18n/translations';
import { sanitizePackageTitle } from '@/lib/scheduler/mission-calculator';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import type { Booking } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

/** Keys of `t.member.dashboard.errors`. Errors are held as keys so they re-render in the active language. */
type DashboardErrorKey =
  | 'loadFailed'
  | 'emailNotConfirmed'
  | 'authRequired'
  | 'bookingDataUnavailable'
  | 'receiptAuthNotConfigured'
  | 'sessionExpired'
  | 'receiptUnavailable'
  | 'receiptConfirmedEmailRequired'
  | 'bookingNotFound'
  | 'receiptNotAvailableForBooking'
  | 'receiptTemporarilyUnavailable'
  | 'receiptNotPublished';

/** Keys of `t.member.dashboard.status`. */
type BookingStatusKey = 'cancelled' | 'refunded' | 'paymentPending' | 'completed' | 'confirmed';

/**
 * The exact English messages returned by `/api/my-bookings`, mapped to localized copy. An unknown or
 * missing message falls back to the generic error so raw server text never reaches a non-English visitor.
 */
const BOOKINGS_API_ERRORS: ReadonlyMap<string, DashboardErrorKey> = new Map([
  ['Confirm your email address to access member purchases.', 'emailNotConfirmed'],
  ['Authentication required.', 'authRequired'],
  ['Booking data is temporarily unavailable.', 'bookingDataUnavailable'],
]);

/** The exact English messages returned by `/api/my-bookings/[ref]/receipt`. */
const RECEIPT_API_ERRORS: ReadonlyMap<string, DashboardErrorKey> = new Map([
  ['Authentication with a confirmed email is required.', 'receiptConfirmedEmailRequired'],
  ['Booking not found.', 'bookingNotFound'],
  ['A Stripe payment receipt is not available for this booking.', 'receiptNotAvailableForBooking'],
  ['Payment receipt is temporarily unavailable.', 'receiptTemporarilyUnavailable'],
  ['Stripe has not published a receipt for this payment yet.', 'receiptNotPublished'],
]);

function apiErrorKey(
  known: ReadonlyMap<string, DashboardErrorKey>,
  message: unknown,
  fallback: DashboardErrorKey
): DashboardErrorKey {
  return (typeof message === 'string' && known.get(message)) || fallback;
}

/** English keeps the shared `formatDate` output (en-GB); Arabic keeps Latin digits like the rest of the telemetry. */
const DATE_LOCALES: Record<Language, string> = {
  en: 'en-GB',
  he: 'he-IL',
  ru: 'ru-RU',
  fr: 'fr-FR',
  ar: 'ar-u-nu-latn',
};

function formatMissionDate(ymd: string, language: Language): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return formatDate(ymd);
  // Local calendar date, not UTC midnight, so the day never shifts (same rule as formatDate).
  const localDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat(DATE_LOCALES[language] ?? DATE_LOCALES.en, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(localDate);
}

function todayInIsrael(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function bookingStatusKey(booking: Booking): BookingStatusKey {
  if (booking.status === 'cancelled') return 'cancelled';
  if (booking.paymentStatus === 'refunded') return 'refunded';
  if (booking.paymentStatus === 'pending') return 'paymentPending';
  if (booking.status === 'completed') return 'completed';
  return 'confirmed';
}

function bookingStatusVariant(booking: Booking): 'sky' | 'emerald' | 'amber' | 'slate' {
  if (booking.status === 'cancelled' || booking.paymentStatus === 'refunded') return 'slate';
  if (booking.paymentStatus === 'pending') return 'amber';
  if (booking.status === 'completed') return 'emerald';
  return 'sky';
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const copy = t.member.dashboard;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DashboardErrorKey | null>(null);
  const [receiptError, setReceiptError] = useState<DashboardErrorKey | null>(null);
  const [openingReceipt, setOpeningReceipt] = useState<string | null>(null);

  /**
   * Package titles in the active language, keyed by package ID. A booking stores the English
   * registry title at checkout, so it is only the fallback for legacy or unknown package IDs.
   * getLocalizedPackages applies the BASIC_20 / PROMO_45 overrides, and the duration suffix is
   * stripped exactly as at checkout so the title never contradicts the booked duration.
   */
  const packageTitles = useMemo(
    () => new Map(getLocalizedPackages(language).map((pkg) => [pkg.id, sanitizePackageTitle(pkg.title)])),
    [language]
  );

  useEffect(() => {
    let active = true;

    async function loadUserData() {
      if (!user?.email) {
        if (active) {
          setBookings([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setLoadError(null);
      try {
        const headers: HeadersInit = {};
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
        } else {
          // Accepted only by the non-production local simulator route.
          headers['x-simdream-demo-email'] = user.email;
        }

        const response = await fetch('/api/my-bookings', { headers, cache: 'no-store' });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          if (active) {
            setBookings([]);
            setLoadError(apiErrorKey(BOOKINGS_API_ERRORS, data?.error, 'loadFailed'));
          }
          return;
        }
        if (active) setBookings(Array.isArray(data) ? data : []);
      } catch {
        // Network or session failure: browser error text is not localizable, so show the generic message.
        if (active) {
          setBookings([]);
          setLoadError('loadFailed');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadUserData();
    return () => {
      active = false;
    };
  }, [user?.email, user?.id]);

  const { upcomingBookings, historyBookings, paidSpend } = useMemo(() => {
    const today = todayInIsrael();
    const upcoming = bookings
      .filter((booking) => booking.bookingDate >= today && booking.status !== 'cancelled' && booking.status !== 'completed')
      .sort((a, b) => `${a.bookingDate}${a.startTime}`.localeCompare(`${b.bookingDate}${b.startTime}`));
    const upcomingIds = new Set(upcoming.map((booking) => booking.id));
    const history = bookings
      .filter((booking) => !upcomingIds.has(booking.id))
      .sort((a, b) => `${b.bookingDate}${b.startTime}`.localeCompare(`${a.bookingDate}${a.startTime}`));
    const total = bookings
      .filter((booking) => booking.paymentStatus === 'paid')
      .reduce((sum, booking) => sum + booking.totalIls, 0);
    return { upcomingBookings: upcoming, historyBookings: history, paidSpend: total };
  }, [bookings]);

  const openReceipt = async (bookingReference: string) => {
    setReceiptError(null);
    setOpeningReceipt(bookingReference);
    try {
      if (!isSupabaseConfigured || !supabase) {
        setReceiptError('receiptAuthNotConfigured');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) {
        setReceiptError('sessionExpired');
        return;
      }
      const response = await fetch(`/api/my-bookings/${encodeURIComponent(bookingReference)}/receipt`, {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: 'no-store',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || typeof result?.receiptUrl !== 'string') {
        setReceiptError(apiErrorKey(RECEIPT_API_ERRORS, result?.error, 'receiptUnavailable'));
        return;
      }
      window.open(result.receiptUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setReceiptError('receiptUnavailable');
    } finally {
      setOpeningReceipt(null);
    }
  };

  if (!authLoading && !user) {
    return (
      <Card className="p-10 text-center space-y-4">
        <h1 className="text-2xl font-black text-white">{copy.signInTitle}</h1>
        <p className="text-sm text-slate-400">{copy.signInSubtitle}</p>
        <Link href="/login"><Button>{copy.signInCta}</Button></Link>
      </Card>
    );
  }

  if (authLoading || !user) {
    return <Card className="p-10 text-center text-sm text-slate-400">{copy.loadingFlightDeck}</Card>;
  }

  const renderBooking = (booking: Booking, isUpcoming: boolean) => (
    <article
      key={booking.id}
      className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
    >
      <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={bookingStatusVariant(booking)}>{copy.status[bookingStatusKey(booking)].toUpperCase()}</Badge>
          <span className="text-xs font-mono text-sky-400 font-bold" dir="ltr">{booking.bookingReference}</span>
        </div>
        <h3 className="text-base font-bold text-white">{packageTitles.get(booking.packageId) ?? booking.packageTitle}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono">
          <span>{formatMissionDate(booking.bookingDate, language)}</span>
          <span dir="ltr">{booking.startTime}–{booking.endTime} IST</span>
          <span>{copy.durationMinutes.replace('{minutes}', String(booking.durationMinutes))}</span>
          <span className="text-white font-bold" dir="ltr">{formatCurrency(booking.totalIls)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {isUpcoming && (
          <Link href={`/book/success?ref=${encodeURIComponent(booking.bookingReference)}`}>
            <Button variant="secondary" size="sm">
              <FileText className="w-3.5 h-3.5" />
              <span>{copy.boardingPass}</span>
            </Button>
          </Link>
        )}
        {booking.paymentMethod === 'stripe' && booking.paymentStatus === 'paid' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={openingReceipt === booking.bookingReference}
            onClick={() => void openReceipt(booking.bookingReference)}
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>{copy.paymentReceipt}</span>
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    </article>
  );

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-sky-400 uppercase font-semibold">{copy.secureBadge}</span>
          <h1 className="text-2xl font-black text-white mt-1">{copy.welcomeBack.replace('{name}', () => user.fullName || copy.defaultPilotName)}</h1>
          <p className="text-xs text-slate-400"><span dir="ltr">{user.email}</span> · {copy.verifiedEmailScope}</p>
        </div>
        <Link href="/book">
          <Button size="sm" className="font-bold whitespace-nowrap">
            <Plane className="w-4 h-4 -rotate-45" />
            <span>{copy.bookNextMission}</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">{copy.stats.upcomingLabel}</span>
          <p className="text-2xl font-black text-sky-400 font-mono">{upcomingBookings.length}</p>
          <p className="text-[10px] text-slate-400">{copy.stats.upcomingHint}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">{copy.stats.recordsLabel}</span>
          <p className="text-2xl font-black text-white font-mono">{bookings.length}</p>
          <p className="text-[10px] text-slate-400">{copy.stats.recordsHint}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">{copy.stats.paidTotalLabel}</span>
          <p className="text-2xl font-black text-emerald-400 font-mono"><span dir="ltr">{formatCurrency(paidSpend)}</span></p>
          <p className="text-[10px] text-slate-400">{copy.stats.paidTotalHint}</p>
        </Card>
      </div>

      {loadError && (
        <div role="alert" className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm">{copy.errors[loadError]}</div>
      )}
      {receiptError && (
        <div role="alert" className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-sm">{copy.errors[receiptError]}</div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-sky-400" /> {copy.upcomingHeading}</h2>
          <span className="text-xs font-mono text-slate-400">{copy.scheduledCount.replace('{count}', String(upcomingBookings.length))}</span>
        </div>
        {loading ? (
          <Card className="p-8 text-center text-sm text-slate-400">{copy.loadingReservations}</Card>
        ) : upcomingBookings.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <p className="text-slate-400 text-sm">{copy.noUpcoming}</p>
            <Link href="/book"><Button size="sm">{copy.bookCockpitSlot}</Button></Link>
          </Card>
        ) : <div className="space-y-3">{upcomingBookings.map((booking) => renderBooking(booking, true))}</div>}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-400" /> {copy.historyHeading}</h2>
          <Badge variant="emerald"><ShieldCheck className="w-3.5 h-3.5" /> {copy.verifiedHistoryBadge}</Badge>
        </div>
        <p className="text-xs text-slate-400">{copy.receiptNotice}</p>
        {loading ? (
          <Card className="p-8 text-center text-sm text-slate-400">{copy.loadingHistory}</Card>
        ) : historyBookings.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-400">{copy.noHistory}</Card>
        ) : <div className="space-y-3">{historyBookings.map((booking) => renderBooking(booking, false))}</div>}
      </section>

      <Card className="p-4 text-xs text-slate-400 flex gap-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>{copy.guestBookingsNotice}</p>
      </Card>
    </div>
  );
}
