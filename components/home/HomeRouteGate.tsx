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
}

export function HomeRouteGate() {
  const { t, isRTL } = useLanguage();
  const rg = t.routeGate;

  // Tier 1: Consumer Experiences, Gifts, and Multi-Session Tracks
  const consumerRoutes: RouteCardItem[] = [
    {
      href: '/experiences',
      badge: rg.experiencesBadge,
      title: rg.experiencesTitle,
      desc: rg.experiencesDesc,
      cta: rg.experiencesCta,
      icon: Compass,
      accent: 'sky',
      colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30 group-hover:bg-sky-500/20',
      badgeClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      href: '/vouchers',
      badge: rg.vouchersBadge,
      title: rg.vouchersTitle,
      desc: rg.vouchersDesc,
      cta: rg.vouchersCta,
      icon: Gift,
      accent: 'amber',
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30 group-hover:bg-amber-500/20',
      badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      href: '/subscriptions',
      badge: rg.subscriptionsBadge,
      title: rg.subscriptionsTitle,
      desc: rg.subscriptionsDesc,
      cta: rg.subscriptionsCta,
      icon: Route,
      accent: 'purple',
      colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30 group-hover:bg-purple-500/20',
      badgeClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
  ];

  // Tier 2: Professional Airline Prep, Anxiety Coaching, and Corporate Offsites
  const specializedRoutes: RouteCardItem[] = [
    {
      href: '/pro',
      badge: rg.proBadge,
      title: rg.proTitle,
      desc: rg.proDesc,
      cta: rg.proCta,
      icon: GraduationCap,
      accent: 'sky',
      colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30 group-hover:bg-sky-500/20',
      badgeClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      href: '/fear-of-flying',
      badge: rg.fearOfFlyingBadge,
      title: rg.fearOfFlyingTitle,
      desc: rg.fearOfFlyingDesc,
      cta: rg.fearOfFlyingCta,
      icon: HeartPulse,
      accent: 'emerald',
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 group-hover:bg-emerald-500/20',
      badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      href: '/workshops',
      badge: rg.workshopsBadge,
      title: rg.workshopsTitle,
      desc: rg.workshopsDesc,
      cta: rg.workshopsCta,
      icon: Briefcase,
      accent: 'amber',
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30 group-hover:bg-amber-500/20',
      badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  const renderRouteCard = (item: RouteCardItem) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-2xl transition-transform duration-200 hover:-translate-y-1"
      >
        <Card
          glow
          borderAccent={item.accent}
          className="h-full flex flex-col justify-between space-y-5 p-6 transition-colors duration-200 group-hover:border-slate-700"
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

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-sky-400 group-hover:text-sky-300">
            <span>{item.cta}</span>
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

        {/* 2-Tier Structured Intent Layout */}
        <div className="space-y-8 sm:space-y-10">
          {/* Consumer Flights & Gifting */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {consumerRoutes.map(renderRouteCard)}
          </div>

          {/* Professional & Specialized Programs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-800/60">
            {specializedRoutes.map(renderRouteCard)}
          </div>
        </div>
      </div>
    </section>
  );
}
