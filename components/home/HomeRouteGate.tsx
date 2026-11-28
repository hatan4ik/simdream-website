'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  GraduationCap,
  HeartPulse,
  Route,
  Briefcase,
  Gift,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/i18n/language-context';

interface RouteCardItem {
  href: string;
  badge: string;
  title: string;
  desc: string;
  cta: string;
  icon: React.ElementType;
  accent: 'sky' | 'amber' | 'emerald' | 'purple';
  colorClass: string;
  badgeClass: string;
  telemetry?: { label: string; value: string; color?: string }[];
}

export function HomeRouteGate() {
  const { t, isRTL } = useLanguage();
  const rg = t.routeGate;

  // Group 1, flights for everyone. Anchor: Consumer Flight Experiences
  const experiencesAnchor: RouteCardItem = {
    href: '/experiences',
    badge: rg.experiencesBadge,
    title: rg.experiencesTitle,
    desc: rg.experiencesDesc,
    cta: rg.experiencesCta,
    icon: Compass,
    accent: 'sky',
    colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30 group-hover:bg-sky-500/20',
    badgeClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    telemetry: [
      { label: 'FLEET', value: 'B737-MAX LEAP-1B', color: 'text-sky-300' },
      { label: 'SIMULATOR', value: '1:1 MOTORIZED YOKE', color: 'text-emerald-400' },
      { label: 'GLOBAL NAV', value: '24,000+ AIRPORTS', color: 'text-white' },
      { label: 'COACHING', value: '1-ON-1 AIRLINE PILOT', color: 'text-amber-400' },
    ],
  };

  // Group 1, secondary: Gift Vouchers
  const vouchersCard: RouteCardItem = {
    href: '/vouchers',
    badge: rg.vouchersBadge,
    title: rg.vouchersTitle,
    desc: rg.vouchersDesc,
    cta: rg.vouchersCta,
    icon: Gift,
    accent: 'amber',
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30 group-hover:bg-amber-500/20',
    badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  // Group 1, secondary: Multi-Session Flight Tracks
  const subscriptionsCard: RouteCardItem = {
    href: '/subscriptions',
    badge: rg.subscriptionsBadge,
    title: rg.subscriptionsTitle,
    desc: rg.subscriptionsDesc,
    cta: rg.subscriptionsCta,
    icon: Route,
    accent: 'purple',
    colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30 group-hover:bg-purple-500/20',
    badgeClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  // Group 2, specialist programmes. Anchor: Professional Airline Assessment & Interview Prep
  const proAnchor: RouteCardItem = {
    href: '/pro',
    badge: rg.proBadge,
    title: rg.proTitle,
    desc: rg.proDesc,
    cta: rg.proCta,
    icon: GraduationCap,
    accent: 'sky',
    colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30 group-hover:bg-sky-500/20',
    badgeClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    telemetry: [
      { label: 'AVIONICS', value: 'CPflight DUAL MCP/EFIS', color: 'text-sky-300' },
      { label: 'CDU / FMC', value: '1:1 HARDWARE PEGASUS', color: 'text-emerald-400' },
      { label: 'AIRLINES', value: 'EL AL / ARKIA / RYR', color: 'text-white' },
      { label: 'STANDARD', value: 'TYPE-RATING COCKPIT', color: 'text-sky-400' },
    ],
  };

  // Group 2, secondary: Fear of Flying Coaching
  const fearOfFlyingCard: RouteCardItem = {
    href: '/fear-of-flying',
    badge: rg.fearOfFlyingBadge,
    title: rg.fearOfFlyingTitle,
    desc: rg.fearOfFlyingDesc,
    cta: rg.fearOfFlyingCta,
    icon: HeartPulse,
    accent: 'emerald',
    colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 group-hover:bg-emerald-500/20',
    badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  // Group 2, secondary: Corporate CRM & Leadership Workshops
  const workshopsCard: RouteCardItem = {
    href: '/workshops',
    badge: rg.workshopsBadge,
    title: rg.workshopsTitle,
    desc: rg.workshopsDesc,
    cta: rg.workshopsCta,
    icon: Briefcase,
    accent: 'amber',
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30 group-hover:bg-amber-500/20',
    badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  // Source order is reading order: each group is its anchor, then its two secondary routes.
  const routeGroups = [
    { id: 'consumer', anchor: experiencesAnchor, secondary: [vouchersCard, subscriptionsCard] },
    { id: 'specialist', anchor: proAnchor, secondary: [fearOfFlyingCard, workshopsCard] },
  ];

  const renderAnchorCard = (item: RouteCardItem) => {
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        data-route-card="anchor"
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-2xl transition-transform duration-200 motion-safe:hover:-translate-y-1 h-full"
      >
        <Card
          glow
          borderAccent={item.accent}
          className="h-full flex flex-col justify-between p-6 sm:p-8 transition-colors duration-200 group-hover:border-slate-700 relative overflow-hidden"
        >
          {/* Subtle cockpit corner tint. The curve and the fade are physical, so both are mirrored for right-to-left pages. */}
          <div
            data-route-backdrop
            className="absolute top-0 end-0 w-64 h-64 bg-gradient-to-bl rtl:bg-gradient-to-br from-sky-500/5 to-transparent rounded-bl-full rtl:rounded-bl-none rtl:rounded-br-full pointer-events-none"
          />

          <div className="flex flex-1 flex-col gap-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors ${item.colorClass}`}>
                <Icon className="w-7 h-7" />
              </div>
              <span className={`text-[11px] font-mono uppercase tracking-wider font-bold border px-3 py-1 rounded-full ${item.badgeClass}`}>
                {item.badge}
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl sm:text-3xl xl:text-4xl font-black text-white group-hover:text-sky-300 transition-colors tracking-tight">
                {item.title}
              </h3>
              <p className="text-slate-300 text-sm sm:text-base xl:text-lg leading-relaxed max-w-xl">
                {item.desc}
              </p>
            </div>

            {/* Instrument-style readouts: left-to-right in every language (AGENTS.md §5.3), wrapping
                instead of cutting text off, and a 2 x 2 block beside the stacked secondary routes.
                `mt-auto` rests the panel on the link row when the card is stretched to the pair's height. */}
            {item.telemetry && (
              <div
                dir="ltr"
                data-route-telemetry
                className="mt-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 lg:gap-x-6 lg:gap-y-4 p-3.5 lg:p-5 rounded-xl bg-slate-950/70 border border-slate-800/90 font-mono text-[11px] lg:text-[13px]"
              >
                {item.telemetry.map((tItem, tIdx) => (
                  <div key={tIdx} className="space-y-0.5">
                    <span className="text-slate-400 text-[9px] lg:text-[10px] uppercase tracking-wider block font-semibold">
                      {tItem.label}
                    </span>
                    <span className={`font-bold tabular-nums break-words block ${tItem.color || 'text-white'}`}>
                      {tItem.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between text-sm font-semibold text-sky-400 group-hover:text-sky-300 relative z-10">
            <span className="font-mono tracking-wide">{item.cta}</span>
            <ArrowRight className={`w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
          </div>
        </Card>
      </Link>
    );
  };

  const renderSecondaryCard = (item: RouteCardItem) => {
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        data-route-card="secondary"
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-2xl transition-transform duration-200 motion-safe:hover:-translate-y-1 h-full"
      >
        <Card
          glow={false}
          borderAccent={item.accent}
          className="h-full flex flex-col justify-between p-6 transition-colors duration-200 group-hover:border-slate-700"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${item.colorClass}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-wider font-bold border px-2.5 py-1 rounded-full ${item.badgeClass}`}>
                {item.badge}
              </span>
            </div>

            <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
              {item.title}
            </h3>

            <p className="text-slate-400 text-sm leading-relaxed">
              {item.desc}
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-sky-400 group-hover:text-sky-300">
            <span className="font-mono tracking-wide">{item.cta}</span>
            <ArrowRight className={`w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <section data-route-gate className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/60 border-t border-slate-900">
      <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="sky">{rg.badge}</Badge>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {rg.title}
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            {rg.subtitle}
          </p>
        </div>

        {/* Two route groups. From `lg` each is a 12-column grid: the anchor leads (7 columns, both
            rows) and the two secondary routes stack beside it (5 columns). At `md` the anchor takes
            the full row above the pair; on phones everything is one column. */}
        <div className="space-y-8 sm:space-y-10">
          {routeGroups.map((group, index) => (
            <div
              key={group.id}
              data-route-group={group.id}
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2 gap-6 ${
                index > 0 ? 'pt-8 sm:pt-10 border-t border-slate-800/60' : ''
              }`}
            >
              <div className="md:col-span-2 lg:col-span-7 lg:row-span-2">{renderAnchorCard(group.anchor)}</div>
              {group.secondary.map((item) => (
                <div key={item.href} className="lg:col-span-5">
                  {renderSecondaryCard(item)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
