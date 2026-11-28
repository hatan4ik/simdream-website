'use client';

import React from 'react';
import Link from 'next/link';
import { buttonClassName } from '@/components/ui/Button';
import { CockpitMediaFrame } from '@/components/ui/CockpitMediaFrame';
import { HOME_HERO_MEDIA, pickLocalizedMediaText } from '@/lib/media/cockpit-media';
import { useLanguage } from '@/lib/i18n/language-context';

export function HomeHero() {
  const { t, language } = useLanguage();

  return (
    <section className="relative flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-[calc(var(--consent-banner-offset,0px)+3rem)] sm:pb-20 hud-grid">
      {/* Glowing atmospheric cockpit backdrops */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-950/20 via-slate-950/80 to-aviation-darkest pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
        {/* Telemetry pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-sky-500/30 text-[11px] sm:text-xs font-mono text-sky-400 shadow-glow backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
          <span>{t.hero.badge}</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.12]">
          {t.hero.titlePart1}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-sky-400">
            {t.hero.titleHighlight}
          </span>{' '}
          {t.hero.titlePart2}
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 font-normal leading-relaxed">
          {t.hero.subtitle}
        </p>

        {/* Hero CTAs: single semantic links with buttonClassName (no nested Button in Link) */}
        <div className="flex flex-row flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
          <Link
            href="/book"
            className={buttonClassName('primary', 'lg')}
            data-ui-control="button"
            data-button-variant="primary"
          >
            {t.hero.bookFlight}
          </Link>
          <Link
            href="/about"
            className={buttonClassName('outline', 'lg')}
            data-ui-control="button"
            data-button-variant="outline"
          >
            {t.hero.cockpitSpecs}
          </Link>
          <Link
            href="/vouchers"
            className={buttonClassName('outline', 'lg')}
            data-ui-control="button"
            data-button-variant="outline"
          >
            {t.cta.buyVoucher}
          </Link>
        </div>

        {/* Authentic Tel Aviv 737 MAX visual anchor (poster-first static WebP, zero entrance delay) */}
        <div className="pt-4 sm:pt-6 max-w-4xl mx-auto text-start">
          <CockpitMediaFrame
            media={HOME_HERO_MEDIA}
            alt={pickLocalizedMediaText(HOME_HERO_MEDIA.alt, language)}
            caption={HOME_HERO_MEDIA.caption ? pickLocalizedMediaText(HOME_HERO_MEDIA.caption, language) : undefined}
            priority
          />
        </div>
      </div>
    </section>
  );
}
