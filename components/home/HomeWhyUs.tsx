'use client';

import React from 'react';
import Link from 'next/link';
import {
  Gauge,
  UserCheck,
  Globe,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/i18n/language-context';

export function HomeWhyUs() {
  const { t, isRTL } = useLanguage();
  const wu = t.whyUs;

  // Top Tier: 2 Flagship Pillars (The Machine & The Mentors)
  const flagshipPillars = [
    {
      badge: wu.pillar1Badge,
      title: wu.pillar1Title,
      desc: wu.pillar1Desc,
      points: wu.pillar1Points,
      icon: Gauge,
      accent: 'sky' as const,
      colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      dotColor: 'bg-sky-400',
    },
    {
      badge: wu.pillar2Badge,
      title: wu.pillar2Title,
      desc: wu.pillar2Desc,
      points: wu.pillar2Points,
      icon: UserCheck,
      accent: 'emerald' as const,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      dotColor: 'bg-emerald-400',
    },
  ];

  // Foundation Tier: 3 Structural Pillars (Airports, Anxiety, Integrity)
  const foundationPillars = [
    {
      badge: wu.pillar3Badge,
      title: wu.pillar3Title,
      desc: wu.pillar3Desc,
      points: wu.pillar3Points,
      icon: Globe,
      accent: 'amber' as const,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      dotColor: 'bg-amber-400',
    },
    {
      badge: wu.pillar4Badge,
      title: wu.pillar4Title,
      desc: wu.pillar4Desc,
      points: wu.pillar4Points,
      icon: Sparkles,
      accent: 'purple' as const,
      colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      dotColor: 'bg-purple-400',
    },
    {
      badge: wu.pillar5Badge,
      title: wu.pillar5Title,
      desc: wu.pillar5Desc,
      points: wu.pillar5Points,
      icon: ShieldCheck,
      accent: 'sky' as const,
      colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      dotColor: 'bg-sky-400',
    },
  ];

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 border-t border-b border-slate-900">
      <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="sky">{wu.badge}</Badge>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {wu.title}
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            {wu.subtitle}
          </p>
        </div>

        {/* Asymmetrical 2 + 3 Editorial Pillar Grid */}
        <div className="space-y-6 sm:space-y-8">
          {/* Top Marquee Tier: 2 Flagship Pillars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {flagshipPillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <Card
                  key={idx}
                  glow
                  borderAccent={pillar.accent}
                  className="p-8 space-y-6 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${pillar.colorClass}`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className={`text-[11px] font-mono uppercase tracking-wider font-bold border px-3 py-1 rounded-full ${pillar.colorClass}`}>
                        {pillar.badge}
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      {pillar.title}
                    </h3>
                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                      {pillar.desc}
                    </p>

                    {/* Cockpit Visual Anchor for Pillar 1 (Boeing 737 LEAP-1B) */}
                    {idx === 0 && (
                      <div className="relative h-44 rounded-xl overflow-hidden border border-sky-500/30 group/img my-2">
                        <img
                          src="/gift-cards/moonlight.webp"
                          alt="Boeing 737 LEAP-1B motorized flight deck"
                          className="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                  <ul className="text-xs sm:text-sm font-mono text-slate-300 space-y-2 pt-4 border-t border-slate-800">
                    {pillar.points.map((point, pIdx) => (
                      <li key={pIdx} className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${pillar.dotColor} shrink-0`} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>

          {/* Bottom Foundation Tier: 3 Structural Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {foundationPillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <Card
                  key={idx}
                  glow
                  borderAccent={pillar.accent}
                  className="p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${pillar.colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-mono uppercase tracking-wider font-bold border px-2.5 py-1 rounded-full ${pillar.colorClass}`}>
                        {pillar.badge}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{pillar.title}</h3>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                      {pillar.desc}
                    </p>

                    {/* Runway Visual Anchor for Pillar 3 (24,000+ Airports) */}
                    {idx === 0 && (
                      <div className="relative h-28 rounded-xl overflow-hidden border border-amber-500/30 group/img my-1">
                        <img
                          src="/gift-cards/skyline.webp"
                          alt="24,000+ global airports and approaches"
                          className="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                  <ul className="text-xs font-mono text-slate-300 space-y-1.5 pt-3 border-t border-slate-800">
                    {pillar.points.map((point, pIdx) => (
                      <li key={pIdx} className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${pillar.dotColor} shrink-0`} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Engineering & Hardware Specs Teaser Link */}
        <div className="text-center pt-2">
          <Link
            href="/pro"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-sky-400 transition-colors"
          >
            <span>{wu.proTrainingSpecs}</span>
            <ChevronRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </div>
    </section>
  );
}
