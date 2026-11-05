'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Users,
  Award,
  CheckCircle2,
  Gift,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { getLocalizedAddons, getLocalizedPackages } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { WorldRoutesSection } from '@/components/experiences/WorldRoutesSection';
import {
  getSubscriptionPassFinancials,
  SUBSCRIPTION_PASSES,
  SUBSCRIPTION_SECTION_COPY,
} from '@/lib/data/subscription-passes';

export default function ExperiencesPage() {
  const { t, language, isRTL } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [pendingPassId, setPendingPassId] = useState<string | null>(null);

  const handleBuySubscription = async (passId: string) => {
    setPendingPassId(passId);
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: passId }),
      });
      if (!res.ok) throw new Error('Checkout API failed');
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error('No checkout URL');
    } catch (err) {
      console.warn('Subscription checkout redirect failed, falling back to dispatch:', err);
      window.location.href = `/contact?subject=subscription&plan=${passId}`;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat === 'recreational' || cat === 'fear_of_flying' || cat === 'subscriptions') {
      setSelectedCategory(cat);
    }
  }, []);

  const categories = [
    { id: 'all', label: t.experiences.all },
    { id: 'recreational', label: t.experiences.recreational },
    { id: 'fear_of_flying', label: t.experiences.fearOfFlying },
    { id: 'subscriptions', label: t.experiences.subscriptions },
  ];

  // Exclude B2B corporate and professional training packages from the consumer catalog
  // (Corporate workshops live on /workshops; Professional airline assessment prep lives on /pro)
  const packages = getLocalizedPackages(language).filter(
    (p) => p.category !== 'corporate' && p.category !== 'training'
  );

  const filteredPackages =
    selectedCategory === 'all'
      ? packages
      : packages.filter((p) => p.category === selectedCategory);

  const showFlightPackages = selectedCategory !== 'subscriptions';
  const showSubscriptions = selectedCategory === 'all' || selectedCategory === 'subscriptions';
  const subscriptionCopy = SUBSCRIPTION_SECTION_COPY[language];
  const localizedAddons = getLocalizedAddons(language);
  const subscriptionPasses = SUBSCRIPTION_PASSES.map((pass) => ({
    ...pass,
    copy: pass.copy[language],
    financials: getSubscriptionPassFinancials(pass),
    trainingAddons: pass.trainingAddonIds.map((addonId) => localizedAddons.find((addon) => addon.id === addonId)),
  }));

  return (
    <div className="flex-1 w-full min-w-0 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <Badge variant="sky">{t.experiences.badge}</Badge>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
          {t.experiences.title}
        </h1>
        <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
          {t.experiences.subtitle}
        </p>

        {/* Direct Launch Bar to Live Kantorovich Calendar */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/book">
            <Button size="lg">{t.nav.bookFlight}</Button>
          </Link>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-800 pb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all min-h-[44px] touch-manipulation cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-sky-700 text-white shadow-glow'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 1. Single Flight Packages Grid */}
      {showFlightPackages && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPackages.map((pkg) => (
            <Card
              key={pkg.id}
              glow={pkg.featured}
              borderAccent={pkg.featured ? 'sky' : 'none'}
              // backdrop-blur-none: this page stacks ~30 cards; software-rendered WebKit cannot repaint that many blurs.
              className="flex flex-col justify-between relative overflow-hidden backdrop-blur-none"
            >
              {pkg.badge && (
                <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                  <Badge variant={pkg.featured ? 'sky' : 'slate'}>{pkg.badge}</Badge>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{pkg.durationMinutes} {t.experiences.minutesTime}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{pkg.title}</h2>
                </div>

                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{pkg.description}</p>

                {/* Price */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-white">{formatCurrency(pkg.priceIls)}</span>
                      <span className="text-xs text-slate-400 font-mono ml-1 rtl:mr-1">{t.experiences.perFlight}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{t.experiences.approxUsd} ${pkg.priceUsd} USD</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>{pkg.guestSeats} {t.experiences.jumpseatGuests}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.experiences.instructorIncluded}</span>
                    </span>
                  </div>
                </div>

                {/* Clear, localized session inclusions rather than a small generic highlights label. */}
                <div className="space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                  <p className="text-sm sm:text-base font-bold text-white">
                    {t.experiences.packageHighlights}
                  </p>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {pkg.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8 mt-auto">
                <Link
                  href={
                    pkg.category === 'corporate'
                      ? '/workshops'
                      : `/book?package=${pkg.slug}`
                  }
                >
                  <Button
                    variant={pkg.featured ? 'primary' : 'secondary'}
                    className="w-full justify-between min-h-[44px]"
                  >
                    <span>
                      {pkg.category === 'corporate'
                        ? t.experiences.inquireCorporate
                        : t.experiences.bookThisFlight}
                    </span>
                    <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 1b. Experience Flights: World Trio routes, sights and adventures in the captain's voice. */}
      {showFlightPackages && <WorldRoutesSection />}

      {/* 2. Single-payment flight subscriptions. A Wix entitlement is required before automated redemption. */}
      {showSubscriptions && (
        <section className="space-y-8 pt-4">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="sky">{subscriptionCopy.badge}</Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              {subscriptionCopy.title}
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {subscriptionCopy.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {subscriptionPasses.map((pass) => (
              <Card
                key={pass.id}
                borderAccent={pass.sessions === 10 ? 'sky' : 'none'}
                className="flex flex-col gap-6 backdrop-blur-none"
                data-subscription-pass={pass.id}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant={pass.sessions === 10 ? 'sky' : 'slate'}>
                      {pass.sessions} × {pass.sessionMinutes} {t.experiences.minutesTime}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      <span dir="ltr">{pass.sessions * pass.sessionMinutes}</span>{' '}
                      {subscriptionCopy.totalFlightTimeLabel}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">{pass.copy.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-300">{pass.copy.summary}</p>
                </div>

                <div className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-4 space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-3xl font-black text-white">{formatCurrency(pass.priceIls)}</span>
                    <span className="text-xs text-slate-400">{subscriptionCopy.validityLabel}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span>
                      {subscriptionCopy.standardValueLabel}: {formatCurrency(pass.financials.standardValueIls)}
                    </span>
                    <span className="text-sky-300">
                      {subscriptionCopy.savingsLabel}: {formatCurrency(pass.financials.savingsIls)} ({pass.financials.savingsPercent}%)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span>{pass.sessions} {subscriptionCopy.sessionLabel}</span>
                    <span>{pass.sessions * pass.sessionMinutes} {subscriptionCopy.totalFlightTimeLabel}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white">{subscriptionCopy.curriculumLabel}</p>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {pass.copy.curriculum.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                  <p className="text-sm font-semibold text-white">{subscriptionCopy.trainingModulesLabel}</p>
                  <p className="text-xs leading-relaxed text-slate-300">{subscriptionCopy.trainingModulesDescription}</p>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {pass.trainingAddons.map((addon) =>
                      addon ? (
                        <li key={addon.id} className="flex items-start gap-2">
                          <Award className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                          <span>{addon.name}</span>
                        </li>
                      ) : null
                    )}
                  </ul>
                </div>

                <div className="mt-auto space-y-3">
                  <p className="text-xs leading-relaxed text-slate-400">{subscriptionCopy.educationalDisclosure}</p>
                  <Button
                    variant={pass.sessions === 10 ? 'primary' : 'outline'}
                    className="w-full"
                    onClick={() => handleBuySubscription(pass.id)}
                    disabled={pendingPassId === pass.id}
                    data-action="buy-subscription"
                  >
                    {pendingPassId === pass.id ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          {language === 'he'
                            ? 'מעביר לתשלום...'
                            : language === 'ru'
                              ? 'Переход к оплате...'
                              : language === 'fr'
                                ? 'Redirection vers le paiement...'
                                : language === 'ar'
                                  ? 'جارٍ التحويل للدفع...'
                                  : 'Redirecting to payment...'}
                        </span>
                      </span>
                    ) : (
                      <>
                        <span>{subscriptionCopy.requestEnrollment}</span>
                        <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </Button>
                  <Link
                    href={`/contact?subject=subscription&plan=${pass.id}`}
                    className="text-[11px] text-slate-400 hover:text-sky-400 text-center block pt-1 underline"
                  >
                    <span>{subscriptionCopy.consultDispatch}</span>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 3. Professional Pilot Assessment Bridge Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left rtl:md:text-right">
          <Badge variant="amber">{t.experiences.proBridgeBadge}</Badge>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {t.experiences.proBridgeTitle}
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
            {t.experiences.proBridgeDesc}
          </p>
        </div>
        <Link href="/pro" className="shrink-0">
          <Button size="lg" className="bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 min-h-[44px]">
            <span>{t.experiences.proBridgeButton}</span>
            <ArrowRight className={`w-4 h-4 text-slate-950 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </Link>
      </div>

      {/* 4. B2B / Corporate Aviation Workshops Dedicated Bridge Card */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left rtl:md:text-right">
          <Badge variant="amber">{t.experiences.b2bBadge}</Badge>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {t.experiences.b2bTitle}
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            {t.experiences.b2bDesc}
          </p>
        </div>
        <Link href="/workshops" className="shrink-0">
          <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-slate-950 min-h-[44px]">
            <span>{t.experiences.b2bButton}</span>
            <ArrowRight className={`w-4 h-4 text-slate-950 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </Link>
      </div>

      {/* 5. Gift Voucher Teaser Banner */}
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/60 via-slate-900 to-sky-950/60 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-glow">
        <div className="space-y-2 text-center md:text-left rtl:md:text-right">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-sky-400 font-bold uppercase">
            <Gift className="w-4 h-4" />
            <span>{t.experiences.giftTeaserBadge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">{t.experiences.giftTeaserTitle}</h2>
          <p className="text-slate-300 text-sm max-w-xl">
            {t.experiences.giftTeaserDesc}
          </p>
        </div>
        <Link href="/vouchers">
          {/* Wraps on phones: a no-wrap label made the page ~359px wide at 320px. */}
          <Button size="lg" className="text-center sm:whitespace-nowrap min-h-[44px]">
            <Gift className="w-5 h-5" />
            <span>{t.experiences.customizeVoucher}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
