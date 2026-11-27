import React from 'react';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { ServerIsraelTodayProvider } from '@/components/booking/ServerIsraelToday';
import { israelToday } from '@/lib/scheduler/israel-clock';
import { buildPageMetadata } from '@/lib/seo/seo-config';

export const metadata: Metadata = buildPageMetadata('book');

/**
 * Supplies Israel's date for the first HTML so `/book` paints its calendar before any script loads.
 * `connection()` makes the reading per request: a prerender must never freeze a build-time date here.
 * Live departures are not read here; the browser fetches `/api/slots`, uncached, after hydration.
 */
export default async function BookLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return <ServerIsraelTodayProvider value={israelToday()}>{children}</ServerIsraelTodayProvider>;
}
