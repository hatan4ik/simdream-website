'use client';

import { useLanguage } from '@/lib/i18n/language-context';

/**
 * Reserves a viewport of height while the page hydrates or the storefront loads, so the content
 * replacing it does not shove the footer up the screen (cumulative layout shift).
 */
export function BookingLoadingFallback() {
  const { t } = useLanguage();
  return <div className="min-h-screen py-24 text-center text-slate-400 font-mono text-sm">{t.booking.initializing}</div>;
}
