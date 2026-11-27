'use client';

import React from 'react';
import { Compass, Gauge, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/lib/i18n/language-context';

export function HomeHowItWorks() {
  const { t } = useLanguage();
  const hiw = t.howItWorks;

  const steps = [
    {
      num: hiw.step1Number,
      title: hiw.step1Title,
      desc: hiw.step1Desc,
      icon: Compass,
      tag: 'BRIEFING ROOM',
      wpt: 'WPT-01',
      pfdBadge: 'NAV / PRE-FLT',
    },
    {
      num: hiw.step2Number,
      title: hiw.step2Title,
      desc: hiw.step2Desc,
      icon: Gauge,
      tag: 'LEAP-1B COCKPIT',
      wpt: 'WPT-02',
      pfdBadge: 'CMD / ACTIVE',
    },
    {
      num: hiw.step3Number,
      title: hiw.step3Title,
      desc: hiw.step3Desc,
      icon: MessageSquare,
      tag: 'PILOT DEBRIEF',
      wpt: 'WPT-03',
      pfdBadge: 'LOG / COMPLETE',
    },
  ];

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 border-t border-slate-900 relative overflow-hidden">
      {/* Background radial atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-sky-500/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="sky">{hiw.badge}</Badge>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {hiw.title}
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            {hiw.subtitle}
          </p>
        </div>

        {/* Connected Flight Plan Sequence */}
        <div className="relative">
          {/* Desktop connecting airway flight track line with FMC cerulean/orange gradient */}
          <div
            className="hidden md:block absolute top-[36px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-sky-500/30 via-orange-500/40 to-sky-500/30 pointer-events-none"
            aria-hidden="true"
          />

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 relative">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="flex flex-col items-center md:items-start text-center md:text-start space-y-5 relative group"
                >
                  {/* Waypoint Indicator Node */}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-[72px] h-[72px] rounded-2xl bg-slate-900/90 border border-sky-500/30 group-hover:border-orange-500/70 flex items-center justify-center text-sky-400 group-hover:text-orange-400 shadow-glow transition-all duration-300 group-hover:scale-105">
                      <Icon className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-1.5 border border-slate-800 bg-slate-950/70 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                        <span className="text-[10px] font-mono font-bold text-slate-300 tracking-wider">
                          {step.wpt}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-2xl font-black font-mono tabular-nums text-sky-400 group-hover:text-orange-400 tracking-tight transition-colors"
                          aria-hidden="true"
                        >
                          {step.num}
                        </span>
                        <span
                          className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold"
                          aria-hidden="true"
                        >
                          {step.tag}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Waypoint Content Card with motion-safe hover elevation */}
                  <div className="w-full bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 space-y-3 transition-all duration-300 group-hover:border-slate-700/80 motion-safe:group-hover:-translate-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      <span>BOEING PFD STAGE</span>
                      <span className="text-sky-400 font-bold">{step.pfdBadge}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
