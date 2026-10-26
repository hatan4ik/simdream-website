'use client';

import { useSyncExternalStore } from 'react';

const noSubscription = () => () => {};

/**
 * A value read in the browser (typically from the clock), or null while the page hydrates.
 * Pages are prerendered at build time, so reading the clock during render froze the build
 * day into the HTML and broke hydration on every later day (React error #418). React
 * hydrates with the server snapshot (null), then re-renders with the browser value; a
 * client-side navigation reads the browser value straight away.
 *
 * `read` must return a primitive so that repeated reads compare equal.
 */
export function useClientValue<T extends string | number | boolean>(read: () => T): T | null {
  return useSyncExternalStore<T | null>(noSubscription, read, () => null);
}
