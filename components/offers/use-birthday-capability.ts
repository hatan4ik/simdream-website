'use client';

import { useEffect, useState } from 'react';

/**
 * Whether the live checkout path can apply the birthday discount (`GET /api/offers/capabilities`).
 * `null` while unknown: the page then shows nothing extra, and only a definite `false` adds the notice.
 */
export function useBirthdayCapability(): boolean | null {
  const [enforceable, setEnforceable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/offers/capabilities')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { birthdayDiscountEnforceable?: unknown } | null) => {
        if (!cancelled && typeof data?.birthdayDiscountEnforceable === 'boolean') {
          setEnforceable(data.birthdayDiscountEnforceable);
        }
      })
      .catch(() => {
        // Unknown stays unknown: the page keeps its default copy.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return enforceable;
}
