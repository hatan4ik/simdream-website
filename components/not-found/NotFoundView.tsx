'use client';

import React from 'react';
import Link from 'next/link';
import { buttonClassName } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/language-context';
import { localizeInternalHref } from '@/lib/i18n/locale-routing';
import { notFoundCopyFor } from './not-found-copy';

/**
 * The page a visitor sees for a URL that matches no route. It renders inside the root layout, so
 * the header, language selector and footer stay around it; this view adds the explanation and the
 * three ways back. The links keep the visitor's language prefix (`/ru/book`), built from the page
 * language and not from the URL path: what `usePathname()` reports for a rewritten `/ru/...` URL
 * depends on the runtime (the Wix host keeps the prefix, `next start`, which the browser suites run,
 * drops it), and a Russian visitor must not be sent to the Hebrew root in either.
 * `data-not-found` is the stable hook for the browser suites, which must not match on translated text.
 */
export function NotFoundView() {
  const { language, t } = useLanguage();
  const localHref = (href: string) => localizeInternalHref(href, language);
  const copy = notFoundCopyFor(language);

  return (
    <section
      data-not-found
      className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center sm:px-6 lg:px-8"
    >
      {/* Decorative code: the h1 below carries the meaning. Telemetry-style text stays left-to-right. */}
      <p dir="ltr" aria-hidden="true" className="text-7xl font-black tracking-tight text-sky-400 sm:text-8xl">
        404
      </p>
      <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{copy.title}</h1>
      <p className="max-w-xl text-lg leading-relaxed text-slate-300">{copy.intro}</p>
      <div className="mt-2 flex flex-row flex-wrap items-center justify-center gap-3">
        <Link href={localHref('/book')} data-ui-control="button" data-button-variant="primary" className={buttonClassName('primary', 'lg')}>
          {t.nav.bookFlight}
        </Link>
        <Link href={localHref('/')} data-ui-control="button" data-button-variant="outline" className={buttonClassName('outline', 'lg')}>
          {copy.home}
        </Link>
        <Link href={localHref('/contact')} data-ui-control="button" data-button-variant="ghost" className={buttonClassName('ghost', 'lg')}>
          {t.nav.contact}
        </Link>
      </div>
    </section>
  );
}
