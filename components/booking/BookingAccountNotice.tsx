'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';

/**
 * Tells a signed-in member that the booking is saved to their Flight Deck, or a guest how to sign in
 * to save it. Rendered bare (a fragment) inside the storefront's buy box, or `framed` as a bar above
 * the wizard's step bar.
 */
export function BookingAccountNotice({ framed = false }: { framed?: boolean }) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const notice = user ? (
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

  if (!framed) return notice;
  return (
    <div className="max-w-4xl mx-auto rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      {notice}
    </div>
  );
}
