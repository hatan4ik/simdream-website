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

export function HomeRouteGate() {
  const { t, isRTL } = useLanguage();
  const rg = t.routeGate;

  const routes = [
    {
      href: '/experiences',
      badge: rg.experiencesBadge,
      title: rg.experiencesTitle,
      desc: rg.experiencesDesc,
      cta: rg.experiencesCta,
      icon: Compass,
      accent: 'sky' as const,
    },
    {
      href: '/pro',
      badge: rg.proBadge,
      title: rg.proTitle,
      desc: rg.proDesc,
      cta: rg.proCta,
      icon: GraduationCap,
      accent: 'sky' as const,
    },
    {
      href: '/fear-of-flying',
      badge: rg.fearOfFlyingBadge,
      title: rg.fearOfFlyingTitle,
      desc: rg.fearOfFlyingDesc,
      cta: rg.fearOfFlyingCta,
      icon: HeartPulse,
      accent: 'emerald' as const,
    },
    {
      href: '/subscriptions',
      badge: rg.subscriptionsBadge,
      title: rg.subscriptionsTitle,
      desc: rg.subscriptionsDesc,
      cta: rg.subscriptionsCta,
      icon: Route,
      accent: 'sky' as const,
    },
    {
      href: '/workshops',
      badge: rg.workshopsBadge,
      title: rg.workshopsTitle,
      desc: rg.workshopsDesc,
      cta: rg.workshopsCta,
      icon: Briefcase,
      accent: 'amber' as const,
    },
    {
      href: '/vouchers',
      badge: rg.vouchersBadge,
      title: rg.vouchersTitle,
      desc: rg.vouchersDesc,
      cta: rg.vouchersCta,
      icon: Gift,
      accent: 'amber' as const,
    },
  ];

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/60 border-t border-slate-900">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-14">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="sky">{rg.badge}</Badge>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {rg.title}
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            {rg.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-2xl transition-transform hover:-translate-y-1"
                aria-label={`${item.title} — ${item.cta}`}
              >
                <Card
                  glow
                  borderAccent={item.accent}
                  className="h-full flex flex-col justify-between space-y-5 p-6 transition-colors group-hover:border-sky-500/50"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
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
                    <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
