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
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import type { Booking } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

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

function bookingStatusLabel(booking: Booking): string {
  if (booking.status === 'cancelled') return 'Cancelled';
  if (booking.paymentStatus === 'refunded') return 'Refunded';
  if (booking.paymentStatus === 'pending') return 'Payment pending';
  if (booking.status === 'completed') return 'Completed';
  return 'Confirmed';
}

function bookingStatusVariant(booking: Booking): 'sky' | 'emerald' | 'amber' | 'slate' {
  if (booking.status === 'cancelled' || booking.paymentStatus === 'refunded') return 'slate';
  if (booking.paymentStatus === 'pending') return 'amber';
  if (booking.status === 'completed') return 'emerald';
  return 'sky';
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [openingReceipt, setOpeningReceipt] = useState<string | null>(null);

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
      setLoadError('');
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
          throw new Error(typeof data?.error === 'string' ? data.error : 'We could not load your reservations.');
        }
        if (active) setBookings(Array.isArray(data) ? data : []);
      } catch (error) {
        if (active) {
          setBookings([]);
          setLoadError(error instanceof Error ? error.message : 'We could not load your reservations.');
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
    setReceiptError('');
    setOpeningReceipt(bookingReference);
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Payment receipts are available only with configured member authentication.');
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) throw new Error('Your member session has expired. Please sign in again.');
      const response = await fetch(`/api/my-bookings/${encodeURIComponent(bookingReference)}/receipt`, {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: 'no-store',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || typeof result?.receiptUrl !== 'string') {
        throw new Error(typeof result?.error === 'string' ? result.error : 'Payment receipt is unavailable.');
      }
      window.open(result.receiptUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : 'Payment receipt is unavailable.');
    } finally {
      setOpeningReceipt(null);
    }
  };

  if (!authLoading && !user) {
    return (
      <Card className="p-10 text-center space-y-4">
        <h1 className="text-2xl font-black text-white">Sign in to your Flight Deck</h1>
        <p className="text-sm text-slate-400">Members can view reservations, purchase history, and Stripe payment receipts.</p>
        <Link href="/login"><Button>Sign in or create a member profile</Button></Link>
      </Card>
    );
  }

  if (authLoading || !user) {
    return <Card className="p-10 text-center text-sm text-slate-400">Loading your secure Flight Deck…</Card>;
  }

  const renderBooking = (booking: Booking, isUpcoming: boolean) => (
    <article
      key={booking.id}
      className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
    >
      <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={bookingStatusVariant(booking)}>{bookingStatusLabel(booking).toUpperCase()}</Badge>
          <span className="text-xs font-mono text-sky-400 font-bold">{booking.bookingReference}</span>
        </div>
        <h3 className="text-base font-bold text-white">{booking.packageTitle}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono">
          <span>{formatDate(booking.bookingDate)}</span>
          <span>{booking.startTime}–{booking.endTime} IST</span>
          <span>{booking.durationMinutes} min</span>
          <span className="text-white font-bold">{formatCurrency(booking.totalIls)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {isUpcoming && (
          <Link href={`/book/success?ref=${encodeURIComponent(booking.bookingReference)}`}>
            <Button variant="secondary" size="sm">
              <FileText className="w-3.5 h-3.5" />
              <span>Boarding pass</span>
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
            <span>Payment receipt</span>
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
          <span className="text-xs font-mono text-sky-400 uppercase font-semibold">Secure member Flight Deck</span>
          <h1 className="text-2xl font-black text-white mt-1">Welcome back, {user.fullName || 'Captain'}</h1>
          <p className="text-xs text-slate-400">{user.email} · reservations and purchases belonging to this verified email</p>
        </div>
        <Link href="/book">
          <Button size="sm" className="font-bold whitespace-nowrap">
            <Plane className="w-4 h-4 -rotate-45" />
            <span>Book next mission</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Upcoming reservations</span>
          <p className="text-2xl font-black text-sky-400 font-mono">{upcomingBookings.length}</p>
          <p className="text-[10px] text-slate-500">Confirmed or pending future sessions</p>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Purchase records</span>
          <p className="text-2xl font-black text-white font-mono">{bookings.length}</p>
          <p className="text-[10px] text-slate-500">Bookings saved to this member account</p>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Paid booking total</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">{formatCurrency(paidSpend)}</p>
          <p className="text-[10px] text-slate-500">Paid flight bookings; refunds are shown separately</p>
        </Card>
      </div>

      {loadError && (
        <div role="alert" className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm">{loadError}</div>
      )}
      {receiptError && (
        <div role="alert" className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-sm">{receiptError}</div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-sky-400" /> Upcoming sessions</h2>
          <span className="text-xs font-mono text-slate-400">{upcomingBookings.length} scheduled</span>
        </div>
        {loading ? (
          <Card className="p-8 text-center text-sm text-slate-400">Loading reservations…</Card>
        ) : upcomingBookings.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <p className="text-slate-400 text-sm">No future simulator reservations are saved to this member profile.</p>
            <Link href="/book"><Button size="sm">Book a cockpit slot</Button></Link>
          </Card>
        ) : <div className="space-y-3">{upcomingBookings.map((booking) => renderBooking(booking, true))}</div>}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-400" /> Previous sessions & purchases</h2>
          <Badge variant="emerald"><ShieldCheck className="w-3.5 h-3.5" /> VERIFIED ACCOUNT HISTORY</Badge>
        </div>
        <p className="text-xs text-slate-400">Stripe payments include a protected Stripe payment receipt. A tax invoice requires the business’s invoicing system.</p>
        {loading ? (
          <Card className="p-8 text-center text-sm text-slate-400">Loading purchase history…</Card>
        ) : historyBookings.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-400">No previous sessions or purchases are saved to this member profile.</Card>
        ) : <div className="space-y-3">{historyBookings.map((booking) => renderBooking(booking, false))}</div>}
      </section>

      <Card className="p-4 text-xs text-slate-400 flex gap-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>Older guest bookings are added only after you sign in with a confirmed email address that exactly matches the checkout email. If a purchase is missing, contact SimDream with the booking reference.</p>
      </Card>
    </div>
  );
}
