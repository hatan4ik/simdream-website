'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Award,
  ArrowRight,
  Calendar,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  ChevronDown,
  Plane,
  Clock,
  Compass,
  Heart,
  GraduationCap,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { getLocalizedAddons } from '@/lib/i18n/translations';
import {
  CONSUMER_SUBSCRIPTION_PASSES,
  getSubscriptionPassFinancials,
  SUBSCRIPTION_SECTION_COPY,
} from '@/lib/data/subscription-passes';
import { SUBSCRIPTION_PAGE_COPY } from '@/lib/data/subscription-page-copy';
import { FaqPageJsonLd } from '@/components/seo/FaqPageJsonLd';
import { PAGE_SEO_DEFINITIONS } from '@/lib/seo/seo-config';
import { WixMemberSubscriptionPanel } from '@/components/wix/WixMemberSubscriptionPanel';
import { useSubscriptionCheckout } from '@/components/subscriptions/useSubscriptionCheckout';

export default function SubscriptionsPage() {
  const { language, isRTL } = useLanguage();
  const [selectedFilter, setSelectedFilter] = useState<'all' | '5' | '10'>('all');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const { pendingPassId, buySubscription } = useSubscriptionCheckout();

  const pageCopy = SUBSCRIPTION_PAGE_COPY[language] || SUBSCRIPTION_PAGE_COPY.en;
  // The FAQ markup must name the language of the strings actually shown (English fallback included).
  const pageCopyLanguage = SUBSCRIPTION_PAGE_COPY[language] ? language : 'en';
  const sectionCopy = SUBSCRIPTION_SECTION_COPY[language] || SUBSCRIPTION_SECTION_COPY.en;
  const localizedAddons = getLocalizedAddons(language);

  const passes = CONSUMER_SUBSCRIPTION_PASSES.map((pass) => ({
    ...pass,
    copy: pass.copy[language] || pass.copy.en,
    financials: getSubscriptionPassFinancials(pass),
    trainingAddons: pass.trainingAddonIds.map((addonId) =>
      localizedAddons.find((addon) => addon.id === addonId)
    ),
  }));

  const filteredPasses = passes.filter((pass) => {
    if (selectedFilter === '5') return pass.sessions === 5;
    if (selectedFilter === '10') return pass.sessions === 10;
    return true;
  });

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((current) => (current === index ? null : index));
  };

  return (
    <div className="flex-1 w-full min-w-0 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
      {/* 1. HERO SECTION (Google Cloud / Google Store style) */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs sm:text-sm font-semibold tracking-wide">
          <Plane className="w-3.5 h-3.5" />
          <span>{pageCopy.eyebrow}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
          {pageCopy.heroTitle}
        </h1>

        <p className="text-slate-300 text-base sm:text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto font-normal">
          {pageCopy.heroSubtitle}
        </p>

        {/* Quick Stats Ribbon (4 metric pills) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-4 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-1">
            <CreditCard className="w-5 h-5 text-sky-400 mx-auto mb-1" />
            <p className="text-sm font-bold text-white">{pageCopy.stats.paymentValue}</p>
            <p className="text-xs text-slate-400">{pageCopy.stats.paymentLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-1">
            <Calendar className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <p className="text-sm font-bold text-white">{pageCopy.stats.paceValue}</p>
            <p className="text-xs text-slate-400">{pageCopy.stats.paceLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-1">
            <ShieldCheck className="w-5 h-5 text-sky-400 mx-auto mb-1" />
            <p className="text-sm font-bold text-white">{pageCopy.stats.mentorshipValue}</p>
            <p className="text-xs text-slate-400">{pageCopy.stats.mentorshipLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center space-y-1">
            <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-sm font-bold text-white">{pageCopy.stats.savingsValue}</p>
            <p className="text-xs text-slate-400">{pageCopy.stats.savingsLabel}</p>
          </div>
        </div>
      </section>

      <WixMemberSubscriptionPanel language={language} />

      {/* 2. "WHY WOULD I NEED THIS?" — four first-person reasons, each pointing at a track */}
      <section className="space-y-8" data-subscription-reasons>
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {pageCopy.reasonsTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            {pageCopy.reasonsSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pageCopy.pillars.map((pillar, idx) => {
            const icons = [Compass, Clock, GraduationCap, Heart];
            const Icon = icons[idx] || Award;
            return (
              <Card
                key={idx}
                className="p-6 flex flex-col justify-between border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950"
              >
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">{pillar.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 3. SUBSCRIPTION CARDS GRID (With Interactive Filter) */}
      <section className="space-y-8" id="plans">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {sectionCopy.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {sectionCopy.subtitle}
            </p>
          </div>

          {/* Interactive filter toggle pills */}
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedFilter === 'all'
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {pageCopy.filterAll}
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('5')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedFilter === '5'
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {pageCopy.filter5}
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('10')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedFilter === '10'
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {pageCopy.filter10}
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredPasses.map((pass) => {
            const isRecommended = pass.id === 'advanced-captain-5x90';
            const perSessionPrice = Math.round(pass.priceIls / pass.sessions);

            return (
              <Card
                key={pass.id}
                borderAccent={isRecommended ? 'sky' : 'none'}
                className={`flex flex-col gap-6 relative ${
                  isRecommended
                    ? 'ring-1 ring-sky-500/50 bg-gradient-to-b from-sky-950/20 via-slate-950 to-slate-950'
                    : 'bg-slate-950'
                }`}
                data-subscription-pass={pass.id}
              >
                {/* Header & Badges */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={pass.sessions === 10 ? 'sky' : 'slate'}>
                        {pass.sessions} × {pass.sessionMinutes} {pageCopy.minutesLabel}
                      </Badge>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3" />
                          {pageCopy.recommendedBadge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      <span dir="ltr">{pass.sessions * pass.sessionMinutes}</span>{' '}
                      {pageCopy.totalMinutesLabel}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white">{pass.copy.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-300">{pass.copy.summary}</p>
                </div>

                {/* Pricing Box with Breakdown */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {formatCurrency(pass.priceIls)}
                    </span>
                    <span className="text-xs font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                      {formatCurrency(perSessionPrice)} / {pageCopy.perSessionLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                    <span>
                      {sectionCopy.standardValueLabel}: {formatCurrency(pass.financials.standardValueIls)}
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      {sectionCopy.savingsLabel}: {formatCurrency(pass.financials.savingsIls)} ({pass.financials.savingsPercent}%)
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-4">
                    <span>{pass.sessions} {sectionCopy.sessionLabel}</span>
                    <span>•</span>
                    <span>{sectionCopy.flexibilityLabel}</span>
                  </div>
                </div>

                {/* Curriculum Milestones */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-white tracking-wide">
                    {sectionCopy.curriculumLabel}
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-200">
                    {pass.copy.curriculum.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Training Themes */}
                <div className="space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    {sectionCopy.trainingModulesLabel}
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {pass.trainingAddons.map((addon) =>
                      addon ? (
                        <li key={addon.id} className="flex items-start gap-2">
                          <Award className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <span>{addon.name}</span>
                        </li>
                      ) : null
                    )}
                  </ul>
                </div>

                {/* Action CTA */}
                <div className="mt-auto pt-4 space-y-3">
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {sectionCopy.educationalDisclosure}
                  </p>
                  <Button
                    variant={isRecommended || pass.sessions === 10 ? 'primary' : 'outline'}
                    className="w-full"
                    onClick={() => buySubscription(pass)}
                    disabled={pendingPassId === pass.id}
                    data-action="buy-subscription"
                  >
                    {pendingPassId === pass.id ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{sectionCopy.redirectingToPayment}</span>
                      </span>
                    ) : (
                      <>
                        <span>{sectionCopy.requestEnrollment}</span>
                        <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </Button>
                  <Link
                    href={`/contact?subject=subscription&plan=${pass.id}`}
                    className="text-[11px] text-slate-400 hover:text-sky-400 text-center block pt-1 underline"
                  >
                    <span>{sectionCopy.consultDispatch}</span>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. THE 5-STAGE FLIGHT DECK LEARNING ROADMAP (Visual Stepper) */}
      <section className="space-y-8 pt-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="sky">{pageCopy.roadmapTitle}</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {pageCopy.roadmapSubtitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {pageCopy.stages.map((stage, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold tracking-wider text-sky-400 uppercase">
                  {stage.stage}
                </span>
                <span className="text-xs font-mono text-slate-400">0{idx + 1}/05</span>
              </div>
              <h3 className="text-sm font-bold text-white leading-snug">{stage.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed flex-1">
                {stage.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. COMPARISON MATRIX (Single Flight vs 5-Flight vs 10-Flight) */}
      <section className="space-y-8 pt-4">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {pageCopy.comparisonTitle}
          </h2>
          <p className="text-sm text-slate-400">
            {pageCopy.comparisonSubtitle}
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left rtl:text-right border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <th className="py-4 px-6">{pageCopy.comparisonHeaders.feature}</th>
                <th className="py-4 px-6 text-slate-400">{pageCopy.comparisonHeaders.singleFlight}</th>
                <th className="py-4 px-6 text-sky-400 font-bold">{pageCopy.comparisonHeaders.sub5}</th>
                <th className="py-4 px-6 text-emerald-400 font-bold">{pageCopy.comparisonHeaders.sub10}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs sm:text-sm">
              {pageCopy.comparisonRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-4 px-6 font-semibold text-white">{row.feature}</td>
                  <td className="py-4 px-6 text-slate-400">{row.single}</td>
                  <td className="py-4 px-6 text-sky-300 font-medium">{row.sub5}</td>
                  <td className="py-4 px-6 text-emerald-300 font-medium">{row.sub10}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. GOOGLE-STYLE EXPANDABLE FAQ ACCORDION */}
      <section className="max-w-3xl mx-auto space-y-8 pt-4">
        {/* FAQPage markup from the very array rendered below, in the visitor's language (AGENTS.md §8). */}
        <FaqPageJsonLd
          url={`${FACILITY_INFO.primaryDomain}${PAGE_SEO_DEFINITIONS.subscriptions.path}`}
          language={pageCopyLanguage}
          faqs={pageCopy.faqs}
        />
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-sky-400 text-xs font-mono uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>{pageCopy.faqEyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{pageCopy.faqTitle}</h2>
          <p className="text-sm text-slate-400">{pageCopy.faqSubtitle}</p>
        </div>

        <div className="space-y-3">
          {pageCopy.faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-5 text-left rtl:text-right font-semibold text-white hover:text-sky-300 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base pr-4 rtl:pr-0 rtl:pl-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-sky-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. BOTTOM CONVERSION CTA BANNER */}
      <section className="rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-950 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
        <div className="max-w-2xl mx-auto space-y-3">
          <Badge variant="sky">{pageCopy.bottomCtaBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {pageCopy.bottomCtaTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {pageCopy.bottomCtaSubtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link href="#plans">
            <Button variant="primary">
              <span>{pageCopy.bottomCtaButton}</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </Link>
          <a
            href={FACILITY_INFO.contact.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-slate-700 bg-slate-900/80 text-sm font-semibold text-slate-200 hover:text-white hover:border-emerald-500 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp Dispatch ({FACILITY_INFO.contact.phoneDisplay})</span>
          </a>
        </div>

        <p className="text-xs text-slate-400 max-w-xl mx-auto pt-2">
          {pageCopy.bottomContactConcierge}:{' '}
          <a href={FACILITY_INFO.contact.phoneHref} className="text-sky-400 hover:underline">
            {FACILITY_INFO.contact.phoneDisplay}
          </a>
        </p>
      </section>
    </div>
  );
}
