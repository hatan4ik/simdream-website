'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, HeartHandshake, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { getLocalizedPackages, type LocalizedRecord } from '@/lib/i18n/translations';
import { useLanguage } from '@/lib/i18n/language-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

const FEAR_OF_FLYING_PACKAGE_ID = 'pkg-fear-of-flying-90';

import { FEAR_COPY } from './fear-copy';

const STEP_ICONS = [MessageCircle, HeartHandshake, ShieldCheck] as const;

export function FearOfFlyingView() {
  const { language, isRTL } = useLanguage();
  const copy = FEAR_COPY[language] || FEAR_COPY.en;
  const pkg = getLocalizedPackages(language).find((candidate) => candidate.id === FEAR_OF_FLYING_PACKAGE_ID);
  const bookHref = `/book?package=${pkg?.slug ?? 'fear-of-flying-course'}`;

  return (
    <div className="flex-1 w-full min-w-0 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16 sm:space-y-20">
      {/* 1. CALM HERO: one message, one action */}
      <section className="text-center max-w-3xl mx-auto space-y-6 sm:space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-500/40 text-xs font-mono text-sky-300 font-bold">
          <HeartHandshake className="w-4 h-4 text-sky-400" />
          <span>{copy.badge}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">{copy.title}</h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed">{copy.subtitle}</p>

        <div className="flex flex-row flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
          <Link href={bookHref}>
            <Button size="lg">{copy.ctaBook}</Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" size="lg">
              {copy.ctaHow}
            </Button>
          </a>
        </div>

        <ul className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 text-left rtl:text-right">
          {copy.reassurance.map((item) => (
            <li
              key={item}
              className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 font-semibold leading-tight"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. THE SESSION, STEP BY STEP */}
      <section id="how-it-works" className="space-y-8 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{copy.stepsTitle}</h2>
          <p className="text-slate-400 text-sm sm:text-base">{copy.stepsSubtitle}</p>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {copy.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? ShieldCheck;
            return (
              <li key={step.title}>
                <Card className="h-full p-5 sm:p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-300 font-mono font-bold flex items-center justify-center text-sm">
                      {index + 1}
                    </span>
                    <Icon className="w-5 h-5 text-sky-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{step.desc}</p>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 3. THE ONE PACKAGE: catalogue-authoritative price, duration and inclusions */}
      {pkg && (
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <Card className="lg:col-span-3 p-6 sm:p-8 space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{pkg.title}</h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{pkg.description}</p>
            </div>
            <h3 className="text-sm font-mono font-bold text-sky-300 uppercase tracking-wide">{copy.includedTitle}</h3>
            <ul className="space-y-2.5">
              {pkg.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="lg:col-span-2 p-6 sm:p-8 space-y-5 border-sky-500/30">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white" dir="ltr">
                {formatCurrency(pkg.priceIls)}
              </span>
              <span className="text-sm text-slate-400">{copy.perSession}</span>
            </div>
            <ul className="space-y-3 text-sm text-slate-200">
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>{copy.minutes(pkg.durationMinutes)}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>{copy.companion}</span>
              </li>
            </ul>
            <Link href={bookHref} className="block">
              <Button size="lg" className="w-full">
                {copy.ctaBook}
              </Button>
            </Link>
          </Card>
        </section>
      )}

      {/* 4. WHO GUIDES YOU + HONEST SCOPE */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 sm:p-8 space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white">{copy.guideTitle}</h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{copy.guideDesc}</p>
        </Card>
        <Card className="p-6 sm:p-8 space-y-3 border-slate-700">
          <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{copy.honesty}</p>
        </Card>
      </section>

      {/* 5. FINAL CTA */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left rtl:md:text-right">
          <h2 className="text-xl sm:text-2xl font-bold text-white">{copy.finalTitle}</h2>
          <p className="text-slate-400 text-sm">{copy.finalDesc}</p>
        </div>
        <Link href={bookHref} className="w-full md:w-auto">
          <Button size="lg" className="w-full md:w-auto">
            {copy.ctaBook}
            <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </Link>
      </section>
    </div>
  );
}
