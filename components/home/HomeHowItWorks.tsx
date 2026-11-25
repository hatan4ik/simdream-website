'use client';

import React from 'react';
import { Compass, Gauge, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
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
    },
    {
      num: hiw.step2Number,
      title: hiw.step2Title,
      desc: hiw.step2Desc,
      icon: Gauge,
    },
    {
      num: hiw.step3Number,
      title: hiw.step3Title,
      desc: hiw.step3Desc,
      icon: MessageSquare,
    },
  ];

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-950 border-t border-slate-900">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-14">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="sky">{hiw.badge}</Badge>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {hiw.title}
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            {hiw.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.num}
                glow
                borderAccent="sky"
                className="space-y-5 p-6 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-black font-mono text-sky-400/40">
                    {step.num}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
