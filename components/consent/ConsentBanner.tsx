'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  acceptAll,
  acknowledge,
  consentMode,
  openConsentSettings,
  rejectNonEssential,
  type ConsentCategory,
} from '@/lib/consent';
import { useLanguage } from '@/lib/i18n/language-context';
import { CONSENT_COPY } from './consent-copy';
import { CONSENT_LINK_LABEL } from './link-label';

/**
 * First-visit banner: a non-blocking region fixed to the bottom of the viewport (no layout shift),
 * above the sticky booking bars (z-30) and below modal dialogs (z-50) and the header (z-60).
 * While it is open it publishes its height as `--consent-banner-offset`, which the `bottom-safe-area-*`
 * utility reads, so the sticky booking bars rise above it instead of hiding behind it.
 *
 * Informational notice while no optional category is in use (one "Got it", no toggles);
 * a real choice with equal "Accept all" and "Reject non-essential" once one is.
 */
export function ConsentBanner({ inUse }: { /** Test seam; defaults to the categories the site uses. */ inUse?: readonly ConsentCategory[] }) {
  const { language } = useLanguage();
  const copy = CONSENT_COPY[language] || CONSENT_COPY.en;
  const settingsLabel = CONSENT_LINK_LABEL[language] || CONSENT_LINK_LABEL.en;
  const mode = consentMode(inUse);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const root = document.documentElement;
    const publish = () => root.style.setProperty('--consent-banner-offset', `${Math.ceil(element.getBoundingClientRect().height)}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--consent-banner-offset');
    };
  }, []);

  const textLink = 'text-sky-400 underline underline-offset-2 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-sm';

  return (
    <section
      ref={ref}
      data-consent-banner
      data-consent-mode={mode}
      aria-label={copy.bannerLabel}
      className="fixed inset-x-0 bottom-0 z-[45] px-safe-area-3 pb-safe-area-2 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-slate-700 bg-slate-900 p-3.5 text-start shadow-2xl sm:p-5">
        {mode === 'choice' && <p className="mb-1 text-sm font-semibold text-white">{copy.choiceTitle}</p>}
        <p className="text-[13px] leading-snug text-slate-300 sm:text-sm sm:leading-relaxed">
          {mode === 'choice' ? copy.choiceBody : copy.noticeBody}
        </p>
        {/* Notice: one row that wraps. Choice: a 2 x 2 grid on phones so "Accept all" and "Reject
            non-essential" are always the same size, a single row from `sm` up. */}
        <div
          className={
            mode === 'notice'
              ? 'mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1'
              : 'mt-2.5 grid grid-cols-2 items-stretch gap-2 sm:flex sm:flex-wrap sm:items-center'
          }
        >
          {mode === 'notice' ? (
            <>
              <Button type="button" size="md" onClick={() => acknowledge()}>
                {copy.gotIt}
              </Button>
              <button type="button" onClick={openConsentSettings} className={`${textLink} min-h-11 px-2 text-sm`}>
                {settingsLabel}
              </button>
            </>
          ) : (
            <>
              <Button type="button" size="md" onClick={() => acceptAll()}>
                {copy.acceptAll}
              </Button>
              <Button type="button" size="md" onClick={() => rejectNonEssential()}>
                {copy.rejectNonEssential}
              </Button>
              <Button type="button" size="md" variant="outline" onClick={openConsentSettings}>
                {copy.customize}
              </Button>
            </>
          )}
          <Link href="/privacy-policy" className={`${textLink} inline-flex min-h-11 items-center px-2 text-sm`}>
            {copy.privacyPolicy}
          </Link>
        </div>
      </div>
    </section>
  );
}
