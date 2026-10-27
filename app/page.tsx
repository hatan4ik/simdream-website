'use client';

import React from 'react';
import Link from 'next/link';
import {
  Plane,
  Gauge,
  Compass,
  Radio,
  ShieldCheck,
  ChevronRight,
  Star,
  Users,
  ArrowRight,
  UserCheck,
  Globe,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getLocalizedPackages } from '@/lib/i18n/translations';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { GoogleReviewsRotator } from '@/components/reviews/GoogleReviewsRotator';

export default function HomePage() {
  const { t, language, isRTL } = useLanguage();
  const featuredPackages = getLocalizedPackages(language)
    .filter((pkg) => pkg.category === 'recreational')
    .slice(0, 3);

  return (
    <div className="flex-1 flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 py-24 hud-grid">
        {/* Glowing atmospheric cockpit backdrops */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/20 via-slate-950/80 to-aviation-darkest pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          {/* Telemetry pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-sky-500/30 text-xs font-mono text-sky-400 shadow-glow backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>{t.hero.badge}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            {t.hero.titlePart1}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-sky-400">
              {t.hero.titleHighlight}
            </span>{' '}
            {t.hero.titlePart2}
          </h1>

          {/* Subtitle */}
          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
            {t.hero.subtitle}
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/book" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto font-bold text-base px-8 py-4 shadow-glow">
                <Plane className="w-5 h-5 -rotate-45" />
                <span>{t.hero.bookFlight}</span>
              </Button>
            </Link>
            <Link href="/about" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto font-semibold text-base px-8 py-4">
                <span>{t.hero.cockpitSpecs}</span>
                <ChevronRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </Link>
          </div>

          {/* Avionics Metrics HUD */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md text-left rtl:text-right">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono uppercase">{t.hero.hudScale}</span>
                <Gauge className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">{t.hero.scaleTitle}</p>
              <p className="text-[11px] text-slate-400">{t.hero.scaleDesc}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md text-left rtl:text-right">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono uppercase">{t.hero.hudVisual}</span>
                <Compass className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">{t.hero.visualTitle}</p>
              <p className="text-[11px] text-slate-400">{t.hero.visualDesc}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md text-left rtl:text-right">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono uppercase">{t.hero.hudAirports}</span>
                <Radio className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400 font-mono">{t.hero.airportsTitle}</p>
              <p className="text-[11px] text-slate-400">{t.hero.airportsDesc}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md text-left rtl:text-right">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono uppercase">{t.hero.hudInstructors}</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400 font-mono">{t.hero.instructorsTitle}</p>
              <p className="text-[11px] text-slate-400">{t.hero.instructorsDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WHY CHOOSE SIM DREAM: THE CAPTAIN'S EXPERIENCE */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 border-t border-b border-slate-900">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="sky">{t.whyUs.badge}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {t.whyUs.title}
            </h2>
            <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
              {t.whyUs.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1: Full Command */}
            <Card glow borderAccent="sky" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Gauge className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                    {t.whyUs.pillar1Badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{t.whyUs.pillar1Title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  {t.whyUs.pillar1Desc}
                </p>
              </div>
              <ul className="text-xs font-mono text-slate-300 space-y-1.5 pt-3 border-t border-slate-800">
                {t.whyUs.pillar1Points.map((point, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Pillar 2: Mentorship */}
            <Card glow borderAccent="emerald" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    {t.whyUs.pillar2Badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{t.whyUs.pillar2Title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  {t.whyUs.pillar2Desc}
                </p>
              </div>
              <ul className="text-xs font-mono text-slate-300 space-y-1.5 pt-3 border-t border-slate-800">
                {t.whyUs.pillar2Points.map((point, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Pillar 3: Freedom */}
            <Card glow borderAccent="amber" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Globe className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                    {t.whyUs.pillar3Badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{t.whyUs.pillar3Title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  {t.whyUs.pillar3Desc}
                </p>
              </div>
              <ul className="text-xs font-mono text-slate-300 space-y-1.5 pt-3 border-t border-slate-800">
                {t.whyUs.pillar3Points.map((point, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Pillar 4: Transformative Impact */}
            <Card glow borderAccent="purple" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
                    {t.whyUs.pillar4Badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{t.whyUs.pillar4Title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  {t.whyUs.pillar4Desc}
                </p>
              </div>
              <ul className="text-xs font-mono text-slate-300 space-y-1.5 pt-3 border-t border-slate-800">
                {t.whyUs.pillar4Points.map((point, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Link to Professional Training & Cockpit Specifications */}
          <div className="text-center pt-2">
            <Link href="/pro">
              <Button variant="outline" size="sm" className="font-mono text-xs">
                <span>{t.whyUs.proTrainingSpecs}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </Link>
          </div>

          {/* Social Proof: 5.0★ Google Reviews directly in Why Fly With Sim Dream */}
          <div className="pt-6 border-t border-slate-900">
            <GoogleReviewsRotator
              badge={t.reviews.badge}
              title={t.reviews.title}
              subtitle={t.reviews.subtitle}
              items={t.reviews.items}
            />
          </div>
        </div>
      </section>

      {/* 3. POPULAR FLIGHT EXPERIENCES */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-aviation-darkest">
        <div className="max-w-7xl mx-auto space-y-16">
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
            <Link href="/experiences">
              <Button variant="secondary">
                <span>{t.experiences.viewAll}</span>
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
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
                        <CheckCircleIcon className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <Link href={`/book?package=${pkg.slug}`}>
                    <Button
                      variant={pkg.featured ? 'primary' : 'secondary'}
                      className="w-full font-bold"
                    >
                      <span>{t.experiences.bookThisFlight}</span>
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CORPORATE CRM WORKSHOP SPOTLIGHT */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-t border-b border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="amber">{t.workshops.badge}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              {t.workshops.title}
            </h2>
            <p className="text-slate-300 text-base leading-relaxed">
              {t.workshops.subtitle}
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t.workshops.description}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/70">
                <p className="font-bold text-white text-sm">{t.workshops.pillar1Title}</p>
                <p className="text-xs text-slate-400 mt-1">{t.workshops.pillar1Desc}</p>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/70">
                <p className="font-bold text-white text-sm">{t.workshops.pillar2Title}</p>
                <p className="text-xs text-slate-400 mt-1">{t.workshops.pillar2Desc}</p>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/workshops">
                <Button size="lg" className="font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-glowAmber">
                  <span>{t.workshops.exploreBtn}</span>
                  <ArrowRight className={`w-4 h-4 text-slate-950 ${isRTL ? 'rotate-180' : ''}`} />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-white text-sm">{t.workshops.caseStudyBadge}</span>
              </div>
              <span className="text-xs font-mono text-emerald-400">TEL AVIV B737 MAX</span>
            </div>

            <blockquote className="italic text-slate-300 text-sm leading-relaxed">
              &ldquo;{t.workshops.caseStudyQuote}&rdquo;
            </blockquote>

            <div className="flex items-center gap-3 pt-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400">
                YS
              </div>
              <div>
                <p className="text-sm font-bold text-white">Yoni Shaked</p>
                <p className="text-xs text-slate-400">{t.workshops.caseStudyAuthor}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION RIBBON */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-sky-950/40 border-t border-sky-900/60 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="sky">{t.cta.badge}</Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            {t.cta.title}
          </h2>
          <p className="text-slate-300 text-base max-w-2xl mx-auto">
            {t.cta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/book">
              <Button size="lg" className="w-full sm:w-auto font-bold text-base px-8 py-4">
                <Plane className="w-5 h-5 -rotate-45" />
                <span>{t.cta.bookFlight}</span>
              </Button>
            </Link>
            <Link href="/vouchers">
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-semibold text-base px-8 py-4">
                <span>{t.cta.buyVoucher}</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
