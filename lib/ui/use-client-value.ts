'use client';

import { useSyncExternalStore } from 'react';

const noSubscription = () => () => {};

/**
 * A value read in the browser (typically from the clock), or `serverValue` (null by default)
 * while the page hydrates. Reading the clock during render would freeze the server's reading
 * into the HTML and break hydration whenever the browser disagrees (React error #418). React
 * hydrates with the server snapshot, then re-renders with the browser value if it differs; a
 * client-side navigation reads the browser value straight away.
 *
 * Pass `serverValue` only when the server read it for this request (a server component after
 * `connection()`), never a value that a prerender could freeze at build time.
 *
 * `read` must return a primitive so that repeated reads compare equal.
 */
export function useClientValue<T extends string | number | boolean>(read: () => T, serverValue: T | null = null): T | null {
  return useSyncExternalStore<T | null>(noSubscription, read, () => serverValue);
}
