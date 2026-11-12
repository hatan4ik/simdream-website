'use client';

import { useEffect } from 'react';

/**
 * Scrolls to the URL hash once the clause text is on screen. The long text is loaded per language,
 * so on a deep link such as `/rules#refunds` the target may not exist when the browser first tries
 * to jump to it. Renders nothing.
 */
export function LegalHashScroll() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    let id = hash;
    try {
      id = decodeURIComponent(hash);
    } catch {
      // keep the raw hash
    }
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, []);
  return null;
}
