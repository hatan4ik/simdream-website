'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock,
  Award,
  ArrowRight,
  Compass,
  ShieldCheck,
  Gauge,
  Users,
  Radio,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Loader2,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { type Language, type LocalizedRecord } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { getSubscriptionPassFinancials, PRO_SUBSCRIPTION_PASSES } from '@/lib/data/subscription-passes';
import { useSubscriptionCheckout } from '@/components/subscriptions/useSubscriptionCheckout';

const SIMDREAM_SERVICE_URLS: Record<string, string> = {
  'airline-prep-60-pro':
    'https://www.simdream.co.il/service-page/airline-interview-prep-60-pro?referral=service_list_widget',
  'airline-prep-90-pro':
    'https://www.simdream.co.il/service-page/airline-interview-prep-90-pro?referral=service_list_widget',
  'airline-assessment-prep':
    'https://www.simdream.co.il/service-page/airline-interview-prep-120-pro?referral=service_list_widget',
  'pkg-pro-60':
    'https://www.simdream.co.il/service-page/airline-interview-prep-60-pro?referral=service_list_widget',
  'pkg-pro-90':
    'https://www.simdream.co.il/service-page/airline-interview-prep-90-pro?referral=service_list_widget',
  'pkg-assessment-prep-120':
    'https://www.simdream.co.il/service-page/airline-interview-prep-120-pro?referral=service_list_widget',
};

import { PRO_COPY } from './pro-copy';

