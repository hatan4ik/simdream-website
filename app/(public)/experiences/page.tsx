'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  Users,
  Award,
  CheckCircle2,
  Gift,
  ArrowRight,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { getLocalizedPackages } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

export default function ExperiencesPage() {
  const { t, language, isRTL } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: t.experiences.all },
    { id: 'recreational', label: t.experiences.recreational },
    { id: 'training', label: t.experiences.training },
    { id: 'fear_of_flying', label: t.experiences.fearOfFlying },
  ];

  // Exclude B2B corporate packages from the consumer catalog (they live exclusively on /workshops)
  const packages = getLocalizedPackages(language).filter((p) => p.category !== 'corporate');
  const filteredPackages =
    selectedCategory === 'all'
      ? packages
      : packages.filter((p) => p.category === selectedCategory);

  return (
    <div className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
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
            <Button size="lg" className="font-bold shadow-glow">
              <Calendar className="w-5 h-5" />
              <span>{t.nav.bookFlight} — Live Calendar &amp; Slots</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-800 pb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              selectedCategory === cat.id
                ? 'bg-sky-500 text-white shadow-glow'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPackages.map((pkg) => (
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
                  <span className="text-xs font-mono text-slate-500">{t.experiences.approxUsd} ${pkg.priceUsd} USD</span>
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

              {/* Features List */}
              <div className="space-y-2">
                <p className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                  {t.experiences.packageHighlights}
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
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
                  className="w-full font-bold justify-between"
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

      {/* B2B / Corporate Aviation Workshops Dedicated Bridge Card */}
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
          <Button size="lg" className="font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-glowAmber">
            <span>{t.experiences.b2bButton}</span>
            <ArrowRight className={`w-4 h-4 text-slate-950 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </Link>
      </div>

      {/* Gift Voucher Teaser Banner */}
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
          <Button size="lg" className="font-bold whitespace-nowrap">
            <Gift className="w-5 h-5" />
            <span>{t.experiences.customizeVoucher}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
