'use client';

import React from 'react';
import Link from 'next/link';
import { Plane } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonClassName } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/language-context';

export function HomeCtaRibbon() {
  const { t } = useLanguage();

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 bg-sky-950/40 border-t border-sky-900/60 relative overflow-hidden">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <Badge variant="sky">{t.cta.badge}</Badge>
        <h2 className="text-3xl sm:text-5xl font-black text-white">
          {t.cta.title}
        </h2>
        <p className="text-slate-300 text-base max-w-2xl mx-auto">
          {t.cta.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
          <Link
            href="/book"
            className={buttonClassName('primary', 'lg', 'w-full sm:w-auto')}
            data-ui-control="button"
            data-button-variant="primary"
          >
            <Plane className="w-5 h-5 -rotate-45" />
            <span>{t.cta.bookFlight}</span>
          </Link>
          <Link
            href="/vouchers"
            className={buttonClassName('outline', 'lg', 'w-full sm:w-auto')}
            data-ui-control="button"
            data-button-variant="outline"
          >
            <span>{t.cta.buyVoucher}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