export function ProSessionsView() {
  const { language, isRTL } = useLanguage();
  const copy = PRO_COPY[language] || PRO_COPY.en;
  const { pendingPassId, buySubscription } = useSubscriptionCheckout();

  const pillarIcons = [Gauge, ShieldCheck, Compass, Users];

  /** PRO prices come from the package registry, never from the copy (AGENTS.md §6.3, §8). */
  const priceForSlug = (slug: string): string => {
    const pkg = SIMULATOR_PACKAGES.find((entry) => entry.slug === slug);
    if (!pkg) throw new Error(`Unknown PRO package slug ${slug}`);
    return formatCurrency(pkg.priceIls);
  };
  const proTracks = PRO_SUBSCRIPTION_PASSES.map((pass) => ({
    ...pass,
    copy: pass.copy[language] || pass.copy.en,
    financials: getSubscriptionPassFinancials(pass),
  }));

  return (
    <div className="flex-1 w-full min-w-0 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 sm:space-y-20">
      {/* 1. PROFESSIONAL TRAINING HERO WITH PROMINENT BOOK CTA */}
      <section className="text-center max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-xs font-mono text-amber-300 font-bold">
          <Award className="w-4 h-4 text-amber-400" />
          <span>{copy.heroBadge}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          {copy.heroTitle}
        </h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          {copy.heroSubtitle}
        </p>

        {/* Primary Booking & Information Actions */}
        <div className="flex flex-row flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
          <Link href="/book?package=airline-prep-90-pro">
            <Button size="lg">{copy.heroCtaPrimary}</Button>
          </Link>
          <a href="#why-prep">
            <Button variant="outline" size="lg">{copy.heroCtaSecondary}</Button>
          </a>
        </div>

        {/* Trust & Avionics Highlights Bar */}
        <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 max-w-4xl mx-auto text-left rtl:text-right">
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5">
            <Compass className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono text-slate-200 font-semibold leading-tight">
              {copy.trustFMC}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono text-slate-200 font-semibold leading-tight">
              {copy.trustMentors}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono text-slate-200 font-semibold leading-tight">
              {copy.trustIOS}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono text-slate-200 font-semibold leading-tight">
              {copy.trustZeroNoise}
            </span>
          </div>
        </div>
      </section>

      {/* 2. WHY THEY NEED IT: HIGH-STAKES CHECKRIDE REALITY & EVALUATION DOMAINS */}
      <section id="why-prep" className="space-y-10 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="amber">{copy.whyBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {copy.whyHeading}
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {copy.whySubtitle}
          </p>
        </div>

        {/* Screening Reality Callout Box */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-950 p-6 sm:p-7 flex flex-col sm:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">
              {copy.whyCalloutTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {copy.whyCalloutDesc}
            </p>
          </div>
        </div>

        {/* The 4 Checkride Preparation Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {copy.whyPillars.map((pillar, idx) => {
            const IconComp = pillarIcons[idx] || Gauge;
            return (
              <Card
                key={idx}
                glow
                borderAccent="amber"
                className="p-6 sm:p-7 space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Direct Booking Call-To-Action Banner */}
        <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {copy.bookDirectTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              {copy.bookDirectSubtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/book?package=airline-prep-90-pro" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300"
              >
                <span>{copy.bookDirectCta(priceForSlug('airline-prep-90-pro'))}</span>
                <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link href="/book?package=airline-prep-60-pro">
              <Button variant="secondary" size="sm" className="font-mono text-xs">
                <span>{copy.bookDirect60(priceForSlug('airline-prep-60-pro'))}</span>
              </Button>
            </Link>
            <Link href="/book?package=airline-assessment-prep">
              <Button variant="secondary" size="sm" className="font-mono text-xs">
                <span>{copy.bookDirect120(priceForSlug('airline-assessment-prep'))}</span>
              </Button>
            </Link>
          </div>

          <div className="pt-2">
            <Link
              href="/experiences"
              className="text-xs font-mono text-sky-400 hover:underline"
            >
              {copy.recreationalLink}
            </Link>
          </div>
        </div>
      </section>

      {/* 3. SESSION DEPTH BREAKDOWN & DIRECT BOOKING OPTIONS */}
      <section className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 sm:p-8 space-y-8">
        <div className="max-w-4xl space-y-3">
          <Badge variant="amber">{copy.interviewGuideBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {copy.interviewGuideTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {copy.interviewGuideDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {copy.interviewPackages.map((pkg) => {
            const isRecommended = pkg.slug === 'airline-prep-90-pro';
            const price = priceForSlug(pkg.slug);
            return (
              <div
                key={pkg.slug}
                className={`rounded-2xl border p-6 flex flex-col justify-between space-y-5 transition-all ${
                  isRecommended
                    ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/15 via-slate-950/90 to-slate-950 shadow-glowAmber'
                    : 'border-slate-800 bg-slate-950/70'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-300 font-mono text-xs font-bold">
                      <Clock className="w-4 h-4" />
                      <span>{pkg.duration}</span>
                    </div>
                    {isRecommended && (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        {copy.recommendedBadge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">{pkg.title}</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                        {price}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {copy.perSession}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {pkg.bestFor}
                  </p>

                  <div className="border-t border-slate-800/80 pt-3 text-xs text-sky-200 leading-relaxed">
                    <span className="font-bold text-sky-300">
                      {copy.sessionFlowLabel}
                    </span>
                    {pkg.flow}
                  </div>
                </div>

                <div className="pt-4 space-y-2.5">
                  <Link href={`/book?package=${pkg.slug}`}>
                    <Button
                      variant={isRecommended ? 'primary' : 'secondary'}
                      className={`w-full font-bold justify-between ${
                        isRecommended
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300'
                          : ''
                      }`}
                    >
                      <span>
                        {copy.bookBtn(pkg.title, price)}
                      </span>
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </Button>
                  </Link>

                  <div className="text-center pt-1">
                    <a
                      href={
                        SIMDREAM_SERVICE_URLS[pkg.slug] ||
                        'https://www.simdream.co.il/booking'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-amber-300 transition-colors"
                    >
                      <span>{copy.officialServicePage}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400/80" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
          {copy.interviewNote}
        </p>
      </section>

      {/* 4. FACILITY & BOEING 737 MAX COCKPIT SPECIFICATIONS (CLEAN DISCLOSURE DRAWER) */}
      <section className="pt-4 border-t border-slate-900">
        <details className="group rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-mono text-xs text-slate-400 hover:text-slate-200">
            <span>{copy.techSpecsSummary}</span>
            <ChevronDown
              aria-hidden="true"
              className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
            />
          </summary>
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] leading-relaxed text-slate-400">
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.techSpecsVisualsTitle}
              </p>
              <p>{copy.techSpecsVisualsDesc}</p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.techSpecsControlsTitle}
              </p>
              <p>{copy.techSpecsControlsDesc}</p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.techSpecsLocationTitle}
              </p>
              <p>{copy.techSpecsLocationDesc}</p>
            </div>
          </div>
        </details>
      </section>

      {/* 4b. PRO TRACKS: MULTI-SESSION AIRLINE INTERVIEW PREP (sold only here, never on /subscriptions) */}
      <section id="pro-tracks" className="space-y-8 scroll-mt-24" data-pro-tracks>
        <div className="max-w-3xl space-y-3">
          <Badge variant="amber">{copy.proTracksBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">{copy.proTracksTitle}</h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{copy.proTracksDesc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {proTracks.map((track) => (
            <Card
              key={track.id}
              borderAccent="amber"
              className="flex flex-col gap-6 bg-slate-950"
              data-subscription-pass={track.id}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="amber">
                    <span dir="ltr">{track.sessions} × {track.sessionMinutes}</span> PRO
                  </Badge>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">{track.copy.title}</h3>
                <p className="text-sm leading-relaxed text-slate-300">{track.copy.summary}</p>
              </div>

              {/* Price box: registry-derived standard value and savings in ₪ and % */}
              <div className="rounded-2xl border border-amber-500/30 bg-slate-900/70 p-5 space-y-3">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {formatCurrency(track.priceIls)}
                  </span>
                  <span className="text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                    {formatCurrency(Math.round(track.priceIls / track.sessions))} / {copy.proTracksPerSessionLabel}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  <span>
                    {copy.proTracksStandardValueLabel}: <s>{formatCurrency(track.financials.standardValueIls)}</s>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold" data-pro-track-savings>
                    <TrendingUp className="w-3.5 h-3.5" />
                    {copy.proTracksSavingsLabel}: {formatCurrency(track.financials.savingsIls)} ({track.financials.savingsPercent}%)
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  <span dir="ltr">{track.sessions}</span> {copy.proTracksSessionsLabel} • {copy.proTracksFlexibility}
                </div>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-200">
                {track.copy.curriculum.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-2 space-y-3">
                <p className="text-[11px] leading-relaxed text-slate-400">{copy.proTracksDisclosure}</p>
                <Button
                  variant="primary"
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300"
                  onClick={() => buySubscription(track)}
                  disabled={pendingPassId === track.id}
                  data-action="buy-subscription"
                >
                  {pendingPassId === track.id ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{copy.proTracksRedirecting}</span>
                    </span>
                  ) : (
                    <>
                      <span>{copy.proTracksCta}</span>
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </Button>
                <Link
                  href={`/contact?subject=subscription&plan=${track.id}`}
                  className="text-[11px] text-slate-400 hover:text-amber-300 text-center block pt-1 underline"
                >
                  <span>{copy.proTracksDispatch}</span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. BOTTOM BRIDGE TO RECREATIONAL PACKAGES & B2B WORKSHOPS */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left rtl:md:text-right">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 font-bold uppercase">
            <Sparkles className="w-4 h-4" />
            <span>{copy.b2cBridgeBadge}</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            {copy.b2cBridgeTitle}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link href="/experiences">
            <Button variant="secondary" size="sm">
              <span>{copy.b2cBtn}</span>
            </Button>
          </Link>
          <Link href="/workshops">
            <Button variant="outline" size="sm">
              <span>{copy.b2bBtn}</span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
