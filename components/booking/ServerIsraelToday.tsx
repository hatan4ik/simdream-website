'use client';

import { createContext, useContext, type ReactNode } from 'react';

const ServerIsraelTodayContext = createContext<string | null>(null);

/**
 * Hands Israel's business date, as the server read it for this request, to the booking page, so the
 * first HTML already carries the calendar instead of a placeholder. It only seeds the first paint:
 * after hydration the browser's own clock decides (`useBookingSchedule`).
 */
export function ServerIsraelTodayProvider({ value, children }: { value: string; children: ReactNode }) {
  return <ServerIsraelTodayContext.Provider value={value}>{children}</ServerIsraelTodayContext.Provider>;
}

/** The server's Israel date for this request, or null outside the booking layout. */
export function useServerIsraelToday(): string | null {
  return useContext(ServerIsraelTodayContext);
}
