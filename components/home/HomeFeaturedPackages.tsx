'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { buttonClassName } from '@/components/ui/Button';
import { getLocalizedPackages } from '@/lib/i18n/translations';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

export function HomeFeaturedPackages() {
  const { t, language, isRTL } = useLanguage();
  const featuredPackages = getLocalizedPackages(language)
    .filter((pkg) => pkg.category === 'recreational')
    .slice(0, 3);

  return (
    <section className="py-14 sm:py-24 px-4 sm:px-6 lg:px-8 bg-aviation-darkest">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <Badge variant="sky">{t.experiences.badge}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mt-2">
              {t.experiences.title}
            </h2>
            <p className="text-slate-400 text-base max-w-xl mt-2">
              {t.experiences.subtitle}
            </p>
          </div>
          <Link
            href="/experiences"
            className={buttonClassName('secondary')}
            data-ui-control="button"
            data-button-variant="secondary"
          >
            <span>{t.experiences.viewAll}</span>
            <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredPackages.map((pkg) => (
            <Card
              key={pkg.id}
              glow={pkg.featured}
              borderAccent={pkg.featured ? 'sky' : 'none'}
              className="flex flex-col justify-between relative overflow-hidden"
            >
              {pkg.badge && (
                <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                  <Badge variant={pkg.featured ? 'sky' : 'slate'}>{pkg.badge}</Badge>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-sky-400 font-bold">
                    {pkg.durationMinutes} {t.experiences.minutesTime}
                  </span>
                  <h3 className="text-2xl font-bold text-white">{pkg.title}</h3>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed">{pkg.shortDesc}</p>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{formatCurrency(pkg.priceIls)}</span>
                    <span className="text-xs text-slate-400 font-mono">{t.experiences.perFlight}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {t.experiences.approxUsd} ${pkg.priceUsd} USD
                  </span>
                </div>

                <ul className="space-y-2 pt-4 border-t border-slate-800 text-xs text-slate-300">
                  {pkg.features.slice(0, 4).map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href={`/book?package=${pkg.slug}`}
                  className={buttonClassName(pkg.featured ? 'primary' : 'secondary', 'md', 'w-full')}
                  data-ui-control="button"
                  data-button-variant={pkg.featured ? 'primary' : 'secondary'}
                >
                  <span>{t.experiences.bookThisFlight}</span>
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
