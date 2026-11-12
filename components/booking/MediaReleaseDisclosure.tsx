'use client';

import { useEffect, useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown } from 'lucide-react';
import { LegalClauseList } from '@/components/legal/shared/LegalClauseList';
import { MEDIA_RELEASE_PATH, loadMediaReleaseSectionHe, type ConsentCopy, type LegalLanguage, type LegalSectionBody } from '@/lib/legal';

// The server renders Hebrew only, so the clause text in the other five languages is loaded by a
// client-only component and stays out of the Wix worker (docs/modules/wix-bundle-diet.md).
const MediaReleaseLoaderIntl = dynamic(() => import('./MediaReleaseLoaderIntl'), { ssr: false });

interface MediaReleaseDisclosureProps {
  copy: ConsentCopy['media'];
  language: LegalLanguage;
  newTabHint: string;
}

type LoadState = { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; section: LegalSectionBody; language: LegalLanguage };

/**
 * "Read the full text": the complete media release and waiver of claims (rules clause 14) in a calm,
 * scrollable panel under the checkbox. The text is loaded only when the visitor opens it, in the page
 * language, so it is not part of everyone's download. A failed load says so and links to the rules page.
 */
export function MediaReleaseDisclosure({ copy, language, newTabHint }: MediaReleaseDisclosureProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const isHebrew = language === 'he';
  const loaded = state.status === 'ready' && state.language === language;

  useEffect(() => {
    if (!isHebrew || !open || loaded) return;
    let cancelled = false;
    setState({ status: 'loading' });
    loadMediaReleaseSectionHe()
      .then((section) => {
        if (!cancelled) setState({ status: 'ready', section, language });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
    // `state` is intentionally left out: a finished load must not restart itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, language]);

  return (
    <div className="ps-9 space-y-2" data-consent-media-disclosure>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-xs font-semibold text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <span>{open ? copy.collapse : copy.expand}</span>
        <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && !isHebrew && !loaded && <MediaReleaseLoaderIntl language={language} onState={setState} />}
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={copy.fullTextTitle}
          tabIndex={0}
          data-consent-media-fulltext
          className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/70 p-3.5 text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-white">{copy.fullTextTitle}</p>
          {state.status === 'loading' && (
            <p role="status" className="text-xs text-slate-400">
              {copy.loading}
            </p>
          )}
          {state.status === 'error' && (
            <p role="alert" className="text-xs text-red-300">
              {copy.loadError}
            </p>
          )}
          {state.status === 'ready' && (
            <>
              {state.section.intro && <p className="text-xs leading-relaxed sm:text-sm">{state.section.intro}</p>}
              <LegalClauseList clauses={state.section.clauses} />
            </>
          )}
          <a
            href={MEDIA_RELEASE_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-xs font-semibold text-sky-400 underline underline-offset-2 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-sm"
          >
            {copy.openOnPage}
            <span className="sr-only"> ({newTabHint})</span>
          </a>
        </div>
      )}
    </div>
  );
}
