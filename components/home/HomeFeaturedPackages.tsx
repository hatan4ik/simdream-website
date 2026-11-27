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
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-aviation-darkest">
      <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {featuredPackages.map((pkg) => {
            const isFlagship = Boolean(pkg.featured);
            return (
              <Card
                key={pkg.id}
                glow={isFlagship}
                borderAccent={isFlagship ? 'orange' : 'none'}
                className={`flex flex-col justify-between relative overflow-hidden transition-all duration-200 ${
                  isFlagship
                    ? 'border-orange-500/80 ring-2 ring-orange-500/30 bg-slate-900/90 shadow-2xl scale-[1.02] md:scale-105 z-10'
                    : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700/80'
                }`}
              >
                {pkg.badge && (
                  <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-10">
                    <Badge variant={isFlagship ? 'orange' : 'slate'}>{pkg.badge}</Badge>
                  </div>
                )}

                <div className="space-y-5 p-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                        isFlagship ? 'text-orange-400' : 'text-sky-400'
                      }`}>
                        {pkg.durationMinutes} {t.experiences.minutesTime}
                      </span>
                      {isFlagship && (
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 rounded">
                          FLAGSHIP
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{pkg.title}</h3>
                  </div>

                  <p className="text-slate-400 text-sm leading-relaxed">{pkg.shortDesc}</p>

                  {/* Scannable Pricing & Duration Hero Focal Point */}
                  <div className="py-3 px-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl sm:text-4xl font-black font-mono tabular-nums tracking-tight ${
                          isFlagship ? 'text-white' : 'text-slate-100'
                        }`}>
                          {formatCurrency(pkg.priceIls)}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{t.experiences.perFlight}</span>
                      </div>
                      <div className="text-end">
                        <span className={`text-xs sm:text-sm font-mono font-black tabular-nums px-2 py-0.5 rounded border ${
                          isFlagship
                            ? 'text-orange-400 bg-orange-500/10 border-orange-500/30'
                            : 'text-sky-400 bg-sky-500/10 border-sky-500/30'
                        }`}>
                          {pkg.durationMinutes} MIN
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {t.experiences.approxUsd} ${pkg.priceUsd} USD
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
                    {pkg.features.slice(0, 4).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isFlagship ? 'text-orange-400' : 'text-sky-400'
                        }`} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 p-2">
                  <Link
                    href={`/book?package=${pkg.slug}`}
                    className={buttonClassName(isFlagship ? 'primary' : 'outline', 'md', 'w-full')}
                    data-ui-control="button"
                    data-button-variant={isFlagship ? 'primary' : 'outline'}
                  >
                    <span>{t.experiences.bookThisFlight}</span>
                    <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
