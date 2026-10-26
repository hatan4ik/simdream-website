'use client';

import { useEffect, useState } from 'react';
import { getLiveFacilityStatus, type LiveFacilityStatus } from './facility-info';

/**
 * Live open/closed status, computed only in the browser. Pages are prerendered at build
 * time, so computing it during render froze the build-time clock into the HTML and broke
 * hydration (React error #418). Returns null until mounted, then refreshes every minute.
 */
export function useLiveFacilityStatus(refreshMs = 60_000): LiveFacilityStatus | null {
  const [status, setStatus] = useState<LiveFacilityStatus | null>(null);

  useEffect(() => {
    setStatus(getLiveFacilityStatus());
    const timer = setInterval(() => setStatus(getLiveFacilityStatus()), refreshMs);
    return () => clearInterval(timer);
  }, [refreshMs]);

  return status;
}
