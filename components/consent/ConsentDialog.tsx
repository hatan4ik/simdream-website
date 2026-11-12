'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  acceptAll,
  closeConsentSettings,
  consentMode,
  getConsent,
  optionalCategoriesInUse,
  rejectNonEssential,
  savePreferences,
  OPTIONAL_CONSENT_CATEGORIES,
  type ConsentCategory,
  type OptionalConsentCategory,
} from '@/lib/consent';
import { useLanguage } from '@/lib/i18n/language-context';
import { ConsentCategoryRow } from './ConsentCategoryRow';
import { CONSENT_COPY } from './consent-copy';
import { useDialogFocus } from './use-dialog-focus';

/**
 * Preferences dialog: per-category rows with a plain description of what is stored and why.
 * A toggle exists only for a category the site actually uses; every other optional category is
 * listed as "not used on this site" (transparency without a switch that gates nothing).
 */
export function ConsentDialog({ inUse: inUseOverride }: { /** Test seam; defaults to the categories the site uses. */ inUse?: readonly ConsentCategory[] }) {
  const { language } = useLanguage();
  const copy = CONSENT_COPY[language] || CONSENT_COPY.en;
  const mode = consentMode(inUseOverride);
  const inUse = optionalCategoriesInUse(inUseOverride);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef, closeConsentSettings);

  // Start from the stored decision so reopening shows what the visitor chose; first time: all off.
  // Only categories the site uses can be on (the store drops the rest), so the toggles never lie.
  const [draft, setDraft] = useState<Record<OptionalConsentCategory, boolean>>(() => {
    const record = getConsent();
    return {
      preferences: inUse.includes('preferences') && (record?.categories.preferences ?? false),
      analytics: inUse.includes('analytics') && (record?.categories.analytics ?? false),
      marketing: inUse.includes('marketing') && (record?.categories.marketing ?? false),
    };
  });

  const finish = (action: () => void) => {
    action();
    closeConsentSettings();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-dialog-title"
      data-consent-dialog
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/80 p-3 px-safe-area-3 pb-safe-area-3 backdrop-blur-sm sm:items-center"
      onClick={closeConsentSettings}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90svh] w-full max-w-lg space-y-4 overflow-y-auto overscroll-contain rounded-2xl border border-slate-700 bg-slate-900 p-5 text-start shadow-2xl focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h2 id="consent-dialog-title" className="text-lg font-semibold text-white">
              {copy.dialogTitle}
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">{mode === 'choice' ? copy.dialogIntroChoice : copy.dialogIntroNotice}</p>
          </div>
          <button
            type="button"
            onClick={closeConsentSettings}
            aria-label={copy.close}
            className="-m-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <ul className="space-y-2.5">
          <ConsentCategoryRow
            title={copy.categories.necessary.title}
            description={copy.categories.necessary.description}
            kind="locked"
            copy={copy}
          >
            <div className="mt-3 border-t border-slate-800 pt-3">
              <h4 className="text-xs font-semibold text-slate-200">{copy.storedHeading}</h4>
              <ul className="mt-2 space-y-2.5">
                {copy.storedItems.map((item) => (
                  <li key={item.title} className="text-xs leading-relaxed text-slate-300">
                    <span className="font-semibold text-white">{item.title}.</span> {item.description}
                  </li>
                ))}
              </ul>
            </div>
          </ConsentCategoryRow>
          {OPTIONAL_CONSENT_CATEGORIES.map((category) => (
            <ConsentCategoryRow
              key={category}
              title={copy.categories[category].title}
              description={copy.categories[category].description}
              kind={inUse.includes(category) ? 'toggle' : 'unused'}
              checked={draft[category]}
              onChange={(checked) => setDraft((current) => ({ ...current, [category]: checked }))}
              copy={copy}
            />
          ))}
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {mode === 'choice' ? (
            <>
              <Button type="button" onClick={() => finish(() => savePreferences(draft))} className="w-full sm:w-auto">
                {copy.save}
              </Button>
              <Button type="button" onClick={() => finish(() => acceptAll())} className="w-full sm:w-auto">
                {copy.acceptAll}
              </Button>
              <Button type="button" onClick={() => finish(() => rejectNonEssential())} className="w-full sm:w-auto">
                {copy.rejectNonEssential}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={closeConsentSettings} className="w-full sm:w-auto">
              {copy.close}
            </Button>
          )}
          <Link
            href="/privacy-policy"
            onClick={closeConsentSettings}
            className="inline-flex min-h-11 items-center rounded-sm px-2 text-sm text-sky-400 underline underline-offset-2 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {copy.privacyPolicy}
          </Link>
        </div>
      </div>
    </div>
  );
}
