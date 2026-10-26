'use client';

import { useLanguage } from '@/lib/i18n/language-context';

/** First focusable element on every page: jumps keyboard users past the header (WCAG 2.4.1). */
export function SkipLink() {
  const { t } = useLanguage();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 rtl:focus:left-auto rtl:focus:right-3 focus:z-[100] focus:rounded-lg focus:bg-sky-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
    >
      {t.nav.skipToContent}
    </a>
  );
}
