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

  // Anchor 1: Consumer Flight Experiences (Wide 2-col showcase)
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

  // Secondary 1: Luxury Gift Vouchers (1-col crisp card)
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

  // Secondary 2: Multi-Session Subscription Passes (1-col crisp card)
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

  // Anchor 2: Professional Airline Assessment & Interview Prep (Wide 2-col showcase)
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

  // Secondary 3: Fear of Flying Coaching (1-col therapeutic module)
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

  // Secondary 4 / Anchor 3: Corporate CRM & Leadership Workshops (Wide 2-col leadership module)
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
    telemetry: [
      { label: 'METHOD', value: 'AIRLINE CREW RESOURCE MGMT', color: 'text-amber-300' },
      { label: 'FOCUS', value: 'THREAT & ERROR MANAGEMENT', color: 'text-emerald-400' },
      { label: 'SIMULATION', value: 'EMERGENCY COCKPIT DYNAMICS', color: 'text-white' },
      { label: 'COHORTS', value: 'EXECUTIVE & TEAM OFFSITES', color: 'text-sky-400' },
    ],
  };

  const renderAnchorCard = (item: RouteCardItem) => {
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-2xl transition-transform duration-200 motion-safe:hover:-translate-y-1 h-full"
      >
        <Card
          glow
          borderAccent={item.accent}
          className="h-full flex flex-col justify-between p-6 sm:p-8 transition-colors duration-200 group-hover:border-slate-700 relative overflow-hidden"
        >
          {/* Subtle cockpit instrument grid backdrop */}
          <div className="absolute top-0 end-0 w-64 h-64 bg-gradient-to-bl from-sky-500/5 to-transparent rounded-bl-full pointer-events-none" />

          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors ${item.colorClass}`}>
                <Icon className="w-7 h-7" />
              </div>
              <span className={`text-[11px] font-mono uppercase tracking-wider font-bold border px-3 py-1 rounded-full ${item.badgeClass}`}>
                {item.badge}
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl sm:text-3xl font-black text-white group-hover:text-sky-300 transition-colors tracking-tight">
                {item.title}
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                {item.desc}
              </p>
            </div>

            {/* Instrument-Style Telemetry Readouts */}
            {item.telemetry && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 font-mono text-[11px]">
                {item.telemetry.map((tItem, tIdx) => (
                  <div key={tIdx} className="space-y-0.5">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider block font-semibold">
                      {tItem.label}
                    </span>
                    <span className={`font-bold tabular-nums truncate block ${tItem.color || 'text-white'}`}>
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
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/60 border-t border-slate-900">
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

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Row 1: Anchor 1 (Consumer Flights - 2 cols) + Secondary 1 (Vouchers - 1 col) */}
          <div className="md:col-span-2 lg:col-span-2">
            {renderAnchorCard(experiencesAnchor)}
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            {renderSecondaryCard(vouchersCard)}
          </div>

          {/* Row 2: Secondary 2 (Subscriptions - 1 col) + Anchor 2 (PRO Prep - 2 cols) */}
          <div className="md:col-span-1 lg:col-span-1">
            {renderSecondaryCard(subscriptionsCard)}
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            {renderAnchorCard(proAnchor)}
          </div>

          {/* Row 3: Secondary 3 (Fear of Flying - 1 col) + Anchor 3 (Corporate Workshops - 2 cols) */}
          <div className="md:col-span-1 lg:col-span-1">
            {renderSecondaryCard(fearOfFlyingCard)}
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            {renderAnchorCard(workshopsCard)}
          </div>
        </div>
      </div>
    </section>
  );
}
